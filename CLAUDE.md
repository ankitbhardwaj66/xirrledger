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

## General Rules

- **Never run `deploy.sh` locally** — it runs on the remote Hostinger server only.
- Build command: `cd website && npm run build` (reads `.env.production` automatically).
- The `website/out/` directory is committed to git and served by Hostinger via `git pull`.
