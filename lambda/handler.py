"""
XIRR Ledger — Lambda Handler
Routes API Gateway requests and manages async processing lifecycle.

Routes:
  POST /session    — create session, return presigned S3 upload URLs
  POST /validate   — validate an uploaded file (broker format check + transaction count)
  POST /process    — write pending status, trigger async self-invocation
  POST /send-otp   — generate + email a 6-digit OTP for email verification
  POST /verify-otp — verify OTP submitted by user

Async mode (InvocationType=Event):
  event contains {"async_mode": true, "session_id": ..., ...}
  runs full XIRR computation → writes status.json → sends email
"""

import json
import uuid
import os
import random
import hashlib
import boto3
import logging
from botocore.config import Config
from datetime import datetime, timezone, timedelta

logger = logging.getLogger()
logger.setLevel(logging.INFO)

AWS_REGION = os.environ.get("AWS_REGION_NAME", "ap-south-1")

# Standard client for Lambda-side S3 ops (get_object, put_object)
s3 = boto3.client("s3", region_name=AWS_REGION)

# Separate client for presigned URL generation — forces regional endpoint
# so browser PUT URLs use s3.ap-south-1.amazonaws.com (no CORS redirect)
s3_presign = boto3.client(
    "s3",
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(signature_version="s3v4"),
)

lambda_client = boto3.client("lambda")
ses = boto3.client("ses", region_name=AWS_REGION)

UPLOADS_BUCKET  = os.environ["S3_UPLOADS_BUCKET"]
REPORTS_BUCKET  = os.environ["S3_REPORTS_BUCKET"]
JOBS_BUCKET     = os.environ["S3_JOBS_BUCKET"]
SES_FROM_EMAIL  = os.environ.get("SES_FROM_EMAIL", "reports@xirrledger.com")
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 3


def lambda_handler(event, context):
    logger.info("Event: %s", json.dumps(event))

    # ── Async processing mode (self-invoked) ────────────────
    if event.get("async_mode"):
        from processor import run_processing
        run_processing(event, s3, UPLOADS_BUCKET, REPORTS_BUCKET, JOBS_BUCKET)
        return {"status": "done"}

    # ── HTTP API Gateway routing ─────────────────────────────
    path   = event.get("rawPath", "")
    method = event.get("requestContext", {}).get("http", {}).get("method", "")

    if path == "/session" and method == "POST":
        return handle_create_session(event)

    if path == "/validate" and method == "POST":
        return handle_validate(event)

    if path == "/process" and method == "POST":
        return handle_process(event, context)

    if path == "/send-otp" and method == "POST":
        return handle_send_otp(event)

    if path == "/verify-otp" and method == "POST":
        return handle_verify_otp(event)

    return _response(404, {"error": f"Route not found: {method} {path}"})


# ─────────────────────────────────────────────────────────────
# POST /session
# Body: { "files": [{"name": "ledger.csv", "type": "text/csv"}, ...] }
# Returns: { "session_id": "...", "upload_urls": [{"name": ..., "url": ...}] }
# ─────────────────────────────────────────────────────────────
def handle_create_session(event):
    try:
        body = json.loads(event.get("body") or "{}")
        files = body.get("files", [])

        if not files:
            return _response(400, {"error": "files array is required"})

        session_id = str(uuid.uuid4())

        # Generate one presigned PUT URL per file
        upload_urls = []
        for f in files:
            file_name = f.get("name", "ledger")
            content_type = f.get("type", "application/octet-stream")
            s3_key = f"uploads/{session_id}/{file_name}"

            presigned_url = s3_presign.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": UPLOADS_BUCKET,
                    "Key": s3_key,
                    "ContentType": content_type,
                },
                ExpiresIn=24 * 3600,  # 24 hours
            )
            upload_urls.append({"name": file_name, "url": presigned_url, "key": s3_key})

        logger.info("Created session %s with %d upload URLs", session_id, len(upload_urls))

        return _response(200, {
            "session_id": session_id,
            "upload_urls": upload_urls,
        })

    except Exception as e:
        logger.exception("Error in handle_create_session")
        return _response(500, {"error": str(e)})


# ─────────────────────────────────────────────────────────────
# POST /process
# Body: {
#   "session_id": "...",
#   "name": "Ankit",
#   "email": "ankit@example.com",
#   "files": [{"key": "uploads/{session_id}/ledger.csv", "broker": "zerodha"}],
#   "accounts": [
#     {"pan": null, "broker": "zerodha", "holdings": 50000, "cash": 5000,
#      "file_keys": ["uploads/{sid}/ledger.csv"]},
#     {"pan": "ABCDE1234F", "broker": "groww", "holdings": 30000, "cash": 2000,
#      "file_keys": ["uploads/{sid}/groww1.pdf", "uploads/{sid}/groww2.pdf"],
#      "pan_password": "ABCDE1234F"}
#   ]
# }
# Returns: { "session_id": "...", "status": "processing" }
# ─────────────────────────────────────────────────────────────
def handle_process(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        session_id = body.get("session_id")

        if not session_id:
            return _response(400, {"error": "session_id is required"})

        # Write initial status
        _write_status(session_id, {"status": "pending", "created_at": _now()})

        # Trigger async self-invocation
        async_payload = {
            "async_mode": True,
            "session_id": session_id,
            "name": body.get("name", ""),
            "email": body.get("email", ""),
            "accounts": body.get("accounts", []),
            "manual_entries": body.get("manual_entries", []),
        }

        lambda_client.invoke(
            FunctionName=context.function_name,
            InvocationType="Event",  # async
            Payload=json.dumps(async_payload),
        )

        logger.info("Triggered async processing for session %s", session_id)

        return _response(200, {"session_id": session_id, "status": "processing"})

    except Exception as e:
        logger.exception("Error in handle_process")
        return _response(500, {"error": str(e)})


# ─────────────────────────────────────────────────────────────
# POST /validate
# Body: { "session_id": "...", "file_key": "uploads/.../file.csv",
#         "broker": "zerodha"|"groww"|"fyers", "pan": "ABCDE1234F" (Groww only) }
# Returns: { "valid": true, "transactions_found": 42 }
#       or { "valid": false, "error": "human-readable reason" }
# ─────────────────────────────────────────────────────────────
def handle_validate(event):
    try:
        body = json.loads(event.get("body") or "{}")
        file_key = body.get("file_key", "")
        broker   = body.get("broker", "").lower()
        pan      = body.get("pan")

        if not file_key:
            return _response(400, {"error": "file_key is required"})
        if broker not in ("zerodha", "groww", "fyers"):
            return _response(400, {"error": f"Unknown broker: {broker}"})
        if broker == "groww" and not pan:
            return _response(200, {"valid": False, "error": "PAN required to validate Groww PDF"})

        # Download file from S3
        obj = s3.get_object(Bucket=UPLOADS_BUCKET, Key=file_key)
        file_bytes = obj["Body"].read()

        # Import parsers
        from processor import parse_zerodha_csv, parse_zerodha_ledger_xlsx, parse_groww_pdf, parse_fyers_csv

        if broker == "zerodha":
            if file_key.lower().endswith('.xlsx'):
                outflows, _, client_id = parse_zerodha_ledger_xlsx(file_bytes)
                return _response(200, {"valid": True, "transactions_found": len(outflows), "client_id": client_id})
            else:
                outflows, _ = parse_zerodha_csv(file_bytes)
                return _response(200, {"valid": True, "transactions_found": len(outflows)})

        if broker == "fyers":
            outflows, _ = parse_fyers_csv(file_bytes)
            return _response(200, {"valid": True, "transactions_found": len(outflows)})

        if broker == "groww":
            outflows, _ = parse_groww_pdf(file_bytes, password=pan)
            return _response(200, {"valid": True, "transactions_found": len(outflows)})

    except ValueError:
        return _response(200, {"valid": False, "error": "This CSV has the wrong structure. Please download the correct one from your broker."})

    except Exception as e:
        logger.exception("Error in handle_validate")
        err_str = str(e).lower()
        if "password" in err_str or "encrypted" in err_str or "pdfread" in err_str:
            return _response(200, {"valid": False, "error": "Incorrect PAN — could not open this PDF. Please check your PAN and try again."})
        return _response(200, {"valid": False, "error": "This file has the wrong structure. Please download the correct one from your broker."})


# ─────────────────────────────────────────────────────────────
# POST /send-otp
# Body: { "email": "user@example.com", "name": "Ankit" }
# Returns: { "sent": true }
# ─────────────────────────────────────────────────────────────
def handle_send_otp(event):
    try:
        body  = json.loads(event.get("body") or "{}")
        email = (body.get("email") or "").strip().lower()
        name  = (body.get("name") or "there").strip()

        if not email or "@" not in email:
            return _response(400, {"error": "Valid email is required"})

        otp = str(random.randint(100000, 999999))
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)).isoformat()

        otp_key = f"otps/{hashlib.sha256(email.encode()).hexdigest()}.json"
        s3.put_object(
            Bucket=JOBS_BUCKET,
            Key=otp_key,
            Body=json.dumps({"otp": otp, "email": email, "expires_at": expires_at, "attempts": 0}),
            ContentType="application/json",
        )

        ses.send_email(
            Source=SES_FROM_EMAIL,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": "Your XIRR Ledger verification code"},
                "Body": {
                    "Html": {
                        "Data": f"""
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px">
  <div style="display:flex;align-items:center;gap:10px;margin:0 0 8px">
    <div style="width:32px;height:32px;background:rgba(245,158,11,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="18" height="18" fill="#f59e0b" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
    </div>
    <h2 style="color:#f59e0b;margin:0;font-size:1.2rem">XIRR Ledger</h2>
  </div>
  <p style="color:#94a3b8;margin:0 0 24px">Email Verification</p>
  <p>Hi {name},</p>
  <p>Your verification code is:</p>
  <div style="font-size:2rem;font-weight:800;letter-spacing:0.2em;color:#f59e0b;background:#1e293b;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0">{otp}</div>
  <p style="color:#64748b;font-size:0.85rem">This code expires in {OTP_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
</div>"""
                    }
                },
            },
        )

        logger.info("OTP sent to %s", email)
        return _response(200, {"sent": True})

    except Exception as e:
        logger.exception("Error in handle_send_otp")
        return _response(500, {"error": str(e)})


# ─────────────────────────────────────────────────────────────
# POST /verify-otp
# Body: { "email": "user@example.com", "otp": "123456" }
# Returns: { "verified": true } or { "verified": false, "error": "..." }
# ─────────────────────────────────────────────────────────────
def handle_verify_otp(event):
    try:
        body  = json.loads(event.get("body") or "{}")
        email = (body.get("email") or "").strip().lower()
        otp   = (body.get("otp") or "").strip()

        if not email or not otp:
            return _response(400, {"error": "email and otp are required"})

        otp_key = f"otps/{hashlib.sha256(email.encode()).hexdigest()}.json"

        try:
            obj = s3.get_object(Bucket=JOBS_BUCKET, Key=otp_key)
            record = json.loads(obj["Body"].read())
        except s3.exceptions.NoSuchKey:
            return _response(200, {"verified": False, "error": "OTP not found. Please request a new one."})
        except Exception:
            return _response(200, {"verified": False, "error": "OTP not found. Please request a new one."})

        # Check expiry
        expires_at = datetime.fromisoformat(record["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            s3.delete_object(Bucket=JOBS_BUCKET, Key=otp_key)
            return _response(200, {"verified": False, "error": "OTP expired. Please request a new one."})

        # Check attempts
        attempts = record.get("attempts", 0) + 1
        if attempts > OTP_MAX_ATTEMPTS:
            s3.delete_object(Bucket=JOBS_BUCKET, Key=otp_key)
            return _response(200, {"verified": False, "error": "Too many attempts. Please request a new OTP."})

        if record["otp"] != otp:
            # Persist incremented attempts
            record["attempts"] = attempts
            s3.put_object(
                Bucket=JOBS_BUCKET,
                Key=otp_key,
                Body=json.dumps(record),
                ContentType="application/json",
            )
            remaining = OTP_MAX_ATTEMPTS - attempts
            return _response(200, {"verified": False, "error": f"Incorrect code. {remaining} attempt(s) left."})

        # Success — delete OTP record
        s3.delete_object(Bucket=JOBS_BUCKET, Key=otp_key)
        logger.info("OTP verified for %s", email)
        return _response(200, {"verified": True})

    except Exception as e:
        logger.exception("Error in handle_verify_otp")
        return _response(500, {"error": str(e)})


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def _write_status(session_id, data):
    s3.put_object(
        Bucket=JOBS_BUCKET,
        Key=f"jobs/{session_id}/status.json",
        Body=json.dumps(data),
        ContentType="application/json",
    )


def _now():
    return datetime.now(timezone.utc).isoformat()


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
