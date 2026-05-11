<?php
/**
 * POST /api/track-step.php
 * Called by the frontend when the user advances to a new wizard step.
 * Creates the session row if it doesn't exist yet (e.g. right after sign-in).
 *
 * Body (JSON): { session_id, step, name?, email? }
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
if (!$body || empty($body['session_id']) || empty($body['step'])) {
    http_response_code(400);
    echo json_encode(['error' => 'session_id and step are required']);
    exit;
}

// Full funnel order — new wizard steps + legacy old-flow steps
$valid_steps = [
    'broker',           // wizard: selected broker
    'trade-type',       // wizard: selected what they trade
    'upload-mf',        // wizard: uploading MF tradebook
    'upload-ledger',    // wizard: uploading ledger / order history
    'upload-dividend',  // wizard: uploading dividend file
    'holdings',         // wizard: entering portfolio value
    'account-done',     // wizard: ready to calculate (all accounts set)
    'upload',           // old flow: uploaded files
    'details',          // old flow: entering holdings details
    'processing',       // calculating XIRR
    'results',          // results shown
    'edit-holdings',    // editing holdings after results
];
$step = $body['step'];
if (!in_array($step, $valid_steps, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid step']);
    exit;
}

$session_id = substr($body['session_id'], 0, 64);
$name       = substr($body['name']  ?? '', 0, 100);
$email      = substr($body['email'] ?? '', 0, 100);

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Use VALUES() so each named param is only bound once.
    // last_step only moves forward — if the new step ranks lower than the current
    // one (e.g. session restored to 'upload' when user is already at 'details'),
    // we keep the existing value.
    $stmt = $pdo->prepare("
        INSERT INTO xirr_sessions (session_id, name, email, broker, status, last_step)
        VALUES (:sid, :name, :email, '', 'pending', :step)
        ON DUPLICATE KEY UPDATE
            last_step = CASE
                WHEN FIELD(VALUES(last_step),
                        'broker','trade-type','upload-mf','upload-ledger','upload-dividend',
                        'holdings','account-done','upload','details','processing','results','edit-holdings')
                   > FIELD(last_step,
                        'broker','trade-type','upload-mf','upload-ledger','upload-dividend',
                        'holdings','account-done','upload','details','processing','results','edit-holdings')
                THEN VALUES(last_step)
                ELSE last_step
            END,
            name  = CASE WHEN VALUES(name)  != '' THEN VALUES(name)  ELSE name  END,
            email = CASE WHEN VALUES(email) != '' THEN VALUES(email) ELSE email END
    ");
    $stmt->execute([
        ':sid'   => $session_id,
        ':name'  => $name,
        ':email' => $email,
        ':step'  => $step,
    ]);

    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    error_log('track-step.php PDO error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
