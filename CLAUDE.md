# Claude Instructions for xirrcalculator

## Branch & Deploy Flow

**Always create a feature branch before starting new work.** Never commit directly to `dev` or `main`.

```bash
git checkout dev && git pull origin dev
git checkout -b feature/<short-name>   # e.g. feature/xirr-guard
```

### The frontend deploys automatically (GitHub Actions)

`.github/workflows/deploy.yml` deploys the Next.js frontend on every push/merge:

| Merge into | Triggers | Builds with | Deploys to |
|---|---|---|---|
| `dev`  | auto | `npm run build:dev` | dev.xirrledger.com (`public_html/dev/`) |
| `main` | auto | `npm run build`     | xirrledger.com (`public_html/`) |

**You no longer build + rsync the frontend by hand** — merging does it. The workflow uses the `HOSTINGER_SSH_KEY` repo secret (a dedicated deploy key already installed on the server).

### Standard flow

1. Work on `feature/<name>`, commit, push: `git push -u origin feature/<name>`
2. Open a PR **`feature/<name>` → `dev`**. Merge it → CI auto-deploys **dev**.
3. Test at **dev.xirrledger.com** — stop and wait for the user to confirm.
4. Only after confirmation, open a PR **`dev` → `main`**. Merging it → CI auto-deploys **prod**.

> **Prod is gated by the `dev` → `main` PR merge, not a manual rsync.** Merging to `main` deploys to prod immediately. Always confirm with the user before merging `dev` → `main`.

### Manual frontend deploy (fallback only — if CI is down)
```bash
# dev
cd website && rm -rf out/ && npm run build:dev && cd ..
rsync -avz --delete --exclude=robots.txt --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/dev/
# prod
cd website && rm -rf out/ && npm run build && cd ..
rsync -avz --delete --exclude=dev --exclude=api/config.php -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/
```

> `website/out/` is gitignored — never commit it (CI rebuilds it).  
> `api/config.php` is gitignored — never overwritten by rsync/CI. Edit it on the server via SSH.
> **Lambda / Terraform / DB migrations are NOT automated** — deploy those manually (see below).

## Lambda Deploy

All Lambda deploys go through Terraform (dev first, then prod). **Never use `aws lambda update-function-code` directly** — use `terraform apply`.

### When to rebuild the layer

Only rebuild `lambda/dist/layer.zip` when `requirements.txt` changes:
```bash
cd lambda && ./build_layer.sh   # requires Docker
```

| What changed | Rebuild layer? | Run terraform apply? |
|---|---|---|
| `requirements.txt` | **Yes — run build_layer.sh first** | Yes |
| Lambda code (`handler.py`, `processor.py` etc.) | No | Yes |
| Env vars / IAM / config only | No | Yes |

> `dist/layer.zip` is gitignored. Never commit it. If it's stale or missing, Terraform will detect the checksum mismatch and replace the Lambda layer with the wrong file — causing import errors.

### Deploy flow (dev first, then prod)
```bash
# 1. Commit and push
git checkout dev
git add lambda/
git commit -m "..."
git push origin dev

# 2. Deploy to dev (rebuilding layer only if requirements.txt changed)
cd terraform-dev && AWS_PROFILE=ankit terraform apply && cd ..
```
Test at **dev.xirrledger.com** — stop and wait for user to confirm it works.

```bash
# 3. Deploy to prod (only after user confirms)
git checkout main && git merge dev && git push origin main
cd terraform && AWS_PROFILE=ankit terraform apply && cd ..
```

## Branches

| Branch | URL | Web root on Hostinger |
|---|---|---|
| `main` | xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/` |
| `dev` | dev.xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/dev/` |

- **ALL new work starts on a feature branch off `dev`** — always check `git branch` before making changes; if on `dev`/`main`, create `feature/<name>` first.
- **Always ask before merging `dev` → `main`** — merging to `main` auto-deploys prod via GitHub Actions. Even if the user says "deploy", confirm: "Ready to merge to prod?" and wait for explicit approval.
- Default flow: feature branch → commit → push → PR to `dev` → merge (CI auto-deploys dev) → user tests → PR `dev` → `main` → merge (CI auto-deploys prod).
- When the user says "push" without specifying a branch, push the **current branch** only.
- **Never commit directly to `dev` or `main`** — no exceptions. Use a feature branch + PR. If changes accidentally land on `main`, cherry-pick them back to a branch to keep history clean.

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
| `AWS_REGION_NAME` | optional | defaults to `ap-south-1` |

> **Always manage Lambda env vars via Terraform, never via AWS CLI.** These variables are declared in `terraform/lambda.tf` and values live in `terraform/terraform.tfvars` (gitignored). To change a value:
> ```bash
> # 1. Edit terraform/terraform.tfvars with the new value
> # 2. Plan and apply — dev first, then prod
> cd terraform-dev && AWS_PROFILE=ankit terraform plan && AWS_PROFILE=ankit terraform apply && cd ..
> cd terraform    && AWS_PROFILE=ankit terraform plan && AWS_PROFILE=ankit terraform apply && cd ..
> ```
> Using `aws lambda update-function-configuration --environment Variables={...}` directly **replaces the entire env object** and causes drift from Terraform state — this broke prod in June 2026.

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

- **Never commit `website/out/`** — it is gitignored; CI rebuilds and deploys it.
- Build commands: `npm run build:dev` (dev) or `npm run build` (prod) — CI runs these automatically; only run manually for the fallback deploy.
- `deploy.sh` on the server is no longer used — GitHub Actions rsync replaces it.
- **The frontend deploys on merge** — merge a feature branch to `dev` to test on dev.xirrledger.com; get user confirmation before merging `dev` → `main` (which deploys prod).
- **Lambda changes are still manual** — `terraform apply` (dev then prod); CI does not touch Lambda.
