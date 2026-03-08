/* ============================================
   FitQuest — Dashboard Page
   ============================================ */

(async () => {
  const ready = await initApp('dashboard');
  if (!ready) return;
  renderDashboard();
})();

function renderDashboard() {
  const userId = getCurrentUserId();
  const user = getCurrentUser();
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  const stats = dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  const today = getToday();

  // XP Progress
  const xp = xpProgress(stats ? stats.total_xp : 0);
  document.getElementById('level-badge').textContent = `⭐ Lvl ${xp.level}`;

  // Today's calories
  const todayFood = dbGet('SELECT COALESCE(SUM(calories),0) as cal FROM food_log WHERE user_id = ? AND date = ?', [userId, today]);
  const todayWorkout = dbGet('SELECT COALESCE(SUM(calories_burned),0) as cal, COUNT(*) as cnt FROM workout_log WHERE user_id = ? AND date = ?', [userId, today]);
  const todayChallenges = dbGet('SELECT COUNT(*) as cnt FROM user_challenges uc JOIN daily_challenges dc ON uc.challenge_id = dc.id WHERE uc.user_id = ? AND dc.date = ? AND uc.completed = 1', [userId, today]);

  const content = document.getElementById('dashboard-content');
  content.innerHTML = `
    <!-- Stats Row -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon purple">⚡</div>
        <div class="stat-info">
          <div class="stat-value">${stats ? stats.total_xp : 0}</div>
          <div class="stat-label">Total XP</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon teal">🔥</div>
        <div class="stat-info">
          <div class="stat-value">${stats ? stats.current_streak : 0}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pink">🍽️</div>
        <div class="stat-info">
          <div class="stat-value">${Math.round(todayFood.cal)}</div>
          <div class="stat-label">Calories Today</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">💪</div>
        <div class="stat-info">
          <div class="stat-value">${todayWorkout.cnt}</div>
          <div class="stat-label">Workouts Today</div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div>
        <!-- XP Progress -->
        <div class="card mb-2">
          <div class="card-header">
            <span class="card-title">Level ${xp.level} Progress</span>
            <span style="color:var(--text-muted);font-size:0.85rem;">${Math.round(xp.progress)} / ${xp.needed} XP</span>
          </div>
          <div class="xp-bar-container">
            <div class="xp-bar" style="width: ${xp.percent}%"></div>
          </div>
        </div>

        <!-- Calorie Target -->
        <div class="card mb-2">
          <div class="card-header">
            <span class="card-title">Calorie Target</span>
            <span style="color:var(--secondary);font-weight:700;">${Math.round(todayFood.cal)} / ${profile ? Math.round(profile.target_calories) : '---'} kcal</span>
          </div>
          <div class="xp-bar-container">
            <div class="xp-bar" style="width: ${profile ? Math.min(100, (todayFood.cal / profile.target_calories) * 100) : 0}%; background: linear-gradient(90deg, var(--success), var(--secondary));"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:0.8rem;color:var(--text-muted);">
            <span>Burned: ${Math.round(todayWorkout.cal)} kcal</span>
            <span>Net: ${Math.round(todayFood.cal - todayWorkout.cal)} kcal</span>
          </div>
        </div>

        <!-- Today's Challenges -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Today's Challenges</span>
            <span style="color:var(--text-muted);font-size:0.85rem;">${todayChallenges.cnt} completed</span>
          </div>
          <div id="today-challenges"></div>
        </div>
      </div>

      <div>
        <!-- Profile Summary -->
        <div class="card mb-2">
          <div class="card-title mb-1">Profile Summary</div>
          <div style="font-size:0.9rem;color:var(--text-muted);line-height:2;">
            <div>Goal: <strong style="color:var(--text)">${profile ? profile.goal.toUpperCase() : '---'}</strong></div>
            <div>BMI: <strong style="color:var(--text)">${profile ? profile.bmi : '---'}</strong></div>
            <div>TDEE: <strong style="color:var(--text)">${profile ? Math.round(profile.tdee) : '---'} kcal</strong></div>
            <div>Body: <strong style="color:var(--text)">${profile ? profile.body_type : '---'}</strong></div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <div class="card-title mb-1">Quick Actions</div>
          <div class="quick-actions">
            <a href="calories.html" class="quick-action"><span class="qa-icon">🍽️</span> Log Meal</a>
            <a href="challenges.html" class="quick-action"><span class="qa-icon">🎯</span> Challenges</a>
            <a href="plan.html" class="quick-action"><span class="qa-icon">📋</span> My Plan</a>
            <a href="progress.html" class="quick-action"><span class="qa-icon">📈</span> Progress</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Render today's challenges preview
  const challenges = dbAll('SELECT * FROM daily_challenges WHERE date = ? LIMIT 3', [today]);
  const challengeEl = document.getElementById('today-challenges');
  if (challenges.length === 0) {
    challengeEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No challenges for today yet.</p>';
  } else {
    challengeEl.innerHTML = challenges.map(ch => {
      const done = dbGet('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ? AND completed = 1', [userId, ch.id]);
      return `
        <div class="challenge-card ${done ? 'completed' : ''}" style="margin-bottom:0.5rem;">
          <div class="ch-icon ${ch.difficulty}">${done ? '✅' : '🎯'}</div>
          <div class="ch-info">
            <div class="ch-title">${ch.title}</div>
            <span class="difficulty-badge ${ch.difficulty}">${ch.difficulty}</span>
            <span class="ch-xp">+${ch.xp_reward} XP</span>
          </div>
        </div>
      `;
    }).join('');
  }
}
