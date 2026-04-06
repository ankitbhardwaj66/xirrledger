# XIRR Ledger

Calculate your true portfolio returns (XIRR) from your actual broker ledger and compare against Nifty 50 — for Zerodha, Groww, and Fyers investors.

**Live at:** [https://xirrledger.com](https://xirrledger.com)
**YouTube:** [Watch the explainer](https://www.youtube.com/watch?v=ZXf0VT8RPmc)

---

## What is XIRR?

XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment performance when you have irregular cash flows. Unlike CAGR, XIRR accounts for the exact timing of every deposit and withdrawal, idle cash in your broker account, all transaction charges (STT, brokerage, DP charges, GST), and dividend income — giving you a true annualised return that your broker doesn't show you.

---

## Supported Brokers

| Broker | File Format | Notes |
|---|---|---|
| Zerodha | XLSX ledger | Funds → View Statement → All Segments → date range → XLSX (one file, all years) |
| Groww | PDF ledger | Funds → All Transactions → select year → Download (1 PDF per year, PAN as password) |
| Fyers | CSV ledger | Reports → Ledger → Download CSV (one file per financial year) |

Upload files from multiple brokers in one session for a combined XIRR.

---

## How It Works

1. **Sign in** with Google or enter your email (verified via OTP)
2. **Upload** your broker ledger files — drag and drop, supports multiple brokers
3. **Enter** current holdings value and available cash per account
4. **Calculate** — results in ~30 seconds
5. **Get** your XIRR, Nifty 50 benchmark, performance gap, and a PDF report emailed to you

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
| Frontend | Next.js 16 (static export) |
| Hosting | Hostinger shared hosting (Apache) |
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
├── website/                    # Next.js frontend
│   ├── app/                    # Pages (home, blog, calculator, faq, etc.)
│   ├── components/             # Navigation, Footer, YouTubeFacade
│   ├── content/blog/           # MDX blog posts
│   └── public/                 # Static assets, .htaccess, PHP bridge
├── lambda/                     # AWS Lambda functions
│   ├── handler.py              # API router (/session, /validate, /process, /send-otp, /verify-otp)
│   ├── processor.py            # XIRR pipeline (parse → compute → PDF → email)
│   ├── refresher.py            # Daily Nifty 50 S3 cache refresher
│   ├── email/                  # SES email templates
│   └── build_layer.sh          # Builds Lambda layer via Docker
├── marketing/                  # Content for YouTube and social
│   └── videos/                 # Per-video folder: title.txt, description.txt, script.md
├── terraform/                  # Prod AWS infrastructure as code
├── terraform-dev/              # Dev AWS infrastructure as code
└── DEPLOYMENT.md               # Architecture details, credentials, deploy steps
```

---

## PDF Report Contents

The PDF emailed after each calculation includes:

1. **Portfolio Summary** — XIRR, first investment date, investment period, total invested/withdrawn, current value, dividend income, net gain/loss
2. **Nifty 50 Benchmark Comparison** — your XIRR vs Nifty XIRR, performance gap, value difference
3. **Individual Account Analysis** — capital distribution (pie chart), profit/loss per account (bar chart), detailed per-account breakdown with XIRR
4. **Account Comparison Table** — all accounts side by side with combined total

---

## GSC / SEO Status

- `xirrledger.com/calculator/` — `noindex` (app page, not content)
- `dev.xirrledger.com` — blocked via `robots.txt` (`Disallow: /`)
- Trailing slash 301 redirect — in `.htaccess`
- Sitemap — all URLs with trailing slash

---

## Sample Report

[Download sample PDF report](https://xirrledger.com/sample_report.pdf)

---

## Disclaimer

This tool is for informational purposes only. Always verify calculations independently and consult a financial advisor for investment decisions.

---

## License

MIT License — feel free to use and modify.
