"""
XIRR Ledger — Nifty 50 Daily Cache Refresher

Downloads the full ^NSEI history from yfinance and stores it in S3 as:
  s3://xirrledger-jobs/nifty50/history.json

Triggered daily by EventBridge at 6:00 AM IST (00:30 UTC).
The processor Lambda reads from this cache instead of calling yfinance
on every user request, eliminating shared-IP rate limiting.
"""

import json
import os
import boto3
import logging
import pandas as pd
import yfinance as yf

yf.set_tz_cache_location('/tmp')

logger = logging.getLogger()
logger.setLevel(logging.INFO)

S3_JOBS_BUCKET = os.environ.get("S3_JOBS_BUCKET", "xirrledger-jobs")
NIFTY_CACHE_KEY = "nifty50/history.json"


def lambda_handler(event, context):
    import time
    s3 = boto3.client("s3")

    logger.info("Downloading full Nifty 50 history from yfinance...")
    nifty = None
    for attempt in range(5):
        try:
            nifty = yf.download("^NSEI", start="1999-01-01", progress=False, auto_adjust=True)
            if not nifty.empty:
                break
            logger.warning("Attempt %d: empty response, retrying...", attempt + 1)
        except Exception as e:
            logger.warning("Attempt %d failed: %s", attempt + 1, e)
        delay = 10 * (2 ** attempt)  # 10s, 20s, 40s, 80s, 160s
        logger.info("Waiting %ds before retry...", delay)
        time.sleep(delay)

    if nifty is None or nifty.empty:
        raise ValueError("yfinance returned empty dataframe for ^NSEI after all retries")

    # Flatten multi-level columns if present (newer yfinance versions)
    if isinstance(nifty.columns, pd.MultiIndex):
        nifty.columns = nifty.columns.get_level_values(0)

    close = nifty[["Close"]].copy().reset_index()
    close.columns = ["date", "close"]
    close["date"] = pd.to_datetime(close["date"]).dt.tz_localize(None)

    records = [
        {"date": row["date"].strftime("%Y-%m-%d"), "close": round(float(row["close"]), 2)}
        for _, row in close.iterrows()
        if not pd.isna(row["close"])
    ]

    logger.info("Saving %d records to s3://%s/%s", len(records), S3_JOBS_BUCKET, NIFTY_CACHE_KEY)
    s3.put_object(
        Bucket=S3_JOBS_BUCKET,
        Key=NIFTY_CACHE_KEY,
        Body=json.dumps(records),
        ContentType="application/json",
    )

    latest = records[-1] if records else {}
    logger.info("Done — latest date: %s  close: %s", latest.get("date"), latest.get("close"))
    return {"status": "ok", "records": len(records), "latest": latest}
