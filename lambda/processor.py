"""
XIRR Ledger — Processing Worker
Runs the full XIRR computation pipeline asynchronously.

Called from handler.py with:
  event = {
    "async_mode": True,
    "session_id": str,
    "name": str,
    "email": str,
    "accounts": [
      {
        "id": str,                    # frontend account id (used to link manual_entries)
        "broker": "zerodha" | "groww" | "fyers",
        "pan": str | None,
        "pan_password": str | None,   # for Groww PDFs (Fyers doesn't need this)
        "file_keys": [str],           # S3 keys in uploads bucket
        "dividend_file_keys": [str],  # optional — Zerodha dividend XLSX S3 keys
        "holdings": float,
        "cash": float
      }
    ],
    "manual_entries": [              # optional — outside broker investments
      {
        "label": str,                # e.g. "RBI Bond 2022"
        "amount": float,             # purchase amount (positive)
        "date": str,                 # ISO date "YYYY-MM-DD"
        "account_id": str | None     # links to accounts[].id for per-account XIRR
      }
    ]
  }
"""

import json
import os
import io
import re
import boto3
import logging
import tempfile
import requests
from datetime import datetime, timedelta, timezone

import pandas as pd
import numpy as np
from scipy.optimize import newton, brentq
import pdfplumber
import openpyxl
# yfinance removed — Nifty 50 data is read from the S3 daily cache
# (populated by the nifty-refresher Lambda, see refresher.py)
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.graphics.shapes import Drawing, Rect, String as GStr
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ses = boto3.client("ses", region_name=os.environ.get("AWS_REGION_NAME", "ap-south-1"))

SES_FROM_EMAIL       = os.environ.get("SES_FROM_EMAIL", "reports@xirrledger.com")
HOSTINGER_API_URL    = os.environ.get("HOSTINGER_API_URL", "")
HOSTINGER_API_SECRET = os.environ.get("HOSTINGER_API_SECRET", "")
TEST_EMAILS          = {e.strip().lower() for e in os.environ.get("TEST_EMAILS", "").split(",") if e.strip()}
SEND_EMAIL           = os.environ.get("SEND_EMAIL", "true").lower() == "true"


# ─────────────────────────────────────────────────────────────
# Cross-file deduplication helper
# ─────────────────────────────────────────────────────────────
def _dedup_cross_file(df):
    """
    Remove rows where (date, amount) appears in more than one source file.
    The first file's entries win; duplicates from later files are dropped.
    Entries within the same file are untouched — even multiple entries on
    the same date are legitimate if they come from the same file.
    """
    if df.empty or "_file_idx" not in df.columns:
        return df.drop(columns=["_file_idx"], errors="ignore")

    df = df.copy()
    df["_key"] = df["date"].astype(str) + "|" + df["amount"].astype(str)
    # For each (date, amount) key, find the lowest file index that contains it
    min_file = df.groupby("_key")["_file_idx"].transform("min")
    # Keep only rows whose file index is the minimum for that key
    result = df[df["_file_idx"] == min_file].drop(columns=["_file_idx", "_key"])
    return result.reset_index(drop=True)


# ─────────────────────────────────────────────────────────────
# Main entry point
# ─────────────────────────────────────────────────────────────
def run_processing(event, s3_client, uploads_bucket, reports_bucket, jobs_bucket):
    session_id     = event["session_id"]
    name           = event.get("name", "Investor")
    email          = event.get("email", "")
    accounts       = event.get("accounts", [])
    manual_entries = event.get("manual_entries", [])

    def update_status(data):
        s3_client.put_object(
            Bucket=jobs_bucket,
            Key=f"jobs/{session_id}/status.json",
            Body=json.dumps(data),
            ContentType="application/json",
        )

    def notify_php(payload):
        is_test = email.lower() in TEST_EMAILS
        if not (HOSTINGER_API_URL and email and not is_test):
            return
        try:
            requests.post(
                f"{HOSTINGER_API_URL}/update-session.php",
                json=payload,
                headers={"X-API-Secret": HOSTINGER_API_SECRET},
                timeout=10,
            )
        except Exception as e:
            logger.warning("PHP bridge notification failed: %s", e)

    try:
        update_status({"status": "parsing", "message": "Downloading and parsing ledger files..."})

        all_outflows = []
        all_inflows  = []
        account_stats_list = []

        for account in accounts:
            broker       = account.get("broker", "").lower()
            pan          = account.get("pan")
            pan_password = account.get("pan_password") or pan  # PAN is usually the PDF password
            file_keys    = account.get("file_keys", [])
            holdings     = float(account.get("holdings", 0))
            cash         = float(account.get("cash", 0))
            current_value = holdings + cash

            account_outflows  = []
            account_inflows   = []
            fyers_client_id   = None
            zerodha_client_id = None

            for file_idx, s3_key in enumerate(file_keys):
                logger.info("Downloading s3://%s/%s", uploads_bucket, s3_key)
                obj = s3_client.get_object(Bucket=uploads_bucket, Key=s3_key)
                file_bytes = obj["Body"].read()
                file_name  = s3_key.split("/")[-1].lower()

                if broker == "fyers":
                    if file_idx == 0:
                        # Extract Client ID from CSV header (row 4: "Client ID,XS80867")
                        for line in file_bytes.decode("utf-8-sig", errors="replace").splitlines()[:10]:
                            parts = line.split(",", 1)
                            if len(parts) == 2 and parts[0].strip() == "Client ID":
                                fyers_client_id = parts[1].strip()
                                break
                    out, inf = parse_fyers_csv(file_bytes)
                elif file_name.endswith(".pdf"):
                    out, inf = parse_groww_pdf(file_bytes, password=pan_password)
                elif broker == "zerodha" and file_name.endswith(".xlsx"):
                    out, inf, _cid = parse_zerodha_ledger_xlsx(file_bytes)
                    if _cid:
                        zerodha_client_id = _cid
                elif file_name.endswith(".csv"):
                    out, inf = parse_zerodha_csv(file_bytes)
                else:
                    logger.warning("Unsupported file type: %s", file_name)
                    continue

                # Tag each row with its source file index (used for cross-file dedup below)
                out["_file_idx"] = file_idx
                inf["_file_idx"] = file_idx
                account_outflows.append(out)
                account_inflows.append(inf)

            if not account_outflows and account.get("trade_type", "stocks") != "mf":
                logger.warning("No transactions found for account %s", pan or broker)
                continue

            acc_out = pd.concat(account_outflows, ignore_index=True) if account_outflows else pd.DataFrame(columns=["date", "amount", "_file_idx"])
            acc_inf = pd.concat(account_inflows, ignore_index=True) if account_inflows else pd.DataFrame(columns=["date", "amount", "_file_idx"])

            # For Groww/Fyers accounts with multiple files: remove cross-file duplicates only.
            # Entries on the same date within the same file are legitimate and kept.
            # Zerodha always has one file per account so no dedup needed there.
            if broker in ("groww", "fyers") and len(account_outflows) > 1:
                acc_out = _dedup_cross_file(acc_out)
                acc_inf = _dedup_cross_file(acc_inf)
            else:
                acc_out = acc_out.drop(columns=["_file_idx"], errors="ignore")
                acc_inf = acc_inf.drop(columns=["_file_idx"], errors="ignore")

            # ── Process MF tradebook files (new flow) ────────────
            # NOTE: all_outflows.append happens AFTER MF merging below
            mf_file_keys   = account.get("mf_file_keys", [])
            mf_outflows_all, mf_inflows_all = [], []
            for mk in mf_file_keys:
                try:
                    obj      = s3_client.get_object(Bucket=uploads_bucket, Key=mk)
                    mf_o, mf_i = parse_zerodha_mf_tradebook(obj["Body"].read())
                    if not mf_o.empty:
                        mf_outflows_all.append(mf_o)
                    if not mf_i.empty:
                        mf_inflows_all.append(mf_i)
                    logger.info("Parsed MF tradebook %s — %d buys, %d sells", mk, len(mf_o), len(mf_i))
                except Exception as e:
                    logger.warning("Failed to parse MF tradebook %s: %s", mk, e)

            mf_out_df = pd.concat(mf_outflows_all, ignore_index=True) if mf_outflows_all else pd.DataFrame(columns=["date", "amount"])
            mf_inf_df = pd.concat(mf_inflows_all,  ignore_index=True) if mf_inflows_all  else pd.DataFrame(columns=["date", "amount"])

            # Track MF totals for PDF breakdown
            mf_invested  = float(-mf_out_df["amount"].sum()) if not mf_out_df.empty else 0.0
            mf_redeemed  = float( mf_inf_df["amount"].sum()) if not mf_inf_df.empty else 0.0
            trade_type_val = account.get("trade_type", "stocks")

            # Merge MF cashflows into XIRR only for MF-only accounts.
            # For 'both' accounts the stock ledger already captures all bank
            # transfers including MF purchases — adding tradebook buys/sells
            # would double-count every MF investment.
            if trade_type_val == "mf":
                if not mf_out_df.empty:
                    acc_out = pd.concat([acc_out, mf_out_df], ignore_index=True)
                if not mf_inf_df.empty:
                    acc_inf = pd.concat([acc_inf, mf_inf_df], ignore_index=True)
            logger.info("MF breakdown — invested: %.2f, redeemed: %.2f, trade_type: %s",
                        mf_invested, mf_redeemed, trade_type_val)

            # Append to combined outflows AFTER MF merging (MF-only path needs this)
            all_outflows.append(acc_out)
            all_inflows.append(acc_inf)

            # ── Collect dividend inflows (Zerodha dividend XLSX) ──
            # Kept separate from broker inflows so total_withdrawn stays broker-only.
            # Dividends are passed into compute_portfolio_stats as dividend_cashflows
            # so they affect XIRR and net_gain but not the "Total Withdrawn" display.
            dividend_file_keys = account.get("dividend_file_keys", [])
            dividend_details   = []
            dividend_cashflows = pd.DataFrame(columns=["date", "amount"])
            for dk in dividend_file_keys:
                try:
                    obj     = s3_client.get_object(Bucket=uploads_bucket, Key=dk)
                    div_df, div_detail = parse_zerodha_dividends_xlsx(obj["Body"].read())
                    if not div_df.empty:
                        dividend_cashflows = pd.concat([dividend_cashflows, div_df], ignore_index=True)
                        dividend_details.extend(div_detail)
                        logger.info("Collected %d dividend inflow rows from %s", len(div_df), dk)
                except Exception as e:
                    logger.warning("Failed to parse dividend file %s: %s", dk, e)

            # Use client ID extracted from XLSX content; fall back to filename for legacy CSV
            zerodha_acct = zerodha_client_id
            if not zerodha_acct and broker == "zerodha" and file_keys:
                fname = file_keys[0].split("/")[-1]
                m = re.search(r'ledger[_\-](.+?)\.(?:csv|xlsx)', fname, re.IGNORECASE)
                zerodha_acct = m.group(1) if m else None

            if broker == "fyers":
                acct_name = f"Fyers ({fyers_client_id})" if fyers_client_id else "Fyers"
            elif pan:
                acct_name = f"Groww ({pan})"
            elif zerodha_acct:
                acct_name = f"Zerodha ({zerodha_acct})"
            else:
                acct_name = broker.capitalize() if broker else "Unknown"

            # Derive a stable account id for manual-entry linking.
            # Use the frontend-provided id if present; fall back to broker-specific
            # identifiers that match exactly what the frontend stores as acc.id.
            if broker == "fyers" and fyers_client_id:
                _derived_id = fyers_client_id
            elif broker == "groww" and pan:
                _derived_id = pan
            elif file_keys:
                _derived_id = file_keys[0].split("/")[-1]   # filename, e.g. ledger-NBN208.csv
            else:
                _derived_id = ""
            _acct_id = account.get("id", "") or _derived_id
            logger.info("Account id resolved: frontend=%r  derived=%r  used=%r",
                        account.get("id", ""), _derived_id, _acct_id)

            account_stats_list.append({
                "id": _acct_id,
                "name": acct_name,
                "outflows": acc_out,
                "inflows": acc_inf,
                "current_value": current_value,
                "dividend_cashflows": dividend_cashflows,
                "dividend_details": dividend_details,
                "mf_invested": mf_invested,
                "mf_redeemed": mf_redeemed,
                "trade_type": account.get("trade_type", "stocks"),
            })

        if not all_outflows:
            raise ValueError("No transactions found in any of the uploaded files.")

        combined_outflows = pd.concat(all_outflows, ignore_index=True)
        combined_inflows  = pd.concat(all_inflows, ignore_index=True) if all_inflows else pd.DataFrame(columns=["date", "amount"])
        combined_value    = sum(a["current_value"] for a in account_stats_list)

        # ── Inject manual outside-broker investment entries ───
        # Build a lookup so linked entries can also be injected into per-account outflows
        account_id_to_idx = {acc["id"]: i for i, acc in enumerate(account_stats_list) if acc.get("id")}

        manual_rows = []
        for me in manual_entries:
            try:
                amt = float(me.get("amount", 0))
                dt  = str(me.get("date", "")).strip()
                if amt > 0 and dt:
                    manual_rows.append({"date": dt, "amount": -amt})
                    # If linked to a specific account, inject into that account's outflows too
                    linked_id = me.get("account_id") or ""
                    if linked_id and linked_id in account_id_to_idx:
                        idx = account_id_to_idx[linked_id]
                        account_stats_list[idx]["outflows"] = pd.concat(
                            [account_stats_list[idx]["outflows"], pd.DataFrame([{"date": dt, "amount": -amt}])],
                            ignore_index=True,
                        )
                        logger.info("Injected manual entry '%s' into account '%s'", me.get("label", ""), account_stats_list[idx]["name"])
            except (ValueError, TypeError):
                continue
        if manual_rows:
            logger.info("Appending %d manual outside-investment entries to combined outflows", len(manual_rows))
            combined_outflows = pd.concat(
                [combined_outflows, pd.DataFrame(manual_rows)], ignore_index=True
            )

        # ── Guard: at least one transaction must exist ────────
        if combined_outflows.empty:
            raise ValueError(
                "No fund transfer transactions were found in the uploaded files. "
                "Please check you downloaded the correct statement (ledger/funds history), not a trade or holdings report."
            )

        # ── Fetch Nifty 50 data from S3 cache ────────────────
        update_status({"status": "fetching", "message": "Loading Nifty 50 benchmark data..."})
        first_date = min(pd.to_datetime(combined_outflows["date"]))
        nifty_data = fetch_nifty50_data(first_date, datetime.now(), s3_client, jobs_bucket)

        # ── Compute XIRR ─────────────────────────────────────
        update_status({"status": "computing", "message": "Computing XIRR..."})
        combined_div_cashflows_list = [
            acc["dividend_cashflows"] for acc in account_stats_list
            if not acc["dividend_cashflows"].empty
        ]
        combined_div_cashflows = (
            pd.concat(combined_div_cashflows_list, ignore_index=True)
            if combined_div_cashflows_list
            else pd.DataFrame(columns=["date", "amount"])
        )
        combined_stats = compute_portfolio_stats(
            combined_outflows, combined_inflows, combined_value, nifty_data,
            dividend_cashflows=combined_div_cashflows,
        )

        individual_stats = []
        for acc in account_stats_list:
            stats = compute_portfolio_stats(
                acc["outflows"], acc["inflows"], acc["current_value"], nifty_data,
                dividend_cashflows=acc.get("dividend_cashflows"),
            )
            stats["account_name"]     = acc["name"]
            stats["account_id"]       = acc.get("id", "")
            stats["dividend_details"] = acc.get("dividend_details", [])
            stats["mf_invested"]      = acc.get("mf_invested", 0.0)
            stats["mf_redeemed"]      = acc.get("mf_redeemed", 0.0)
            stats["trade_type"]       = acc.get("trade_type", "stocks")
            individual_stats.append(stats)

        # ── Generate PDF ──────────────────────────────────────
        if combined_stats.get("xirr_percentage") is None:
            raise ValueError(
                "We couldn't calculate your XIRR — the solver didn't converge. "
                "This can happen with very few transactions or an unusual cash flow pattern. "
                "Please double-check that your holdings value and file are correct and try again."
            )

        update_status({"status": "report", "message": "Generating PDF report..."})
        pdf_bytes = generate_pdf_report(individual_stats, combined_stats, name, manual_entries=manual_entries)

        pdf_key = f"reports/{session_id}/xirr_report.pdf"
        s3_client.put_object(
            Bucket=reports_bucket,
            Key=pdf_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )

        # Generate presigned URL (7 days — AWS hard cap for presigned URLs)
        report_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": reports_bucket, "Key": pdf_key},
            ExpiresIn=7 * 24 * 3600,
        )

        xirr_pct       = combined_stats.get("xirr_percentage")
        nifty_xirr_pct = combined_stats.get("nifty_xirr_percentage")

        period_years = combined_stats.get("investment_period_years")
        final_status = {
            "status": "done",
            "xirr": round(xirr_pct, 2) if xirr_pct is not None else None,
            "nifty_xirr": round(nifty_xirr_pct, 2) if nifty_xirr_pct is not None else None,
            "total_invested": round(combined_stats["total_invested"], 2),
            "total_withdrawn": round(combined_stats["total_withdrawn"], 2),
            "current_value": round(combined_value, 2),
            "net_gain": round(combined_stats["net_gain"], 2),
            "investment_period_days": combined_stats.get("investment_period_days"),
            "investment_period_years": round(period_years, 2) if period_years is not None else None,
            "report_url": report_url,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        update_status(final_status)

        # ── Notify PHP bridge ─────────────────────────────────
        notify_php({
            "session_id": session_id,
            "status": "done",
            "report_url": report_url,
            "xirr": final_status["xirr"],
            "nifty_xirr": final_status["nifty_xirr"],
        })

        # ── Send email ────────────────────────────────────────
        if email and SEND_EMAIL:
            send_report_email(name, email, final_status, report_url)
        elif email and not SEND_EMAIL:
            logger.info("Email skipped (SEND_EMAIL=false) for session %s", session_id)

        logger.info("Processing complete for session %s — XIRR: %s%%", session_id, xirr_pct)

    except ValueError as e:
        # ValueError messages are already written to be user-friendly
        logger.error("Processing failed (ValueError) for session %s: %s", session_id, e)
        msg = str(e)
        update_status({"status": "error", "message": msg})
        notify_php({"session_id": session_id, "status": "error", "error_message": msg})
    except Exception as e:
        # Catch-all for unexpected errors — never show raw Python to the user
        logger.exception("Processing failed for session %s", session_id)
        msg = "Something went wrong while processing your files. Please go back and try again."
        update_status({"status": "error", "message": msg})
        notify_php({"session_id": session_id, "status": "error", "error_message": msg})


# ─────────────────────────────────────────────────────────────
# XIRR calculation (ported from xirr_calculator.py)
# ─────────────────────────────────────────────────────────────
def calculate_xirr(cash_flows, dates, guess=0.1):
    if len(cash_flows) != len(dates):
        raise ValueError("Cash flows and dates must have the same length")
    if len(cash_flows) < 2:
        raise ValueError("Need at least 2 cash flows")

    sorted_data = sorted(zip(dates, cash_flows))
    dates       = [d for d, _ in sorted_data]
    cash_flows  = [cf for _, cf in sorted_data]
    first_date  = dates[0]
    years       = [(date - first_date).days / 365.25 for date in dates]

    def xnpv(rate):
        rate = np.clip(rate, -0.9999, 100)
        try:
            return sum(cf / (1 + rate) ** yr for cf, yr in zip(cash_flows, years))
        except (OverflowError, ZeroDivisionError):
            return float("inf") if rate > 0 else float("-inf")

    def xnpv_deriv(rate):
        rate = np.clip(rate, -0.9999, 100)
        try:
            return sum(-cf * yr / (1 + rate) ** (yr + 1) for cf, yr in zip(cash_flows, years))
        except (OverflowError, ZeroDivisionError):
            return 0

    for guess0 in [0.1, 0.0, -0.5, 0.5, 1.0]:
        try:
            r = newton(xnpv, guess0, fprime=xnpv_deriv, maxiter=100, tol=1e-6)
            if abs(xnpv(r)) < 1.0 and -0.99 < r < 10:
                return r
        except Exception:
            continue

    for lo in [-0.999, -0.99, -0.95]:
        for hi in [10, 5, 2]:
            try:
                if xnpv(lo) * xnpv(hi) < 0:
                    r = brentq(xnpv, lo, hi, maxiter=200, xtol=1e-6)
                    if abs(xnpv(r)) < 1.0:
                        return r
            except Exception:
                continue

    raise ValueError("Could not converge to an XIRR solution.")


# ─────────────────────────────────────────────────────────────
# Parsers
# ─────────────────────────────────────────────────────────────
def parse_zerodha_csv(file_bytes):
    df = pd.read_csv(io.BytesIO(file_bytes))
    required = ["particulars", "posting_date", "credit", "debit"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Zerodha CSV missing columns: {missing}")

    fund_additions = df[df["particulars"].str.contains("Funds added", na=False)].copy()
    fund_additions = fund_additions[["posting_date", "credit"]].copy()
    fund_additions.columns = ["date", "amount"]
    fund_additions["amount"] = -fund_additions["amount"]
    fund_additions = fund_additions[fund_additions["date"].notna()]

    payouts = df[df["particulars"].str.contains("Payout", na=False)][["posting_date", "debit"]].copy()
    payouts.columns = ["date", "amount"]
    quarterly = df[df["particulars"].str.contains("quarterly settlement", case=False, na=False)][["posting_date", "debit"]].copy()
    quarterly.columns = ["date", "amount"]

    inflows = pd.concat([payouts, quarterly], ignore_index=True)
    inflows = inflows[inflows["date"].notna()]

    if len(fund_additions) == 0:
        raise ValueError("No 'Funds added' entries found in Zerodha CSV.")

    return fund_additions, inflows


def parse_zerodha_ledger_xlsx(file_bytes: bytes):
    """Parse a Zerodha ledger XLSX file.

    The XLSX contains:
      - Row 7: ('Client ID', '<ACCT_ID>', ...)  — client ID in column C
      - Row 15: ('Particulars', 'Posting Date', 'Cost Center', 'Voucher Type', 'Debit', 'Credit', 'Net Balance')
      - Row 16+: data rows

    Returns:
        outflows  — DataFrame(date, amount) fund additions (negative = money invested)
        inflows   — DataFrame(date, amount) payouts + quarterly settlements
        client_id — str, e.g. "GZW478"
    """
    from datetime import datetime as _dt
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    # Extract client ID from first 15 rows
    client_id = ""
    for row in rows[:15]:
        if not row:
            continue
        for j, cell in enumerate(row):
            if cell is not None and str(cell).strip() == "Client ID":
                if j + 1 < len(row) and row[j + 1] is not None:
                    client_id = str(row[j + 1]).strip()
                break

    # Find header row containing "Particulars"
    header_idx = None
    for i, row in enumerate(rows):
        if row and any(c is not None and str(c).strip().lower() == "particulars" for c in row):
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Not a valid Zerodha ledger XLSX — 'Particulars' column not found.")

    headers = [str(c).strip().lower() if c is not None else "" for c in rows[header_idx]]
    try:
        particulars_col = headers.index("particulars")
        date_col        = headers.index("posting date")
        credit_col      = headers.index("credit")
        debit_col       = headers.index("debit")
    except ValueError as e:
        raise ValueError(f"Zerodha ledger XLSX missing expected column: {e}") from e

    fund_rows     = []
    payout_rows   = []
    quarterly_rows = []

    for row in rows[header_idx + 1:]:
        if not row or row[particulars_col] is None:
            continue
        particulars = str(row[particulars_col])
        date_val    = row[date_col]
        credit_val  = row[credit_col]
        debit_val   = row[debit_col]

        # Normalize date to YYYY-MM-DD string
        if isinstance(date_val, _dt):
            date_str = date_val.strftime("%Y-%m-%d")
        else:
            date_str = str(date_val).strip() if date_val is not None else ""
        if not date_str or date_str.lower() == "none":
            continue

        if "Funds added" in particulars:
            amt = float(credit_val or 0)
            if amt > 0:
                fund_rows.append({"date": date_str, "amount": -amt})
        elif "Payout" in particulars:
            amt = float(debit_val or 0)
            if amt > 0:
                payout_rows.append({"date": date_str, "amount": amt})
        elif "quarterly settlement" in particulars.lower():
            amt = float(debit_val or 0)
            if amt > 0:
                quarterly_rows.append({"date": date_str, "amount": amt})

    outflows = pd.DataFrame(fund_rows) if fund_rows else pd.DataFrame(columns=["date", "amount"])
    inflows  = pd.concat(
        [pd.DataFrame(payout_rows), pd.DataFrame(quarterly_rows)],
        ignore_index=True
    ) if payout_rows or quarterly_rows else pd.DataFrame(columns=["date", "amount"])

    if outflows.empty:
        raise ValueError("No 'Funds added' entries found in this file. Your ledger may not cover the period when you first added funds — try re-downloading with an earlier start date from Zerodha Console.")

    return outflows, inflows, client_id


def parse_zerodha_dividends_xlsx(file_bytes: bytes):
    """Parse a Zerodha dividend XLSX report.

    Returns:
        xirr_df   — DataFrame(date, amount) with positive inflow rows for XIRR
        details   — list of {"symbol": str, "amount": float} for PDF display
    """
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    # Find header row dynamically (contains "Ex-Date")
    header_idx = None
    for i, row in enumerate(rows):
        if row and any(str(c).strip() == "Ex-Date" for c in row if c is not None):
            header_idx = i
            break
    if header_idx is None:
        raise ValueError("Not a valid Zerodha dividend file — 'Ex-Date' column not found.")

    headers = [str(c).strip() if c is not None else "" for c in rows[header_idx]]
    try:
        date_col   = headers.index("Ex-Date")
        amt_col    = headers.index("Net Dividend Amount")
        symbol_col = headers.index("Symbol")
    except ValueError as e:
        raise ValueError(f"Zerodha dividend file missing expected column: {e}") from e

    today_str   = datetime.now().strftime("%Y-%m-%d")
    xirr_rows   = []
    detail_rows = []
    for row in rows[header_idx + 1:]:
        if not row or row[date_col] is None or row[amt_col] is None:
            continue
        try:
            dt  = str(row[date_col])[:10]   # YYYY-MM-DD
            amt = float(row[amt_col])
            sym = str(row[symbol_col]).strip() if row[symbol_col] else "Unknown"
            # Skip summary/total rows and future-dated entries (e.g. upcoming FY)
            if amt > 0 and dt <= today_str and "total" not in sym.lower():
                xirr_rows.append({"date": dt, "amount": amt})   # positive = inflow
                detail_rows.append({"symbol": sym, "amount": amt})
        except (ValueError, TypeError):
            continue

    xirr_df = pd.DataFrame(xirr_rows) if xirr_rows else pd.DataFrame(columns=["date", "amount"])
    return xirr_df, detail_rows


def parse_zerodha_mf_tradebook(file_bytes: bytes):
    """
    Parse a Zerodha MF Tradebook XLSX (one file per ≤365-day range).
    Returns (outflows_df, inflows_df) where:
      buy  → outflows  (amount = -(qty * price), negative)
      sell → inflows   (amount = +(qty * price), positive)
    Deduplicates rows by Trade ID to handle overlapping date-range files.
    """
    from io import BytesIO
    import openpyxl

    wb = openpyxl.load_workbook(BytesIO(file_bytes), data_only=True)
    ws = wb["Mutual Funds"] if "Mutual Funds" in wb.sheetnames else wb.active
    rows = list(ws.iter_rows(values_only=True))

    # Locate header row by finding "Trade Date" column
    header_idx = trade_date_col = trade_type_col = qty_col = price_col = trade_id_col = None
    for i, row in enumerate(rows[:20]):
        norm = [str(c).lower().strip() if c is not None else "" for c in row]
        if "trade date" in norm:
            header_idx    = i
            trade_date_col = norm.index("trade date")
            trade_type_col = norm.index("trade type") if "trade type" in norm else None
            qty_col        = norm.index("quantity")   if "quantity"   in norm else None
            price_col      = norm.index("price")      if "price"      in norm else None
            trade_id_col   = norm.index("trade id")   if "trade id"   in norm else None
            break

    if header_idx is None:
        return pd.DataFrame(columns=["date", "amount"]), pd.DataFrame(columns=["date", "amount"])

    outflow_rows, inflow_rows = [], []
    seen_ids: set = set()

    for row in rows[header_idx + 1:]:
        if not any(row):
            continue
        try:
            date_raw   = row[trade_date_col]   if trade_date_col  is not None else None
            ttype      = str(row[trade_type_col]).strip().lower() if trade_type_col is not None and row[trade_type_col] else ""
            qty        = float(row[qty_col])   if qty_col   is not None and row[qty_col]   else 0.0
            price      = float(row[price_col]) if price_col is not None and row[price_col] else 0.0
            trade_id   = str(row[trade_id_col]) if trade_id_col is not None and row[trade_id_col] else None

            if not date_raw or qty == 0 or price == 0:
                continue
            if trade_id:
                if trade_id in seen_ids:
                    continue          # cross-file duplicate
                seen_ids.add(trade_id)

            date_str = date_raw.strftime("%Y-%m-%d") if hasattr(date_raw, "strftime") else str(date_raw)[:10]
            amount   = qty * price

            if ttype == "buy":
                outflow_rows.append({"date": date_str, "amount": -amount})
            elif ttype == "sell":
                inflow_rows.append({"date": date_str, "amount": amount})
        except (ValueError, TypeError, IndexError):
            continue

    outflows = pd.DataFrame(outflow_rows) if outflow_rows else pd.DataFrame(columns=["date", "amount"])
    inflows  = pd.DataFrame(inflow_rows)  if inflow_rows  else pd.DataFrame(columns=["date", "amount"])
    return outflows, inflows


def parse_groww_pdf(file_bytes, password=None):
    all_deposits    = []
    all_withdrawals = []

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        with pdfplumber.open(tmp_path, password=password or "") as pdf:
            for page in pdf.pages:
                tables = page.extract_tables() or []
                for table in tables:
                    if len(table) < 2:
                        continue
                    header = table[0]
                    date_col = seg_col = credit_col = debit_col = None
                    for i, col in enumerate(header):
                        if col and "Transaction" in col and "Date" in col:
                            date_col = i
                        elif col and "Segment" in col and "Type" in col:
                            seg_col = i
                        elif col and "Credit" in col:
                            credit_col = i
                        elif col and "Debit" in col:
                            debit_col = i

                    if None in (date_col, seg_col, credit_col, debit_col):
                        continue

                    for row in table[1:]:
                        if len(row) <= max(date_col, seg_col, credit_col, debit_col):
                            continue
                        txn_date   = row[date_col]
                        seg_type   = row[seg_col]
                        credit_amt = row[credit_col]
                        debit_amt  = row[debit_col]

                        if not txn_date or not seg_type:
                            continue
                        try:
                            date_obj = datetime.strptime(txn_date.strip(), "%d/%m/%Y")
                            date_str = date_obj.strftime("%Y-%m-%d")
                        except Exception:
                            continue

                        # Deposit types: RAZORPAY_DEPOSIT, DIRECT_NETBANKING,
                        # GROWW_MANDATE, GROWW_UPI (all are real bank → broker transfers)
                        _DEPOSIT_KEYWORDS = ("DEPOSIT", "NETBANKING", "MANDATE", "UPI")
                        if any(k in seg_type.upper() for k in _DEPOSIT_KEYWORDS) and credit_amt:
                            try:
                                amt = float(credit_amt.replace(",", "").strip())
                                if amt > 0:
                                    all_deposits.append({"date": date_str, "amount": -amt})
                            except Exception:
                                pass

                        if "WITHDRAW" in seg_type.upper() and debit_amt:
                            try:
                                amt = float(debit_amt.replace(",", "").strip())
                                if amt > 0:
                                    all_withdrawals.append({"date": date_str, "amount": amt})
                            except Exception:
                                pass
    finally:
        os.unlink(tmp_path)

    outflows = pd.DataFrame(all_deposits) if all_deposits else pd.DataFrame(columns=["date", "amount"])
    inflows  = pd.DataFrame(all_withdrawals) if all_withdrawals else pd.DataFrame(columns=["date", "amount"])
    return outflows, inflows


def parse_fyers_csv(file_bytes):
    """
    Parse Fyers Ledger CSV (Reports → Ledger → select FY → Generate → Download CSV).

    Format: metadata header rows (Report Title, Date Range, Client Name, Client ID, PAN),
    summary rows, then the data table starting with:
      Date, Transaction type, Description, Debit amount, Credit amount, Running balance

    Outflows (investments) : "Funds added"    rows → Credit amount (negated)
    Inflows  (withdrawals) : "Funds withdrawn" rows → Debit amount
    Date format: "07 Feb 2025"
    """
    text = file_bytes.decode("utf-8-sig", errors="replace")
    lines = text.splitlines()

    # Find the data header row (contains both 'Transaction type' and 'Debit amount')
    header_row_idx = None
    for i, line in enumerate(lines):
        if "Transaction type" in line and "Debit amount" in line:
            header_row_idx = i
            break

    if header_row_idx is None:
        raise ValueError("Could not find data header in Fyers CSV — is this a valid Fyers Ledger file?")

    data_text = "\n".join(lines[header_row_idx:])
    df = pd.read_csv(io.StringIO(data_text))
    df.columns = [c.strip() for c in df.columns]

    required = ["Date", "Transaction type", "Debit amount", "Credit amount"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Fyers CSV missing columns: {missing}")

    df = df.dropna(subset=["Date"])
    df = df[df["Date"].astype(str).str.strip() != ""]

    outflows_list = []
    inflows_list  = []

    for _, row in df.iterrows():
        txn_type = str(row.get("Transaction type", "")).strip().lower()
        date_raw = str(row.get("Date", "")).strip()

        try:
            date_str = datetime.strptime(date_raw, "%d %b %Y").strftime("%Y-%m-%d")
        except Exception:
            continue

        if txn_type == "funds added":
            try:
                amt = float(str(row["Credit amount"]).replace(",", "").strip())
                if amt > 0:
                    outflows_list.append({"date": date_str, "amount": -amt})
            except (ValueError, TypeError):
                pass
        elif txn_type == "funds withdrawn":
            try:
                amt = float(str(row["Debit amount"]).replace(",", "").strip())
                if amt > 0:
                    inflows_list.append({"date": date_str, "amount": amt})
            except (ValueError, TypeError):
                pass

    outflows = pd.DataFrame(outflows_list) if outflows_list else pd.DataFrame(columns=["date", "amount"])
    inflows  = pd.DataFrame(inflows_list)  if inflows_list  else pd.DataFrame(columns=["date", "amount"])

    if len(outflows) == 0:
        raise ValueError("No 'Funds added' entries found in Fyers Ledger CSV.")

    return outflows, inflows


# ─────────────────────────────────────────────────────────────
# Nifty 50
# ─────────────────────────────────────────────────────────────
NIFTY_CACHE_KEY = "nifty50/history.json"

def fetch_nifty50_data(start_date, end_date, s3_client, jobs_bucket):
    """
    Read Nifty 50 history from the S3 daily cache (populated by nifty-refresher Lambda).
    Filters to the relevant date window for this user's investment period.
    """
    try:
        obj = s3_client.get_object(Bucket=jobs_bucket, Key=NIFTY_CACHE_KEY)
        records = json.loads(obj["Body"].read())
    except Exception as e:
        logger.warning("Could not read Nifty 50 cache from S3: %s", e)
        return None

    start = pd.to_datetime(start_date) - timedelta(days=10)
    end   = pd.to_datetime(end_date)   + timedelta(days=5)

    rows = [
        {"date": pd.to_datetime(r["date"]), "close": r["close"]}
        for r in records
        if start <= pd.to_datetime(r["date"]) <= end
    ]

    if not rows:
        logger.warning("Nifty 50 cache has no data for the requested date range")
        return None

    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    logger.info("Loaded %d Nifty 50 rows from S3 cache (%s → %s)",
                len(df), df.iloc[0]["date"].date(), df.iloc[-1]["date"].date())
    return df


def compute_nifty_stats(outflows, inflows, nifty_data):
    """
    Simulates investing the same cash flows into Nifty 50.
    Returns dict with xirr_percentage, current_value, units_held, current_price — or None on failure.
    """
    if nifty_data is None or nifty_data.empty:
        return None

    try:
        transactions = []
        for _, row in outflows.iterrows():
            transactions.append({"date": pd.to_datetime(row["date"]), "amount": row["amount"], "type": "inv"})
        for _, row in inflows.iterrows():
            transactions.append({"date": pd.to_datetime(row["date"]), "amount": row["amount"], "type": "wdw"})
        transactions.sort(key=lambda x: x["date"])

        total_units = 0.0

        def nearest_price(txn_date):
            exact = nifty_data[nifty_data["date"] == txn_date]
            if not exact.empty:
                return float(exact.iloc[0]["close"])
            future = nifty_data[nifty_data["date"] > txn_date]
            return float(future.iloc[0]["close"]) if not future.empty else float(nifty_data.iloc[-1]["close"])

        for t in transactions:
            price = nearest_price(t["date"])
            if price == 0:
                continue
            if t["type"] == "inv":
                total_units += abs(t["amount"]) / price
            else:
                cur_val = total_units * price
                if cur_val > 0:
                    pct = abs(t["amount"]) / cur_val
                    total_units -= total_units * pct
                    total_units = max(0, total_units)

        latest_price  = float(nifty_data.iloc[-1]["close"])
        current_value = total_units * latest_price

        cash_flows = list(outflows["amount"]) + list(inflows["amount"]) + [current_value]
        dates      = [pd.to_datetime(d) for d in outflows["date"]] + \
                     [pd.to_datetime(d) for d in inflows["date"]] + \
                     [datetime.now()]

        xirr_pct = calculate_xirr(cash_flows, dates) * 100

        return {
            "xirr_percentage": xirr_pct,
            "current_value":   current_value,
            "units_held":      total_units,
            "current_price":   latest_price,
        }
    except Exception as e:
        logger.warning("Nifty stats failed: %s", e)
        return None


def calculate_nifty_xirr(outflows, inflows, nifty_data):
    stats = compute_nifty_stats(outflows, inflows, nifty_data)
    return stats["xirr_percentage"] if stats else None


# ─────────────────────────────────────────────────────────────
# Portfolio stats
# ─────────────────────────────────────────────────────────────
def compute_portfolio_stats(outflows, inflows, current_value, nifty_data=None, dividend_cashflows=None):
    today = datetime.now()
    total_invested  = -outflows["amount"].sum() if len(outflows) else 0
    # total_withdrawn = broker withdrawals only (excludes dividends for clean display)
    total_withdrawn = inflows["amount"].sum() if len(inflows) else 0
    # dividend_total is tracked separately and added to net_gain
    has_dividends   = dividend_cashflows is not None and not dividend_cashflows.empty
    dividend_total  = float(dividend_cashflows["amount"].sum()) if has_dividends else 0.0
    net_gain        = current_value + total_withdrawn + dividend_total - total_invested
    simple_return   = (net_gain / total_invested * 100) if total_invested > 0 else 0

    # First investment date + period
    first_date = pd.to_datetime(outflows["date"]).min() if len(outflows) > 0 else None
    investment_period_days  = (today - first_date).days if first_date is not None else None
    investment_period_years = investment_period_days / 365.25 if investment_period_days else None

    n_investments = len(outflows)
    n_withdrawals = len(inflows)

    # XIRR uses broker inflows + dividend inflows together
    xirr_inflows = (
        pd.concat([inflows, dividend_cashflows], ignore_index=True)
        if has_dividends else inflows
    )
    cash_flows = list(outflows["amount"]) + list(xirr_inflows["amount"]) + [current_value]
    dates      = [pd.to_datetime(d) for d in outflows["date"]] + \
                 [pd.to_datetime(d) for d in xirr_inflows["date"]] + \
                 [today]

    xirr_pct = None
    try:
        xirr_pct = calculate_xirr(cash_flows, dates) * 100
    except Exception as e:
        logger.warning("XIRR failed: %s", e)

    nifty = compute_nifty_stats(outflows, inflows, nifty_data) if nifty_data is not None else None

    return {
        "total_invested":          total_invested,
        "total_withdrawn":         total_withdrawn,   # broker only
        "dividend_total":          dividend_total,    # dividend income (separate from withdrawals)
        "current_value":           current_value,
        "net_gain":                net_gain,          # broker + dividends
        "simple_return":           simple_return,
        "xirr_percentage":         xirr_pct,
        "nifty_xirr_percentage":   nifty["xirr_percentage"]   if nifty else None,
        "nifty_current_value":     nifty["current_value"]     if nifty else None,
        "nifty_units_held":        nifty["units_held"]        if nifty else None,
        "nifty_current_price":     nifty["current_price"]     if nifty else None,
        "first_investment_date":   first_date.strftime("%B %d, %Y") if first_date is not None else None,
        "investment_period_days":  investment_period_days,
        "investment_period_years": investment_period_years,
        "n_investments":           n_investments,
        "n_withdrawals":           n_withdrawals,
    }


# ─────────────────────────────────────────────────────────────
# PDF report generation
# ─────────────────────────────────────────────────────────────
# PDF helpers
# ─────────────────────────────────────────────────────────────
def _fmt_inr(val):
    """Indian number format: -98,72,027.57  (no currency prefix — keeps columns narrow)"""
    if val is None:
        return "N/A"
    s = f"{abs(val):.2f}"
    integer, decimal = s.split(".")
    rev = integer[::-1]
    parts = []
    for i, ch in enumerate(rev):
        if i == 3 and i < len(rev):
            parts.append(",")
        elif i > 3 and (i - 3) % 2 == 0 and i < len(rev):
            parts.append(",")
        parts.append(ch)
    formatted = "".join(parts)[::-1] + "." + decimal
    return ("-" if val < 0 else "") + formatted


def _base_table_style(header_bg, num_cols=2):
    """Base TableStyle: coloured header, alternating rows, right-align value columns."""
    style = [
        # Header
        ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor(header_bg)),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 9),
        ("TOPPADDING",    (0, 0), (-1, 0), 9),
        # Body
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 7),
        ("TOPPADDING",    (0, 1), (-1, -1), 7),
        # Grid
        ("LINEBELOW",     (0, 0), (-1, 0), 1,   colors.HexColor("#f59e0b")),
        ("INNERGRID",     (0, 1), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        # Padding
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        # Right-align all non-first columns (numeric data)
        ("ALIGN",         (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN",         (0, 0), (0, -1),  "LEFT"),
    ]
    return TableStyle(style)


def _kpi_cell(label, value, sublabel, bg, value_color="#f59e0b", label_color="#94a3b8"):
    """Single KPI banner cell with stacked label / big value / sublabel."""
    return Paragraph(
        f'<font name="Helvetica" size="8" color="{label_color}">{label}</font><br/>'
        f'<font name="Helvetica-Bold" size="20" color="{value_color}">{value}</font><br/>'
        f'<font name="Helvetica" size="8" color="{label_color}">{sublabel}</font>',
        ParagraphStyle("KPI", alignment=TA_CENTER, leading=22,
                       backColor=colors.HexColor(bg), borderPadding=(14, 8, 14, 8))
    )


class _WatermarkCanvas(rl_canvas.Canvas):
    """Custom canvas: draws watermark AFTER page content so it appears in the foreground."""
    def showPage(self):
        self.saveState()
        w, h = A4
        self.setFont("Helvetica-Bold", 52)
        self.setFillColor(colors.HexColor("#0f172a"), alpha=0.06)
        self.translate(w / 2, h / 2)
        self.rotate(40)
        self.drawCentredString(0, 0, "xirrledger.com")
        self.restoreState()
        super().showPage()


def generate_pdf_report(individual_stats, combined_stats, user_name, manual_entries=None):
    buf = io.BytesIO()
    ML, MR = 36, 36
    page_w = A4[0] - ML - MR   # usable width ≈ 523 pt

    doc = SimpleDocTemplate(buf, pagesize=A4,
                            rightMargin=MR, leftMargin=ML,
                            topMargin=32, bottomMargin=24)
    styles = getSampleStyleSheet()

    # ── Shared paragraph styles ───────────────────────────────
    title_s = ParagraphStyle("T", fontSize=22, fontName="Helvetica-Bold",
                              textColor=colors.HexColor("#f59e0b"),
                              alignment=TA_CENTER, spaceAfter=16)
    sub_s   = ParagraphStyle("S", fontSize=9,  fontName="Helvetica",
                              textColor=colors.HexColor("#64748b"),
                              alignment=TA_CENTER, spaceAfter=8)
    h2_s    = ParagraphStyle("H2", fontSize=12, fontName="Helvetica-Bold",
                              textColor=colors.HexColor("#f59e0b"),
                              spaceBefore=14, spaceAfter=6)
    note_s  = ParagraphStyle("N", fontSize=7.5, fontName="Helvetica",
                              textColor=colors.HexColor("#64748b"),
                              spaceBefore=4, spaceAfter=2)
    acct_h_s = ParagraphStyle("AH", fontSize=10, fontName="Helvetica-Bold",
                               textColor=colors.HexColor("#f59e0b"),
                               spaceBefore=12, spaceAfter=4)
    footer_s = ParagraphStyle("F", fontSize=7.5, fontName="Helvetica",
                               textColor=colors.HexColor("#64748b"),
                               alignment=TA_CENTER, spaceBefore=18)

    elements = []
    cs = combined_stats

    # ── Page title ────────────────────────────────────────────
    elements.append(Paragraph("XIRR Ledger Report", title_s))
    elements.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}  |  "
        f"Prepared for: <b>{user_name}</b>",
        sub_s
    ))
    elements.append(HRFlowable(width="100%", thickness=1.5,
                                color=colors.HexColor("#f59e0b"),
                                spaceBefore=6, spaceAfter=16))

    # ── KPI Banner (3 boxes) ──────────────────────────────────
    xirr_v   = f"{cs['xirr_percentage']:.2f}%"       if cs.get("xirr_percentage")      is not None else "N/A"
    nifty_v  = f"{cs['nifty_xirr_percentage']:.2f}%" if cs.get("nifty_xirr_percentage") is not None else "N/A"

    has_xirr  = cs.get("xirr_percentage") is not None
    has_nifty = cs.get("nifty_xirr_percentage") is not None
    if has_xirr and has_nifty:
        diff     = cs["xirr_percentage"] - cs["nifty_xirr_percentage"]
        beat_v   = f"+{diff:.2f}%" if diff > 0 else f"{diff:.2f}%"
        beat_lbl = "vs Nifty 50"
        kpi3_bg  = "#1b5e20" if diff > 0 else "#b71c1c"
    else:
        beat_v   = "N/A"
        beat_lbl = "Nifty data unavailable" if not has_nifty else "XIRR unavailable"
        kpi3_bg  = "#37474f"

    kpi_row = [[
        _kpi_cell("YOUR XIRR",     xirr_v,  "annualised return", "#0f172a"),
        _kpi_cell("NIFTY 50 XIRR", nifty_v, "benchmark return",  "#1e293b"),
        _kpi_cell("PERFORMANCE",   beat_v,  beat_lbl,             kpi3_bg,  value_color="#ffffff", label_color="#ffffff"),
    ]]
    cw = page_w / 3
    kpi_t = Table(kpi_row, colWidths=[cw, cw, cw], spaceBefore=0,
                  style=TableStyle([
                      ("BACKGROUND",    (0, 0), (0, 0), colors.HexColor("#0f172a")),
                      ("BACKGROUND",    (1, 0), (1, 0), colors.HexColor("#1e293b")),
                      ("BACKGROUND",    (2, 0), (2, 0), colors.HexColor(kpi3_bg)),
                      ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
                      ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
                      ("TOPPADDING",    (0, 0), (-1, -1), 16),
                      ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
                      ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                      ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
                      ("LINEAFTER",     (0, 0), (1, 0), 2, colors.HexColor("#f59e0b")),
                  ]))
    elements.append(kpi_t)
    elements.append(Spacer(1, 14))

    # ── Portfolio Summary ─────────────────────────────────────
    elements.append(Paragraph("Portfolio Summary", h2_s))

    period_str = "N/A"
    if cs.get("investment_period_days") and cs.get("investment_period_years"):
        period_str = f"{cs['investment_period_days']} days  ({cs['investment_period_years']:.2f} years)"
    txn_str = (f"{cs.get('n_investments', 0)} investments,  "
               f"{cs.get('n_withdrawals', 0)} withdrawals")

    gain_bg = colors.HexColor("#d1fae5") if (cs.get("net_gain") or 0) >= 0 else colors.HexColor("#fee2e2")

    summary_rows = [
        ["Metric",                  "Value"],
        ["First Investment Date",   cs.get("first_investment_date") or "N/A"],
        ["Investment Period",        period_str],
        ["Total Transactions",       txn_str],
        ["Total Invested",           _fmt_inr(cs["total_invested"])],
        ["Total Withdrawn",          _fmt_inr(cs["total_withdrawn"])],
        ["Current Portfolio Value",  _fmt_inr(cs["current_value"])],
        ["Net Gain / Loss",          _fmt_inr(cs["net_gain"])],     # row 7
        ["XIRR (Annualised)",        xirr_v],                       # row 8
    ]
    st = Table(summary_rows, colWidths=[page_w * 0.56, page_w * 0.44])
    st.setStyle(_base_table_style("#0f172a"))
    st.setStyle(TableStyle([
        ("BACKGROUND",  (0, 7), (-1, 7), gain_bg),          # Net Gain row (index 7)
        ("FONTNAME",    (1, 7), (1, 7),  "Helvetica-Bold"),  # bold value
        ("FONTNAME",    (1, 8), (1, 8),  "Helvetica-Bold"),  # bold XIRR value
        ("FONTSIZE",    (1, 8), (1, 8),  10),
        ("TEXTCOLOR",   (1, 8), (1, 8),  colors.HexColor("#f59e0b")),
    ]))
    elements.append(st)

    # ── Manual entries note ───────────────────────────────────
    if manual_entries:
        valid_entries = [me for me in manual_entries if me.get("amount") and me.get("date")]
        if valid_entries:
            total_manual = sum(float(me["amount"]) for me in valid_entries)
            lines = "  ".join(
                f"{me.get('label', 'Investment')} — ₹{float(me['amount']):,.0f} on {me['date']}"
                for me in valid_entries
            )
            elements.append(Paragraph(
                f"Includes {len(valid_entries)} outside investment(s) totalling ₹{total_manual:,.0f} "
                f"not tracked by the broker:  {lines}",
                note_s
            ))

    # ── Nifty 50 Benchmark Comparison ─────────────────────────
    elements.append(Paragraph("Nifty 50 Benchmark Comparison", h2_s))

    nifty_xirr_str  = f"{cs['nifty_xirr_percentage']:.2f}%" if has_nifty else "N/A"
    nifty_val_str   = _fmt_inr(cs.get("nifty_current_value"))
    nifty_units_str = f"{cs['nifty_units_held']:.2f}"        if cs.get("nifty_units_held") else "N/A"
    nifty_price_str = _fmt_inr(cs.get("nifty_current_price"))

    if has_nifty:
        perf_str     = f"BEAT BY {diff:.2f}%" if diff > 0 else f"UNDERPERFORMED BY {abs(diff):.2f}%"
        val_diff_str = _fmt_inr(cs["current_value"] - cs["nifty_current_value"])
        perf_bg      = colors.HexColor("#d1fae5") if diff > 0 else colors.HexColor("#fee2e2")
        perf_txt_col = colors.HexColor("#065f46") if diff > 0 else colors.HexColor("#991b1b")
    else:
        perf_str     = "Nifty data unavailable"
        val_diff_str = "N/A"
        perf_bg      = colors.HexColor("#f5f5f5")
        perf_txt_col = colors.HexColor("#888888")

    col_a = page_w * 0.38
    col_b = page_w * 0.31
    col_c = page_w * 0.31

    nifty_rows = [
        ["Metric",                 "Your Portfolio",       "Nifty 50"],
        ["Current Value",          _fmt_inr(cs["current_value"]), nifty_val_str],
        ["XIRR (Annualised)",      xirr_v,                 nifty_xirr_str],
        ["Performance vs Nifty 50", perf_str,              ""],
        ["Value Difference",       val_diff_str,           "—"],
        ["Nifty 50 Units Held",    "—",                    nifty_units_str],
        ["Current Nifty 50 Price", "—",                    nifty_price_str],
    ]
    nt = Table(nifty_rows, colWidths=[col_a, col_b, col_c])
    nt.setStyle(_base_table_style("#0f172a", num_cols=3))
    nt.setStyle(TableStyle([
        ("SPAN",       (1, 3), (2, 3)),                     # performance spans both value cols
        ("BACKGROUND", (0, 3), (-1, 3), perf_bg),
        ("TEXTCOLOR",  (1, 3), (2, 3),  perf_txt_col),
        ("FONTNAME",   (1, 3), (2, 3),  "Helvetica-Bold"),
        ("ALIGN",      (1, 3), (2, 3),  "CENTER"),
        ("FONTNAME",   (1, 2), (2, 2),  "Helvetica-Bold"),  # bold XIRR row
        ("FONTSIZE",   (1, 2), (2, 2),  10),
    ]))
    elements.append(nt)
    elements.append(Paragraph(
        "Note: Nifty 50 comparison simulates investing the same amounts on the same dates "
        "in the Nifty 50 index. Withdrawals are proportionally accounted for.",
        note_s
    ))

    # ── Page break before insight + account section ───────────
    if has_nifty or len(individual_stats) >= 1:
        elements.append(PageBreak())

    # ── Insight Card ──────────────────────────────────────────
    if has_nifty:
        period_yrs = cs.get("investment_period_years") or 0
        if diff > 0:
            tag           = "OUTPERFORMING"
            insight_title = f"Beating Nifty 50 by {diff:.2f}%"
            insight_body  = ("Your portfolio is outperforming the benchmark that beats most "
                             "professional fund managers. Keep it up!")
            card_bg       = "#0b2418"
            card_border   = "#10b981"
            tag_color     = "#10b981"
            body_color    = "#6ee7b7"
        elif period_yrs < 5:
            tag           = "KEEP GOING"
            insight_title = "Keep building your skills!"
            insight_body  = (f"You are {period_yrs:.1f} years into your investing journey. "
                             "Nifty 50 is a tough benchmark — many investors only start "
                             "beating it after 5+ years of experience. Stay consistent!")
            card_bg       = "#1c1400"
            card_border   = "#f59e0b"
            tag_color     = "#f59e0b"
            body_color    = "#fcd34d"
        else:
            tag           = "UNDERPERFORMING"
            insight_title = "Consider shifting to index funds"
            insight_body  = (f"After {period_yrs:.1f} years, Nifty 50 has consistently "
                             f"outperformed your portfolio by {abs(diff):.2f}%. Index funds "
                             "match the market automatically — it may be the smarter long-term move.")
            card_bg       = "#1a0a0a"
            card_border   = "#ef4444"
            tag_color     = "#ef4444"
            body_color    = "#fca5a5"

        tag_s   = ParagraphStyle("ITAG", fontSize=7,   fontName="Helvetica-Bold",
                                  textColor=colors.HexColor(tag_color),
                                  spaceBefore=0, spaceAfter=3)
        title_i = ParagraphStyle("ITIT", fontSize=10,  fontName="Helvetica-Bold",
                                  textColor=colors.HexColor(tag_color),
                                  spaceBefore=0, spaceAfter=4)
        body_i  = ParagraphStyle("IBOD", fontSize=8.5, fontName="Helvetica",
                                  textColor=colors.HexColor(body_color),
                                  spaceBefore=0, spaceAfter=0, leading=12)
        card_t = Table([[
            [Paragraph(tag, tag_s), Paragraph(insight_title, title_i), Paragraph(insight_body, body_i)]
        ]], colWidths=[page_w])
        card_t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor(card_bg)),
            ("BOX",           (0, 0), (-1, -1), 1.5, colors.HexColor(card_border)),
            ("LEFTPADDING",   (0, 0), (-1, -1), 14),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 14),
            ("TOPPADDING",    (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ]))
        elements.append(Spacer(1, 10))
        elements.append(card_t)

    # ── Individual Account Analysis ───────────────────────────
    if len(individual_stats) >= 1:
        elements.append(Paragraph(
            "Individual Account Analysis" if len(individual_stats) > 1 else "Account Detail",
            h2_s
        ))

        if len(individual_stats) > 1:
            # ── Portfolio Composition Charts (stacked) ────────────
            SLICE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4"]
            total_inv = combined_stats["total_invested"] or 1
            pie_vals  = [max(s["total_invested"], 0) for s in individual_stats]
            pie_names = [s.get("account_name", "Account") for s in individual_stats]
            pie_pcts  = [v / total_inv * 100 for v in pie_vals]
            gain_vals = [round(s.get("net_gain") or 0, 2) for s in individual_stats]

            n = len(individual_stats)

            # ── Pie chart (full width, pie left + legend right) ────
            pie_h  = 180
            pie_r  = 70
            pie_cx = pie_r + 20
            pie_cy = pie_h / 2

            pie_d = Drawing(page_w, pie_h)
            pie_d.add(GStr(page_w / 2, pie_h - 14, "Capital Distribution",
                           fontName="Helvetica-Bold", fontSize=9,
                           textAnchor="middle", fillColor=colors.HexColor("#f59e0b")))

            pc = Pie()
            pc.x      = pie_cx - pie_r
            pc.y      = pie_cy - pie_r
            pc.width  = pie_r * 2
            pc.height = pie_r * 2
            pc.data   = [max(v, 0.001) for v in pie_vals]
            pc.labels = [""] * len(pie_vals)
            pc.slices.strokeColor = colors.HexColor("#ffffff")
            pc.slices.strokeWidth = 1.5
            for i, col in enumerate(SLICE_COLORS[:n]):
                pc.slices[i].fillColor = colors.HexColor(col)
            pie_d.add(pc)

            # Legend to the right of the pie
            lx    = pie_cx + pie_r + 24
            ly    = pie_cy + (n * 18) / 2   # vertically centred
            for i, (name, pct) in enumerate(zip(pie_names, pie_pcts)):
                col   = SLICE_COLORS[i % len(SLICE_COLORS)]
                y_pos = ly - i * 20
                pie_d.add(Rect(lx, y_pos - 6, 10, 10,
                               fillColor=colors.HexColor(col), strokeColor=None))
                pie_d.add(GStr(lx + 16, y_pos,
                               f"{name}  {pct:.1f}%",
                               fontName="Helvetica", fontSize=8,
                               fillColor=colors.HexColor("#0f172a")))

            elements.append(pie_d)
            elements.append(Spacer(1, 4))

            # ── Bar chart (full width) ─────────────────────────────
            bar_h = 180
            bar_d = Drawing(page_w, bar_h)
            bar_d.add(GStr(page_w / 2, bar_h - 14, "Profit / Loss by Account",
                           fontName="Helvetica-Bold", fontSize=9,
                           textAnchor="middle", fillColor=colors.HexColor("#f59e0b")))

            bc = VerticalBarChart()
            bc.x      = 52
            bc.y      = 30
            bc.width  = page_w - 68
            bc.height = bar_h - 52

            bc.data = [gain_vals]

            padding = max(abs(v) for v in gain_vals) * 0.15 or 10000
            y_min   = min(0, min(gain_vals)) - padding
            y_max   = max(0, max(gain_vals)) + padding

            def _lakh_fmt(v):
                if v == 0:
                    return "0"
                l    = v / 100000
                sign = "+" if l > 0 else ""
                return f"{sign}{l:.1f}L"

            bc.valueAxis.valueMin         = y_min
            bc.valueAxis.valueMax         = y_max
            bc.valueAxis.valueSteps       = None
            bc.valueAxis.labelTextFormat  = _lakh_fmt
            bc.valueAxis.labels.fontSize  = 7
            bc.valueAxis.labels.fontName  = "Helvetica"
            bc.valueAxis.labels.fillColor = colors.HexColor("#64748b")
            bc.valueAxis.strokeColor      = colors.HexColor("#cbd5e1")
            bc.valueAxis.gridStrokeColor  = colors.HexColor("#e2e8f0")

            short_names = []
            for s in individual_stats:
                name = s.get("account_name", "Account")
                short_names.append(name.split("(")[1].rstrip(")") if "(" in name else name[:10])
            bc.categoryAxis.categoryNames    = short_names
            bc.categoryAxis.labels.fontSize  = 8
            bc.categoryAxis.labels.fontName  = "Helvetica"
            bc.categoryAxis.labels.fillColor = colors.HexColor("#0f172a")
            bc.categoryAxis.strokeColor      = colors.HexColor("#cbd5e1")

            bc.groupSpacing     = 16
            bc.barSpacing       = 2
            bc.bars.strokeColor = None
            for i, col in enumerate(SLICE_COLORS[:n]):
                bc.bars[0, i].fillColor = colors.HexColor(col)

            bar_d.add(bc)
            elements.append(bar_d)
            elements.append(Spacer(1, 8))

        # ── Per-account tables (always, even for single account) ──
        for stats in individual_stats:
            acc_xirr   = f"{stats['xirr_percentage']:.2f}%" if stats.get("xirr_percentage") is not None else "N/A"
            acc_period = "N/A"
            if stats.get("investment_period_days") and stats.get("investment_period_years"):
                acc_period = (f"{stats['investment_period_days']} days  "
                              f"({stats['investment_period_years']:.2f} years)")
            acc_txn = (f"{stats.get('n_investments', 0)} investments,  "
                       f"{stats.get('n_withdrawals', 0)} withdrawals")
            acc_gain_bg = colors.HexColor("#d1fae5") if (stats.get("net_gain") or 0) >= 0 \
                          else colors.HexColor("#fee2e2")

            # MF / stocks breakdown
            mf_invested  = stats.get("mf_invested", 0.0)
            mf_redeemed  = stats.get("mf_redeemed", 0.0)
            trade_type   = stats.get("trade_type", "stocks")
            has_mf_split = mf_invested > 0 and trade_type in ("mf", "both")
            stocks_invested  = max(stats["total_invested"]  - mf_invested,  0) if has_mf_split else 0
            stocks_withdrawn = max(stats["total_withdrawn"] - mf_redeemed,  0) if has_mf_split else 0

            # Find manual entries linked to this account
            acc_id = stats.get("account_id", "")
            logger.info("PDF: account=%r  acc_id=%r  manual_entries=%r",
                        stats.get("account_name"), acc_id, manual_entries)
            linked_manual = [
                me for me in (manual_entries or [])
                if acc_id and me.get("account_id") == acc_id
                and me.get("amount") and me.get("date")
            ]
            logger.info("PDF: linked_manual count=%d", len(linked_manual))
            manual_total    = sum(float(me["amount"]) for me in linked_manual) if linked_manual else 0
            broker_invested = stats["total_invested"] - manual_total

            # Dividend income: use stats["dividend_total"] (set by compute_portfolio_stats)
            total_div = stats.get("dividend_total", 0.0)

            # Row layout (0-indexed):
            # 0  header
            # Build rows dynamically — row indices computed at runtime for styling
            elements.append(Paragraph(stats.get("account_name", "Account"), acct_h_s))
            rows = [
                ["Metric",            "Value"],
                ["Investment Period",  acc_period],
                ["Total Transactions", acc_txn],
                ["Total Invested",     _fmt_inr(stats["total_invested"])],
            ]
            sub_style_rows = []  # list of (row_idx, label_color_hex, bg_color_hex)

            # MF + Stocks invested sub-rows (only when MF tradebook was uploaded)
            if has_mf_split:
                rows.append(["└ Stocks", _fmt_inr(stocks_invested)])
                sub_style_rows.append((len(rows) - 1, "#475569", "#f1f5f9"))
                rows.append(["└ Mutual Funds", _fmt_inr(mf_invested)])
                sub_style_rows.append((len(rows) - 1, "#475569", "#f1f5f9"))
            # Outside investment sub-rows
            if linked_manual:
                rows.append(["└ Broker transactions", _fmt_inr(broker_invested)])
                sub_style_rows.append((len(rows) - 1, "#64748b", "#eef2f7"))
                rows.append(["└ Outside investments", _fmt_inr(manual_total)])
                sub_style_rows.append((len(rows) - 1, "#64748b", "#eef2f7"))

            rows.append(["Total Withdrawn",    _fmt_inr(stats["total_withdrawn"])])
            # MF + Stocks withdrawn sub-rows
            if has_mf_split:
                rows.append(["└ Stocks withdrawn", _fmt_inr(stocks_withdrawn)])
                sub_style_rows.append((len(rows) - 1, "#475569", "#f1f5f9"))
                rows.append(["└ MF Redeemed", _fmt_inr(mf_redeemed)])
                sub_style_rows.append((len(rows) - 1, "#475569", "#f1f5f9"))

            rows.append(["Current Value",      _fmt_inr(stats["current_value"])])
            div_present = total_div > 0
            div_row_idx = None
            if div_present:
                div_row_idx = len(rows)
                rows.append(["Dividend Income", _fmt_inr(total_div)])
            gain_idx = len(rows)
            rows.append(["Net Gain / Loss",    _fmt_inr(stats["net_gain"])])
            xirr_idx = len(rows)
            rows.append(["XIRR (Annualised)",  acc_xirr])

            at = Table(rows, colWidths=[page_w * 0.56, page_w * 0.44])
            at.setStyle(_base_table_style("#1e293b"))
            style_cmds = [
                ("BACKGROUND", (0, gain_idx), (-1, gain_idx), acc_gain_bg),
                ("FONTNAME",   (1, gain_idx), (1, gain_idx),  "Helvetica-Bold"),
                ("FONTNAME",   (1, xirr_idx), (1, xirr_idx),  "Helvetica-Bold"),
                ("FONTSIZE",   (1, xirr_idx), (1, xirr_idx),  10),
                ("TEXTCOLOR",  (1, xirr_idx), (1, xirr_idx),  colors.HexColor("#f59e0b")),
            ]
            if div_row_idx is not None:
                style_cmds.extend([
                    ("TEXTCOLOR", (1, div_row_idx), (1, div_row_idx), colors.HexColor("#f59e0b")),
                    ("FONTNAME",  (1, div_row_idx), (1, div_row_idx), "Helvetica-Bold"),
                ])
            for r_idx, lbl_hex, bg_hex in sub_style_rows:
                style_cmds.extend([
                    ("BACKGROUND",  (0, r_idx), (-1, r_idx), colors.HexColor(bg_hex)),
                    ("FONTSIZE",    (0, r_idx), (-1, r_idx), 8),
                    ("TEXTCOLOR",   (0, r_idx), (0,  r_idx), colors.HexColor(lbl_hex)),
                    ("TEXTCOLOR",   (1, r_idx), (1,  r_idx), colors.HexColor(lbl_hex)),
                    ("LEFTPADDING", (0, r_idx), (0,  r_idx), 26),
                ])
            at.setStyle(TableStyle(style_cmds))
            elements.append(at)

            if linked_manual:
                entries_note = "  \u2022  ".join(
                    f"{me.get('label', 'Investment')} \u2014 \u20b9{float(me['amount']):,.0f} on {me['date']}"
                    for me in linked_manual
                )
                elements.append(Paragraph(
                    f"Outside investments linked to this account:  {entries_note}",
                    note_s
                ))
            if total_div > 0:
                elements.append(Paragraph(
                    "Dividend income is included in Net Gain / Loss and in the XIRR calculation.",
                    note_s
                ))

            elements.append(Spacer(1, 10))

        # ── Account Comparison (multi-account only) ────────────
        if len(individual_stats) > 1:
            elements.append(Paragraph("Account Comparison", h2_s))
            cmp_rows = [["Account", "Invested", "Withdrawn", "Current Value", "Gain / Loss"]]
            for stats in individual_stats:
                cmp_rows.append([
                    stats.get("account_name", "Account"),
                    _fmt_inr(stats["total_invested"]),
                    _fmt_inr(stats["total_withdrawn"]),
                    _fmt_inr(stats["current_value"]),
                    _fmt_inr(stats["net_gain"]),
                ])
            last = len(cmp_rows)  # combined row will be at this index
            cmp_rows.append([
                "COMBINED",
                _fmt_inr(combined_stats["total_invested"]),
                _fmt_inr(combined_stats["total_withdrawn"]),
                _fmt_inr(combined_stats["current_value"]),
                _fmt_inr(combined_stats["net_gain"]),
            ])
            cw5 = page_w / 5
            cmt = Table(cmp_rows, colWidths=[cw5 * 1.5, cw5 * 0.875, cw5 * 0.875, cw5 * 0.875, cw5 * 0.875])
            cmt.setStyle(_base_table_style("#0f172a", num_cols=5))
            cmt.setStyle(TableStyle([
                ("BACKGROUND", (0, last), (-1, last), colors.HexColor("#0f172a")),
                ("TEXTCOLOR",  (0, last), (-1, last), colors.HexColor("#f59e0b")),
                ("FONTNAME",   (0, last), (-1, last), "Helvetica-Bold"),
                ("LINEABOVE",  (0, last), (-1, last), 1.5, colors.HexColor("#f59e0b")),
            ]))
            elements.append(cmt)

    # ── Footer ────────────────────────────────────────────────
    elements.append(Paragraph(
        "Generated by XIRR Ledger — https://xirrledger.com  |  All monetary values in INR",
        footer_s
    ))

    doc.build(elements, canvasmaker=_WatermarkCanvas)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────
# Email via SES
# ─────────────────────────────────────────────────────────────
def send_report_email(name, email, stats, report_url):
    try:
        xirr_val  = stats.get("xirr")
        nifty_val = stats.get("nifty_xirr")
        xirr  = f"{xirr_val:.2f}"  if xirr_val  is not None else "N/A"
        nifty = f"{nifty_val:.2f}" if nifty_val is not None else "N/A"

        # ── vs Nifty ──────────────────────────────────────────
        diff = (xirr_val - nifty_val) if (xirr_val is not None and nifty_val is not None) else None
        if diff is not None and diff > 0:
            vs_nifty        = f"Beat Nifty 50 by {diff:.2f}%"
            vs_nifty_color  = "#10b981"
            vs_nifty_bg     = "#0b2418"
            vs_nifty_border = "#10b981"
        elif diff is not None:
            vs_nifty        = f"Missed Nifty 50 by {abs(diff):.2f}%"
            vs_nifty_color  = "#f59e0b"
            vs_nifty_bg     = "#1c1400"
            vs_nifty_border = "#f59e0b"
        else:
            vs_nifty        = "N/A"
            vs_nifty_color  = "#64748b"
            vs_nifty_bg     = "#1e293b"
            vs_nifty_border = "#334155"

        # ── Format INR (Indian grouping, ₹ prefix, no decimals) ──
        def _e_inr(val):
            s = str(round(abs(float(val or 0))))
            if len(s) <= 3:
                return f"\u20b9{s}"
            result, s = s[-3:], s[:-3]
            while s:
                result, s = s[-2:] + "," + result, s[:-2]
            return f"\u20b9{result}"

        total_invested = _e_inr(stats.get("total_invested", 0))
        current_value  = _e_inr(stats.get("current_value",  0))
        net_gain_val   = stats.get("net_gain", 0)
        net_gain       = ("+" if net_gain_val >= 0 else "-") + _e_inr(net_gain_val)
        net_gain_color = "#10b981" if net_gain_val >= 0 else "#ef4444"

        # ── Investment period ─────────────────────────────────
        years = stats.get("investment_period_years")
        if years:
            y, m = int(years), round((years - int(years)) * 12)
            period = (f"{m}mo" if y == 0 else f"{y}yr" if m == 0 else f"{y}yr {m}mo")
        else:
            period = "N/A"

        # ── Insight card ──────────────────────────────────────
        period_yrs = years or 0
        if xirr_val is not None and nifty_val is not None:
            if xirr_val >= nifty_val:
                suffix = (f" \u2014 {int(period_yrs)} years of disciplined investing is paying off"
                          if period_yrs >= 5 else "")
                insight_icon        = "\U0001f3c6"   # 🏆
                insight_title       = f"You beat Nifty 50 by {diff:.2f}%!"
                insight_body        = (f"Congratulations{suffix}! You're outperforming the benchmark "
                                       "that beats most professional fund managers. Keep it up!")
                insight_bg          = "#0b2418"
                insight_border      = "#10b981"
                insight_title_color = "#10b981"
                insight_body_color  = "#6ee7b7"
            elif period_yrs < 5:
                insight_icon        = "\U0001f4aa"   # 💪
                insight_title       = "Keep building your skills!"
                insight_body        = (f"You're {period} into your investing journey. Nifty 50 is a tough "
                                       "benchmark \u2014 many investors only start beating it after 5+ years "
                                       "of experience. Stay consistent!")
                insight_bg          = "#1c1400"
                insight_border      = "#f59e0b"
                insight_title_color = "#f59e0b"
                insight_body_color  = "#fcd34d"
            else:
                insight_icon        = "\U0001f4c8"   # 📈
                insight_title       = "Consider shifting to index funds."
                insight_body        = (f"After {period}, Nifty 50 has consistently outperformed your "
                                       f"portfolio by {abs(diff):.2f}%. Index funds match the market "
                                       "automatically \u2014 it may be the smarter long-term move.")
                insight_bg          = "#1a0a0a"
                insight_border      = "#ef4444"
                insight_title_color = "#ef4444"
                insight_body_color  = "#fca5a5"
        else:
            insight_icon        = "\u2139\ufe0f"  # ℹ️
            insight_title       = "Analysis complete."
            insight_body        = "Open your PDF report for the full breakdown."
            insight_bg          = "#1e293b"
            insight_border      = "#1e3a5f"
            insight_title_color = "#94a3b8"
            insight_body_color  = "#64748b"

        ses.send_templated_email(
            Source=f"XIRR Ledger <{SES_FROM_EMAIL}>",
            Destination={"ToAddresses": [email]},
            Template="xirrledger-report-ready",
            TemplateData=json.dumps({
                "name":               name,
                "xirr":               xirr,
                "nifty_xirr":         nifty,
                "vs_nifty":           vs_nifty,
                "vs_nifty_color":     vs_nifty_color,
                "vs_nifty_bg":        vs_nifty_bg,
                "vs_nifty_border":    vs_nifty_border,
                "report_url":         report_url,
                "total_invested":     total_invested,
                "current_value":      current_value,
                "net_gain":           net_gain,
                "net_gain_color":     net_gain_color,
                "investment_period":  period,
                "insight_icon":       insight_icon,
                "insight_title":      insight_title,
                "insight_body":       insight_body,
                "insight_bg":         insight_bg,
                "insight_border":     insight_border,
                "insight_title_color": insight_title_color,
                "insight_body_color":  insight_body_color,
            }),
        )
        logger.info("Email sent to %s", email)
    except Exception as e:
        logger.warning("Email send failed: %s", e)
