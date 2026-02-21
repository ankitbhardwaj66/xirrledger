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
│             └── xirrledger-reports/   (PDF reports, 7d URL) │
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
| User DB | MySQL on Hostinger via PHP bridge | 🔲 PHP written — MySQL setup pending |
| NEXT_PUBLIC_API_URL | Baked into build via `.env.production` | ✅ Done |

---

## What's Done ✅

### Website
- Next.js 16 with Tailwind CSS — pages: Home, Features, How It Works, FAQ, Contact, Blog
- 4 MDX blog posts with per-post SEO meta tags
- Google Analytics 4 integrated
- Static export deployed to Hostinger via `deploy.sh` (runs on remote server)

### Calculator (`/calculator`)
- Google Sign-In (GSI One Tap + button) + manual name/email fallback
- Drag & drop file upload (CSV=Zerodha, PDF=Groww), multi-file
- SHA-256 content hashing — duplicate file detection across uploads
- Auto broker detection from file extension
- Groww PAN entry: "Same PAN for all" checkbox or per-file
- Files with same PAN auto-grouped into one Groww account
- Per-account holdings + cash inputs
- Async processing with animated progress steps
- Results: XIRR vs Nifty 50, investment period, contextual insight card
- PDF report opens in new tab (presigned S3 URL, 7-day expiry)

### Lambda
- `handler.py` — routes `POST /session` (presigned URLs) and `POST /process` (async trigger)
- `processor.py` — full pipeline:
  - Zerodha CSV parser (Funds added, Payouts, Quarterly settlements)
  - Groww PDF parser (pdfplumber, PAN as password)
  - Cross-file duplicate detection for Groww (same date+amount across files = skip)
  - XIRR calculation (Newton-Raphson + Brent fallback)
  - Nifty 50 comparison (reads from S3 daily cache — no yfinance on user requests)
  - PDF report generation (ReportLab) with watermark, KPI banner, Nifty comparison
  - Status polling via S3 jobs bucket (public read)
  - Email via SES on completion
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
- SES domain identity (verified), email template `xirrledger-report-ready`
- CloudWatch log groups (7-day retention)

---

## What's Pending 🔲

### MySQL Setup on Hostinger
1. Create a MySQL database in Hostinger control panel
2. SSH/FTP to Hostinger and edit `/public_html/api/config.php`:
```php
define('DB_NAME', 'your_db_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');
define('API_SECRET', 'same_as_hostinger_api_secret_in_tfvars');
```
3. Run the schema:
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

### Phase 6 — Returning Users
- Look up user by `google_id` or `email` on sign-in
- Show past reports if returning user
- "Your last report: 3 days ago — Download again" UX

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

### Build frontend
```bash
cd website
rm -rf out/
npm run build    # NEXT_PUBLIC_API_URL is read from .env.production automatically
```
> Note: `deploy.sh` runs on the **remote Hostinger server** — never run it locally.

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
| `main` | Production — deployed to Hostinger |
| `feature/calculator-page` | All calculator + Lambda + infra work (in progress) |
