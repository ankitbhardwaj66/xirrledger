# XIRR Ledger

Calculate your true portfolio returns (XIRR) from your actual broker ledger and compare against Nifty 50 — for Zerodha, Groww, and Fyers investors.

**Live at:** [https://xirrledger.com](https://xirrledger.com)
**YouTube:** [Watch the explainer](https://www.youtube.com/watch?v=jnIUkdnjqjo)

---

## What is XIRR?

XIRR (Extended Internal Rate of Return) is the most accurate way to measure investment performance when you have irregular cash flows. Unlike CAGR, XIRR accounts for the exact timing of every deposit and withdrawal, idle cash in your broker account, all transaction charges (STT, brokerage, DP charges, GST), and dividend income — giving you a true annualised return that your broker doesn't show you.

---

## Supported Brokers & File Types

| Broker | Stocks / F&O | Mutual Funds | How to download |
|---|---|---|---|
| Zerodha | XLSX ledger (all segments) | MF Tradebook XLSX | Ledger: Console → Funds → Statement → All Segments → XLSX. MF: Console → Reports → Tradebook → Mutual Funds (one file per ≤365 days, multiple files ok) |
| Groww | Stock Order History XLSX | MF Order History XLSX | Stocks: Reports → Transactions → Stocks - Order history → Download. MF: Reports → Transactions → Mutual Funds - Order history |
| Fyers | CSV ledger | — *(coming soon)* | Reports → Ledger → set date range → CSV (one file per FY, upload all together) |

You can add multiple accounts (same or different brokers) in one session for a combined XIRR.

**Note:** Groww stock XIRR excludes brokerage charges and STT (not included in the order history). Fyers ledger includes all charges automatically.

**Optional (Zerodha):** Dividend XLSX — Console → Reports → Downloads → Dividend statement (one per FY). Adds dividend income as inflows to improve XIRR accuracy.

---

## How It Works

The calculator uses a guided step-by-step wizard (one screen at a time):

1. **Sign in** with Google or email OTP
2. **Select broker** — Zerodha, Groww, or Fyers *(Fyers goes directly to upload; Groww/Zerodha choose trade type next)*
3. **Choose trade type** — Stocks/F&O, Mutual Funds, or Both *(Fyers: MF coming soon)*
4. **Upload MF tradebook** *(if MF or Both)* — Zerodha or Groww XLSX; multiple yearly files; Trade ID dedup
5. **Upload stock ledger / order history** *(if Stocks or Both)* — XLSX for Zerodha/Groww, CSV for Fyers
6. **Upload dividend files** *(optional, Zerodha only)* — one XLSX per FY
7. **Enter current portfolio value** and cash balance
8. **Review & calculate** — or add another account and loop back to step 2
9. **Edit Holdings** — after results, edit any account's value and recalculate without re-uploading files

Results in ~30 seconds. PDF report emailed automatically.

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

PHP Bridge (Hostinger)
    ├── save-user.php         — create session, capture device type
    ├── track-step.php        — update wizard step
    ├── update-session.php    — Lambda callback (XIRR result, report URL)
    ├── get-report.php        — generate fresh S3 presigned URL on demand
    ├── get-failed-sessions.php — support email candidate query
    ├── mark-support-email-sent.php
    └── dashboard.php         — admin funnel dashboard (key-protected)
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
│   ├── app/                    # Pages
│   │   ├── page.tsx            # Homepage
│   │   ├── about/
│   │   ├── blog/               # Blog index + [slug] posts
│   │   ├── calculator/         # App entry (noindex)
│   │   ├── contact/
│   │   ├── faq/                # FAQ page (18 questions, JSON-LD)
│   │   ├── features/
│   │   ├── how-it-works/
│   │   ├── how-to-calculate-xirr/  # SEO landing page + HowTo schema
│   │   ├── privacy-policy/
│   │   └── terms-of-service/
│   ├── components/             # Navigation, Footer, YouTubeFacade
│   ├── content/blog/           # MDX blog posts
│   └── public/
│       ├── api/                # PHP bridge (gitignored: config.php)
│       │   ├── config.example.php   # ← template; copy to config.php on server
│       │   ├── dashboard.php        # Admin funnel dashboard
│       │   ├── get-report.php       # On-demand S3 presigned URL proxy
│       │   ├── save-user.php        # Session create + device detection
│       │   ├── track-step.php
│       │   ├── update-session.php   # Lambda result callback
│       │   ├── get-failed-sessions.php
│       │   └── mark-support-email-sent.php
│       ├── .htaccess           # www→non-www, trailing slash, cache, security headers
│       └── robots.txt          # Disallow: /api/
├── lambda/
│   ├── handler.py              # API router + async dispatch
│   ├── processor.py            # XIRR pipeline (parse → compute → PDF → email)
│   ├── refresher.py            # Daily Nifty 50 S3 cache refresher
│   ├── email/                  # SES email templates
│   └── build_layer.sh          # Builds Lambda layer via Docker
├── db/
│   ├── migrate.php             # Migration runner (dev/prod, --status flag)
│   └── migrations/             # Numbered SQL files (0001_initial_schema.sql, ...)
├── scripts/
│   └── refresh_report_urls.py  # Refreshes expired S3 presigned URLs in DB
├── marketing/
│   ├── videos/                 # Per-video folder: title.txt, description.txt, script.md
│   └── seo/                    # SEO audit reports
├── terraform/                  # Prod AWS infrastructure as code
├── terraform-dev/              # Dev AWS infrastructure as code
└── DEPLOYMENT.md               # Architecture details, deploy steps
```

---

## PDF Report Contents

The PDF emailed after each calculation includes:

1. **Portfolio Summary** — XIRR, first investment date, investment period, total invested/withdrawn, current value, dividend income, net gain/loss
2. **Nifty 50 Benchmark Comparison** — your XIRR vs Nifty XIRR, performance gap, value difference
3. **Individual Account Analysis** — capital distribution (pie chart), profit/loss per account (bar chart), detailed per-account table including:
   - When MF tradebook uploaded: sub-rows showing **Stocks** and **Mutual Funds** breakdown under Total Invested and Total Withdrawn
   - MF gross activity footnote (total buys, total redemptions, net position)
4. **Account Comparison Table** — all accounts side by side with combined total

---

## Admin Dashboard

A key-protected funnel dashboard lives at `/api/dashboard.php?key=KEY`. It shows:

- **Funnel metrics** — signed-in → uploaded → clicked calculate → got report (with drop-off counts)
- **Step and broker breakdown** — distribution tables
- **Recent sessions table** — time, name, email, broker, device (Phone/Tablet/Desktop), last step, XIRR, Nifty XIRR, PDF link, support email sent, error message
- **PDF links** — routed through `get-report.php` which generates a fresh presigned URL on every click (no expiry)

The dashboard is blocked from Google indexing via `robots.txt` (`Disallow: /api/`) and `X-Robots-Tag: noindex, nofollow`.

---

## Lambda Environment Variables

| Variable | Required | Description |
|---|---|---|
| `S3_UPLOADS_BUCKET` | **hard required** | S3 bucket for file uploads (`xirrledger-uploads`) |
| `S3_REPORTS_BUCKET` | **hard required** | S3 bucket for PDF reports (`xirrledger-reports`) |
| `S3_JOBS_BUCKET` | **hard required** | S3 bucket for job status polling (`xirrledger-jobs`) |
| `HOSTINGER_API_URL` | required | PHP bridge URL e.g. `https://xirrledger.com/api` |
| `HOSTINGER_API_SECRET` | required | Shared secret for Lambda→PHP auth (set in Terraform tfvars) |
| `SES_FROM_EMAIL` | optional | Sender address, defaults to `reports@xirrledger.com` |
| `SEND_EMAIL` | optional | Set to `false` to suppress all outbound email |
| `TEST_EMAILS` | optional | Comma-separated emails that skip DB writes |
| `AWS_REGION_NAME` | optional | Defaults to `ap-south-1` |

> **Always manage these via Terraform** (`terraform/lambda.tf` + `terraform/terraform.tfvars`), never via AWS CLI directly. CLI updates replace the entire env object and cause drift from Terraform state.

---

## Security

- **`config.php`** — gitignored; credentials managed on server only via SSH. Use `config.example.php` as setup template.
- **AWS IAM** — `xirrledger-server` IAM user on server has `s3:GetObject` on `xirrledger-reports/*` and `xirrledger-reports-dev/*`. Lambda uses a separate IAM role.
- **PHP bridge auth** — all Lambda→PHP callbacks verified with `X-API-Secret` header (shared secret matching `HOSTINGER_API_SECRET` in Terraform)
- **`/api/` path** — blocked from Google (`Disallow: /api/` in `robots.txt`)
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy via `.htaccess`

---

## SEO & Compliance

**Full audit:** `marketing/seo/audit-2026-04-09.md` — score 62/100, all Critical + High items resolved.

### Schema markup
| Page | Schema types |
|---|---|
| Site-wide (`layout.tsx`) | `Organization` (with logo, founder, sameAs) |
| Homepage | `WebSite`, `SoftwareApplication` (FinanceApplication, free) |
| `/how-to-calculate-xirr/` | `HowTo` (5 steps) |
| `/faq/` | `FAQPage` (18 questions) |
| `/blog/[slug]/` | `Article` (author, publisher, image, logo) |

### Technical
- `/calculator/` — `noindex` (app UI, not content); excluded from sitemap
- `dev.xirrledger.com` — blocked via server-side `robots.txt` (`Disallow: /`)
- `/api/` — blocked via `robots.txt` (`Disallow: /api/`)
- Trailing slash — enforced via `next.config.ts` + `.htaccess` 301
- Sitemap — all URLs with trailing slash, real `lastmod` dates
- `llms.txt` — present at `/llms.txt` for AI crawler discovery

### Legal / YMYL
- Privacy Policy — `/privacy-policy/`
- Terms of Service — `/terms-of-service/`
- Financial disclaimer — footer (site-wide) + all blog post pages

---

## Design System

| Element | Font / Treatment |
|---|---|
| Display headings (H1, H2) | Bricolage Grotesque |
| Body text | Inter |
| Numbers, percentages, code | IBM Plex Mono (`var(--font-mono)`) |
| Primary accent | `#f59e0b` (amber) |
| Background | `#0f172a` (navy) / `#131f35` (sections) |
| Hero background | Graph paper grid texture (H+V lines, radial fade) |

---

## Sample Report

[Download sample PDF report](https://xirrledger.com/sample_report.pdf)

---

## Disclaimer

This tool is for informational purposes only. Always verify calculations independently and consult a financial advisor for investment decisions.

---

## License

MIT License — feel free to use and modify.
