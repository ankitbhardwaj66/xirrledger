<?php
/**
 * POST /api/get-failed-sessions.php
 * Called by the support-emailer Lambda to find users who only had failures today.
 *
 * Auth:     X-API-Secret header
 * Body:     {} (no params needed)
 * Response: { users: [{ email, name, error_message }] }
 *
 * Logic:
 *   - Sessions that are 'error' OR stuck 'pending' (>30 min old) AND support_email_sent_at IS NULL
 *   - Exclude any email whose most recent 'done' session is newer than their most recent failure (already solved it)
 *   - Exclude any email already sent a support email today (UTC date — extra dedup safety net)
 *
 * Required table (run once on Hostinger MySQL):
 *   CREATE TABLE IF NOT EXISTS support_emails_sent (
 *     email    VARCHAR(100) NOT NULL,
 *     sent_date DATE        NOT NULL,
 *     sent_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
 *     PRIMARY KEY (email, sent_date)
 *   );
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

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->query("
        SELECT
            email,
            -- pick the name from the most recent session for this email
            SUBSTRING_INDEX(GROUP_CONCAT(name ORDER BY created_at DESC SEPARATOR '|||'), '|||', 1) AS name,
            -- pick the most recent non-null error message if available
            SUBSTRING_INDEX(GROUP_CONCAT(
                CASE WHEN error_message IS NOT NULL AND error_message != '' THEN error_message END
                ORDER BY created_at DESC SEPARATOR '|||'
            ), '|||', 1) AS error_message
        FROM xirr_sessions
        WHERE
            email != ''
            AND support_email_sent_at IS NULL
            AND (
                status = 'error'
                OR (status = 'pending' AND created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))
            )
            -- exclude if their most recent done session is newer than their most recent failure
            -- (they already solved it — no need to intervene regardless of when)
            AND email NOT IN (
                SELECT DISTINCT email
                FROM xirr_sessions
                WHERE status = 'done'
                  AND created_at >= (
                      SELECT MAX(s2.created_at)
                      FROM xirr_sessions s2
                      WHERE s2.email = xirr_sessions.email
                        AND (
                            s2.status = 'error'
                            OR (s2.status = 'pending' AND s2.created_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))
                        )
                  )
            )
            -- extra dedup: never send twice on the same UTC day
            AND email NOT IN (
                SELECT email
                FROM support_emails_sent
                WHERE sent_date = CURDATE()
            )
        GROUP BY email
    ");

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Clean up nulls
    foreach ($users as &$u) {
        $u['name']          = $u['name']          ?? '';
        $u['error_message'] = $u['error_message'] ?? '';
    }

    echo json_encode(['users' => $users]);
} catch (PDOException $e) {
    error_log('get-failed-sessions.php PDO error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
