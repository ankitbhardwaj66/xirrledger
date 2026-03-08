# Claude Instructions for xirrcalculator

## Push Procedure

When the user says "push" (or "deploy frontend", "push frontend"):

1. Check `git status` / `git diff --stat` for any changes under `website/` (i.e. `website/app/`, `website/content/`, `website/lib/`, etc.)
2. If there are frontend changes (anything inside `website/` **except** `website/out/`):
   - `cd website && rm -rf out/`
   - On `dev` branch: `npm run build:dev` — on `main` branch: `npm run build`
   - `cd ..` (back to repo root)
   - `git add website/out/`
   - Commit the rebuilt `out/` together with the source changes (or as a follow-up commit if source was already committed)
3. Stage and commit any remaining uncommitted changes (Lambda, source files, etc.)
4. `git push`
5. SSH into Hostinger and deploy:
   - **main branch:** `ssh -p 65002 u889244618@46.28.45.163 "cd /home/u889244618/domains/xirrledger.com/public_html/xirrcalculator/website && git pull origin main && ./deploy.sh"`
   - **dev branch:** `ssh -p 65002 u889244618@46.28.45.163 "cd /home/u889244618/domains/xirrledger.com/public_html/dev/xirrcalculator/website && git pull origin dev && ./deploy.sh"`

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

**SSH command:** `ssh -p 65002 u889244618@46.28.45.163`

**Production (main):**
```bash
ssh -p 65002 u889244618@46.28.45.163 "cd /home/u889244618/domains/xirrledger.com/public_html/xirrcalculator/website && git pull origin main && ./deploy.sh"
```

**Dev (dev branch):**
```bash
ssh -p 65002 u889244618@46.28.45.163 "cd /home/u889244618/domains/xirrledger.com/public_html/dev/xirrcalculator/website && git pull origin dev && ./deploy.sh"
```

## AWS / Terraform

- Always use `--profile ankit` for AWS CLI commands and set `AWS_PROFILE=ankit` for Terraform.
- For `terraform` commands: `cd terraform-dev && AWS_PROFILE=ankit terraform plan/apply`
- For `aws` CLI commands: `aws --profile ankit <command> --region ap-south-1`

## How env files work

`NEXT_PUBLIC_*` values are **baked into `out/` at build time on your local machine**.
The server never runs a build — it just does `git pull` to get the pre-built `out/`.

Two env files are committed to git:
- `website/.env.dev` — dev API (dev.xirrledger.com), no GA
- `website/.env.production` — prod API (xirrledger.com), with GA

**Build for `dev` branch:**
```bash
cd website && rm -rf out/ && npm run build:dev
```

**Build for `main` branch:**
```bash
cd website && rm -rf out/ && npm run build
```

No manual file swapping needed — just use the right build command.

## Merging dev → main

**Always delete `website/out/` from main before merging**, to avoid rename/rename and modify/delete conflicts (Next.js hashes change every build).

```bash
# On main branch:
git rm -r --cached website/out/ && rm -rf website/out/
git commit -m "Remove out/ before merge"
git merge dev
# If modify/delete conflicts remain in out/:
git checkout dev -- website/out/
git add website/out/ && git commit -m "Resolve out/ conflicts (take dev)"
# Rebuild with prod env:
cd website && npm run build && cd ..
git add website/out/ && git commit -m "Rebuild out/ with prod env"
git push origin main
```

## General Rules

- **Never run `deploy.sh` locally** — it runs on the remote Hostinger server only.
- Build commands: `npm run build:dev` (dev branch) or `npm run build` (main branch).
- The `website/out/` directory is committed to git and served by Hostinger via `git pull`.
