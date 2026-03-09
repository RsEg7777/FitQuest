/* ============================================
   FitQuest — App Utilities & PWA
   Navigation, auth guards, toast, helpers
   ============================================ */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}

async function renderSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const user  = await getCurrentUser();
  const stats = user ? await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [user.id]) : null;
  const level = stats ? stats.level : 1;
  const initial = user ? user.username.charAt(0).toUpperCase() : '?';

  const navItems = [
    { href: 'dashboard.html',  icon: '📊', label: 'Dashboard',         id: 'dashboard' },
    { href: 'challenges.html', icon: '🎯', label: 'Challenges',         id: 'challenges' },
    { href: 'plan.html',       icon: '📋', label: 'My Plan',            id: 'plan' },
    { href: 'calories.html',   icon: '🍽️', label: 'Calorie Tracker',   id: 'calories' },
    { href: 'progress.html',   icon: '📈', label: 'Progress & Stats',   id: 'progress' },
    { href: 'leaderboard.html',icon: '🏆', label: 'Leaderboard',        id: 'leaderboard' },
    { href: 'badges.html',     icon: '🏅', label: 'Badges',             id: 'badges' },
    { href: 'exercises.html',  icon: '💪', label: 'Exercise Library',   id: 'exercises' },
    { href: 'profile.html',    icon: '⚙️', label: 'Profile & Settings', id: 'profile' },
  ];

  sidebar.innerHTML = `
    <div class="sidebar-header"><div class="logo">⚡ FitQuest</div></div>
    <nav class="sidebar-nav">
      ${navItems.map(item => `
        <a href="${item.href}" class="${activePage === item.id ? 'active' : ''}">
          <span class="nav-icon">${item.icon}</span>${item.label}
        </a>`).join('')}
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

function setupMobileSidebar() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (toggle) toggle.addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
  if (overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

function requireAuth() {
  if (!getCurrentUserId()) { window.location.href = 'auth.html'; return false; }
  return true;
}

async function requireOnboarding() {
  const userId = getCurrentUserId();
  if (!userId) return false;
  const profile = await dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  if (!profile) { window.location.href = 'onboarding.html'; return false; }
  return true;
}

function logout() {
  localStorage.removeItem('fitquest_user_id');
  window.location.href = 'index.html';
}

function getToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.className = 'toast-container'; document.body.appendChild(c); }
  return c;
}

function showToast(title, message, icon = 'ℹ️', type = '') {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${message}</div></div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showBadgeToast(badgeName, badgeIcon) { showToast('Badge Unlocked!', badgeName, badgeIcon, 'badge-toast'); spawnConfetti(); }

function spawnConfetti() {
  const colors = ['#6c5ce7','#00cec9','#fd79a8','#fdcb6e','#00b894','#e17055'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = (2 + Math.random() * 2) + 's';
    p.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}

function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDayName(dayNum) {
  return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][dayNum - 1] || '';
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

function round(num, decimals = 1) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function setupDailyReminder() {
  if (!('Notification' in window)) return;
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 21 && now.getMinutes() === 0 && Notification.permission === 'granted') {
      new Notification('FitQuest Reminder 💪', { body: "Don't break your streak! Log your workout or meal for today.", icon: '/icons/icon-192.png' });
    }
  }, 60000);
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}

async function initApp(pageName) {
  await initDB();
  if (!requireAuth()) return false;
  if (!await requireOnboarding()) return false;
  await renderSidebar(pageName);
  setupMobileSidebar();
  setupDailyReminder();
  await updateStreak();
  return true;
}

async function updateStreak() {
  const userId = getCurrentUserId();
  if (!userId) return;
  const stats = await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  if (!stats) return;
  const today = getToday();
  const lastActive = stats.last_active_date;
  if (lastActive === today) return;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  if (lastActive === yesterdayStr) {
    const newStreak = stats.current_streak + 1;
    const longest = Math.max(newStreak, stats.longest_streak);
    await dbRun('UPDATE user_stats SET current_streak = ?, longest_streak = ?, last_active_date = ? WHERE user_id = ?',
      [newStreak, longest, today, userId]);
  } else {
    await dbRun('UPDATE user_stats SET current_streak = 1, last_active_date = ? WHERE user_id = ?', [today, userId]);
  }
}
