<?php
/**
 * GET /api/dashboard.php?key=DASHBOARD_KEY
 * Admin funnel dashboard — shows step-by-step user drop-off.
 *
 * Query params:
 *   key   — must match DASHBOARD_KEY in config.php
 *   since — "today" | "7" (default) | "30" | "all"
 */

require_once __DIR__ . '/config.php';

// ── Auth ────────────────────────────────────────────────────────────────────
$key = $_GET['key'] ?? '';
if ($key !== DASHBOARD_KEY) {
    http_response_code(403);
    echo '<!doctype html><html><body style="background:#0a1020;color:#ef4444;font-family:monospace;padding:40px">
        <h2>403 — Wrong key</h2><p>Access /api/dashboard.php?key=YOUR_KEY</p></body></html>';
    exit;
}

// ── Date filter ──────────────────────────────────────────────────────────────
$since = $_GET['since'] ?? '7';
$since_label = 'Last 7 days';
$where_clause = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
if ($since === 'today') {
    $where_clause = 'WHERE DATE(created_at) = CURDATE()';
    $since_label  = 'Today';
} elseif ($since === '30') {
    $where_clause = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    $since_label  = 'Last 30 days';
} elseif ($since === 'all') {
    $where_clause = '';
    $since_label  = 'All time';
}

// ── DB ───────────────────────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Funnel counts
    $funnel = $pdo->query("
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN last_step IN ('details','processing','results') OR status = 'done' THEN 1 ELSE 0 END) AS to_details,
            SUM(CASE WHEN last_step IN ('processing','results') OR status = 'done' THEN 1 ELSE 0 END) AS to_processing,
            SUM(CASE WHEN last_step = 'results' OR status = 'done' THEN 1 ELSE 0 END) AS completed
        FROM xirr_sessions
        $where_clause
    ")->fetch(PDO::FETCH_ASSOC);

    // Step breakdown (count per last_step)
    $step_rows = $pdo->query("
        SELECT COALESCE(last_step, 'upload') AS step, COUNT(*) AS cnt
        FROM xirr_sessions
        $where_clause
        GROUP BY COALESCE(last_step, 'upload')
    ")->fetchAll(PDO::FETCH_ASSOC);
    $step_counts = [];
    foreach ($step_rows as $r) $step_counts[$r['step']] = (int)$r['cnt'];

    // Broker breakdown
    $broker_rows = $pdo->query("
        SELECT
            CASE
                WHEN broker LIKE '%,%' THEN 'multi-broker'
                WHEN broker = '' OR broker IS NULL THEN 'unknown'
                ELSE broker
            END AS b,
            COUNT(*) AS cnt
        FROM xirr_sessions
        $where_clause
        GROUP BY b
        ORDER BY cnt DESC
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Recent sessions
    $sessions = $pdo->query("
        SELECT session_id, name, email, broker, last_step, status, xirr, nifty_xirr, error_message, created_at, completed_at, support_email_sent_at
        FROM xirr_sessions
        " . ($where_clause ?: '') . "
        ORDER BY created_at DESC
        LIMIT 100
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Today vs yesterday quick stats
    $today_row = $pdo->query("
        SELECT
            SUM(CASE WHEN DATE(created_at)  = CURDATE() THEN 1 ELSE 0 END) AS today_new,
            SUM(CASE WHEN DATE(completed_at) = CURDATE() AND status = 'done' THEN 1 ELSE 0 END) AS today_done
        FROM xirr_sessions
    ")->fetch(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    die('<pre style="color:red">DB Error: ' . htmlspecialchars($e->getMessage()) . '</pre>');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function pct($n, $d) {
    if (!$d) return '—';
    return round($n / $d * 100) . '%';
}
function step_badge($step) {
    $colors = [
        'upload'     => '#3b82f6',
        'details'    => '#a78bfa',
        'processing' => '#f59e0b',
        'results'    => '#10b981',
    ];
    $labels = [
        'upload'     => 'Upload',
        'details'    => 'Details',
        'processing' => 'Processing',
        'results'    => 'Results',
    ];
    $c = $colors[$step] ?? '#64748b';
    $l = $labels[$step] ?? ($step ?: '—');
    return "<span style='background:{$c}22;color:{$c};border:1px solid {$c}44;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600'>{$l}</span>";
}
function status_badge($status, $last_step) {
    if ($status === 'done') return "<span style='background:#10b98122;color:#10b981;border:1px solid #10b98144;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600'>Done</span>";
    if ($status === 'error') return "<span style='background:#ef444422;color:#ef4444;border:1px solid #ef444444;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600'>Error</span>";
    if ($last_step === 'processing') return "<span style='background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600'>Stuck</span>";
    return "<span style='background:#64748b22;color:#94a3b8;border:1px solid #64748b44;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600'>Pending</span>";
}
function time_ago($dt) {
    if (!$dt) return '—';
    $diff = time() - strtotime($dt);
    if ($diff < 60) return $diff . 's ago';
    if ($diff < 3600) return floor($diff/60) . 'm ago';
    if ($diff < 86400) return floor($diff/3600) . 'h ago';
    return floor($diff/86400) . 'd ago';
}

$total       = (int)($funnel['total'] ?? 0);
$to_details  = (int)($funnel['to_details'] ?? 0);
$to_proc     = (int)($funnel['to_processing'] ?? 0);
$completed   = (int)($funnel['completed'] ?? 0);

$key_param = urlencode($key);

function since_link($since_val, $label, $current, $key_param) {
    $active = ($current === $since_val) ? "font-weight:700;color:#e2c97e;border-bottom:2px solid #e2c97e;" : "color:#64748b;border-bottom:2px solid transparent;";
    return "<a href='?key={$key_param}&since={$since_val}' style='text-decoration:none;padding:6px 12px;{$active}font-size:13px'>{$label}</a>";
}

?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>XIRR Ledger — Dashboard</title>
<meta name="robots" content="noindex,nofollow">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #0a1020; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; padding: 0 0 60px; }
.header { background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; }
.header h1 { font-size: 18px; font-weight: 700; color: #e2c97e; letter-spacing: -0.3px; }
.header .meta { font-size: 12px; color: #64748b; }
.container { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
.section-title { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; margin-bottom: 16px; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.card { background: #131f35; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 20px 24px; }
.card .label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.card .value { font-size: 32px; font-weight: 800; line-height: 1; }
.card .sub { font-size: 12px; color: #64748b; margin-top: 6px; }
.card .conv { font-size: 13px; font-weight: 700; margin-top: 4px; }
.funnel { background: #131f35; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 24px; margin-bottom: 32px; }
.funnel-row { margin-bottom: 14px; }
.funnel-row:last-child { margin-bottom: 0; }
.funnel-label { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
.funnel-bar-bg { background: rgba(255,255,255,0.05); border-radius: 4px; height: 10px; overflow: hidden; }
.funnel-bar { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
.today-row { display: flex; gap: 20px; margin-bottom: 32px; }
.today-card { background: #131f35; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 24px; flex: 1; display: flex; align-items: center; gap: 16px; }
.today-card .num { font-size: 28px; font-weight: 800; }
.today-card .lbl { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.table-wrap { background: #131f35; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; margin-bottom: 32px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
thead th { background: rgba(255,255,255,0.04); color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; }
tbody td { padding: 11px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: rgba(255,255,255,0.02); }
.pill { display: inline-block; background: rgba(255,255,255,0.06); border-radius: 4px; padding: 2px 8px; font-size: 11px; color: #94a3b8; font-weight: 600; }
.xirr-pos { color: #10b981; font-weight: 700; }
.xirr-neg { color: #ef4444; font-weight: 700; }
.filter-bar { display: flex; gap: 0; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 28px; }
</style>
</head>
<body>

<div class="header">
  <h1>XIRR Ledger — Funnel Dashboard</h1>
  <div class="meta">Auto-refreshes every 60s &nbsp;|&nbsp; <?= date('d M Y, H:i') ?> IST &nbsp;|&nbsp; <a href="?key=<?= $key_param ?>&since=<?= $since ?>" style="color:#e2c97e;text-decoration:none">Refresh</a></div>
</div>

<div class="container">

  <!-- Date filter -->
  <div class="filter-bar">
    <?= since_link('today', 'Today',       $since, $key_param) ?>
    <?= since_link('7',     'Last 7 days', $since, $key_param) ?>
    <?= since_link('30',    'Last 30 days',$since, $key_param) ?>
    <?= since_link('all',   'All time',    $since, $key_param) ?>
  </div>

  <!-- Today quick stats -->
  <div class="today-row">
    <div class="today-card">
      <div class="num" style="color:#3b82f6"><?= (int)($today_row['today_new'] ?? 0) ?></div>
      <div class="lbl">New sessions today</div>
    </div>
    <div class="today-card">
      <div class="num" style="color:#10b981"><?= (int)($today_row['today_done'] ?? 0) ?></div>
      <div class="lbl">Reports generated today</div>
    </div>
  </div>

  <!-- Funnel cards -->
  <div class="section-title"><?= htmlspecialchars($since_label) ?> — Funnel</div>
  <div class="cards">

    <div class="card">
      <div class="label">Signed In</div>
      <div class="value" style="color:#3b82f6"><?= $total ?></div>
      <div class="sub">Reached upload step</div>
      <div class="conv" style="color:#3b82f6">100%</div>
    </div>

    <div class="card">
      <div class="label">Uploaded Files</div>
      <div class="value" style="color:#a78bfa"><?= $to_details ?></div>
      <div class="sub">Passed file validation</div>
      <div class="conv" style="color:#a78bfa"><?= pct($to_details, $total) ?> of signed-in</div>
    </div>

    <div class="card">
      <div class="label">Clicked Calculate</div>
      <div class="value" style="color:#f59e0b"><?= $to_proc ?></div>
      <div class="sub">Triggered processing</div>
      <div class="conv" style="color:#f59e0b"><?= pct($to_proc, $total) ?> of signed-in</div>
    </div>

    <div class="card">
      <div class="label">Got Report</div>
      <div class="value" style="color:#10b981"><?= $completed ?></div>
      <div class="sub">XIRR calculated ✓</div>
      <div class="conv" style="color:#10b981"><?= pct($completed, $total) ?> of signed-in</div>
    </div>

  </div>

  <!-- Funnel visual -->
  <div class="funnel">
    <div class="section-title" style="margin-bottom:20px">Drop-off at each step</div>

    <?php
    $steps = [
      ['label' => 'Signed in → Upload page', 'count' => $total,      'color' => '#3b82f6'],
      ['label' => 'Completed file upload',   'count' => $to_details,  'color' => '#a78bfa'],
      ['label' => 'Clicked Calculate',       'count' => $to_proc,     'color' => '#f59e0b'],
      ['label' => 'Got their report',        'count' => $completed,   'color' => '#10b981'],
    ];
    $max = max(1, $total);
    foreach ($steps as $i => $s):
      $width = round($s['count'] / $max * 100);
      $dropped = ($i > 0) ? ($steps[$i-1]['count'] - $s['count']) : 0;
    ?>
    <div class="funnel-row">
      <div class="funnel-label">
        <span style="color:#cbd5e1"><?= $s['label'] ?></span>
        <span style="color:#94a3b8"><?= $s['count'] ?><?= $dropped > 0 ? " <span style='color:#ef4444;font-size:11px'>(-{$dropped} dropped)</span>" : '' ?></span>
      </div>
      <div class="funnel-bar-bg">
        <div class="funnel-bar" style="width:<?= $width ?>%;background:<?= $s['color'] ?>"></div>
      </div>
    </div>
    <?php endforeach; ?>
  </div>

  <!-- Step distribution + Broker breakdown side by side -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px">

    <div class="table-wrap">
      <div style="padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;font-weight:600;color:#94a3b8">Users last seen at step</div>
      <table>
        <thead><tr><th>Step</th><th>Users</th><th>% of total</th></tr></thead>
        <tbody>
        <?php
        $step_order = ['upload', 'details', 'processing', 'results'];
        foreach ($step_order as $s):
          $cnt = $step_counts[$s] ?? 0;
        ?>
          <tr>
            <td><?= step_badge($s) ?></td>
            <td style="font-weight:700"><?= $cnt ?></td>
            <td style="color:#64748b"><?= pct($cnt, $total) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="table-wrap">
      <div style="padding:16px 20px 12px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:13px;font-weight:600;color:#94a3b8">By broker</div>
      <table>
        <thead><tr><th>Broker</th><th>Sessions</th><th>% of total</th></tr></thead>
        <tbody>
        <?php foreach ($broker_rows as $b): ?>
          <tr>
            <td><span class="pill"><?= htmlspecialchars($b['b'] ?: 'unknown') ?></span></td>
            <td style="font-weight:700"><?= (int)$b['cnt'] ?></td>
            <td style="color:#64748b"><?= pct($b['cnt'], $total) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
    </div>

  </div>

  <!-- Recent sessions -->
  <div class="section-title">Recent sessions (last 100 in period)</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Name</th>
          <th>Email</th>
          <th>Broker</th>
          <th>Last Step</th>
          <th>Status</th>
          <th>XIRR</th>
          <th>Nifty XIRR</th>
          <th>Support Email</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
      <?php foreach ($sessions as $s): ?>
        <tr>
          <td style="color:#64748b;white-space:nowrap"><?= time_ago($s['created_at']) ?></td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><?= htmlspecialchars($s['name'] ?: '—') ?></td>
          <td style="color:#94a3b8;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><?= htmlspecialchars($s['email'] ?: '—') ?></td>
          <td><span class="pill"><?= htmlspecialchars($s['broker'] ?: '—') ?></span></td>
          <td><?= step_badge($s['last_step']) ?></td>
          <td><?= status_badge($s['status'], $s['last_step']) ?></td>
          <td><?php
            if ($s['xirr'] !== null) {
              $v = round((float)$s['xirr'], 1);
              echo "<span class='" . ($v >= 0 ? 'xirr-pos' : 'xirr-neg') . "'>{$v}%</span>";
            } else echo '<span style="color:#475569">—</span>';
          ?></td>
          <td><?php
            if ($s['nifty_xirr'] !== null) {
              $v = round((float)$s['nifty_xirr'], 1);
              echo "<span style='color:#64748b'>{$v}%</span>";
            } else echo '<span style="color:#475569">—</span>';
          ?></td>
          <td style="white-space:nowrap"><?php
            if ($s['support_email_sent_at']) {
              echo "<span style='color:#f59e0b;font-size:11px'>" . time_ago($s['support_email_sent_at']) . "</span>";
            } else {
              echo '<span style="color:#475569">—</span>';
            }
          ?></td>
          <td style="max-width:220px;color:#ef4444;font-size:11px"><?= $s['error_message'] ? htmlspecialchars($s['error_message']) : '<span style="color:#475569">—</span>' ?></td>
        </tr>
      <?php endforeach; ?>
      <?php if (empty($sessions)): ?>
        <tr><td colspan="9" style="text-align:center;color:#475569;padding:32px">No sessions in this period</td></tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>

</div>

<script>
// Auto-refresh every 60s
setTimeout(() => location.reload(), 60000);
</script>

</body>
</html>
