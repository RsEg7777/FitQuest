/* ============================================
   FitQuest — SQL Console
   Interactive SQL terminal for monitoring DB
   ============================================ */

let queryHistory = [];

(async () => {
  const ready = await initApp('sql-console');
  if (!ready) return;

  const stats = dbGet('SELECT * FROM user_stats WHERE user_id = ?', [getCurrentUserId()]);
  if (stats) {
    document.getElementById('level-badge').textContent = `⭐ Lvl ${stats.level}`;
  }

  renderPresetQueries();
  setupKeyboardShortcut();
  loadHistory();

  // Clear the textarea default whitespace
  document.getElementById('sql-editor').value = '';
})();

/* ---------- Preset Queries ---------- */
const PRESET_QUERIES = [
  { label: '👥 All Users', query: 'SELECT id, username, email, created_at FROM users;', category: 'select' },
  { label: '📊 User Profiles', query: 'SELECT u.username, up.* FROM user_profiles up JOIN users u ON up.user_id = u.id;', category: 'select' },
  { label: '⚡ User Stats', query: 'SELECT u.username, us.* FROM user_stats us JOIN users u ON us.user_id = u.id;', category: 'select' },
  { label: '🍽️ Food Log (Today)', query: `SELECT fl.id, u.username, fl.meal_type, fl.food_name, fl.calories, fl.servings, fl.logged_at\nFROM food_log fl JOIN users u ON fl.user_id = u.id\nWHERE fl.date = date('now')\nORDER BY fl.logged_at DESC;`, category: 'select' },
  { label: '💪 Workout Log (Today)', query: `SELECT wl.id, u.username, wl.exercise_name, wl.duration_min, wl.calories_burned, wl.logged_at\nFROM workout_log wl JOIN users u ON wl.user_id = u.id\nWHERE wl.date = date('now')\nORDER BY wl.logged_at DESC;`, category: 'select' },
  { label: '🎯 Challenges + Status', query: `SELECT dc.title, dc.difficulty, dc.xp_reward,\n  CASE WHEN uc.completed = 1 THEN 'Done' ELSE 'Pending' END AS status,\n  u.username\nFROM daily_challenges dc\nLEFT JOIN user_challenges uc ON dc.id = uc.challenge_id\nLEFT JOIN users u ON uc.user_id = u.id\nWHERE dc.date = date('now');`, category: 'select' },
  { label: '🏅 Earned Badges', query: `SELECT u.username, b.name AS badge, b.icon, b.description, ub.earned_at\nFROM user_badges ub\nJOIN users u ON ub.user_id = u.id\nJOIN badges b ON ub.badge_id = b.id\nORDER BY ub.earned_at DESC;`, category: 'select' },
  { label: '🏆 Leaderboard', query: `SELECT u.username, us.total_xp, us.level, us.current_streak, us.longest_streak\nFROM users u\nLEFT JOIN user_stats us ON u.id = us.user_id\nORDER BY us.total_xp DESC;`, category: 'select' },
  { label: '📈 XP History', query: `SELECT u.username, xl.xp_amount, xl.source, xl.earned_at\nFROM xp_log xl JOIN users u ON xl.user_id = u.id\nORDER BY xl.earned_at DESC\nLIMIT 20;`, category: 'select' },
  { label: '⚖️ Weight History', query: `SELECT u.username, wl.date, wl.weight_kg\nFROM weight_log wl JOIN users u ON wl.user_id = u.id\nORDER BY wl.date DESC\nLIMIT 20;`, category: 'select' },
  { label: '🥘 Indian Foods', query: 'SELECT id, name, category, calories, protein_g, carbs_g, fat_g FROM indian_foods ORDER BY category, name LIMIT 30;', category: 'select' },
  { label: '📋 All Tables', query: "SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name;", category: 'schema' },
  { label: '🔍 Table Schema', query: "SELECT sql FROM sqlite_master WHERE type='table' AND name='users';", category: 'schema' },
  { label: '📊 Row Counts', query: `SELECT 'users' AS tbl, COUNT(*) AS rows FROM users
UNION ALL SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL SELECT 'indian_foods', COUNT(*) FROM indian_foods
UNION ALL SELECT 'food_log', COUNT(*) FROM food_log
UNION ALL SELECT 'workout_log', COUNT(*) FROM workout_log
UNION ALL SELECT 'daily_challenges', COUNT(*) FROM daily_challenges
UNION ALL SELECT 'user_challenges', COUNT(*) FROM user_challenges
UNION ALL SELECT 'badges', COUNT(*) FROM badges
UNION ALL SELECT 'user_badges', COUNT(*) FROM user_badges
UNION ALL SELECT 'xp_log', COUNT(*) FROM xp_log
UNION ALL SELECT 'user_stats', COUNT(*) FROM user_stats
UNION ALL SELECT 'weight_log', COUNT(*) FROM weight_log
UNION ALL SELECT 'workout_plans', COUNT(*) FROM workout_plans
UNION ALL SELECT 'meal_plans', COUNT(*) FROM meal_plans;`, category: 'schema' },
];

function renderPresetQueries() {
  const container = document.getElementById('preset-queries');
  container.innerHTML = PRESET_QUERIES.map((p, i) => `
    <button class="preset-btn ${p.category}" onclick="loadPreset(${i})" title="${escapeHtml(p.query.substring(0, 80))}...">
      ${p.label}
    </button>
  `).join('');
}

function loadPreset(index) {
  const preset = PRESET_QUERIES[index];
  document.getElementById('sql-editor').value = preset.query;
  document.getElementById('sql-editor').focus();
}

/* ---------- Query Execution ---------- */
async function executeQuery() {
  const editor = document.getElementById('sql-editor');
  const sql = editor.value.trim();
  if (!sql) return;

  const resultsCard = document.getElementById('results-card');
  const resultsContainer = document.getElementById('results-container');
  const resultsMeta = document.getElementById('results-meta');
  const resultsTitle = document.getElementById('results-title');

  resultsCard.style.display = 'block';

  const startTime = performance.now();

  try {
    // Determine if this is a read or write query
    const upperSql = sql.toUpperCase().trimStart();
    const isSelect = upperSql.startsWith('SELECT') || upperSql.startsWith('PRAGMA') || upperSql.startsWith('EXPLAIN');

    if (isSelect) {
      // SELECT query — show results as table
      const results = [];
      const stmt = db.prepare(sql);
      const columns = stmt.getColumnNames();

      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();

      const elapsed = (performance.now() - startTime).toFixed(1);

      resultsTitle.textContent = '📊 Query Results';
      resultsMeta.textContent = `${results.length} row${results.length !== 1 ? 's' : ''} · ${elapsed}ms`;

      if (results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="sql-empty-result">
            <span style="font-size:2rem;opacity:0.4;">📭</span>
            <p>No rows returned</p>
          </div>`;
      } else {
        resultsContainer.innerHTML = renderResultTable(columns, results);
      }
    } else {
      // Write query (INSERT, UPDATE, DELETE, CREATE, DROP, etc.)
      db.run(sql);
      await saveDB();

      const elapsed = (performance.now() - startTime).toFixed(1);
      const changes = db.getRowsModified();

      resultsTitle.textContent = '✅ Query Executed';
      resultsMeta.textContent = `${elapsed}ms`;
      resultsContainer.innerHTML = `
        <div class="sql-success-result">
          <span style="font-size:1.5rem;">✅</span>
          <div>
            <strong>Query executed successfully</strong>
            <p style="color:var(--text-muted);font-size:0.85rem;">${changes} row${changes !== 1 ? 's' : ''} affected</p>
          </div>
        </div>`;
    }

    // Add to history
    addToHistory(sql, true);

  } catch (err) {
    const elapsed = (performance.now() - startTime).toFixed(1);

    resultsTitle.textContent = '❌ Error';
    resultsMeta.textContent = elapsed + 'ms';
    resultsContainer.innerHTML = `
      <div class="sql-error-result">
        <span style="font-size:1.5rem;">❌</span>
        <div>
          <strong>SQL Error</strong>
          <p style="color:var(--danger);font-size:0.85rem;font-family:monospace;">${escapeHtml(err.message)}</p>
        </div>
      </div>`;

    addToHistory(sql, false, err.message);
  }

  // Scroll to results
  resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Render Results Table ---------- */
function renderResultTable(columns, rows) {
  let html = '<div class="sql-table-wrapper"><table class="sql-result-table">';

  // Header
  html += '<thead><tr>';
  columns.forEach(col => {
    html += `<th>${escapeHtml(col)}</th>`;
  });
  html += '</tr></thead>';

  // Body
  html += '<tbody>';
  rows.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      const val = row[col];
      const display = val === null ? '<span class="sql-null">NULL</span>' : escapeHtml(String(val));
      html += `<td>${display}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  return html;
}

/* ---------- Query History ---------- */
function addToHistory(sql, success, error = null) {
  queryHistory.unshift({
    sql,
    success,
    error,
    timestamp: new Date().toLocaleTimeString(),
  });

  // Keep last 50 queries
  if (queryHistory.length > 50) queryHistory.pop();

  renderHistory();
}

function renderHistory() {
  const card = document.getElementById('history-card');
  const list = document.getElementById('history-list');

  if (queryHistory.length === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  list.innerHTML = queryHistory.map((h, i) => `
    <div class="history-item ${h.success ? '' : 'error'}" onclick="replayHistory(${i})">
      <div class="history-status">${h.success ? '✅' : '❌'}</div>
      <div class="history-info">
        <code class="history-sql">${escapeHtml(h.sql.substring(0, 120))}${h.sql.length > 120 ? '...' : ''}</code>
        <span class="history-time">${h.timestamp}</span>
      </div>
    </div>
  `).join('');
}

function replayHistory(index) {
  document.getElementById('sql-editor').value = queryHistory[index].sql;
  document.getElementById('sql-editor').focus();
}

function clearHistory() {
  queryHistory = [];
  renderHistory();
}

function loadHistory() {
  renderHistory();
}

/* ---------- Editor Helpers ---------- */
function clearEditor() {
  document.getElementById('sql-editor').value = '';
  document.getElementById('sql-editor').focus();
}

function setupKeyboardShortcut() {
  document.getElementById('sql-editor').addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }

    // Tab to insert spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      e.target.value = e.target.value.substring(0, start) + '  ' + e.target.value.substring(end);
      e.target.selectionStart = e.target.selectionEnd = start + 2;
    }
  });
}

/* ---------- Utility ---------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
