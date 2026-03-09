/* ============================================
   FitQuest — Auth (Login / Register)
   ============================================ */

/*
 * ────────── Google OAuth Config ──────────
 * Replace this with your Google Cloud Console Client ID.
 * Steps: https://console.cloud.google.com → Credentials → OAuth 2.0 Client ID
 * Add your Vercel domain (and localhost for testing) as Authorized JavaScript Origins.
 */
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// Init DB on page load
(async () => {
  await initDB();
  // If already logged in, redirect
  if (getCurrentUserId()) {
    const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [getCurrentUserId()]);
    window.location.href = profile ? 'dashboard.html' : 'onboarding.html';
  }

  // Initialize Google Sign-In
  initGoogleSignIn();
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

/* ---------- Google Sign-In ---------- */
function initGoogleSignIn() {
  // Wait for the Google Identity Services library to load
  if (typeof google === 'undefined' || !google.accounts) {
    // Retry after a short delay if the library hasn't loaded yet
    setTimeout(initGoogleSignIn, 500);
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
  });
}

function triggerGoogleLogin() {
  if (typeof google === 'undefined' || !google.accounts) {
    alert('Google Sign-In is loading. Please try again in a moment.');
    return;
  }

  // Use the One Tap / popup flow
  google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // Fallback: show the button-based popup
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.top = '50%';
      tempDiv.style.left = '50%';
      tempDiv.style.transform = 'translate(-50%, -50%)';
      tempDiv.style.zIndex = '10000';
      tempDiv.style.background = 'var(--bg-card)';
      tempDiv.style.padding = '2rem';
      tempDiv.style.borderRadius = '16px';
      tempDiv.style.border = '1px solid var(--border)';
      tempDiv.style.boxShadow = '0 8px 40px rgba(0,0,0,0.5)';
      tempDiv.id = 'google-popup-container';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.className = 'modal-close';
      closeBtn.style.float = 'right';
      closeBtn.onclick = () => tempDiv.remove();
      tempDiv.appendChild(closeBtn);

      const title = document.createElement('p');
      title.textContent = 'Choose your Google account';
      title.style.marginBottom = '1rem';
      title.style.fontWeight = '600';
      tempDiv.appendChild(title);

      const btnWrapper = document.createElement('div');
      tempDiv.appendChild(btnWrapper);
      document.body.appendChild(tempDiv);

      google.accounts.id.renderButton(btnWrapper, {
        theme: 'filled_black',
        size: 'large',
        width: 300,
        text: 'continue_with',
      });
    }
  });
}

/* ---------- Handle Google Credential Response ---------- */
async function handleGoogleCredential(response) {
  // Remove popup if it exists
  const popup = document.getElementById('google-popup-container');
  if (popup) popup.remove();

  // Decode the JWT credential to extract user info
  const payload = decodeJwtPayload(response.credential);
  if (!payload || !payload.email) {
    alert('Google Sign-In failed. Could not retrieve account info.');
    return;
  }

  const email = payload.email;
  const name = payload.name || email.split('@')[0];
  // Create a username from the Google name (lowercase, no spaces)
  const username = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
  const googleHash = await hashPassword('google_oauth_' + payload.sub);

  // Check if user already exists with this email
  let user = dbGet('SELECT * FROM users WHERE email = ?', [email]);

  if (user) {
    // Existing user — log them in
    localStorage.setItem('fitquest_user_id', user.id);
    const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]);
    window.location.href = profile ? 'dashboard.html' : 'onboarding.html';
  } else {
    // New user — register them
    // Check if username is taken, if so append a random suffix
    let finalUsername = username;
    let existing = dbGet('SELECT id FROM users WHERE username = ?', [finalUsername]);
    if (existing) {
      finalUsername = username + '_' + Math.floor(Math.random() * 1000);
    }

    try {
      dbRun('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [finalUsername, email, googleHash]);
      user = dbGet('SELECT id FROM users WHERE email = ?', [email]);

      if (user) {
        dbRun('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, 0, 1, 1, 1, ?)',
          [user.id, getToday()]);

        localStorage.setItem('fitquest_user_id', user.id);
        window.location.href = 'onboarding.html';
      }
    } catch (err) {
      alert('Google Sign-In registration failed. Please try manual registration.');
    }
  }
}

/* ---------- Decode JWT Payload (no library needed) ---------- */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
