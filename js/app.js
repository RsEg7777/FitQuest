/* ============================================
   FitQuest — App Utilities & PWA
   Navigation, auth guards, toast, helpers
   ============================================ */

/* ---------- PWA Service Worker Registration ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

/* ---------- Sidebar Navigation ---------- */
function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const user = getCurrentUser();
  const stats = user ? dbGet('SELECT * FROM user_stats WHERE user_id = ?', [user.id]) : null;
  const level = stats ? stats.level : 1;
  const initial = user ? user.username.charAt(0).toUpperCase() : '?';

  const navItems = [
    { href: 'dashboard.html', icon: '📊', label: 'Dashboard', id: 'dashboard' },
    { href: 'challenges.html', icon: '🎯', label: 'Challenges', id: 'challenges' },
    { href: 'plan.html', icon: '📋', label: 'My Plan', id: 'plan' },
    { href: 'calories.html', icon: '🍽️', label: 'Calorie Tracker', id: 'calories' },
    { href: 'progress.html', icon: '📈', label: 'Progress & Stats', id: 'progress' },
    { href: 'leaderboard.html', icon: '🏆', label: 'Leaderboard', id: 'leaderboard' },
    { href: 'badges.html', icon: '🏅', label: 'Badges', id: 'badges' },
    { href: 'exercises.html', icon: '💪', label: 'Exercise Library', id: 'exercises' },
    { href: 'sql-console.html', icon: '🖥️', label: 'SQL Console', id: 'sql-console' },
    { href: 'profile.html', icon: '⚙️', label: 'Profile & Settings', id: 'profile' },
  ];

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="logo">⚡ FitQuest</div>
    </div>
    <nav class="sidebar-nav">
      ${navItems.map(item => `
        <a href="${item.href}" class="${activePage === item.id ? 'active' : ''}">
          <span class="nav-icon">${item.icon}</span>
          ${item.label}
        </a>
      `).join('')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar">${initial}</div>
        <div class="user-info">
          <div class="user-name">${user ? user.username : 'Guest'}</div>
          <div class="user-level">Level ${level}</div>
        </div>
        <button class="btn-ghost" onclick="logout()" title="Logout">🚪</button>
      </div>
    </div>
  `;
}

/* ---------- Mobile Sidebar Toggle ---------- */
function setupMobileSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

/* ---------- Auth Guard ---------- */
function requireAuth() {
  const userId = getCurrentUserId();
  if (!userId) {
    window.location.href = 'auth.html';
    return false;
  }
  return true;
}

function requireOnboarding() {
  const userId = getCurrentUserId();
  if (!userId) return false;
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  if (!profile) {
    window.location.href = 'onboarding.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('fitquest_user_id');
  window.location.href = 'index.html';
}

/* ---------- Toast Notifications ---------- */
function getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(title, message, icon = 'ℹ️', type = '') {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showBadgeToast(badgeName, badgeIcon) {
  showToast('Badge Unlocked!', badgeName, badgeIcon, 'badge-toast');
  spawnConfetti();
}

/* ---------- Confetti Effect ---------- */
function spawnConfetti() {
  const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#00b894', '#e17055'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (2 + Math.random() * 2) + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

/* ---------- Modal Helpers ---------- */
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

/* ---------- Date Helpers ---------- */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDayName(dayNum) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayNum - 1] || '';
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

/* ---------- Number Formatting ---------- */
function round(num, decimals = 1) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/* ---------- Push Notification Reminder (9 PM) ---------- */
function setupDailyReminder() {
  if (!('Notification' in window)) return;

  // Check every minute
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 21 && now.getMinutes() === 0) {
      if (Notification.permission === 'granted') {
        new Notification('FitQuest Reminder 💪', {
          body: "Don't break your streak! Log your workout or meal for today.",
          icon: '/icons/icon-192.png'
        });
      }
    }
  }, 60000);
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/* ---------- App Init for protected pages ---------- */
async function initApp(pageName) {
  await initDB();
  if (!requireAuth()) return false;
  if (!requireOnboarding()) return false;

  renderSidebar(pageName);
  setupMobileSidebar();
  setupDailyReminder();
  updateStreak();

  return true;
}

/* ---------- Update streak on page load ---------- */
function updateStreak() {
  const userId = getCurrentUserId();
  if (!userId) return;

  const stats = dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  if (!stats) return;

  const today = getToday();
  const lastActive = stats.last_active_date;

  if (lastActive === today) return; // Already updated today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastActive === yesterdayStr) {
    // Continue streak
    const newStreak = stats.current_streak + 1;
    const longest = Math.max(newStreak, stats.longest_streak);
    dbRun('UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE user_id = ?',
      [newStreak, longest, today, userId]);
  } else if (lastActive !== today) {
    // Streak broken
    dbRun('UPDATE user_stats SET current_streak = 1, last_active_date = ? WHERE user_id = ?',
      [today, userId]);
  }
}
