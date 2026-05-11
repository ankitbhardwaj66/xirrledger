# XIRR Ledger — Deployment Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Hostinger (Static Hosting)                                 │
│  Next.js static export → Apache serves HTML/CSS/JS          │
│                                                             │
│  PHP Bridge (MySQL user database)                           │
│    save-user.php          — session create + device detect  │
│    track-step.php         — wizard step tracking            │
│    update-session.php     — Lambda result callback (COALESCE│
│                             prevents null overwrites)       │
│    get-report.php         — fresh S3 presigned URL on demand│
│    get-failed-sessions.php — support email candidate query  │
│    mark-support-email-sent.php                              │
│    dashboard.php          — admin funnel dashboard          │
│  config.php — gitignored; managed on server via SSH only   │
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
│             ├── xirrledger-uploads/   (ledger files, no expiry)   │
│             ├── xirrledger-jobs/      (status.json, OTPs, Nifty, 7d dev) │
│             └── xirrledger-reports/   (PDF reports, no expiry)    │
│                    ↕                                        │
│                   SES  (OTP email + report email on done)   │
│                                                             │
│  IAM Users                                                  │
│    ankit           — admin (local CLI + Terraform only)     │
│    xirrledger-server — s3:GetObject on reports/* only       │
│                       (used by get-report.php on Hostinger) │
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

### Calculator (`/calculator`) — Guided wizard (updated 2026-05-11)

Step-by-step wizard — each screen does one thing.

**Step flow:**
1. `broker` — Zerodha / Groww / Fyers. Fyers → goes directly to `upload-ledger` (only stocks/F&O supported)
2. `trade-type` — Stocks/F&O · Mutual Funds · Both. MF/Both disabled for Fyers (coming soon)
3. `upload-mf` *(MF or Both)* — Zerodha or Groww MF Order History XLSX; hash dedup; overlap detection
4. `upload-ledger` *(Stocks or Both)* — Zerodha: XLSX; Groww: **Stock Order History XLSX** (replaces PDF); Fyers: CSV per FY
5. `upload-dividend` *(optional, Zerodha stocks only)* — one XLSX per FY
6. `holdings` — current portfolio value (₹) + cash
7. `account-done` — "Calculate My XIRR" or "Add Another Account"
8. `results` — XIRR, Nifty comparison, insight card, PDF download
9. `edit-holdings` — edit any account's holdings value and recalculate without re-uploading

**Key behaviours:**
- `handleDraftCalculate(override?, override?)` — uploads all drafts in one `/session` call; caches session+keys in `wizardSession` state; re-submit via Edit Holdings skips upload entirely
- `wizardSession` cleared on "New Calculation" or "Add Another Account"
- Fyers: trade-type shown with MF/Both disabled + "COMING SOON" badge
- Groww: "Stocks" label (not F&O); order history has no charges (STT/brokerage excluded)
- Progress dots reflect actual path per broker/trade-type combo
- `completedAccounts[]` accumulates; shown as chips on broker screen

**Legacy `upload` + `details` steps preserved** — still reachable via old multi-file flow.

**MF tradebook (Zerodha, 2026-05-10):**
- Format: `tradebook-NBN208-MF.xlsx` — sheet "Mutual Funds", header row ~14, Trade Date/Type/Qty/Price/Trade ID columns
- Zerodha limits downloads to ≤365 days per export; users upload one XLSX per year
- Client-side: SheetJS reads date range + trade count per file; no overlap warnings (deduplicated server-side)
- Server-side: `parse_zerodha_mf_tradebook()` in processor.py; Trade ID dedup across all files post-concat (handles identical or overlapping files)
- MF cashflows merged into XIRR for both `'mf'` and `'both'` trade types — Zerodha Coin MF goes directly bank → BSE STAR MF (never hits the trading ledger), so tradebook flows must always be added on top of ledger flows
- PDF: `has_mf_split = trade_type == 'both'` — shows `└ Stocks` and `└ Mutual Funds` sub-rows under Total Invested and Total Withdrawn, plus MF gross activity footnote

**Auth — Email OTP:**
- Manual sign-in sends a 6-digit OTP via SES before proceeding
- Session persisted in `localStorage` (`xirrledger_session`, 7-day expiry)
- Google Sign-In bypasses OTP

**Outside investments (manual entries):**
- Optional — add investments not tracked by broker (govt bonds, gold bonds, etc.)
- Sent to Lambda as `manual_entries[]` with `account_id`; injected as additional outflows in XIRR

**Processing:**
- Async with animated progress steps
- Error modal on Lambda failure (no raw Python shown)
- Results: XIRR vs Nifty 50, portfolio stats, contextual insight card
- "Edit Holdings" → old `details` step with preserved data; "New Calculation" → back to `broker` step

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
- `handler.py` — routes: `POST /session`, `POST /process`, `POST /validate`, `POST /send-otp`, `POST /verify-otp`
  - `handle_validate()`: deep file parse check; returns `{valid, transactions_found}` or `{valid: false, error}`
  - `ValueError` → user-friendly message; `Exception` → "Something went wrong" (no raw Python in UI)
- `processor.py` — full pipeline:
  - **Parsers:**
    - `parse_zerodha_ledger_xlsx()` — XLSX ledger; "Funds added" → outflows, "Payout"/"quarterly settlement" → inflows; reads Client ID
    - `parse_zerodha_csv()` — legacy CSV ledger (same logic)
    - `parse_zerodha_mf_tradebook()` — Zerodha MF Tradebook XLSX; buy→outflow, sell→inflow; `trade_id` for cross-file dedup
    - `parse_zerodha_dividends_xlsx()` — dividend XLSX; positive inflows + detail rows for PDF
    - `parse_groww_stock_order_history_xlsx()` — **new (2026-05-11)**; Groww Stock Order History XLSX; BUY→outflow, SELL→inflow; Executed orders only; filename-based client code extraction; no PAN needed
    - `parse_groww_pdf()` — legacy Groww balance-statement PDF (pdfplumber, PAN password) — kept as fallback
    - `parse_groww_mf_order_history()` — Groww MF Order History XLSX (sheet "Transactions")
    - `parse_fyers_csv()` — Fyers ledger CSV; "Funds added" → outflows, "Funds withdrawn" → inflows
  - **XIRR fallback (2026-05-11):** when solver fails with always-negative NPV (fully liquidated net-loss portfolio, current_value=0), falls back to simple annualised return: `(total_recovered/total_invested)^(1/years) - 1`. PDF marks with `*` and footnote.
  - **MF tradebook processing** (`mf_file_keys` per account):
    - All files parsed, concatenated, then Trade ID deduplicated post-concat (`_dedup_mf()`)
    - Tracks `mf_invested` (gross buys) + `mf_redeemed` (gross sells) for PDF breakdown
    - MF cashflows merged into XIRR for both `'mf'` and `'both'` trade types
    - `'both'`: ledger (stocks) + tradebook (MF) = total outflows; user enters combined current value
    - `'mf'`-only: tradebook is the only cashflow source; `account_outflows` empty guard skipped
  - **Manual entries** — injected as additional outflows; linked to specific account by `account_id`
  - **XIRR calculation** — Newton-Raphson + Brent fallback
  - **Nifty 50 comparison** — S3 daily cache (no yfinance on user requests)
  - **PDF generation** (ReportLab) — Navy + Gold theme:
    - Per-account table: `has_mf_split = trade_type == 'both'` → shows `└ Stocks` / `└ Mutual Funds` sub-rows under Total Invested and Total Withdrawn; MF gross activity footnote
    - Outside investments sub-rows: `└ Broker transactions` / `└ Outside investments`
    - Insight card (OUTPERFORMING / KEEP GOING / UNDERPERFORMING)
    - Multi-account: pie + bar charts, comparison table
  - **Status polling** via S3 jobs bucket; **email** via SES; **PHP bridge** notification on completion
- `refresher.py` — daily Nifty 50 cache refresh via EventBridge (6:00 AM IST)

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
- [ ] PDF report opens in new tab; confirm presigned URL works
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
- [ ] Attempt direct S3 bucket listing — bucket policy should deny `s3:ListBucket`
- [ ] Attempt to upload directly to S3 using a presigned upload URL from another session
- [ ] Access `get-report.php` without the dashboard key — should return 403
- [ ] Access `get-report.php` with a session that has `status != 'done'` — should return 404
- [ ] Access `dashboard.php` without the key — should return 403

#### PHP Bridge
- [ ] POST to `update-session.php` without `X-API-Secret` header — should return 403
- [ ] POST to `update-session.php` with null xirr — verify COALESCE preserves existing value in DB
- [ ] Verify `config.php` returns 403 if accessed directly via browser

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
| AWS IAM profile (admin) | `ankit` | `~/.aws/credentials` |
| AWS IAM user (server) | `xirrledger-server` | Hostinger `config.php` (gitignored) |
| AWS Region | `ap-south-1` | `terraform/terraform.tfvars` |
| API Gateway URL (prod) | `https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com/` | `.env.production` |
| API Gateway URL (dev) | `https://wu3hy4822m.execute-api.ap-south-1.amazonaws.com` | `.env.dev` |
| S3 jobs polling base | `https://xirrledger-jobs.s3.ap-south-1.amazonaws.com` | `calculator/page.tsx` |
| Lambda → PHP secret | (in `terraform/terraform.tfvars`) | Lambda env + Hostinger `config.php` |
| Dashboard key | (in Hostinger `config.php`) | `DASHBOARD_KEY` constant |
| Server `config.php` | gitignored — see `config.example.php` | SSH to server to edit |

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
rsync -avz --delete --exclude=dev --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/

# Dev (dev branch):
cd website && rm -rf out/ && npm run build:dev && cd ..
rsync -avz --delete --exclude=robots.txt --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/dev/
```
> `website/out/` is **gitignored** — never commit it. Always rsync directly to server.
> `api/config.php` is **gitignored** — manage it on the server via SSH. Use `config.example.php` as the template.
> `deploy.sh` is no longer used.

### Refresh expired report presigned URLs in DB
Run when `report_url` values in the DB have expired (e.g. after a long gap since last run):
```bash
python3 scripts/refresh_report_urls.py
```
Scans `xirrledger-reports` S3 bucket, generates fresh 7-day URLs using the `ankit` IAM profile, updates DB via `update-session.php`. Safe to re-run — COALESCE in `update-session.php` prevents overwriting existing XIRR values.

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
| `main` | xirrledger.com | `npm run build` | `/home/u889244618/domains/xirrledger.com/public_html/` |
| `dev` | dev.xirrledger.com | `npm run build:dev` | `/home/u889244618/domains/xirrledger.com/public_html/dev/` |

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
| Dashboard device column + PDF proxy | `dbeceed` | Revert `dashboard.php`, `save-user.php`; drop `device_type` column from DB; delete `get-report.php` |
| `get-report.php` S3 presigned proxy | `8012647` | Delete `get-report.php`; revert `dashboard.php` PDF cell to use `report_url` directly |
| COALESCE in `update-session.php` | `4b049d7` | Revert `update-session.php` to direct SET (caution: partial updates will null existing fields) |
| `config.php` gitignored | `e5a1559` | Remove from `.gitignore`; `git add website/public/api/config.php`; remove `config.example.php` |
