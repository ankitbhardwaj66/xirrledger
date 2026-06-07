#!/usr/bin/env python3
"""
One-time script: refresh all expired report presigned URLs in prod DB.
Lists every session folder in xirrledger-reports, generates a fresh 1-year
presigned URL, and updates the DB via update-session.php.
"""

import os
import boto3
import requests
import sys

BUCKET        = "xirrledger-reports"
REGION        = "ap-south-1"
PROFILE       = "ankit"
EXPIRES_IN    = 365 * 24 * 3600  # 1 year
UPDATE_URL    = "https://xirrledger.com/api/update-session.php"
API_SECRET    = os.environ.get("XIRR_API_SECRET", "")

if not API_SECRET:
    print("Error: XIRR_API_SECRET env var not set. Run: export XIRR_API_SECRET=<secret>")
    sys.exit(1)

session = boto3.Session(profile_name=PROFILE)
s3 = session.client("s3", region_name=REGION)

paginator = s3.get_paginator("list_objects_v2")
pages = paginator.paginate(Bucket=BUCKET, Prefix="reports/", Delimiter="/")

session_ids = []
for page in pages:
    for prefix in page.get("CommonPrefixes", []):
        # prefix looks like "reports/abc123-.../"
        sid = prefix["Prefix"].split("/")[1]
        if sid:
            session_ids.append(sid)

print(f"Found {len(session_ids)} sessions in S3")

ok = 0
fail = 0
for sid in session_ids:
    key = f"reports/{sid}/xirr_report.pdf"
    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": key},
            ExpiresIn=EXPIRES_IN,
        )
        resp = requests.post(
            UPDATE_URL,
            json={"session_id": sid, "status": "done", "report_url": url},
            headers={"X-API-Secret": API_SECRET},
            timeout=10,
        )
        if resp.ok:
            ok += 1
            print(f"  ✓ {sid[:8]}…")
        else:
            fail += 1
            print(f"  ✗ {sid[:8]}… HTTP {resp.status_code}: {resp.text[:80]}")
    except Exception as e:
        fail += 1
        print(f"  ✗ {sid[:8]}… error: {e}")

print(f"\nDone — {ok} updated, {fail} failed")
