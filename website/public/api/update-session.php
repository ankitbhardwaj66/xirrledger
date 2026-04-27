<?php
/**
 * POST /api/update-session.php
 * Called by the Lambda function when processing completes.
 *
 * Auth:   X-API-Secret header (must match API_SECRET in config.php)
 * Body:   { session_id, status, report_url?, xirr?, nifty_xirr? }
 * Response: { ok: true } | { error: "..." }
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
// Only Lambda calls this — no browser CORS needed, but allow just in case
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Verify shared secret
$incoming_secret = $_SERVER['HTTP_X_API_SECRET'] ?? '';
if ($incoming_secret !== API_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['session_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'session_id is required']);
    exit;
}

$session_id = substr($body['session_id'],    0, 64);
$status     = substr($body['status'] ?? 'done', 0, 20);
$report_url = $body['report_url'] ?? null;
$xirr       = isset($body['xirr'])       ? (float) $body['xirr']       : null;
$nifty_xirr = isset($body['nifty_xirr']) ? (float) $body['nifty_xirr'] : null;

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare('
        UPDATE xirr_sessions
        SET status       = :status,
            last_step    = CASE WHEN :status2 = \'done\' THEN \'results\' ELSE last_step END,
            report_url   = :report_url,
            xirr         = :xirr,
            nifty_xirr   = :nifty_xirr,
            completed_at = NOW()
        WHERE session_id = :session_id
    ');
    $stmt->execute([
        ':session_id' => $session_id,
        ':status'     => $status,
        ':status2'    => $status,
        ':report_url' => $report_url,
        ':xirr'       => $xirr,
        ':nifty_xirr' => $nifty_xirr,
    ]);

    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    error_log('update-session.php PDO error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
