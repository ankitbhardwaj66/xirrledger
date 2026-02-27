# Claude Instructions for xirrcalculator

## Push Procedure

When the user says "push" (or "deploy frontend", "push frontend"):

1. Check `git status` / `git diff --stat` for any changes under `website/` (i.e. `website/app/`, `website/content/`, `website/lib/`, etc.)
2. If there are frontend changes (anything inside `website/` **except** `website/out/`):
   - `cd website && rm -rf out/`
   - `npm run build`
   - `cd ..` (back to repo root)
   - `git add website/out/`
   - Commit the rebuilt `out/` together with the source changes (or as a follow-up commit if source was already committed)
3. Stage and commit any remaining uncommitted changes (Lambda, source files, etc.)
4. `git push`

> Never skip `rm -rf out/` — stale files from previous builds must be cleared first.

## Lambda Deploy

When the user says "deploy the lambda" (or "deploy lambda"):
```bash
zip -j lambda/dist/lambda.zip lambda/handler.py lambda/processor.py lambda/refresher.py
AWS_PROFILE=ankit aws lambda update-function-code \
  --function-name xirr-processor \
  --zip-file fileb://lambda/dist/lambda.zip \
  --region ap-south-1
```
No frontend build needed for Lambda-only changes.

## Branches

| Branch | URL | Hostinger path |
|---|---|---|
| `main` | xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/xirrcalculator/` |
| `dev` | dev.xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/dev/xirrcalculator/` |

- All new development goes on the `dev` branch.
- Merge `dev` → `main` only when ready for production.
- When the user says "push" without specifying a branch, push the **current branch** (could be `dev` or `main`).

## Hostinger Deploy (frontend — run on server via SSH)

**Production (main):**
```bash
cd /home/u889244618/domains/xirrledger.com/public_html/xirrcalculator/website
git pull origin main && ./deploy.sh
```

**Dev (dev branch):**
```bash
cd /home/u889244618/domains/xirrledger.com/public_html/dev/xirrcalculator/website
git pull origin dev && ./deploy.sh
```

## AWS / Terraform

- Always use `--profile ankit` for AWS CLI commands and set `AWS_PROFILE=ankit` for Terraform.
- For `terraform` commands: `cd terraform-dev && AWS_PROFILE=ankit terraform plan/apply`
- For `aws` CLI commands: `aws --profile ankit <command> --region ap-south-1`

## How .env.production works

`NEXT_PUBLIC_*` values are **baked into `out/` at build time on your local machine**.
The server never runs a build — it just does `git pull` to get the pre-built `out/`.
So `website/.env.production` is a **local file only** (gitignored). The server's copy doesn't matter.

**Before building for `dev` branch** — `website/.env.production` should contain:
```
NEXT_PUBLIC_API_URL=https://wu3hy4822m.execute-api.ap-south-1.amazonaws.com
NEXT_PUBLIC_JOBS_BASE_URL=https://xirrledger-jobs-dev.s3.ap-south-1.amazonaws.com
```

**Before building for `main` branch** (after merging from dev) — swap to:
```
NEXT_PUBLIC_API_URL=https://3cvw6sp1sf.execute-api.ap-south-1.amazonaws.com
NEXT_PUBLIC_JOBS_BASE_URL=https://xirrledger-jobs.s3.ap-south-1.amazonaws.com
NEXT_PUBLIC_GA_ID=G-2YGVB963RE
```
Then rebuild: `cd website && rm -rf out/ && npm run build` and commit `out/`.

## General Rules

- **Never run `deploy.sh` locally** — it runs on the remote Hostinger server only.
- Build command: `cd website && rm -rf out/ && npm run build` (reads `.env.production` automatically).
- The `website/out/` directory is committed to git and served by Hostinger via `git pull`.
