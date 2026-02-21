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
        "broker": "zerodha" | "groww",
        "pan": str | None,
        "pan_password": str | None,   # for Groww PDFs
        "file_keys": [str],           # S3 keys in uploads bucket
        "holdings": float,
        "cash": float
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

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ses = boto3.client("ses", region_name=os.environ.get("AWS_REGION_NAME", "ap-south-1"))

SES_FROM_EMAIL       = os.environ.get("SES_FROM_EMAIL", "reports@xirrledger.com")
HOSTINGER_API_URL    = os.environ.get("HOSTINGER_API_URL", "")
HOSTINGER_API_SECRET = os.environ.get("HOSTINGER_API_SECRET", "")


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
    session_id = event["session_id"]
    name       = event.get("name", "Investor")
    email      = event.get("email", "")
    accounts   = event.get("accounts", [])

    def update_status(data):
        s3_client.put_object(
            Bucket=jobs_bucket,
            Key=f"jobs/{session_id}/status.json",
            Body=json.dumps(data),
            ContentType="application/json",
        )

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

            account_outflows = []
            account_inflows  = []

            for file_idx, s3_key in enumerate(file_keys):
                logger.info("Downloading s3://%s/%s", uploads_bucket, s3_key)
                obj = s3_client.get_object(Bucket=uploads_bucket, Key=s3_key)
                file_bytes = obj["Body"].read()
                file_name  = s3_key.split("/")[-1].lower()

                if file_name.endswith(".csv"):
                    out, inf = parse_zerodha_csv(file_bytes)
                elif file_name.endswith(".pdf"):
                    out, inf = parse_groww_pdf(file_bytes, password=pan_password)
                else:
                    logger.warning("Unsupported file type: %s", file_name)
                    continue

                # Tag each row with its source file index (used for cross-file dedup below)
                out["_file_idx"] = file_idx
                inf["_file_idx"] = file_idx
                account_outflows.append(out)
                account_inflows.append(inf)

            if not account_outflows:
                logger.warning("No transactions found for account %s", pan or broker)
                continue

            acc_out = pd.concat(account_outflows, ignore_index=True)
            acc_inf = pd.concat(account_inflows, ignore_index=True) if account_inflows else pd.DataFrame(columns=["date", "amount", "_file_idx"])

            # For Groww accounts with multiple files: remove cross-file duplicates only.
            # Entries on the same date within the same file are legitimate and kept.
            # Zerodha always has one file per account so no dedup needed there.
            if broker == "groww" and len(account_outflows) > 1:
                acc_out = _dedup_cross_file(acc_out)
                acc_inf = _dedup_cross_file(acc_inf)
            else:
                acc_out = acc_out.drop(columns=["_file_idx"], errors="ignore")
                acc_inf = acc_inf.drop(columns=["_file_idx"], errors="ignore")

            all_outflows.append(acc_out)
            all_inflows.append(acc_inf)

            # Extract Zerodha account number from filename: ledger-ACCTNUM.csv
            zerodha_acct = None
            if broker == "zerodha" and file_keys:
                fname = file_keys[0].split("/")[-1]
                m = re.search(r'ledger[_\-](.+?)\.csv', fname, re.IGNORECASE)
                zerodha_acct = m.group(1) if m else None

            account_stats_list.append({
                "name": f"Groww ({pan})" if pan else (f"Zerodha ({zerodha_acct})" if zerodha_acct else "Zerodha"),
                "outflows": acc_out,
                "inflows": acc_inf,
                "current_value": current_value,
            })

        if not all_outflows:
            raise ValueError("No transactions found in any of the uploaded files.")

        combined_outflows = pd.concat(all_outflows, ignore_index=True)
        combined_inflows  = pd.concat(all_inflows, ignore_index=True) if all_inflows else pd.DataFrame(columns=["date", "amount"])
        combined_value    = sum(a["current_value"] for a in account_stats_list)

        # ── Fetch Nifty 50 data from S3 cache ────────────────
        update_status({"status": "fetching", "message": "Loading Nifty 50 benchmark data..."})
        first_date = min(pd.to_datetime(combined_outflows["date"]))
        nifty_data = fetch_nifty50_data(first_date, datetime.now(), s3_client, jobs_bucket)

        # ── Compute XIRR ─────────────────────────────────────
        update_status({"status": "computing", "message": "Computing XIRR..."})
        combined_stats = compute_portfolio_stats(combined_outflows, combined_inflows, combined_value, nifty_data)

        individual_stats = []
        for acc in account_stats_list:
            stats = compute_portfolio_stats(acc["outflows"], acc["inflows"], acc["current_value"], nifty_data)
            stats["account_name"] = acc["name"]
            individual_stats.append(stats)

        # ── Generate PDF ──────────────────────────────────────
        update_status({"status": "report", "message": "Generating PDF report..."})
        pdf_bytes = generate_pdf_report(individual_stats, combined_stats, name)

        pdf_key = f"reports/{session_id}/xirr_report.pdf"
        s3_client.put_object(
            Bucket=reports_bucket,
            Key=pdf_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )

        # Generate presigned URL (7 days)
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
        if HOSTINGER_API_URL and email:
            try:
                requests.post(
                    f"{HOSTINGER_API_URL}/update-session.php",
                    json={
                        "session_id": session_id,
                        "status": "done",
                        "report_url": report_url,
                        "xirr": final_status["xirr"],
                        "nifty_xirr": final_status["nifty_xirr"],
                    },
                    headers={"X-API-Secret": HOSTINGER_API_SECRET},
                    timeout=10,
                )
            except Exception as e:
                logger.warning("PHP bridge notification failed: %s", e)

        # ── Send email ────────────────────────────────────────
        if email:
            send_report_email(name, email, final_status, report_url)

        logger.info("Processing complete for session %s — XIRR: %s%%", session_id, xirr_pct)

    except Exception as e:
        logger.exception("Processing failed for session %s", session_id)
        update_status({"status": "error", "message": str(e)})


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

                        if "DEPOSIT" in seg_type.upper() and credit_amt:
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
def compute_portfolio_stats(outflows, inflows, current_value, nifty_data=None):
    today = datetime.now()
    total_invested  = -outflows["amount"].sum() if len(outflows) else 0
    total_withdrawn = inflows["amount"].sum() if len(inflows) else 0
    net_gain        = current_value + total_withdrawn - total_invested
    simple_return   = (net_gain / total_invested * 100) if total_invested > 0 else 0

    # First investment date + period
    first_date = pd.to_datetime(outflows["date"]).min() if len(outflows) > 0 else None
    investment_period_days  = (today - first_date).days if first_date is not None else None
    investment_period_years = investment_period_days / 365.25 if investment_period_days else None

    n_investments = len(outflows)
    n_withdrawals = len(inflows)

    cash_flows = list(outflows["amount"]) + list(inflows["amount"]) + [current_value]
    dates      = [pd.to_datetime(d) for d in outflows["date"]] + \
                 [pd.to_datetime(d) for d in inflows["date"]] + \
                 [today]

    xirr_pct = None
    try:
        xirr_pct = calculate_xirr(cash_flows, dates) * 100
    except Exception as e:
        logger.warning("XIRR failed: %s", e)

    nifty = compute_nifty_stats(outflows, inflows, nifty_data) if nifty_data is not None else None

    return {
        "total_invested":          total_invested,
        "total_withdrawn":         total_withdrawn,
        "current_value":           current_value,
        "net_gain":                net_gain,
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
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f6fb")]),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 7),
        ("TOPPADDING",    (0, 1), (-1, -1), 7),
        # Grid
        ("LINEBELOW",     (0, 0), (-1, 0), 1,   colors.HexColor("#ffffff")),
        ("INNERGRID",     (0, 1), (-1, -1), 0.3, colors.HexColor("#dde3ee")),
        ("BOX",           (0, 0), (-1, -1), 0.5, colors.HexColor("#c5cde8")),
        # Padding
        ("LEFTPADDING",   (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
        # Right-align all non-first columns (numeric data)
        ("ALIGN",         (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN",         (0, 0), (0, -1),  "LEFT"),
    ]
    return TableStyle(style)


def _kpi_cell(label, value, sublabel, bg):
    """Single KPI banner cell with stacked label / big value / sublabel."""
    return Paragraph(
        f'<font name="Helvetica" size="8" color="#a8c4e8">{label}</font><br/>'
        f'<font name="Helvetica-Bold" size="20" color="white">{value}</font><br/>'
        f'<font name="Helvetica" size="8" color="#a8c4e8">{sublabel}</font>',
        ParagraphStyle("KPI", alignment=TA_CENTER, leading=22,
                       backColor=colors.HexColor(bg), borderPadding=(14, 8, 14, 8))
    )


class _WatermarkCanvas(rl_canvas.Canvas):
    """Custom canvas: draws watermark AFTER page content so it appears in the foreground."""
    def showPage(self):
        self.saveState()
        w, h = A4
        self.setFont("Helvetica-Bold", 52)
        self.setFillColor(colors.HexColor("#1a237e"), alpha=0.055)
        self.translate(w / 2, h / 2)
        self.rotate(40)
        self.drawCentredString(0, 0, "xirrledger.com")
        self.restoreState()
        super().showPage()


def generate_pdf_report(individual_stats, combined_stats, user_name):
    buf = io.BytesIO()
    ML, MR = 36, 36
    page_w = A4[0] - ML - MR   # usable width ≈ 523 pt

    doc = SimpleDocTemplate(buf, pagesize=A4,
                            rightMargin=MR, leftMargin=ML,
                            topMargin=32, bottomMargin=24)
    styles = getSampleStyleSheet()

    # ── Shared paragraph styles ───────────────────────────────
    title_s = ParagraphStyle("T", fontSize=22, fontName="Helvetica-Bold",
                              textColor=colors.HexColor("#1a237e"),
                              alignment=TA_CENTER, spaceAfter=16)
    sub_s   = ParagraphStyle("S", fontSize=9,  fontName="Helvetica",
                              textColor=colors.HexColor("#666666"),
                              alignment=TA_CENTER, spaceAfter=8)
    h2_s    = ParagraphStyle("H2", fontSize=12, fontName="Helvetica-Bold",
                              textColor=colors.HexColor("#1a237e"),
                              spaceBefore=14, spaceAfter=6)
    note_s  = ParagraphStyle("N", fontSize=7.5, fontName="Helvetica",
                              textColor=colors.HexColor("#888888"),
                              spaceBefore=4, spaceAfter=2)
    acct_h_s = ParagraphStyle("AH", fontSize=10, fontName="Helvetica-Bold",
                               textColor=colors.HexColor("#283593"),
                               spaceBefore=12, spaceAfter=4)
    footer_s = ParagraphStyle("F", fontSize=7.5, fontName="Helvetica",
                               textColor=colors.HexColor("#bbbbbb"),
                               alignment=TA_CENTER, spaceBefore=18)

    elements = []
    cs = combined_stats

    # ── Page title ────────────────────────────────────────────
    elements.append(Paragraph("XIRR Calculator Report", title_s))
    elements.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}  |  "
        f"Prepared for: <b>{user_name}</b>",
        sub_s
    ))
    elements.append(HRFlowable(width="100%", thickness=1.5,
                                color=colors.HexColor("#1a237e"),
                                spaceBefore=6, spaceAfter=16))

    # ── KPI Banner (3 boxes) ──────────────────────────────────
    xirr_v   = f"{cs['xirr_percentage']:.2f}%"       if cs.get("xirr_percentage")      is not None else "N/A"
    nifty_v  = f"{cs['nifty_xirr_percentage']:.2f}%" if cs.get("nifty_xirr_percentage") is not None else "N/A"

    has_nifty = cs.get("nifty_xirr_percentage") is not None
    if has_nifty:
        diff     = cs["xirr_percentage"] - cs["nifty_xirr_percentage"]
        beat_v   = f"+{diff:.2f}%" if diff > 0 else f"{diff:.2f}%"
        beat_lbl = "vs Nifty 50"
        kpi3_bg  = "#1b5e20" if diff > 0 else "#b71c1c"
    else:
        beat_v   = "N/A"
        beat_lbl = "Nifty data unavailable"
        kpi3_bg  = "#37474f"  # neutral dark grey when no comparison possible

    kpi_row = [[
        _kpi_cell("YOUR XIRR",    xirr_v,  "annualised return",    "#1565c0"),
        _kpi_cell("NIFTY 50 XIRR", nifty_v, "benchmark return",    "#283593"),
        _kpi_cell("PERFORMANCE",   beat_v,  beat_lbl,               kpi3_bg),
    ]]
    gap = 4
    cw  = (page_w - gap * 2) / 3
    kpi_t = Table(kpi_row, colWidths=[cw, cw, cw], spaceBefore=0,
                  style=TableStyle([
                      ("BACKGROUND",    (0, 0), (0, 0), colors.HexColor("#1565c0")),
                      ("BACKGROUND",    (1, 0), (1, 0), colors.HexColor("#283593")),
                      ("BACKGROUND",    (2, 0), (2, 0), colors.HexColor(kpi3_bg)),
                      ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
                      ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
                      ("TOPPADDING",    (0, 0), (-1, -1), 16),
                      ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
                      ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                      ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
                      ("LINEAFTER",     (0, 0), (1, 0), 2, colors.white),
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

    gain_bg = colors.HexColor("#e8f5e9") if (cs.get("net_gain") or 0) >= 0 else colors.HexColor("#ffebee")

    summary_rows = [
        ["Metric",                  "Value"],
        ["First Investment Date",   cs.get("first_investment_date") or "N/A"],
        ["Investment Period",        period_str],
        ["Total Transactions",       txn_str],
        ["Total Invested",           _fmt_inr(cs["total_invested"])],
        ["Total Withdrawn",          _fmt_inr(cs["total_withdrawn"])],
        ["Current Portfolio Value",  _fmt_inr(cs["current_value"])],
        ["Net Gain / Loss",          _fmt_inr(cs["net_gain"])],     # row 7
        ["Simple Return",            f"{cs['simple_return']:.2f}%"],
        ["XIRR (Annualised)",        xirr_v],
    ]
    st = Table(summary_rows, colWidths=[page_w * 0.56, page_w * 0.44])
    st.setStyle(_base_table_style("#1a237e"))
    st.setStyle(TableStyle([
        ("BACKGROUND",  (0, 7), (-1, 7), gain_bg),          # Net Gain row (index 7)
        ("FONTNAME",    (1, 7), (1, 7),  "Helvetica-Bold"),  # bold value
        ("FONTNAME",    (1, 9), (1, 9),  "Helvetica-Bold"),  # bold XIRR value
        ("FONTSIZE",    (1, 9), (1, 9),  10),
        ("TEXTCOLOR",   (1, 9), (1, 9),  colors.HexColor("#1a237e")),
    ]))
    elements.append(st)

    # ── Nifty 50 Benchmark Comparison ─────────────────────────
    elements.append(Paragraph("Nifty 50 Benchmark Comparison", h2_s))

    nifty_xirr_str  = f"{cs['nifty_xirr_percentage']:.2f}%" if has_nifty else "N/A"
    nifty_val_str   = _fmt_inr(cs.get("nifty_current_value"))
    nifty_units_str = f"{cs['nifty_units_held']:.2f}"        if cs.get("nifty_units_held") else "N/A"
    nifty_price_str = _fmt_inr(cs.get("nifty_current_price"))

    if has_nifty:
        perf_str     = f"BEAT BY {diff:.2f}%" if diff > 0 else f"UNDERPERFORMED BY {abs(diff):.2f}%"
        val_diff_str = _fmt_inr(cs["current_value"] - cs["nifty_current_value"])
        perf_bg      = colors.HexColor("#e8f5e9") if diff > 0 else colors.HexColor("#fff3e0")
        perf_txt_col = colors.HexColor("#1b5e20") if diff > 0 else colors.HexColor("#e65100")
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
    nt.setStyle(_base_table_style("#283593", num_cols=3))
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

    # ── Individual Account Analysis ───────────────────────────
    if len(individual_stats) > 1:
        elements.append(PageBreak())
        elements.append(Paragraph("Individual Account Analysis", h2_s))

        for stats in individual_stats:
            acc_xirr   = f"{stats['xirr_percentage']:.2f}%" if stats.get("xirr_percentage") is not None else "N/A"
            acc_period = "N/A"
            if stats.get("investment_period_days") and stats.get("investment_period_years"):
                acc_period = (f"{stats['investment_period_days']} days  "
                              f"({stats['investment_period_years']:.2f} years)")
            acc_txn = (f"{stats.get('n_investments', 0)} investments,  "
                       f"{stats.get('n_withdrawals', 0)} withdrawals")
            acc_gain_bg = colors.HexColor("#e8f5e9") if (stats.get("net_gain") or 0) >= 0 \
                          else colors.HexColor("#ffebee")

            elements.append(Paragraph(stats.get("account_name", "Account"), acct_h_s))
            rows = [
                ["Metric",            "Value"],
                ["Investment Period",  acc_period],
                ["Total Transactions", acc_txn],
                ["Total Invested",     _fmt_inr(stats["total_invested"])],
                ["Total Withdrawn",    _fmt_inr(stats["total_withdrawn"])],
                ["Current Value",      _fmt_inr(stats["current_value"])],
                ["Net Gain / Loss",    _fmt_inr(stats["net_gain"])],    # row 6
                ["Simple Return",      f"{stats['simple_return']:.2f}%"],
                ["XIRR (Annualised)",  acc_xirr],
            ]
            at = Table(rows, colWidths=[page_w * 0.56, page_w * 0.44])
            at.setStyle(_base_table_style("#3949ab"))
            at.setStyle(TableStyle([
                ("BACKGROUND", (0, 6), (-1, 6), acc_gain_bg),
                ("FONTNAME",   (1, 6), (1, 6),  "Helvetica-Bold"),
                ("FONTNAME",   (1, 8), (1, 8),  "Helvetica-Bold"),
                ("FONTSIZE",   (1, 8), (1, 8),  10),
                ("TEXTCOLOR",  (1, 8), (1, 8),  colors.HexColor("#283593")),
            ]))
            elements.append(at)
            elements.append(Spacer(1, 10))

        # ── Account Comparison ────────────────────────────────
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
        cmt.setStyle(_base_table_style("#283593", num_cols=5))
        cmt.setStyle(TableStyle([
            ("BACKGROUND", (0, last), (-1, last), colors.HexColor("#e8eaf6")),
            ("FONTNAME",   (0, last), (-1, last), "Helvetica-Bold"),
            ("LINEABOVE",  (0, last), (-1, last), 1.5, colors.HexColor("#283593")),
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
        xirr  = f"{stats['xirr']:.2f}" if stats.get("xirr") is not None else "N/A"
        nifty = f"{stats['nifty_xirr']:.2f}" if stats.get("nifty_xirr") is not None else "N/A"

        if stats.get("xirr") is not None and stats.get("nifty_xirr") is not None:
            diff = stats["xirr"] - stats["nifty_xirr"]
            vs_nifty = f"Beat Nifty 50 by {diff:.2f}%" if diff > 0 else f"Missed Nifty 50 by {abs(diff):.2f}%"
        else:
            vs_nifty = "N/A"

        ses.send_templated_email(
            Source=SES_FROM_EMAIL,
            Destination={"ToAddresses": [email]},
            Template="xirrledger-report-ready",
            TemplateData=json.dumps({
                "name":       name,
                "xirr":       xirr,
                "nifty_xirr": nifty,
                "vs_nifty":   vs_nifty,
                "report_url": report_url,
            }),
        )
        logger.info("Email sent to %s", email)
    except Exception as e:
        logger.warning("Email send failed: %s", e)
