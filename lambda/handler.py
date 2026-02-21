"""
XIRR Ledger — Lambda Handler
Routes API Gateway requests and manages async processing lifecycle.

Routes:
  POST /session  — create session, return presigned S3 upload URLs
  POST /process  — write pending status, trigger async self-invocation

Async mode (InvocationType=Event):
  event contains {"async_mode": true, "session_id": ..., ...}
  runs full XIRR computation → writes status.json → sends email
"""

import json
import uuid
import os
import boto3
import logging
from datetime import datetime, timezone

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
lambda_client = boto3.client("lambda")

UPLOADS_BUCKET = os.environ["S3_UPLOADS_BUCKET"]
REPORTS_BUCKET = os.environ["S3_REPORTS_BUCKET"]
JOBS_BUCKET    = os.environ["S3_JOBS_BUCKET"]


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

    if path == "/process" and method == "POST":
        return handle_process(event, context)

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

            presigned_url = s3.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": UPLOADS_BUCKET,
                    "Key": s3_key,
                    "ContentType": content_type,
                },
                ExpiresIn=900,  # 15 minutes
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
