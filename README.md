# XIRR Ledger

Calculate your true portfolio returns (XIRR) and compare against Nifty 50 — for Zerodha and Groww investors.

**Live at:** [https://xirrledger.com](https://xirrledger.com)

---

## What is XIRR?

XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment performance when you have irregular cash flows. Unlike simple returns, XIRR accounts for the exact timing of every deposit and withdrawal, giving you a true annualised return figure.

---

## Supported Brokers

| Broker | File Format | Notes |
|---|---|---|
| Zerodha | CSV / XLSX ledger | Funds → View Statement → All Segments → date range → CSV or XLSX |
| Groww | PDF ledger | Funds → All Transactions → select year → Download (1 PDF per year, PAN as password) |
| Fyers | CSV ledger | Reports → Ledger → Download CSV |

---

## How It Works

1. **Sign in** with Google or enter your name and email (verified via OTP)
2. **Upload** your Zerodha CSV/XLSX, Groww PDF, or Fyers CSV ledger files
3. **Enter** current holdings value and available cash per account
4. **Get** your XIRR, Nifty 50 benchmark comparison, and a PDF report emailed to you

---

## Architecture

```
Browser (Next.js static — Hostinger)
    │
    ├── POST /send-otp  ──────────┐
    ├── POST /verify-otp ─────── API Gateway → Lambda (Python, arm64)
    ├── POST /session   ──────────┤              │
    ├── POST /validate  ──────────┤   ┌──────────┼──────────┐
    ├── POST /process   ──────────┘   S3         SES        S3 cache
    └── Poll S3 for status        (uploads)   (email)   (Nifty 50 daily)
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (static export) |
| Hosting | Hostinger shared hosting |
| Backend | AWS Lambda (Python 3.12, arm64) |
| API | AWS API Gateway (HTTP API) |
| Storage | AWS S3 (uploads, reports, job status, OTP records) |
| Email | AWS SES (OTP verification + PDF report) |
| User DB | MySQL on Hostinger (PHP bridge) |
| Auth | Google Identity Services + email OTP |
| Infrastructure | Terraform (ap-south-1 / Mumbai) |

---

## Repository Structure

```
xirrcalculator/
├── website/          # Next.js frontend
│   ├── app/          # Pages (home, blog, calculator, etc.)
│   ├── components/   # Navigation, Footer
│   ├── content/blog/ # MDX blog posts
│   └── public/       # Static assets (sample_report.pdf, PHP bridge)
├── lambda/           # AWS Lambda functions
│   ├── handler.py    # API router (/session, /validate, /process, /send-otp, /verify-otp)
│   ├── processor.py  # XIRR pipeline (parse → compute → PDF → email)
│   ├── refresher.py  # Daily Nifty 50 S3 cache refresher
│   ├── email/        # SES report email template
│   └── build_layer.sh # Builds Lambda layer via Docker
├── terraform/        # Prod AWS infrastructure as code
├── terraform-dev/    # Dev AWS infrastructure as code
└── DEPLOYMENT.md     # Architecture details, credentials, next steps
```

---

## Sample Report

[Download sample PDF report](https://xirrledger.com/sample_report.pdf)

---

## Disclaimer

This tool is for informational purposes only. Always verify calculations independently and consult a financial advisor for investment decisions.

---

## License

MIT License — feel free to use and modify.
