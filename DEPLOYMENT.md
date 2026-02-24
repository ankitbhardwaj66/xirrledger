# XIRR Ledger — Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Hostinger (Static Hosting)                                 │
│  Next.js static export → Apache serves HTML/CSS/JS          │
│  PHP bridge API → MySQL user database                       │
└───────────────────┬─────────────────────────────────────────┘
                    │ API calls from browser
┌───────────────────▼─────────────────────────────────────────┐
│  AWS (Terraform) — ap-south-1 (Mumbai)                      │
│                                                             │
│  API Gateway → Lambda (Python 3.12, arm64)                  │
│                    ↕                                        │
│                   S3                                        │
│             ├── xirrledger-uploads/   (ledger files, 24h)   │
│             ├── xirrledger-jobs/      (status.json + Nifty) │
│             └── xirrledger-reports/   (PDF reports, 24h URL) │
│                    ↕                                        │
│                   SES  (email report on completion)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Status

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 16 (static export) | ✅ Live |
| Hosting | Hostinger shared hosting | ✅ Live |
| Domain | xirrledger.com | ✅ Live |
| Analytics | Google Analytics 4 (G-2YGVB963RE) | ✅ Live |
| Auth | Google Identity Services (OAuth 2.0) | ✅ Live |
| Calculator UI | Next.js /calculator page | ✅ Live |
| Infrastructure | Terraform | ✅ Applied |
| Backend | AWS Lambda (`xirr-processor`, `nifty-refresher`) | ✅ Deployed |
| File storage | AWS S3 (4 buckets) | ✅ Live |
| Email | AWS SES | ✅ Verified (domain + DKIM + MAIL FROM) |
| Nifty 50 cache | S3 daily refresh via EventBridge | ✅ Live (4,500+ rows) |
| User DB | MySQL on Hostinger via PHP bridge | ✅ Live |
| NEXT_PUBLIC_API_URL | Baked into build via `.env.production` | ✅ Done |

---

## What's Done ✅

### Website
- Next.js 16 with Tailwind CSS — pages: Home, Features, How It Works, FAQ, Contact, Blog
- 5 MDX blog posts with per-post SEO meta tags (latest: XIRR vs CAGR — 2026-02-24)
- Google Analytics 4 integrated
- Static export deployed to Hostinger via `deploy.sh` (runs on remote server)
- **Premium Navy + Gold theme** applied across all pages (inline styles, `#0f172a` bg / `#f59e0b` gold)
  - Home, How It Works, Features, Blog listing, Blog post, FAQ, Contact — all fully rethemed
  - `react-icons` v5 used throughout (no SVG inline clutter)
  - `prose-invert` Tailwind class for MDX blog post body on dark background
- **Navigation**: active page highlighting via `usePathname()` (gold underline / left border on mobile); mobile menu auto-collapses on tap
- **Footer**: disclaimer text made visible (`#64748b` + bordered pill style)
- **Hero section**: green privacy badge — "We never store your financial data."
- **Sample PDF** (`/sample_report.pdf`): replaced with real Lambda-generated report (realistic 2-account data, 19.6% XIRR vs 12.3% Nifty)
- **Favicon**: `website/app/icon.svg` — navy bg, gold "XI/RR" two-line (Next.js App Router auto-detects)

### Calculator (`/calculator`)
- Google Sign-In (GSI One Tap + button) + manual name/email fallback
- Drag & drop file upload (CSV=Zerodha, PDF=Groww), multi-file
- SHA-256 content hashing — duplicate file detection across uploads
- Auto broker detection from file extension
- Groww PAN entry: "Same PAN for all" checkbox or per-file
- Files with same PAN auto-grouped into one Groww account
- **Real-time PAN validation** — pdfjs-dist attempts to decrypt PDF with entered PAN; shows ✓/✗ after 10 chars typed
  - Worker: `public/pdf.worker.min.js` (must be `.js` not `.mjs` — Apache on Hostinger serves `.mjs` as `text/plain`)
  - Calculate button locked until all PANs valid
- Per-account holdings + cash inputs — labelled "Current holdings value (₹)" with hint "Today's market value of your holdings — not what you invested"
- **Outside Investments (manual entries)** — optional card in Step 3 (commit `78c464b`)
  - Add any number of investments not tracked by broker (govt bonds, gold bonds, FDs, etc.)
  - Each entry: description (optional), amount (₹), date
  - Sent to Lambda as `manual_entries` array; treated as additional cash outflows in XIRR calculation
  - Current value of these investments should be included in broker holdings field
  - **To revert if removed:** `git revert 78c464b` then redeploy Lambda
- "How to download?" link opens a modal with full Groww + Zerodha step-by-step guide (replaces old cluttered text box)
- Async processing with animated progress steps
- Results: XIRR vs Nifty 50, portfolio stats (total invested, current value, net gain, investment period), contextual insight card
- Results disclaimer: "This report assumes all investments were made exclusively through the provided account statements."
- **Edit Holdings button** on results page — returns to Step 3 with all data preserved (files, PANs, values); user edits and recalculates
- **Stop & Edit Holdings button** on processing page — cancels polling, returns to Step 3 with all data preserved
- XIRR / Nifty figures shown to 2 decimal places (`.toFixed(2)`) matching email precision
- FaTrophy icon replaces 🎉 emoji on "beat Nifty" line
- PDF report opens in new tab (presigned S3 URL, **24-hour** expiry)
- Step 1 subtitle: "We will email you the report too" (concise, no extra header bar)

### Lambda
- `handler.py` — routes `POST /session` (presigned URLs) and `POST /process` (async trigger)
- `processor.py` — full pipeline:
  - Zerodha CSV parser (Funds added, Payouts, Quarterly settlements)
  - Groww PDF parser (pdfplumber, PAN as password) — supports **two formats**:
    1. Annual statement PDFs (downloaded via Groww UI — from April 2023 only)
    2. "Statement of accounts of funds" PDF (full history — request from Groww support team)
    - Deposit segment types matched: `RAZORPAY_DEPOSIT`, `DIRECT_NETBANKING`, `GROWW_MANDATE`, `GROWW_UPI`
    - Withdrawal segment type: `GROWW_WITHDRAW`
  - Cross-file duplicate detection for Groww (same date+amount across files = skip)
  - **Manual entries** (`manual_entries` in event) — injected as additional cash outflows before XIRR (commit `78c464b`)
  - XIRR calculation (Newton-Raphson + Brent fallback)
  - Nifty 50 comparison (reads from S3 daily cache — no yfinance on user requests)
  - PDF report generation (ReportLab) — fully rethemed Navy + Gold (2026-02-24):
    - Title "XIRR Ledger Report" in gold; gold HR divider; navy table headers; gold section headings
    - KPI banner: continuous block, gold separators, white text on coloured performance box
    - Removed Simple Return row; insight card (OUTPERFORMING / KEEP GOING / UNDERPERFORMING)
    - Page 2 charts (multi-account): stacked pie (Capital Distribution) + bar (Profit/Loss in Lakhs)
  - Status polling via S3 jobs bucket (public read)
  - Email via SES on completion — full results in email (XIRR, Nifty, stats grid, insight card)
  - PHP bridge notification on completion
- `refresher.py` — downloads full `^NSEI` history from yfinance, saves to S3
  - Triggered daily by EventBridge at 6:00 AM IST (00:30 UTC)
  - 5x retry with exponential backoff
  - Cache seeded locally (4,522 rows, 2007–2026)

### Infrastructure (Terraform)
- API Gateway HTTP API: `https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com/`
- Lambda function: `xirr-processor` (512MB, 120s timeout)
- Lambda function: `nifty-refresher` (256MB, 300s timeout)
- Lambda layer: `xirrledger-deps` (pandas, numpy, scipy, reportlab, pdfplumber, requests)
- 4 S3 buckets with lifecycle rules
- IAM role with S3 + SES + self-invoke permissions
- EventBridge rule for daily Nifty refresh
- SES domain identity (verified), email template `xirrledger-report-ready` (Navy + Gold theme, full results data)
- CloudWatch log groups (7-day retention)

---

## What's Pending 🔲

### Phase 6 — Returning Users
- Look up user by `google_id` or `email` on sign-in
- Show past reports if returning user
- "Your last report: 3 days ago — Download again" UX

---

## Future Ideas 💡

### 1. Explain the XIRR Formula / Methodology
- Add a "How we calculate your XIRR" section on the website (or inside the PDF report as a footnote)
- Explain: Newton-Raphson iteration with Brent fallback, what counts as a cash flow (funds added, payouts, quarterly settlements), why idle cash matters, and how the final portfolio value is treated as the last cash inflow
- Goal: build trust with users who want to verify the math

### 2. Chart / Graph in PDF Report
- Explore adding a portfolio value vs Nifty 50 line chart inside the generated PDF
- ReportLab supports drawing SVG-like shapes and lines natively — could draw the chart without external libs
- Alternative: generate chart as PNG using `matplotlib` (already available in Lambda layer via pandas/numpy) and embed it in the PDF
- Show: cumulative return curve over the investment period, comparison line for Nifty 50

### 5. Manually Add Fund Transfers by Date (Third-Party Apps & Banks)
- Allow users to manually enter cash flow entries: amount + exact date, for money moved through third-party apps (Paytm Money, ET Money, INDmoney, bank transfers, etc.) that don't provide downloadable ledgers
- These entries are treated as cash flows (funds added/withdrawn) in the XIRR calculation alongside the broker ledger data
- UI: a simple table on the upload/details step — "Add entry" button, date picker, amount (+/-), label/note
- Useful for: SIPs via bank mandate, lump-sum top-ups, external portfolio transfers not captured in broker files
- Implementation: frontend collects these as a JSON array; Lambda merges them into the cash flow list before running XIRR

### 3. More Benchmark Indices
- Currently comparing only against Nifty 50 (`^NSEI`)
- Add support for: Nifty 500 (`^CRSLDX`), Nifty Midcap 150 (`NIFTY_MID_SELECT.NS`), Nifty Smallcap 250, Sensex (`^BSESN`)
- `refresher.py` already downloads from yfinance — extend to download and cache multiple indices daily
- Frontend: add a dropdown in results to switch benchmark
- Lambda: compute XIRR for each benchmark using the same cash flows, return all in the `status.json`

---

## Key Credentials & Config

| Item | Value | Location |
|---|---|---|
| GA4 Measurement ID | G-2YGVB963RE | `layout.tsx` |
| Google OAuth Client ID | `1030081614603-...` | `calculator/page.tsx` |
| AWS Account ID | `681745772892` | — |
| AWS IAM profile | `ankit` | `~/.aws/credentials` |
| AWS Region | `ap-south-1` | `terraform/terraform.tfvars` |
| API Gateway URL | `https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com/` | `.env.production` |
| S3 jobs polling base | `https://xirrledger-jobs.s3.ap-south-1.amazonaws.com` | `calculator/page.tsx` |
| Lambda → PHP secret | (in `terraform/terraform.tfvars`) | Lambda env + Hostinger config.php |

---

## Common Operations

### Deploy Lambda code change
```bash
zip -j lambda/dist/lambda.zip lambda/handler.py lambda/processor.py lambda/refresher.py
AWS_PROFILE=ankit aws lambda update-function-code \
  --function-name xirr-processor \
  --zip-file fileb://lambda/dist/lambda.zip \
  --region ap-south-1
```

### Rebuild Lambda layer (after changing Python deps)
```bash
cd lambda && ./build_layer.sh   # needs Docker running
cd ../terraform && AWS_PROFILE=ankit terraform apply -auto-approve
```

### Build & push frontend
```bash
cd website
rm -rf out/
npm run build    # NEXT_PUBLIC_API_URL is read from .env.production automatically
git add out/     # IMPORTANT: always commit the full out/ folder, not just source files
git commit -m "Rebuild out/"
git push
```
> Note: `deploy.sh` runs on the **remote Hostinger server** — never run it locally.
> The server does `git pull` and copies `out/*` to public_html.

### Apply Terraform changes
```bash
cd terraform
AWS_PROFILE=ankit terraform apply -auto-approve
```

### Check SES verification status
```bash
AWS_PROFILE=ankit aws ses get-identity-verification-attributes \
  --identities xirrledger.com --region ap-south-1
```

### Check Lambda logs
```bash
AWS_PROFILE=ankit aws logs tail /aws/lambda/xirr-processor --follow --region ap-south-1
```

---

## Git Branches

| Branch | Purpose |
|---|---|
| `main` | Single active branch — all work merged here |
| `feature/manual-entries` | Merged into main (2026-02-23) — kept for reference |

### Feature Revert Reference

| Feature | Commit | How to revert |
|---|---|---|
| Outside Investments (manual entries) | `78c464b` | `git revert 78c464b` + redeploy Lambda |
| Download guide modal (Step 2) | `aee2138` | `git revert aee2138` |
| Edit Holdings / Stop & Edit buttons | `ae7d792` | `git revert ae7d792` |
| Full results data in email | `d20e8fb` | `git revert d20e8fb` + update SES template |
