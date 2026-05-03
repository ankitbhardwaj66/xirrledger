<?php
/**
 * POST /api/mark-support-email-sent.php
 * Called by the support-emailer Lambda after sending each support email.
 *
 * Auth:   X-API-Secret header
 * Body:   { email }
 * Response: { ok: true } | { error: "..." }
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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

$body  = json_decode(file_get_contents('php://input'), true);
$email = trim($body['email'] ?? '');

if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'email is required']);
    exit;
}

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Record in dedup table (prevents re-sending today)
    $stmt = $pdo->prepare('
        INSERT IGNORE INTO support_emails_sent (email, sent_date)
        VALUES (:email, CURDATE())
    ');
    $stmt->execute([':email' => substr($email, 0, 100)]);

    // Stamp the sent timestamp on all stuck sessions for this email
    $stmt2 = $pdo->prepare('
        UPDATE xirr_sessions
        SET support_email_sent_at = UTC_TIMESTAMP()
        WHERE email = :email
          AND status != \'done\'
          AND support_email_sent_at IS NULL
    ');
    $stmt2->execute([':email' => substr($email, 0, 100)]);

    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    error_log('mark-support-email-sent.php PDO error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
