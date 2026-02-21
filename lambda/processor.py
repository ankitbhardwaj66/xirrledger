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
import yfinance as yf
yf.set_tz_cache_location('/tmp')  # Lambda /tmp is writable; avoids read-only fs errors
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)
from reportlab.lib.enums import TA_CENTER

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ses = boto3.client("ses", region_name=os.environ.get("AWS_REGION_NAME", "ap-south-1"))

SES_FROM_EMAIL       = os.environ.get("SES_FROM_EMAIL", "reports@xirrledger.com")
HOSTINGER_API_URL    = os.environ.get("HOSTINGER_API_URL", "")
HOSTINGER_API_SECRET = os.environ.get("HOSTINGER_API_SECRET", "")


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

            for s3_key in file_keys:
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

                account_outflows.append(out)
                account_inflows.append(inf)

            if not account_outflows:
                logger.warning("No transactions found for account %s", pan or broker)
                continue

            acc_out = pd.concat(account_outflows, ignore_index=True)
            acc_inf = pd.concat(account_inflows, ignore_index=True) if account_inflows else pd.DataFrame(columns=["date", "amount"])

            all_outflows.append(acc_out)
            all_inflows.append(acc_inf)

            account_stats_list.append({
                "name": f"Groww ({pan})" if pan else "Zerodha",
                "outflows": acc_out,
                "inflows": acc_inf,
                "current_value": current_value,
            })

        if not all_outflows:
            raise ValueError("No transactions found in any of the uploaded files.")

        combined_outflows = pd.concat(all_outflows, ignore_index=True)
        combined_inflows  = pd.concat(all_inflows, ignore_index=True) if all_inflows else pd.DataFrame(columns=["date", "amount"])
        combined_value    = sum(a["current_value"] for a in account_stats_list)

        # ── Fetch Nifty 50 data ──────────────────────────────
        update_status({"status": "fetching", "message": "Fetching Nifty 50 benchmark data..."})
        first_date = min(pd.to_datetime(combined_outflows["date"]))
        nifty_data = fetch_nifty50_data(first_date, datetime.now())

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

        final_status = {
            "status": "done",
            "xirr": round(xirr_pct, 2) if xirr_pct is not None else None,
            "nifty_xirr": round(nifty_xirr_pct, 2) if nifty_xirr_pct is not None else None,
            "total_invested": round(combined_stats["total_invested"], 2),
            "total_withdrawn": round(combined_stats["total_withdrawn"], 2),
            "current_value": round(combined_value, 2),
            "net_gain": round(combined_stats["net_gain"], 2),
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
def fetch_nifty50_data(start_date, end_date):
    import time
    start = pd.to_datetime(start_date) - timedelta(days=10)
    end   = pd.to_datetime(end_date)   + timedelta(days=5)
    for attempt in range(3):
        try:
            nifty = yf.download("^NSEI", start=start, end=end, progress=False)
            if nifty.empty:
                return None
            nifty_data = nifty[["Close"]].copy()
            nifty_data.reset_index(inplace=True)
            nifty_data.columns = ["date", "close"]
            nifty_data["date"] = pd.to_datetime(nifty_data["date"]).dt.tz_localize(None)
            return nifty_data
        except Exception as e:
            logger.warning("Nifty 50 fetch attempt %d failed: %s", attempt + 1, e)
            if attempt < 2:
                time.sleep(2 ** attempt)  # 1s, 2s backoff
    return None


def calculate_nifty_xirr(outflows, inflows, nifty_data):
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

        latest_price = float(nifty_data.iloc[-1]["close"])
        current_value = total_units * latest_price

        cash_flows = list(outflows["amount"]) + list(inflows["amount"]) + [current_value]
        dates      = [pd.to_datetime(d) for d in outflows["date"]] + \
                     [pd.to_datetime(d) for d in inflows["date"]] + \
                     [datetime.now()]

        return calculate_xirr(cash_flows, dates) * 100
    except Exception as e:
        logger.warning("Nifty XIRR failed: %s", e)
        return None


# ─────────────────────────────────────────────────────────────
# Portfolio stats
# ─────────────────────────────────────────────────────────────
def compute_portfolio_stats(outflows, inflows, current_value, nifty_data=None):
    today = datetime.now()
    total_invested  = -outflows["amount"].sum() if len(outflows) else 0
    total_withdrawn = inflows["amount"].sum() if len(inflows) else 0
    net_gain        = current_value + total_withdrawn - total_invested
    simple_return   = (net_gain / total_invested * 100) if total_invested > 0 else 0

    cash_flows = list(outflows["amount"]) + list(inflows["amount"]) + [current_value]
    dates      = [pd.to_datetime(d) for d in outflows["date"]] + \
                 [pd.to_datetime(d) for d in inflows["date"]] + \
                 [today]

    xirr_pct = None
    try:
        xirr_pct = calculate_xirr(cash_flows, dates) * 100
    except Exception as e:
        logger.warning("XIRR failed: %s", e)

    nifty_xirr_pct = calculate_nifty_xirr(outflows, inflows, nifty_data) if nifty_data is not None else None

    return {
        "total_invested":   total_invested,
        "total_withdrawn":  total_withdrawn,
        "current_value":    current_value,
        "net_gain":         net_gain,
        "simple_return":    simple_return,
        "xirr_percentage":  xirr_pct,
        "nifty_xirr_percentage": nifty_xirr_pct,
    }


# ─────────────────────────────────────────────────────────────
# PDF report generation
# ─────────────────────────────────────────────────────────────
def generate_pdf_report(individual_stats, combined_stats, user_name):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            rightMargin=30, leftMargin=30,
                            topMargin=30, bottomMargin=18)
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle("Title", parent=styles["Heading1"],
                                 fontSize=22, textColor=colors.HexColor("#1a237e"),
                                 spaceAfter=20, alignment=TA_CENTER)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14,
                        textColor=colors.HexColor("#283593"),
                        spaceAfter=10, spaceBefore=10)

    elements.append(Paragraph("XIRR Ledger — Portfolio Report", title_style))
    elements.append(Paragraph(f"Prepared for: {user_name}", styles["Normal"]))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y')}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    # Summary table
    elements.append(Paragraph("Portfolio Summary", h2))
    xirr_display  = f"{combined_stats['xirr_percentage']:.2f}%" if combined_stats["xirr_percentage"] is not None else "N/A"
    nifty_display = f"{combined_stats['nifty_xirr_percentage']:.2f}%" if combined_stats.get("nifty_xirr_percentage") is not None else "N/A"

    summary_rows = [
        ["Metric", "Value"],
        ["Total Invested", f"{combined_stats['total_invested']:,.2f}"],
        ["Total Withdrawn", f"{combined_stats['total_withdrawn']:,.2f}"],
        ["Current Portfolio Value", f"{combined_stats['current_value']:,.2f}"],
        ["Net Gain / Loss", f"{combined_stats['net_gain']:,.2f}"],
        ["Simple Return", f"{combined_stats['simple_return']:.2f}%"],
        ["XIRR (Annualised)", xirr_display],
        ["Nifty 50 XIRR", nifty_display],
    ]

    if combined_stats.get("xirr_percentage") is not None and combined_stats.get("nifty_xirr_percentage") is not None:
        diff = combined_stats["xirr_percentage"] - combined_stats["nifty_xirr_percentage"]
        vs_nifty = f"BEAT by {diff:.2f}%" if diff > 0 else f"MISSED by {abs(diff):.2f}%"
        summary_rows.append(["vs Nifty 50", vs_nifty])

    t = Table(summary_rows, colWidths=[3 * inch, 3 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3f51b5")),
        ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 12),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(t)

    # Individual accounts (if more than one)
    if len(individual_stats) > 1:
        elements.append(PageBreak())
        elements.append(Paragraph("Individual Account Analysis", h2))
        for stats in individual_stats:
            account_name = stats.get("account_name", "Account")
            elements.append(Paragraph(account_name, styles["Heading3"]))
            rows = [
                ["Metric", "Value"],
                ["Total Invested", f"{stats['total_invested']:,.2f}"],
                ["Current Value", f"{stats['current_value']:,.2f}"],
                ["XIRR", f"{stats['xirr_percentage']:.2f}%" if stats['xirr_percentage'] else "N/A"],
            ]
            acc_t = Table(rows, colWidths=[2.5 * inch, 2.5 * inch])
            acc_t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#5c6bc0")),
                ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
                ("GRID",       (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE",   (0, 0), (-1, -1), 10),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f5f5f5")]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            elements.append(acc_t)
            elements.append(Spacer(1, 12))

    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Generated by XIRR Ledger — https://xirrledger.com", styles["Normal"]))

    doc.build(elements)
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
