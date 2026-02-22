# Deployment — see root DEPLOYMENT.md

The canonical deployment guide for XIRR Ledger is at the **repository root**:

```
/DEPLOYMENT.md
```

It covers the full architecture (Next.js → Hostinger, AWS Lambda, S3, SES, Terraform), credentials, common operations, and pending work.

---

## Quick reference: how to publish a frontend change

```bash
# 1. Make your changes in website/app/ or website/components/
# 2. Clean and rebuild
cd website
rm -rf out/
npm run build

# 3. Commit BOTH source files AND out/ together
git add website/
git commit -m "Your change description"
git push

# 4. SSH into Hostinger and run deploy.sh (or trigger via git hook)
#    deploy.sh does: git pull + rsync out/* → public_html/
```

> ⚠️ Never run `deploy.sh` locally — it's meant to run on the Hostinger server.
