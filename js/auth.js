/* ============================================
   FitQuest — Auth (Login / Register)
   ============================================ */

// Init DB on page load
(async () => {
  await initDB();
  // If already logged in, redirect
  if (getCurrentUserId()) {
    const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [getCurrentUserId()]);
    window.location.href = profile ? 'dashboard.html' : 'onboarding.html';
  }
})();

/* ---------- Tab Switching ---------- */
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  if (tab === 'login') {
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('login-form').classList.add('active');
  } else {
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('register-form').classList.add('active');
  }
}

/* ---------- Login ---------- */
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  const hash = await hashPassword(password);
  const user = dbGet('SELECT * FROM users WHERE username = ? AND password_hash = ?', [username, hash]);

  if (!user) {
    errorEl.textContent = 'Invalid username or password.';
    errorEl.style.display = 'block';
    return;
  }

  localStorage.setItem('fitquest_user_id', user.id);

  // Check if onboarding is done
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]);
  window.location.href = profile ? 'dashboard.html' : 'onboarding.html';
}

/* ---------- Register ---------- */
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const errorEl = document.getElementById('register-error');

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.style.display = 'block';
    return;
  }

  // Check if username exists
  const existing = dbGet('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    errorEl.textContent = 'Username or email already taken.';
    errorEl.style.display = 'block';
    return;
  }

  const hash = await hashPassword(password);

  try {
    dbRun('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash]);
    const user = dbGet('SELECT id FROM users WHERE username = ?', [username]);

    if (user) {
      // Initialise user stats
      dbRun('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, 0, 1, 1, 1, ?)',
        [user.id, getToday()]);

      localStorage.setItem('fitquest_user_id', user.id);
      window.location.href = 'onboarding.html';
    }
  } catch (err) {
    errorEl.textContent = 'Registration failed. Please try again.';
    errorEl.style.display = 'block';
  }
}
