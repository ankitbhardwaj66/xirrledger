<?php
/**
 * XIRR Ledger — PHP Bridge Config
 *
 * Copy this file to config.php and fill in real values.
 * config.php is gitignored — never commit it.
 *
 * On Hostinger: set values via File Manager or SSH.
 * Dev and prod use separate config.php files with their own DB credentials.
 */

// Block direct web requests to this file
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(403);
    exit;
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');

// Must match HOSTINGER_API_SECRET in terraform/terraform.tfvars
define('API_SECRET', 'your_api_secret');

// Dashboard access key — something only you know
define('DASHBOARD_KEY', 'your_dashboard_key');

// AWS credentials for on-demand S3 presigned URL generation (get-report.php)
// IAM user: xirrledger-server — s3:GetObject on xirrledger-reports/* only
define('AWS_ACCESS_KEY',     'your_aws_access_key');
define('AWS_SECRET_KEY',     'your_aws_secret_key');
define('AWS_REGION',         'ap-south-1');
define('AWS_REPORTS_BUCKET', 'xirrledger-reports');
