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
│    POST /send-otp   — generate + email OTP via SES          │
│    POST /verify-otp — validate OTP (S3 store, 10-min TTL)   │
│    POST /session    — create session + presigned upload URLs │
│    POST /validate   — deep file parse check                 │
│    POST /process    — trigger async XIRR computation        │
│                    ↕                                        │
│                   S3                                        │
│             ├── xirrledger-uploads/   (ledger files)        │
│             ├── xirrledger-jobs/      (status.json, OTPs, Nifty) │
│             └── xirrledger-reports/   (PDF reports)         │
│                    ↕                                        │
│                   SES  (OTP email + report email on done)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Status

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 15 (static export) | ✅ Live |
| Hosting | Hostinger shared hosting | ✅ Live |
| Domain | xirrledger.com | ✅ Live |
| Analytics | Google Analytics 4 (G-2YGVB963RE) | ✅ Live |
| Auth | Google Identity Services + email OTP (SES) | ✅ Live |
| Session | localStorage (7-day expiry) | ✅ Live |
| Calculator UI | Next.js /calculator page | ✅ Live |
| Infrastructure | Terraform | ✅ Applied |
| Backend | AWS Lambda (`xirr-processor`, `nifty-refresher`) | ✅ Deployed |
| File storage | AWS S3 (4 buckets, no auto-delete on prod) | ✅ Live |
| Email | AWS SES (OTP + report, sender: "XIRR Ledger") | ✅ Verified |
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
- Drag & drop file upload (CSV=Zerodha/Fyers, PDF=Groww), multi-file
- SHA-256 content hashing — duplicate file detection across uploads
- **2-layer file validation** — runs on "Continue →" (Step 2), before going to details:
  - **Layer 1 (frontend, instant)**: `detectBrokerFromContent()` reads file bytes — checks CSV headers for Zerodha/Fyers structure, checks PDF magic bytes + `/Encrypt` entry (Groww PDFs are always password-protected); rejects invalid files immediately with a per-file error + **Remove** button
  - **Layer 2 (Lambda, deep)**: `POST /validate` endpoint — downloads file from S3, runs actual parser, returns `{valid, transactions_found}` or `{valid: false, error}`; shown as per-file "checking…" → ✓ / error
  - Files upload to S3 on "Continue →" click; `startProcessing()` reuses the already-uploaded session
- Content-based broker detection (`detectBrokerFromContent`) — not filename-based
- Groww PAN entry: "Same PAN for all" checkbox or per-file
- Files with same PAN auto-grouped into one Groww account
- **Real-time PAN validation** — pdfjs-dist attempts to decrypt PDF with entered PAN; shows ✓/✗ after 10 chars typed
  - Worker: `public/pdf.worker.min.js` (must be `.js` not `.mjs` — Apache on Hostinger serves `.mjs` as `text/plain`)
  - Calculate button locked until all PANs valid
- Per-account holdings + cash inputs — labelled "Current holdings value (₹)" with hint "Today's market value of your holdings — not what you invested"
- **Outside Investments (manual entries)** — optional card in Step 3 (commit `78c464b`)
  - Add any number of investments not tracked by broker (govt bonds, gold bonds, FDs, etc.)
  - Each entry: description (optional), amount (₹), date, **required account link**
  - Account selection is mandatory — Calculate button blocked until all entries linked
  - Sent to Lambda as `manual_entries` array with `account_id`; treated as additional cash outflows in XIRR calculation
  - Current value of these investments should be included in broker holdings field
  - **To revert if removed:** `git revert 78c464b` then redeploy Lambda
- "How to download?" link opens a modal with tabbed guide: **Zerodha | Groww | Fyers** (each with step-by-step instructions)
- Async processing with animated progress steps
- **Processing error modal** — if Lambda returns an error, a fixed-position overlay shows the message + "← Go Back & Try Again" button (no raw Python ever shown)
- Results: XIRR vs Nifty 50, portfolio stats (total invested, current value, net gain, investment period), contextual insight card
- Results disclaimer: "This report assumes all investments were made exclusively through the provided account statements."
- **Edit Holdings button** on results page — returns to Step 3 with all data preserved (files, PANs, values); user edits and recalculates
- **Stop & Edit Holdings button** on processing page — cancels polling, returns to Step 3 with all data preserved
- XIRR / Nifty figures shown to 2 decimal places (`.toFixed(2)`) matching email precision
- FaTrophy icon replaces 🎉 emoji on "beat Nifty" line
- PDF report opens in new tab (presigned S3 URL, **24-hour** expiry)
- Step 1 subtitle: "We will email you the report too" (concise, no extra header bar)

### Auth — Email OTP (2026-04-02)
- Manual sign-in now sends a 6-digit OTP via SES before proceeding to upload
- `POST /send-otp`: generates OTP, stores in S3 jobs bucket (`otps/{sha256(email)}.json`), 10-min TTL, sends email
- `POST /verify-otp`: validates OTP, checks expiry + max 3 attempts, deletes record on success
- Frontend: new `'otp'` step in calculator wizard; blur overlay during send/verify; resend with success feedback
- Session persisted in `localStorage` (`xirrledger_session`, 7-day expiry); restored on page load
- Google Sign-In still bypasses OTP (already trusted)
- Email sender: `XIRR Ledger <reports@xirrledger.com>` (both OTP and report emails)
- Logo image: `website/public/logo-email.png` hosted at `xirrledger.com/logo-email.png`

### Lambda
- `handler.py` — routes: `POST /session` (presigned URLs), `POST /process` (async trigger), `POST /validate` (deep file parse), **`POST /send-otp`**, **`POST /verify-otp`**
  - `handle_validate()`: downloads file from S3, runs actual parser, returns `{valid, transactions_found}` or `{valid: false, error}`
  - `ValueError` → user-friendly message; generic `Exception` → "Something went wrong" (raw Python never reaches UI)
- `processor.py` — full pipeline:
  - Zerodha CSV parser (Funds added, Payouts, Quarterly settlements)
  - Groww PDF parser (pdfplumber, PAN as password) — supports **two formats**:
    1. Annual statement PDFs (downloaded via Groww UI — from April 2023 only)
    2. "Statement of accounts of funds" PDF (full history — request from Groww support team)
    - Deposit segment types matched: `RAZORPAY_DEPOSIT`, `DIRECT_NETBANKING`, `GROWW_MANDATE`, `GROWW_UPI`
    - Withdrawal segment type: `GROWW_WITHDRAW`
  - Cross-file duplicate detection for Groww (same date+amount across files = skip)
  - Guard against empty `combined_outflows` before `min()` — raises `ValueError` with clear message if no transactions found
  - **Manual entries** (`manual_entries` in event) — injected as additional cash outflows before XIRR (commit `78c464b`)
    - Each entry has `account_id` to link to a specific broker account for per-account XIRR
    - Per-account outflows: linked manual entries injected before per-account XIRR calculation
    - `handle_process` forwards `manual_entries` in the async self-invocation payload (was missing — fixed 2026-02-25)
  - XIRR calculation (Newton-Raphson + Brent fallback)
  - Nifty 50 comparison (reads from S3 daily cache — no yfinance on user requests)
  - PDF report generation (ReportLab) — fully rethemed Navy + Gold (2026-02-24):
    - Title "XIRR Ledger Report" in gold; gold HR divider; navy table headers; gold section headings
    - KPI banner: continuous block, gold separators, white text on coloured performance box
    - Removed Simple Return row; insight card (OUTPERFORMING / KEEP GOING / UNDERPERFORMING)
    - Page 2 charts (multi-account): stacked pie (Capital Distribution) + bar (Profit/Loss in Lakhs)
    - Per-account table shows breakdown sub-rows under "Total Invested" when linked manual entries exist: └ Broker transactions / └ Outside investments
    - PageBreak placed before insight card so card + account analysis share same page (no empty page 2)
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
- Lambda layer: `xirrledger-deps` (pandas, numpy, scipy, reportlab, pdfplumber, openpyxl, requests)
- 4 S3 buckets — **prod**: no auto-delete on uploads/reports; dev: 7-day lifecycle on all buckets
- IAM policy includes `s3:DeleteObject` on jobs bucket (required for OTP cleanup)
- IAM role with S3 + SES + self-invoke permissions
- EventBridge rule for daily Nifty refresh
- SES domain identity (verified), email template `xirrledger-report-ready` (Navy + Gold theme, full results data)
- CloudWatch log groups (7-day retention)

---

## XIRR Calculation Architecture

### Cash Flow Sign Convention

| Direction | Sign | Examples |
|---|---|---|
| Outflow (money leaves pocket) | **negative** | Broker deposits, SGB purchases, manual entries |
| Inflow (money returns to pocket) | **positive** | Broker withdrawals, dividends, current portfolio value |

All cash flow DataFrames store amounts with this sign already applied:
- `acc_out["amount"]` — negative values
- `acc_inf["amount"]` — positive values
- `dividend_cashflows["amount"]` — positive values

---

### Pipeline: per account

```
For each account (zerodha / groww / fyers):
  1. Parse broker files → acc_out (outflows), acc_inf (broker inflows)
  2. Parse dividend XLSX files → dividend_cashflows (separate from acc_inf)
  3. Inject linked manual_entries into acc_out (outflows only)
  4. Store in account_stats_list:
       { outflows: acc_out, inflows: acc_inf, dividend_cashflows, dividend_details }
```

Dividends are **never merged into `acc_inf`**. They are kept separate so that:
- `total_withdrawn` (PDF display) = broker inflows only (clean, no dividend noise)
- `net_gain` = current_value + total_withdrawn + dividend_total − total_invested
- XIRR cash flows = broker outflows + broker inflows + dividends + current_value (today)

---

### Pipeline: combined portfolio

```
combined_outflows = concat(all acc_out)
combined_inflows  = concat(all acc_inf)          # broker only
combined_div_cfs  = concat(all dividend_cashflows)

compute_portfolio_stats(combined_outflows, combined_inflows, combined_value,
                        dividend_cashflows=combined_div_cfs)
```

---

### `compute_portfolio_stats(outflows, inflows, current_value, nifty_data, dividend_cashflows)`

```python
total_invested  = -outflows["amount"].sum()
total_withdrawn = inflows["amount"].sum()        # broker withdrawals only
dividend_total  = dividend_cashflows["amount"].sum() if provided else 0

net_gain = current_value + total_withdrawn + dividend_total - total_invested

# XIRR cash flows = broker outflows + (broker inflows + dividends) + terminal value
xirr_inflows = concat(inflows, dividend_cashflows)
cash_flows = [outflows] + [xirr_inflows] + [current_value]   # current_value = positive
dates      = [outflow dates] + [inflow+div dates] + [today]

xirr_rate = calculate_xirr(cash_flows, dates)   # Newton-Raphson + Brent fallback
```

Returns: `total_withdrawn` (broker only), `dividend_total`, `net_gain` (all-in), `xirr_percentage`.

---

### XIRR Solver (`calculate_xirr`)

```
xNPV(r) = Σ CF_i / (1+r)^(days_i / 365.25) = 0

Solvers tried in order:
1. Newton-Raphson — 5 starting guesses: [0.1, 0.0, -0.5, 0.5, 1.0]
2. Brent method   — brackets: lo ∈ {-0.999, -0.99, -0.95}, hi ∈ {10, 5, 2}

Result accepted if: |xNPV(r)| < 1.0 AND -0.99 < r < 10
Returns None (N/A) if no convergence.
```

Common reasons for N/A: current_value = 0 with heavy losses (Fyers closed account),
future-dated cash flows beyond `today`, all cash flows same sign.

---

### Dividend XLSX Parsing (`parse_zerodha_dividends_xlsx`)

- Source: Zerodha `dividends-{CLIENT_ID}-{FY_START}_{FY_END}.xlsx`
- Header row detected dynamically by scanning for `"Ex-Date"` column
- Required columns: `Symbol`, `Ex-Date`, `Net Dividend Amount`
- **Filters applied:**
  - `amt > 0` — skip zero/negative entries
  - `dt <= today` — skip future ex-dates (upcoming FY files have future entries)
  - `"total" not in sym.lower()` — skip Excel summary/total rows
- Returns: `(xirr_df, detail_list)` — xirr_df has `{date, amount}`, detail_list has `{symbol, amount}`
- Multiple FY files can be uploaded per account — all are concatenated
- Client ID matching: `dividends-GZW478-2025_2026.xlsx` → client_id = `GZW478` → linked to `ledger-GZW478.csv`

---

### Nifty 50 Benchmark

```
compute_nifty_stats(outflows, inflows, nifty_data):
  - Mirror every outflow date/amount as a Nifty 50 buy (units = amount / price_on_date)
  - Mirror every inflow date as a proportional sell
  - Terminal value = units_held × current_Nifty_price
  - Nifty XIRR = calculate_xirr on these mirrored cash flows
```

Data: daily close prices from S3 cache (`xirrledger-jobs/nifty50_cache.csv`), refreshed daily at 6 AM IST by `nifty-refresher` Lambda. If cache unavailable, Nifty XIRR = N/A (graceful degradation).

---

### PDF Report Layout (per account table)

```
Metric              │ Value
Investment Period   │ 1315 days  (3.60 years)
Total Transactions  │ 105 investments,  138 withdrawals
Total Invested      │ 46,73,336.00
  └ Broker          │ XX,XX,XXX       ← only if manual entries linked
  └ Outside invest  │ XX,XX,XXX       ← only if manual entries linked
Total Withdrawn     │ 11,16,123.16    ← broker only
Current Value       │ 37,67,643.00
Dividend Income     │ 27,743.91       ← only if dividend file uploaded; amber colour
Net Gain / Loss     │ 2,38,174.07     ← includes dividend income
XIRR (Annualised)   │ 7.94%           ← amber, bold; uses all cash flows incl. dividends
```

---

## Testing Checklist 🧪

### Scenario Testing

#### File Upload & Parsing
- [ ] Zerodha CSV only — single file, single year
- [ ] Zerodha CSV — multiple years (ensure no duplicate transactions)
- [ ] Groww PDF only — single PAN, annual statement format
- [ ] Groww PDF — full-history format (from Groww support team, 12-column)
- [ ] Groww PDFs — multiple PANs (different accounts treated separately)
- [ ] Groww PDFs — multiple files with same PAN (auto-grouped, cross-file dedup)
- [ ] Fyers Ledger CSV — single year
- [ ] Fyers Ledger CSV — multiple years (cross-file dedup)
- [ ] All 3 brokers combined in one session
- [ ] Only manual entries submitted (no broker files)
- [ ] Manual entries combined with broker files
- [ ] File with zero transactions (empty ledger — should surface a clear error, not crash)
- [ ] Very large files (10+ years of Zerodha history, 100k+ rows)
- [ ] Overlapping date ranges across files (ensure dedup logic handles it)

#### Edge Cases
- [ ] Investment period < 1 year (XIRR should still compute correctly)
- [ ] Single cash flow (only one deposit, no withdrawal) — XIRR boundary condition
- [ ] All investments in the same month
- [ ] Holdings value = 0 entered by user (zero or negative XIRR)
- [ ] Holdings value much smaller than invested (severe negative XIRR)
- [ ] Extremely high XIRR (>100%) — Newton-Raphson convergence check
- [ ] Future dates in manual entries (should reject or warn)
- [ ] Nifty 50 cache unavailable (S3 read fails) — graceful degradation
- [ ] User closes tab mid-processing — verify email still sends on Lambda completion

#### UX / Flow
- [ ] Google Sign-In flow — new user vs returning user
- [ ] Manual name/email flow (no Google sign-in)
- [ ] "Same PAN for all" checkbox — switch between single and per-file modes
- [ ] PAN validation ✓/✗ with correct and wrong PANs
- [ ] Duplicate file upload detection (same file content, different filename)
- [ ] Edit Holdings → recalculate — verify state is fully preserved
- [ ] Stop & Edit on processing page — verify polling cancelled, Step 3 restored
- [ ] PDF report opens in new tab; confirm 24h presigned URL works
- [ ] Email received with correct figures matching on-screen results
- [ ] Mobile responsiveness — all 5 steps on small screens

---

### Security Testing

#### File Upload
- [ ] Upload a non-CSV file renamed as `.csv` (e.g. a JPEG or shell script) — Lambda should fail gracefully, not execute
- [ ] Upload a non-PDF file renamed as `.pdf` — pdfplumber should error, not crash Lambda
- [ ] Upload an oversized file (>50MB) — API Gateway / Lambda payload limit should block it
- [ ] CSV with formula injection in cells (`=CMD()`, `@SUM`) — verify no execution path
- [ ] CSV with path traversal in header values (`../../etc/passwd`) — verify safe parsing
- [ ] PDF with embedded JavaScript — verify pdfplumber doesn't execute it

#### API & Lambda
- [ ] Call `POST /process` with a fabricated/expired session ID — should return 4xx
- [ ] Call `POST /process` with a session ID belonging to a different user — S3 key isolation check
- [ ] Replay attack: reuse a previously completed session ID to re-trigger processing
- [ ] Submit `manual_entries` with extreme values (negative amounts, year 1900 dates) — validate input sanitisation in Lambda
- [ ] Inject special characters in `name`/`email` fields sent to PHP bridge — SQL injection check
- [ ] Fuzz the `holdings` and `cash` fields with non-numeric strings — Lambda should handle `ValueError` gracefully

#### S3 & Presigned URLs
- [ ] Attempt to access another job's `status.json` by guessing the session UUID
- [ ] Attempt to access the PDF report URL after 24h expiry — should return 403
- [ ] Attempt direct S3 bucket listing — bucket policy should deny `s3:ListBucket`
- [ ] Attempt to upload directly to S3 using a presigned upload URL from another session

#### Frontend & CORS
- [ ] Call API Gateway from an unlisted origin — CORS policy should block it
- [ ] Check Content-Security-Policy headers on Hostinger (prevent XSS via injected scripts)
- [ ] Verify no sensitive credentials exposed in browser `window.*` or Next.js `NEXT_PUBLIC_*` env vars beyond what is intentional
- [ ] Check that Google OAuth `client_id` is restricted to `xirrledger.com` in Google Cloud Console

#### Rate Limiting & Abuse
- [ ] Spam `POST /session` rapidly from the same IP — verify API Gateway throttling (currently default AWS limits)
- [ ] Submit 100 manual entries in one request — check Lambda memory/timeout behaviour
- [ ] Automated form submission without Google Sign-In (only manual email) — any bot protection needed?

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

## Dev vs Prod Environment

| Flag | Dev | Prod |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://wu3hy4822m.execute-api.ap-south-1.amazonaws.com` | `https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com/` |
| `NEXT_PUBLIC_DEBUG` | `true` (baked in `.env.dev`) | not set (devLog is a no-op) |
| `SEND_EMAIL` (Lambda env) | `false` | `true` (default) |
| DB writes (`save-user.php`) | skipped when `NEXT_PUBLIC_DEBUG=true` | always runs |
| Lambda function | `xirr-processor-dev` | `xirr-processor` |
| S3 jobs bucket | `xirrledger-jobs-dev` | `xirrledger-jobs` |
| Terraform dir | `terraform-dev/` | `terraform/` |

**SES email template** (`xirrledger-report-ready`) is managed as a single source of truth in `lambda/email/report-ready.html` — referenced via `file()` in `terraform/ses.tf`. Never edit the template directly in AWS Console or it will be reverted on next `terraform apply`.

---

## Common Operations

### Deploy Lambda code change
```bash
zip -j lambda/dist/lambda.zip lambda/handler.py lambda/processor.py lambda/refresher.py
# Prod:
aws --profile ankit lambda update-function-code \
  --function-name xirr-processor \
  --zip-file fileb://lambda/dist/lambda.zip \
  --region ap-south-1
# Dev:
aws --profile ankit lambda update-function-code \
  --function-name xirr-processor-dev \
  --zip-file fileb://lambda/dist/lambda.zip \
  --region ap-south-1
```

### Rebuild Lambda layer (after changing Python deps)
```bash
cd lambda && ./build_layer.sh   # needs Docker running
cd ../terraform && AWS_PROFILE=ankit terraform apply -auto-approve
```

### Build & deploy frontend
```bash
# Prod (main branch):
cd website && rm -rf out/ && npm run build && cd ..
rsync -avz --delete --exclude=dev -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/

# Dev (dev branch):
cd website && rm -rf out/ && npm run build:dev && cd ..
rsync -avz --delete -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/dev/
```
> `website/out/` is **gitignored** — never commit it. Always rsync directly to server.
> `deploy.sh` is no longer used.

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

| Branch | URL | Build command | Hostinger path |
|---|---|---|---|
| `main` | xirrledger.com | `npm run build` | `/home/u889244618/domains/xirrledger.com/public_html/xirrcalculator/` |
| `dev` | dev.xirrledger.com | `npm run build:dev` | `/home/u889244618/domains/xirrledger.com/public_html/dev/xirrcalculator/` |

### Feature Revert Reference

| Feature | Commit | How to revert |
|---|---|---|
| Outside Investments (manual entries) | `78c464b` | `git revert 78c464b` + redeploy Lambda |
| Download guide modal (Step 2) | `aee2138` | `git revert aee2138` |
| Edit Holdings / Stop & Edit buttons | `ae7d792` | `git revert ae7d792` |
| Full results data in email | `d20e8fb` | `git revert d20e8fb` + update SES template |
| 2-layer file validation + Upload on Continue | `77343eb`–`04d1386` | `git revert 77343eb..04d1386` + redeploy Lambda |
| Processing error modal | `5de5c05` | `git revert 5de5c05` |
| Lambda ValueError/Exception split + empty outflows guard | `39a07a1` | `git revert 39a07a1` + redeploy Lambda |
| Outside investments account linking (required, per-account XIRR) | (2026-02-25) | Revert frontend + Lambda changes |
| PDF breakdown sub-rows + fix empty page 2 | (2026-02-25) | Lambda-only — redeploy previous processor.py |
| Dividend XLSX inflows (Zerodha) | `8fa0468` | Revert frontend (dividendFiles state) + Lambda (processor.py) |
| Upload overlay + sequential validation | (2026-02-27) | Revert `calculator/page.tsx` + `globals.css` overlay/animation code |
| Email OTP verification | `6f06f10` | Remove `'otp'` step from `CalculatorClient.tsx`; remove `/send-otp` `/verify-otp` from `handler.py` + terraform |
| Session persistence (localStorage) | `dca6a88` | Remove `saveSession`/`clearSession`/restore `useEffect` from `CalculatorClient.tsx` |
| S3 no auto-delete (prod) | `afef0a2` | Re-add lifecycle config blocks to `terraform/s3.tf` + `terraform apply` |
| devLog / timing logs | (2026-02-27) | Remove `devLog()` calls and `performance.now()` timing in `calculator/page.tsx` |
| SEND_EMAIL flag (Lambda) | (2026-02-27) | Remove env var check in `processor.py`; set `SEND_EMAIL` back to `true` on dev |
| SES template → file() | (2026-02-27) | Revert `terraform/ses.tf` to inline HTML; update to match `report-ready.html` |
