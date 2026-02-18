# XIRR Ledger — Deployment Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Hostinger (Static Hosting)                                 │
│  Next.js static export → Apache serves HTML/CSS/JS          │
│  PHP bridge API → MySQL user database                       │
└───────────────────┬─────────────────────────────────────────┘
                    │ API calls from browser
┌───────────────────▼─────────────────────────────────────────┐
│  AWS (Infrastructure via Terraform)                         │
│                                                             │
│  API Gateway → Lambda (Python)                              │
│                    ↕                                        │
│                   S3                                        │
│             ├── uploads/{session_id}/   (ledger files)      │
│             ├── jobs/{session_id}/      (status.json)       │
│             └── reports/{session_id}/  (PDF reports)        │
│                    ↕                                        │
│                   SES  (email report on completion)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 16 (static export) | ✅ Live |
| Hosting | Hostinger shared hosting | ✅ Live |
| Domain | xirrledger.com | ✅ Live |
| Analytics | Google Analytics 4 (G-2YGVB963RE) | ✅ Live |
| Auth | Google Identity Services (OAuth 2.0) | ✅ Frontend done |
| Calculator UI | Next.js /calculator page | ✅ Frontend done |
| Backend compute | AWS Lambda (Python) | 🔲 Planned |
| File storage | AWS S3 | 🔲 Planned |
| Email | AWS SES | 🔲 Planned |
| Infrastructure | Terraform | 🔲 Planned |
| User DB | MySQL on Hostinger | 🔲 PHP bridge needed |
| CI/CD | GitHub → manual deploy.sh | ✅ Working |

---

## What's Done ✅

### Website & Content
- [x] Next.js 16 website with Tailwind CSS
- [x] Pages: Home, Features, How It Works, FAQ, Contact, Blog
- [x] Blog system with MDX — 4 posts published:
  - Why Brokerage Charges Matter in XIRR
  - Why Ledger-Based XIRR Shows True Returns
  - Why Every Trader Needs XIRR
  - Are You Actually Beating Nifty 50?
- [x] Per-post SEO meta tags + keywords support
- [x] Google Analytics 4 integrated
- [x] Responsive navigation + footer
- [x] Static export + Hostinger deployment via `deploy.sh`

### Calculator Frontend (`/calculator`)
- [x] Google Sign-In (GSI One Tap + button)
- [x] Manual name / email / broker selection fallback
- [x] Drag & drop file upload (CSV for Zerodha, PDF for Groww)
- [x] Auto broker detection from file extension
- [x] Multi-file support with per-file remove
- [x] PAN password field (shown only when Groww files detected)
- [x] Current holdings + available cash inputs
- [x] Async processing UI with animated progress steps
- [x] Results page: XIRR vs Nifty 50, beat/miss badge, portfolio stats
- [x] PDF download button
- [x] "Email will be sent if you close the tab" UX

### Google OAuth
- [x] Google Cloud project: `xirrledger`
- [x] OAuth consent screen configured (External, In production)
- [x] OAuth Client ID created for Web application
- [x] Authorised origin: `https://xirrledger.com`
- [x] Client ID: `1030081614603-onnmmupafevkn0hojoj4qk023tuohius.apps.googleusercontent.com`

---

## What's Planned 🔲

### Phase 1 — AWS Infrastructure (Terraform)
Set up all AWS resources as code so they can be reproduced, versioned, and torn down cleanly.

- [ ] S3 bucket: `xirrledger-uploads` (ledger files, auto-delete after 24h)
- [ ] S3 bucket: `xirrledger-reports` (PDF reports, signed URLs, 7-day expiry)
- [ ] S3 bucket: `xirrledger-jobs` (status.json per session, public read)
- [ ] IAM role for Lambda with S3 + SES permissions
- [ ] Lambda function: `xirr-processor` (Python, 512MB, 120s timeout)
- [ ] Lambda Layer: Python dependencies (pandas, numpy, scipy, reportlab, pdfplumber, yfinance)
- [ ] API Gateway (HTTP API):
  - `POST /session` — create session, return presigned S3 upload URLs
  - `POST /process` — trigger async Lambda processing
- [ ] SES domain verification for `xirrledger.com`
- [ ] SES email template: report ready notification
- [ ] Environment variables in Lambda:
  - `S3_UPLOADS_BUCKET`
  - `S3_REPORTS_BUCKET`
  - `S3_JOBS_BUCKET`
  - `SES_FROM_EMAIL`
  - `HOSTINGER_API_URL` (PHP bridge endpoint)

### Phase 2 — Lambda Function (Python)
Port existing `xirr_calculator.py` logic into a Lambda handler.

- [ ] Handler entry point: reads event → routes to processor
- [ ] Step 1: Write `status.json` → `{ status: "parsing" }`
- [ ] Step 2: Download ledger files from S3
- [ ] Step 3: Detect broker per file (CSV = Zerodha, PDF = Groww)
- [ ] Step 4: Parse Zerodha CSV → cash flows
- [ ] Step 5: Decrypt + parse Groww PDF (PAN as password) → cash flows
- [ ] Step 6: Merge cash flows across all accounts
- [ ] Step 7: Write `status.json` → `{ status: "fetching" }`
- [ ] Step 8: Fetch Nifty 50 data via yfinance
- [ ] Step 9: Write `status.json` → `{ status: "computing" }`
- [ ] Step 10: Calculate XIRR (Newton-Raphson + Brent fallback)
- [ ] Step 11: Calculate Nifty 50 mirror XIRR
- [ ] Step 12: Write `status.json` → `{ status: "report" }`
- [ ] Step 13: Generate PDF report (reportlab)
- [ ] Step 14: Upload PDF to S3 reports bucket
- [ ] Step 15: Write `status.json` → `{ status: "done", report_url, xirr, nifty_xirr, ... }`
- [ ] Step 16: POST to Hostinger PHP bridge (update MySQL)
- [ ] Step 17: Send email via SES with report link

### Phase 3 — Hostinger PHP Bridge
Two simple PHP endpoints that connect Lambda to MySQL.

- [ ] `POST /api/save-user.php` — called by frontend on form submit
  ```json
  { "session_id", "name", "email", "broker", "google_token" }
  ```
- [ ] `POST /api/update-session.php` — called by Lambda on completion
  ```json
  { "session_id", "status", "report_url", "xirr", "nifty_xirr" }
  ```
- [ ] Auth token between Lambda and PHP (shared secret in env var)

### Phase 4 — MySQL Schema
```sql
CREATE TABLE xirr_sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  session_id    VARCHAR(64) UNIQUE NOT NULL,
  google_id     VARCHAR(128),
  name          VARCHAR(100),
  email         VARCHAR(100),
  broker        VARCHAR(20),
  status        VARCHAR(20) DEFAULT 'pending',
  xirr          DECIMAL(8,4),
  nifty_xirr    DECIMAL(8,4),
  report_url    TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME
);
```

### Phase 5 — Wire Frontend to Lambda
Replace mock/simulation code in `/calculator/page.tsx` with real API calls.

- [ ] `POST /session` → get presigned S3 URLs → upload files directly to S3
- [ ] `POST /api/save-user.php` → save user to MySQL
- [ ] `POST /process` → trigger Lambda, get job ID
- [ ] Poll `jobs/{session_id}/status.json` every 2s → update progress UI
- [ ] On `status: done` → render real results from Lambda response
- [ ] Set `NEXT_PUBLIC_API_URL` env var to API Gateway URL

### Phase 6 — Returning Users
- [ ] Look up user by `google_id` or `email` in MySQL on sign-in
- [ ] Show past reports if returning user
- [ ] "Your last report: 3 days ago — Download again" UX

---

## Key Credentials & Config

| Item | Value | Stored |
|---|---|---|
| GA4 Measurement ID | G-2YGVB963RE | `layout.tsx` |
| Google OAuth Client ID | `1030081614603-onnmmupafevkn0hojoj4qk023tuohius.apps.googleusercontent.com` | `calculator/page.tsx` |
| Google OAuth Client Secret | (saved separately — not in code) | Secure notes |
| API Gateway URL | TBD (after Terraform apply) | `NEXT_PUBLIC_API_URL` env var |
| Lambda → PHP shared secret | TBD | Lambda env + Hostinger env |

---

## Git Branches

| Branch | Purpose | Status |
|---|---|---|
| `main` | Production — deployed to Hostinger | Active |
| `feature/calculator-page` | Calculator UI + Google auth | In progress |

---

## Deployment Steps (Current)

```bash
# Build
cd website
npm run build

# Deploy to Hostinger (copies out/ to public_html)
./deploy.sh
```

## Deployment Steps (After Lambda is ready)

```bash
# 1. Provision AWS infra
cd terraform
terraform init
terraform apply

# 2. Deploy Lambda
cd lambda
./deploy.sh   # zips + uploads to AWS

# 3. Build & deploy frontend (with API URL)
cd website
NEXT_PUBLIC_API_URL=https://api.xirrledger.com npm run build
./deploy.sh
```

---

## Environment Variables

### Next.js (set at build time)
```env
NEXT_PUBLIC_API_URL=https://api.xirrledger.com   # API Gateway URL
```

### Lambda
```env
S3_UPLOADS_BUCKET=xirrledger-uploads
S3_REPORTS_BUCKET=xirrledger-reports
S3_JOBS_BUCKET=xirrledger-jobs
SES_FROM_EMAIL=reports@xirrledger.com
HOSTINGER_API_URL=https://xirrledger.com/api
HOSTINGER_API_SECRET=<shared-secret>
GOOGLE_CLIENT_ID=1030081614603-onnmmupafevkn0hojoj4qk023tuohius.apps.googleusercontent.com
```

### Hostinger PHP
```env
DB_HOST=localhost
DB_NAME=xirr_db
DB_USER=<user>
DB_PASS=<password>
API_SECRET=<shared-secret>   # same as Lambda's HOSTINGER_API_SECRET
```
