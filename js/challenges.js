/* FitQuest — Daily Challenges */
let activeFilter = 'all';

(async () => {
  const ready = await initApp('challenges');
  if (!ready) return;
  await renderChallenges();
})();

async function renderChallenges() {
  const userId = getCurrentUserId();
  const today = getToday();
  const challenges = await dbAll('SELECT * FROM daily_challenges WHERE date = ?', [today]);

  const filtered = activeFilter === 'all' ? challenges : challenges.filter(c => c.difficulty === activeFilter);

  // Pre-fetch completion status for each challenge
  const doneMap = {};
  for (const ch of filtered) {
    const done = await dbGet('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ? AND completed = 1', [userId, ch.id]);
    doneMap[ch.id] = done;
  }

  document.getElementById('page-content').innerHTML = `
    <div class="challenges-tabs">
      <button class="challenge-tab ${activeFilter === 'all' ? 'active' : ''}" onclick="setFilter('all')">All</button>
      <button class="challenge-tab ${activeFilter === 'easy' ? 'active' : ''}" onclick="setFilter('easy')">🟢 Easy</button>
      <button class="challenge-tab ${activeFilter === 'medium' ? 'active' : ''}" onclick="setFilter('medium')">🟡 Medium</button>
      <button class="challenge-tab ${activeFilter === 'hard' ? 'active' : ''}" onclick="setFilter('hard')">🔴 Hard</button>
    </div>
    <div class="challenges-list">
      ${filtered.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎯</div><h3>No challenges today</h3><p>Check back tomorrow!</p></div>' :
        filtered.map(ch => {
          const done = doneMap[ch.id];
          return `
            <div class="challenge-card ${done ? 'completed' : ''}">
              <div class="ch-icon ${ch.difficulty}">${done ? '✅' : ch.difficulty === 'easy' ? '🟢' : ch.difficulty === 'medium' ? '🟡' : '🔴'}</div>
              <div class="ch-info">
                <div class="ch-title">${ch.title}</div>
                <div class="ch-desc">${ch.description}</div>
                <div style="margin-top:0.25rem;">
                  <span class="difficulty-badge ${ch.difficulty}">${ch.difficulty}</span>
                  <span class="ch-xp">+${ch.xp_reward} XP</span>
                </div>
              </div>
              <div class="ch-action">
                ${done ? '<span style="color:var(--success);font-weight:700;">Done ✓</span>' :
                  `<button class="btn btn-primary btn-sm" onclick="completeChallenge(${ch.id}, ${ch.xp_reward}, '${ch.difficulty}')">Complete</button>`}
              </div>
            </div>
          `;
        }).join('')}
    </div>
  `;
}

async function setFilter(f) {
  activeFilter = f;
  await renderChallenges();
}

async function completeChallenge(challengeId, xpReward, difficulty) {
  const userId = getCurrentUserId();
  await dbRun('INSERT INTO user_challenges (user_id, challenge_id, completed, completed_at) VALUES (?, ?, 1, NOW())',
    [userId, challengeId]);
  await awardXP(userId, xpReward, 'challenge_' + difficulty, challengeId);
  await renderChallenges();
}
