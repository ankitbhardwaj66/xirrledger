# DB Migrations

## Creating a migration

Name files `NNNN_description.sql` — the number prefix controls run order.

```
db/migrations/0001_initial_schema.sql
db/migrations/0002_add_device_type.sql
db/migrations/0003_add_foo_column.sql
```

Each file should be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

## Running migrations

SSH into the server and run from the repo root:

```bash
ssh -p 65002 u889244658@46.28.45.163

# Check what's pending
php db/migrate.php dev  --status
php db/migrate.php prod --status

# Apply pending migrations
php db/migrate.php dev
php db/migrate.php prod   # only after dev is confirmed
```

## Rule

Always run dev first, confirm it works, then run prod — same as the deploy rule.

Applied migrations are tracked in the `schema_migrations` table in each DB.
