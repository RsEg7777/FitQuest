/* FitQuest — Badges & Achievements */
(async () => {
  const ready = await initApp('badges');
  if (!ready) return;
  await renderBadges();
})();

async function renderBadges() {
  const userId = getCurrentUserId();
  const allBadges = await dbAll('SELECT * FROM badges ORDER BY id');
  const earned = await dbAll('SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?', [userId]);
  const earnedMap = {};
  earned.forEach(e => { earnedMap[e.badge_id] = e.earned_at; });

  const earnedCount = earned.length;
  const totalCount = allBadges.length;

  document.getElementById('page-content').innerHTML = `
    <div class="card mb-2">
      <div class="flex-between">
        <div>
          <div class="card-title">Your Badges</div>
          <div style="color:var(--text-muted);font-size:0.9rem;">${earnedCount} of ${totalCount} unlocked</div>
        </div>
        <div class="stat-value" style="color:var(--warning)">${Math.round((earnedCount/totalCount)*100)}%</div>
      </div>
      <div class="xp-bar-container mt-1">
        <div class="xp-bar" style="width:${(earnedCount/totalCount)*100}%;background:linear-gradient(90deg,var(--warning),#f0932b);"></div>
      </div>
    </div>

    <div class="badges-grid">
      ${allBadges.map(b => {
        const isEarned = earnedMap[b.id];
        return `
          <div class="badge-card ${isEarned ? 'earned' : 'locked'}">
            <div class="badge-icon">${b.icon}</div>
            <div class="badge-name">${b.name}</div>
            <div class="badge-desc">${b.description}</div>
            ${isEarned ? `<div class="badge-date">Earned ${formatDate(isEarned)}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}
