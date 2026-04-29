# Claude Instructions for xirrcalculator

## Push Procedure

When the user says "push" (or "deploy frontend", "push frontend"):

1. Check `git status` / `git diff --stat` for any changes under `website/` (i.e. `website/app/`, `website/content/`, `website/lib/`, etc.)
2. If there are frontend changes (anything inside `website/` — `out/` is gitignored, no need to stage it):
   - `cd website && rm -rf out/`
   - On `dev` branch: `npm run build:dev` — on `main` branch: `npm run build`
   - `cd ..` (back to repo root)
3. Stage and commit any remaining uncommitted source changes (Lambda, source files, etc.)
4. `git push`
5. Rsync the built `out/` to Hostinger:
   - **main branch:**
     ```bash
     rsync -avz --delete --exclude=dev -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/
     ```
   - **dev branch:**
     ```bash
     rsync -avz --delete --exclude=robots.txt -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/dev/
     ```

> `website/out/` is gitignored — never commit it. Always rsync it directly to the server.

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

| Branch | URL | Web root on Hostinger |
|---|---|---|
| `main` | xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/` |
| `dev` | dev.xirrledger.com | `/home/u889244618/domains/xirrledger.com/public_html/dev/` |

- All new development goes on the `dev` branch.
- Merge `dev` → `main` only when ready for production.
- When the user says "push" without specifying a branch, push the **current branch** (could be `dev` or `main`).

## Hostinger Deploy (frontend — rsync from local)

**SSH command:** `ssh -p 65002 u889244618@46.28.45.163`

**Production (main):**
```bash
rsync -avz --delete --exclude=dev -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/
```

**Dev (dev branch):**
```bash
rsync -avz --delete --exclude=robots.txt -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/dev/
```

> `--exclude=dev` on main protects the dev subdomain directory from being deleted by `--delete`.

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
rsync -avz --delete --exclude=dev -e "ssh -p 65002" website/out/ u889244618@46.28.45.163:/home/u889244618/domains/xirrledger.com/public_html/
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
