<?php
/**
 * POST /api/save-user.php
 * Called by the frontend after the user signs in and submits the form.
 *
 * Body (JSON): { session_id, name, email, broker, google_token? }
 * Response:    { ok: true } | { error: "..." }
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
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

$session_id   = substr($body['session_id'],  0, 64);
$name         = substr($body['name']  ?? '', 0, 100);
$email        = substr($body['email'] ?? '', 0, 100);
$broker       = substr($body['broker'] ?? '', 0, 20);
$google_token = $body['google_token'] ?? null;

// Extract google sub (user ID) from JWT payload — for deduplication only, not for auth
$google_id = null;
if ($google_token) {
    $parts = explode('.', $google_token);
    if (count($parts) === 3) {
        $padded  = str_pad(strtr($parts[1], '-_', '+/'), strlen($parts[1]) % 4 ? strlen($parts[1]) + 4 - strlen($parts[1]) % 4 : strlen($parts[1]), '=', STR_PAD_RIGHT);
        $payload = json_decode(base64_decode($padded), true);
        $google_id = $payload['sub'] ?? null;
    }
}

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare('
        INSERT INTO xirr_sessions (session_id, google_id, name, email, broker, status)
        VALUES (:session_id, :google_id, :name, :email, :broker, \'pending\')
        ON DUPLICATE KEY UPDATE
            name      = VALUES(name),
            email     = VALUES(email),
            broker    = VALUES(broker),
            google_id = COALESCE(VALUES(google_id), google_id)
    ');
    $stmt->execute([
        ':session_id' => $session_id,
        ':google_id'  => $google_id,
        ':name'       => $name,
        ':email'      => $email,
        ':broker'     => $broker,
    ]);

    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    error_log('save-user.php PDO error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
