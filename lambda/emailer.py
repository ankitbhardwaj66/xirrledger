"""
XIRR Ledger — Daily Support Email for Failed Sessions

Triggered daily by EventBridge at 6:00 PM IST (12:30 UTC).

Finds users who attempted a calculation in the last 24 hours but only
got errors or stuck-pending results (no successful 'done' run), and
sends them a support email offering help via WhatsApp/call.

Each email address receives at most one support email per UTC day
(enforced by the support_emails_sent table on Hostinger MySQL).
"""

import os
import logging
import boto3
import requests

logger = logging.getLogger()
logger.setLevel(logging.INFO)

AWS_REGION           = os.environ.get("AWS_REGION_NAME", "ap-south-1")
SES_FROM_EMAIL       = os.environ.get("SES_FROM_EMAIL", "reports@xirrledger.com")
SES_REPLY_TO         = "contact@xirrledger.com"
HOSTINGER_API_URL    = os.environ.get("HOSTINGER_API_URL", "")
from secrets import get_hostinger_api_secret
HOSTINGER_API_SECRET = get_hostinger_api_secret()

ses = boto3.client("ses", region_name=AWS_REGION)

_EMAIL_TEMPLATE = None

def _load_template():
    global _EMAIL_TEMPLATE
    if _EMAIL_TEMPLATE is None:
        path = os.path.join(os.path.dirname(__file__), "email", "support-followup.html")
        with open(path, "r") as f:
            _EMAIL_TEMPLATE = f.read()
    return _EMAIL_TEMPLATE


def _render(name: str) -> str:
    display_name = name.strip() if name.strip() else "there"
    return _load_template().replace("{{name}}", display_name)


def _get_failed_users() -> list[dict]:
    if not HOSTINGER_API_URL:
        logger.warning("HOSTINGER_API_URL not set — skipping")
        return []
    try:
        resp = requests.post(
            f"{HOSTINGER_API_URL}/get-failed-sessions.php",
            json={},
            headers={"X-API-Secret": HOSTINGER_API_SECRET},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("users", [])
    except Exception as e:
        logger.error("Failed to fetch failed sessions: %s", e)
        return []


def _mark_sent(email: str) -> None:
    try:
        requests.post(
            f"{HOSTINGER_API_URL}/mark-support-email-sent.php",
            json={"email": email},
            headers={"X-API-Secret": HOSTINGER_API_SECRET},
            timeout=5,
        )
    except Exception as e:
        logger.warning("Failed to mark support email sent for %s: %s", email, e)


def _send_email(email: str, name: str) -> bool:
    try:
        html_body = _render(name)
        ses.send_email(
            Source=f"XIRR Ledger <{SES_FROM_EMAIL}>",
            ReplyToAddresses=[SES_REPLY_TO],
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {
                    "Data": "Trouble with XIRR Ledger? We're here to help",
                    "Charset": "UTF-8",
                },
                "Body": {
                    "Html": {"Data": html_body, "Charset": "UTF-8"},
                    "Text": {
                        "Data": (
                            f"Hi {name or 'there'},\n\n"
                            "Finding the Ledger can feel overwhelming at first — and that's completely okay. "
                            "We are here to help you for free.\n\n"
                            "Just reply to this email or reach us on WhatsApp:\n"
                            "https://wa.me/916239618150\n"
                            "Or call / WhatsApp: +91 6239 618 150\n\n"
                            "Try again: https://xirrledger.com/\n\n"
                            "— XIRR Ledger Team"
                        ),
                        "Charset": "UTF-8",
                    },
                },
            },
        )
        logger.info("Support email sent to %s", email)
        return True
    except Exception as e:
        logger.error("SES send failed for %s: %s", email, e)
        return False


def lambda_handler(event, context):
    logger.info("Support emailer triggered")

    users = _get_failed_users()
    logger.info("Found %d users with only failed sessions today", len(users))

    sent = 0
    failed = 0
    for user in users:
        email = user.get("email", "").strip()
        name  = user.get("name", "").strip()
        if not email:
            continue
        if _send_email(email, name):
            _mark_sent(email)
            sent += 1
        else:
            failed += 1

    logger.info("Done — sent: %d, failed: %d", sent, failed)
    return {"status": "ok", "sent": sent, "failed": failed}
