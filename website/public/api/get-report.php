<?php
/**
 * GET /api/get-report.php?session_id=xxx&key=DASHBOARD_KEY
 * Generates a fresh S3 presigned URL for the session's PDF report
 * using IAM credentials stored in config.php, then redirects.
 *
 * Uses pure-PHP AWS Signature V4 — no SDK needed.
 */

require_once __DIR__ . '/config.php';

header('X-Robots-Tag: noindex, nofollow');

// Auth — same key as dashboard
$key = $_GET['key'] ?? '';
if ($key !== DASHBOARD_KEY) {
    http_response_code(403);
    exit('Forbidden');
}

$session_id = preg_replace('/[^a-f0-9\-]/i', '', $_GET['session_id'] ?? '');
if (strlen($session_id) < 10) {
    http_response_code(400);
    exit('Invalid session_id');
}

// Verify session exists, has a report_url, and is done
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $stmt = $pdo->prepare('SELECT status, report_url FROM xirr_sessions WHERE session_id = :sid LIMIT 1');
    $stmt->execute([':sid' => $session_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['status'] !== 'done' || !$row['report_url']) {
        http_response_code(404);
        exit('Report not found');
    }
} catch (PDOException $e) {
    http_response_code(500);
    exit('DB error');
}

// Parse bucket, region, and key from the stored report_url.
// URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}?...
$parsed  = parse_url($row['report_url']);
$host    = $parsed['host'] ?? '';
// host = "xirrledger-reports.s3.ap-south-1.amazonaws.com"
if (preg_match('/^([^.]+)\.s3\.([^.]+)\.amazonaws\.com$/', $host, $m)) {
    // Regional endpoint: bucket.s3.ap-south-1.amazonaws.com
    $bucket = $m[1];
    $region = $m[2];
} elseif (preg_match('/^([^.]+)\.s3\.amazonaws\.com$/', $host, $m)) {
    // Global endpoint: bucket.s3.amazonaws.com — fall back to configured region
    $bucket = $m[1];
    $region = AWS_REGION;
} else {
    http_response_code(500);
    exit('Could not parse S3 URL');
}
$s3_key = ltrim($parsed['path'] ?? '', '/');

$url = s3_presign($bucket, $s3_key, $region, AWS_ACCESS_KEY, AWS_SECRET_KEY);

header("Location: $url", true, 302);
exit;

// ── AWS Signature V4 presigned GET ────────────────────────────────────────────
function s3_presign($bucket, $key, $region, $access_key, $secret_key, $expires = 604800) {
    $now       = time();
    $timestamp = gmdate('Ymd\THis\Z', $now);
    $date      = gmdate('Ymd', $now);
    $host      = "$bucket.s3.$region.amazonaws.com";

    // Encode each path segment individually, preserve slashes
    $canonical_uri = '/' . implode('/', array_map('rawurlencode', explode('/', $key)));

    $credential = "$access_key/$date/$region/s3/aws4_request";

    // Query params must be sorted by key
    $params = [
        'X-Amz-Algorithm'     => 'AWS4-HMAC-SHA256',
        'X-Amz-Credential'    => $credential,
        'X-Amz-Date'          => $timestamp,
        'X-Amz-Expires'       => (string)$expires,
        'X-Amz-SignedHeaders' => 'host',
    ];
    ksort($params);

    $canonical_qs = implode('&', array_map(
        fn($k, $v) => rawurlencode($k) . '=' . rawurlencode($v),
        array_keys($params), $params
    ));

    $canonical_request = implode("\n", [
        'GET',
        $canonical_uri,
        $canonical_qs,
        "host:$host",
        '',
        'host',
        'UNSIGNED-PAYLOAD',
    ]);

    $string_to_sign = implode("\n", [
        'AWS4-HMAC-SHA256',
        $timestamp,
        "$date/$region/s3/aws4_request",
        hash('sha256', $canonical_request),
    ]);

    $k_date    = hash_hmac('sha256', $date,          'AWS4' . $secret_key, true);
    $k_region  = hash_hmac('sha256', $region,        $k_date,              true);
    $k_service = hash_hmac('sha256', 's3',           $k_region,            true);
    $k_signing = hash_hmac('sha256', 'aws4_request', $k_service,           true);
    $signature = hash_hmac('sha256', $string_to_sign, $k_signing);

    return "https://$host$canonical_uri?$canonical_qs&X-Amz-Signature=$signature";
}
