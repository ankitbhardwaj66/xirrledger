# Claude Instructions for xirrcalculator

## Deploy Flow

All work happens on `dev` first. Never touch `main` directly.

### Step 1 — Develop on dev
```bash
git checkout dev
# make changes, then:
git add <files>
git commit -m "..."
git push origin dev
```

### Step 2 — Build and deploy to dev server
```bash
cd website && rm -rf out/ && npm run build:dev && cd ..
rsync -avz --delete --exclude=robots.txt --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/dev/
```
Test at **dev.xirrledger.com** — stop here and wait for user to confirm it works.

### Step 3 — Merge to main and deploy to prod (only after user confirms)
```bash
git checkout main
git merge dev
git push origin main
cd website && rm -rf out/ && npm run build && cd ..
rsync -avz --delete --exclude=dev --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/
```

> `website/out/` is gitignored — never commit it. Always rsync it directly to the server.  
> `api/config.php` is gitignored — never overwritten by rsync. Edit it on the server via SSH.

## Lambda Deploy

Same dev-first rule as frontend — never deploy straight to prod.

### Step 1 — Commit and deploy to dev Lambda
```bash
git checkout dev
git add lambda/
git commit -m "..."
git push origin dev

zip -j lambda/dist/lambda.zip lambda/handler.py lambda/processor.py lambda/refresher.py
aws --profile ankit lambda update-function-code \
  --function-name xirr-processor-dev \
  --zip-file fileb://lambda/dist/lambda.zip \
  --region ap-south-1
```
Test at **dev.xirrledger.com** — stop and wait for user to confirm it works.

### Step 2 — Deploy to prod Lambda (only after user confirms)
```bash
git checkout main
git merge dev
git push origin main

aws --profile ankit lambda update-function-code \
  --function-name xirr-processor \
  --zip-file fileb://lambda/dist/lambda.zip \
  --region ap-south-1
```

> The zip from Step 1 can be reused in Step 2 — no need to re-zip if nothing changed.

## Branches

| Branch | URL | Web root on Hostinger |
|---|---|---|
| `main` | xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/` |
| `dev` | dev.xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/dev/` |

- **ALL work starts on `dev`** — always check `git branch` before making any changes and switch to `dev` if not already there.
- **Always ask before merging to main or deploying to prod** — even if the user says "deploy", confirm: "Ready to merge to prod and deploy?" and wait for explicit approval.
- Default flow: commit → push to `dev` → rsync to dev server → stop and ask the user to test → only then merge + rsync to prod.
- When the user says "push" without specifying a branch, push the **current branch** only.
- **Never commit directly to `main`** — no exceptions. If changes accidentally land on `main`, cherry-pick them back to `dev` to keep branches in sync.

## DB Migrations

Schema changes are managed as numbered SQL files in `db/migrations/`.

### Creating a migration
Create `db/migrations/NNNN_description.sql` (e.g. `0004_add_foo_column.sql`).
Use `IF NOT EXISTS` / `IF EXISTS` to keep files idempotent.

### Running migrations (always dev first)
```bash
ssh -p 65002 u889244618@46.28.45.163

# Check status
php db/migrate.php dev  --status
php db/migrate.php prod --status

# Apply
php db/migrate.php dev
# confirm it works, then:
php db/migrate.php prod
```

Applied migrations are tracked in the `schema_migrations` table in each DB.
**Never apply prod before dev is confirmed working.**

## Databases

Dev and prod use **separate MySQL databases** on Hostinger. Never assume they share data.

| Environment | DB name | DB user | Config file on server |
|---|---|---|---|
| `main` (prod) | `u889244618_xirrledger` | `u889244618_xirrledger` | `/home/.../public_html/api/config.php` |
| `dev` | `u889244618_dev_xirrledger` | `u889244618_dev_xirrledger` | `/home/.../public_html/dev/api/config.php` |

- Both dev and prod `config.php` are **excluded from rsync** so they're never overwritten by deploys. Manage them directly on the server via SSH.
- When running MySQL commands via SSH, always read the correct `config.php` first to get the right credentials.
- Schema changes (new tables, columns) must be applied to **both** databases separately.

## Hostinger Deploy (frontend — rsync from local)

**SSH command:** `ssh -p 65002 u889244618@46.28.45.163`

**Production (main):**
```bash
rsync -avz --delete --exclude=dev --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/
```

**Dev (dev branch):**
```bash
rsync -avz --delete --exclude=robots.txt --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/dev/
```

> `--exclude=dev` on main protects the dev subdomain directory from being deleted by `--delete`.

## Lambda Environment Variables

The prod Lambda (`xirr-processor`) and dev Lambda (`xirr-processor-dev`) require these env vars.

| Variable | Required | Prod value |
|---|---|---|
| `S3_UPLOADS_BUCKET` | **hard required** | `xirrledger-uploads` |
| `S3_REPORTS_BUCKET` | **hard required** | `xirrledger-reports` |
| `S3_JOBS_BUCKET` | **hard required** | `xirrledger-jobs` |
| `HOSTINGER_API_URL` | required (no default) | `https://xirrledger.com/api` |
| `HOSTINGER_API_SECRET` | required (no default) | *(rotated secret — in Terraform tfvars)* |
| `SES_FROM_EMAIL` | optional | `reports@xirrledger.com` |
| `SEND_EMAIL` | optional | `true` |
| `TEST_EMAILS` | optional | admin gmail |
| `AWS_REGION_NAME` | optional | defaults to `ap-south-1` |

> **CRITICAL:** When updating any Lambda env var with `aws lambda update-function-configuration --environment Variables={...}`, AWS **replaces the entire Variables object** — it does NOT merge. Always fetch existing vars first and include all of them in the update:
> ```bash
> # Safe pattern — fetch then merge
> aws --profile ankit lambda get-function-configuration \
>   --function-name xirr-processor --region ap-south-1 \
>   --query 'Environment.Variables'
> # Then include ALL vars in the update, not just the one you're changing
> ```

## AWS / Terraform

- Always use `--profile ankit` for AWS CLI commands and set `AWS_PROFILE=ankit` for Terraform.
- For `aws` CLI commands: `aws --profile ankit <command> --region ap-south-1`

**Terraform deploy order — always dev first, then prod:**
```bash
# 1. Dev first
cd terraform-dev && AWS_PROFILE=ankit terraform plan && AWS_PROFILE=ankit terraform apply && cd ..

# 2. Prod only after dev apply succeeds
cd terraform && AWS_PROFILE=ankit terraform plan && AWS_PROFILE=ankit terraform apply && cd ..
```

Never apply prod Terraform before dev. If something breaks it's easier to catch in dev first.

## How env files work

`NEXT_PUBLIC_*` values are **baked into `out/` at build time on your local machine**.
The server never runs a build — it receives files via rsync.

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

Since `out/` is now gitignored, merges are clean — no more `out/` conflicts.

```bash
# On main branch:
git merge dev
git push origin main
# Then rsync the freshly built out/ to prod:
cd website && rm -rf out/ && npm run build && cd ..
rsync -avz --delete --exclude=dev --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/
```

## Blog Post Images

When writing a new blog post, **do not reuse an existing image** just because it's loosely related. Instead, fetch a relevant image from a free stock photo provider:

- **Preferred sources:** [Unsplash](https://unsplash.com), [Pexels](https://www.pexels.com), [Pixabay](https://pixabay.com)
- Search for a term that matches the post topic (e.g. "stock market calculator", "investment returns", "financial planning")
- Download the image and convert/save it as a `.webp` file
- Place it in `website/public/blog/<slug>.webp`
- Reference it in the MDX as `![alt text](/blog/<slug>.webp)`

**Never use an existing blog image for a new post** — each post should have its own purpose-built image.

## General Rules

- **Never commit `website/out/`** — it is gitignored and deployed via rsync only.
- Build commands: `npm run build:dev` (dev branch) or `npm run build` (main branch).
- `deploy.sh` on the server is no longer used — rsync replaces it.
- **Never commit changes until the user has tested and confirmed they work.** Build → rsync to dev → wait for user to test → only commit after explicit "looks good" / approval.
- **Always rsync to dev after every build** — never leave a build sitting locally without deploying it to dev.xirrledger.com.
