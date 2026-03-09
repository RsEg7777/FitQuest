const http = require('http');
const fs   = require('fs');
const path = require('path');
const pool = require('./db-server');

const PORT = process.env.PORT || 3000;

// ── Helpers ──────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// Translate SQLite-specific functions to MySQL equivalents
function normalizeSql(sql) {
  return sql.replace(/datetime\(["']now["']\)/gi, 'NOW()');
}

// Allow only data-manipulation queries — no DDL
function isSafe(sql) {
  return /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)\s/i.test(sql);
}

// ── Query handler ─────────────────────────────────────────────────────────────

async function handleQuery(req, res) {
  let body;
  try { body = await readBody(req); }
  catch { return sendJSON(res, 400, { error: 'Bad request body' }); }

  const { sql: rawSql, params = [], type } = body;
  if (!rawSql || !type) return sendJSON(res, 400, { error: 'sql and type required' });
  if (!isSafe(rawSql))  return sendJSON(res, 403, { error: 'Query not allowed' });

  const sql = normalizeSql(rawSql);
  let conn;
  try {
    conn = await pool.getConnection();
    if (type === 'all') {
      const [rows] = await conn.query(sql, params);
      return sendJSON(res, 200, { rows });
    }
    if (type === 'get') {
      const [rows] = await conn.query(sql, params);
      return sendJSON(res, 200, { row: rows[0] || null });
    }
    if (type === 'run') {
      const [result] = await conn.query(sql, params);
      return sendJSON(res, 200, { insertId: result.insertId || null, affectedRows: result.affectedRows || 0 });
    }
    return sendJSON(res, 400, { error: 'Unknown type' });
  } catch (err) {
    console.error('SQL error:', err.message, '\n→', sql);
    return sendJSON(res, 500, { error: err.message });
  } finally {
    if (conn) conn.release();
  }
}

// ── Static file server ───────────────────────────────────────────────────────

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  const filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not Found'); }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

// ── Daily challenges seeder (runs on startup) ────────────────────────────────

async function seedTodayChallenges() {
  const today = new Date().toISOString().split('T')[0];
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM daily_challenges WHERE date = ?', [today]
  );
  if (rows[0].cnt > 0) return;

  const challenges = [
    [today, 'easy',   'Morning Stretch',    'Do a 5-minute full body stretch',                   25,  'stretch'],
    [today, 'easy',   'Water Challenge',    'Drink 8 glasses of water today',                    25,  'hydration'],
    [today, 'easy',   'Walk 2000 Steps',    'Take a short walk around your area',                25,  'cardio'],
    [today, 'medium', '20 Push-ups',        'Complete 20 push-ups (can be split into sets)',     50,  'strength'],
    [today, 'medium', 'Healthy Meal',       'Log a meal under 500 calories',                     50,  'nutrition'],
    [today, 'medium', 'Plank Hold',         'Hold a plank for 60 seconds total',                 50,  'core'],
    [today, 'hard',   '30-Min Workout',     'Complete a 30-minute workout session',              100, 'full_body'],
    [today, 'hard',   'No Sugar Day',       'Avoid all added sugars for the entire day',         100, 'nutrition'],
    [today, 'hard',   'Surya Namaskar x12', 'Complete 12 rounds of Sun Salutation',              100, 'yoga'],
  ];

  for (const c of challenges) {
    await pool.query(
      'INSERT INTO daily_challenges (date, difficulty, title, description, xp_reward, challenge_type) VALUES (?, ?, ?, ?, ?, ?)',
      c
    );
  }
  console.log(`✓ Seeded ${challenges.length} challenges for ${today}`);
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'POST' && req.url === '/api/query') return handleQuery(req, res);
  if (req.method === 'GET'  && req.url === '/api/ping')  return sendJSON(res, 200, { ok: true });

  serveStatic(req, res);
});

server.listen(PORT, async () => {
  console.log(`⚡ FitQuest running at http://localhost:${PORT}`);
  try { await seedTodayChallenges(); }
  catch (err) { console.warn('Could not seed challenges:', err.message); }
});
