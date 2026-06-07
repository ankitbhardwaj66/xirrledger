<?php
/**
 * DB Migration runner — xirrledger
 *
 * Usage (via SSH on the server):
 *   php migrate.php dev    — run pending migrations on dev DB
 *   php migrate.php prod   — run pending migrations on prod DB
 *   php migrate.php dev  --status  — show migration status without running
 *   php migrate.php prod --status
 *
 * Migration files live in db/migrations/NNNN_description.sql
 * Applied migrations are tracked in the schema_migrations table.
 *
 * Run from the repo root (SSH into server first):
 *   cd /path/to/repo && php db/migrate.php dev
 */

$env    = $argv[1] ?? null;
$status = in_array('--status', $argv);

if (!in_array($env, ['dev', 'prod'])) {
    echo "Usage: php db/migrate.php [dev|prod] [--status]\n";
    exit(1);
}

// ── Load credentials from the server config ──────────────────────────────────
$config_path = $env === 'dev'
    ? __DIR__ . '/../website/public/api/../../../domains/xirrledger.com/public_html/dev/api/config.php'
    : __DIR__ . '/../website/public/api/../../../domains/xirrledger.com/public_html/api/config.php';

// When running locally against a local config, fall back to relative path
if (!file_exists($config_path)) {
    $config_path = __DIR__ . '/../website/public/api/config.php';
}
if (!file_exists($config_path)) {
    die("Error: config.php not found at {$config_path}\nRun this script on the server.\n");
}
require $config_path;

// ── Connect ───────────────────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    die("DB connection failed: " . $e->getMessage() . "\n");
}

// ── Ensure tracking table exists ──────────────────────────────────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
        migration  VARCHAR(255) NOT NULL UNIQUE,
        applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// ── Load applied migrations ───────────────────────────────────────────────────
$applied = $pdo->query("SELECT migration FROM schema_migrations ORDER BY migration")
               ->fetchAll(PDO::FETCH_COLUMN);
$applied = array_flip($applied);

// ── Discover migration files ──────────────────────────────────────────────────
$dir   = __DIR__ . '/migrations';
$files = glob($dir . '/*.sql');
sort($files);

if (empty($files)) {
    echo "No migration files found in {$dir}\n";
    exit(0);
}

// ── Status mode ───────────────────────────────────────────────────────────────
if ($status) {
    echo "\nMigration status ({$env}):\n";
    echo str_repeat('─', 60) . "\n";
    foreach ($files as $f) {
        $name = basename($f);
        $mark = isset($applied[$name]) ? '✓ applied' : '○ pending';
        echo "  {$mark}  {$name}\n";
    }
    echo str_repeat('─', 60) . "\n\n";
    exit(0);
}

// ── Run pending migrations ────────────────────────────────────────────────────
$pending = array_filter($files, fn($f) => !isset($applied[basename($f)]));

if (empty($pending)) {
    echo "✓ All migrations already applied on {$env}.\n";
    exit(0);
}

echo "\nRunning " . count($pending) . " pending migration(s) on {$env}...\n";
echo str_repeat('─', 60) . "\n";

foreach ($pending as $file) {
    $name = basename($file);
    $sql  = file_get_contents($file);

    echo "  → {$name} ... ";
    try {
        // Split on semicolons to run multiple statements
        $statements = array_filter(
            array_map('trim', explode(';', $sql)),
            fn($s) => $s !== '' && !preg_match('/^--/', $s)
        );
        foreach ($statements as $stmt) {
            if (trim($stmt)) $pdo->exec($stmt);
        }
        $pdo->prepare("INSERT INTO schema_migrations (migration) VALUES (?)")
            ->execute([$name]);
        echo "done\n";
    } catch (PDOException $e) {
        echo "FAILED\n";
        echo "    Error: " . $e->getMessage() . "\n";
        echo "\nAborted — fix the migration and re-run.\n\n";
        exit(1);
    }
}

echo str_repeat('─', 60) . "\n";
echo "✓ All done.\n\n";
