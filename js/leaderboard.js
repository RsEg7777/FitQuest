/* FitQuest — Leaderboard */
(async () => {
  const ready = await initApp('leaderboard');
  if (!ready) return;
  ensureDemoLeaderboard();
  renderLeaderboard();
})();

function renderLeaderboard() {
  const userId = getCurrentUserId();
  const users = getLeaderboard();
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  // Reorder top3 for podium: [2nd, 1st, 3rd]
  const podium = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const medals = ['🥈', '🥇', '🥉'];

  document.getElementById('page-content').innerHTML = `
    <div class="card mb-2">
      <div class="card-title text-center mb-2">This Week's Rankings</div>
      ${top3.length >= 3 ? `
        <div class="leaderboard-podium">
          ${podium.map((u, i) => `
            <div class="podium-item">
              <div class="podium-avatar">${u.username.charAt(0).toUpperCase()}</div>
              <div class="podium-rank">${medals[i]}</div>
              <div class="podium-name">${u.username}${u.id === userId ? ' (You)' : ''}</div>
              <div class="podium-xp">${u.weekly_xp} XP</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>

    <div class="card">
      <table class="leaderboard-table">
        <thead>
          <tr><th>#</th><th>User</th><th>Weekly XP</th><th>Level</th><th>Streak</th></tr>
        </thead>
        <tbody>
          ${users.map((u, i) => `
            <tr class="${u.id === userId ? 'self-row' : ''}">
              <td class="rank">${i + 1}</td>
              <td>
                <div class="user-cell">
                  <div class="lb-avatar">${u.username.charAt(0).toUpperCase()}</div>
                  <span>${u.username}${u.id === userId ? ' (You)' : ''}</span>
                </div>
              </td>
              <td class="xp-cell">${u.weekly_xp} XP</td>
              <td><span class="level-cell">Lvl ${u.level || 1}</span></td>
              <td>🔥 ${u.current_streak || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
