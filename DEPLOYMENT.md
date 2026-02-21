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
│  AWS (Infrastructure via Terraform) — ap-south-1 (Mumbai)  │
│                                                             │
│  API Gateway → Lambda (Python, arm64)                       │
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
| Infrastructure | Terraform | ✅ Applied (2026-02-18) |
| Backend compute | AWS Lambda (Python) | ✅ Deployed (`xirr-processor`) |
| File storage | AWS S3 | ✅ 4 buckets live |
| Email | AWS SES | ✅ Verified (domain + DKIM + MAIL FROM all SUCCESS) |
| User DB | MySQL on Hostinger | 🔲 PHP bridge written — needs MySQL setup on Hostinger |
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

### Phase 1 — AWS Infrastructure (Terraform) ✅ DONE (2026-02-18)
- [x] AWS account: `681745772892` (IAM user: `ankit`, profile: `ankit`)
- [x] Region: `ap-south-1` (Mumbai)
- [x] S3 bucket: `xirrledger-uploads` (ledger files, auto-delete after 24h)
- [x] S3 bucket: `xirrledger-reports` (PDF reports, presigned URLs, 7-day expiry)
- [x] S3 bucket: `xirrledger-jobs` (status.json per session, public read)
- [x] S3 bucket: `xirrledger-artifacts` (Lambda code + layer zips)
- [x] IAM role `xirrledger-lambda-exec` with S3 + SES + self-invoke permissions
- [x] Lambda function: `xirr-processor` (Python 3.12, arm64, 512MB, 120s timeout)
- [x] Lambda Layer: `xirrledger-deps:1` (pandas, numpy, scipy, reportlab, pdfplumber, yfinance)
- [x] API Gateway HTTP API: `xirrledger-api`
  - `POST /session` — create session, return presigned S3 upload URLs
  - `POST /process` — trigger async Lambda processing
- [x] SES domain identity for `xirrledger.com` (DNS records pending)
- [x] SES email template: `xirrledger-report-ready`
- [x] CloudWatch log groups (Lambda + API Gateway, 7-day retention)
- [x] Terraform state stored locally in `terraform/`

### Phase 2 — Lambda Function (Python) ✅ DONE (2026-02-18)
- [x] `lambda/handler.py` — routes `/session` and `/process`, triggers async self-invoke
- [x] `lambda/processor.py` — full pipeline: parse → Nifty 50 → XIRR → PDF → S3 → SES → PHP bridge
- [x] Zerodha CSV parser (Funds added, Payouts, Quarterly settlements)
- [x] Groww PDF parser (pdfplumber, PAN as password)
- [x] XIRR calculation (Newton-Raphson + Brent fallback — ported from `xirr_calculator.py`)
- [x] Nifty 50 comparison via yfinance
- [x] PDF report generation (reportlab)
- [x] Status polling via S3 jobs bucket
- [x] Email via SES templated email

---

## What's Pending 🔲

### SES DNS Verification (do this in Hostinger DNS)
Add the following records to `xirrledger.com` DNS:

**TXT — domain verification**
```
Name:  _amazonses.xirrledger.com
Value: WofHkgtHS06tJw18rdD3I7GWPKMXNnN9F8n529XYVp4=
```

**CNAME × 3 — DKIM signing**
```
wtfkasx5tzstvss4hznqyzpiwr7b65ec._domainkey.xirrledger.com
  → wtfkasx5tzstvss4hznqyzpiwr7b65ec.dkim.amazonses.com

q4gtruaas2ln5s2rssv2tysmre5uzz7s._domainkey.xirrledger.com
  → q4gtruaas2ln5s2rssv2tysmre5uzz7s.dkim.amazonses.com

x4ch2mlhv3mw2a3tifkteoqoeoa7esre._domainkey.xirrledger.com
  → x4ch2mlhv3mw2a3tifkteoqoeoa7esre.dkim.amazonses.com
```

**MX — MAIL FROM**
```
Name:     mail.xirrledger.com
Priority: 10
Value:    feedback-smtp.ap-south-1.amazonses.com
```

### Phase 3 — Hostinger PHP Bridge ✅ WRITTEN
Files at `website/public/api/` — deployed with static site.

- [x] `POST /api/save-user.php` — called by frontend on form submit
- [x] `POST /api/update-session.php` — called by Lambda on completion (auth via `X-API-Secret`)
- [x] `website/public/api/config.php` — DB credentials + API secret (fill in on Hostinger!)

**After deploying, edit `/api/config.php` on Hostinger and set:**
```
DB_NAME  → your MySQL database name
DB_USER  → your MySQL username
DB_PASS  → your MySQL password
```

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

### Phase 5 — Wire Frontend to Lambda ✅ DONE
Real API calls implemented in `/calculator/page.tsx`.

- [x] `POST /session` → get presigned S3 URLs → upload files directly to S3
- [x] `POST /api/save-user.php` → save user to MySQL (fire-and-forget)
- [x] `POST /process` → trigger Lambda async, get session_id
- [x] Poll `https://xirrledger-jobs.s3.ap-south-1.amazonaws.com/jobs/{session_id}/status.json` every 2s
- [x] On `status: done` → render real results from Lambda
- [ ] Set `NEXT_PUBLIC_API_URL=https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com` at build time

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
| AWS Account ID | `681745772892` | — |
| AWS IAM User | `ankit` (AdministratorAccess) | CLI profile `ankit` |
| AWS Region | `ap-south-1` (Mumbai) | `terraform/terraform.tfvars` |
| API Gateway URL | `https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com/` | → `NEXT_PUBLIC_API_URL` |
| Lambda → PHP shared secret | (in `terraform/terraform.tfvars`) | Lambda env + Hostinger env |
| S3 Jobs polling base URL | `https://xirrledger-jobs.s3.ap-south-1.amazonaws.com` | — |

---

## Git Branches

| Branch | Purpose | Status |
|---|---|---|
| `main` | Production — deployed to Hostinger | Active |
| `feature/calculator-page` | Calculator UI + Google auth + AWS infra | In progress |

---

## Deployment Steps

### Update Lambda code
```bash
cd terraform
AWS_PROFILE=ankit terraform apply -auto-approve
```

### Rebuild Lambda layer (after adding/changing Python deps)
```bash
cd lambda
./build_layer.sh          # needs Docker running
cd ../terraform
AWS_PROFILE=ankit terraform apply -auto-approve
```

### Build & deploy frontend
```bash
cd website
rm -rf out/
NEXT_PUBLIC_API_URL=https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com npm run build
./deploy.sh
```

---

## Environment Variables

### Next.js (set at build time)
```env
NEXT_PUBLIC_API_URL=https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com
```

### Lambda (set via Terraform — `terraform/terraform.tfvars`)
```env
S3_UPLOADS_BUCKET=xirrledger-uploads
S3_REPORTS_BUCKET=xirrledger-reports
S3_JOBS_BUCKET=xirrledger-jobs
SES_FROM_EMAIL=reports@xirrledger.com
HOSTINGER_API_URL=https://xirrledger.com/api
HOSTINGER_API_SECRET=<in terraform.tfvars>
AWS_REGION_NAME=ap-south-1
```

### Hostinger PHP
```env
DB_HOST=localhost
DB_NAME=xirr_db
DB_USER=<user>
DB_PASS=<password>
API_SECRET=<same as HOSTINGER_API_SECRET in terraform.tfvars>
```
