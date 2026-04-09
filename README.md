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
│   ├── app/                    # Pages
│   │   ├── page.tsx            # Homepage
│   │   ├── about/              # About page
│   │   ├── blog/               # Blog index + [slug] posts
│   │   ├── calculator/         # App entry (noindex)
│   │   ├── contact/            # Contact page
│   │   ├── faq/                # FAQ page (20 questions, JSON-LD)
│   │   ├── features/           # Features page
│   │   ├── how-it-works/       # How it works page
│   │   ├── how-to-calculate-xirr/  # SEO landing page + HowTo schema
│   │   ├── privacy-policy/     # Privacy Policy
│   │   └── terms-of-service/   # Terms of Service
│   ├── components/             # Navigation, Footer, YouTubeFacade
│   ├── content/blog/           # MDX blog posts (11 posts, author: Ankit Bhardwaj)
│   └── public/                 # Static assets, .htaccess, robots.txt, llms.txt
├── lambda/                     # AWS Lambda functions
│   ├── handler.py              # API router (/session, /validate, /process, /send-otp, /verify-otp)
│   ├── processor.py            # XIRR pipeline (parse → compute → PDF → email)
│   ├── refresher.py            # Daily Nifty 50 S3 cache refresher
│   ├── email/                  # SES email templates
│   └── build_layer.sh          # Builds Lambda layer via Docker
├── marketing/
│   ├── videos/                 # Per-video folder: title.txt, description.txt, script.md
│   └── seo/                    # SEO audit reports (audit-YYYY-MM-DD.md)
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

## SEO & Compliance

**Full audit:** `marketing/seo/audit-2026-04-09.md` — score 62/100, all Critical + High items resolved.

### Schema markup
| Page | Schema types |
|---|---|
| Site-wide (`layout.tsx`) | `Organization` (with logo, founder, sameAs) |
| Homepage | `WebSite`, `SoftwareApplication` (FinanceApplication, free) |
| `/how-to-calculate-xirr/` | `HowTo` (5 steps) |
| `/faq/` | `FAQPage` (20 questions) |
| `/blog/[slug]/` | `Article` (author, publisher, image, logo) |

### Technical
- `/calculator/` — `noindex` (app UI, not content); excluded from sitemap
- `dev.xirrledger.com` — blocked via server-side `robots.txt` (`Disallow: /`)
- Trailing slash — enforced via `next.config.ts` + `.htaccess` 301
- Sitemap — all URLs with trailing slash, real `lastmod` dates (not build timestamp)
- Security headers — HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy in `.htaccess`
- Blog canonical URLs — trailing slash consistent with sitemap
- `llms.txt` — present at `/llms.txt` for AI crawler discovery

### Legal / YMYL
- Privacy Policy — `/privacy-policy/`
- Terms of Service — `/terms-of-service/`
- Financial disclaimer — footer (site-wide) + all blog post pages

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
