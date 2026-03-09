/* FitQuest — Profile & Settings */
(async () => {
  const ready = await initApp('profile');
  if (!ready) return;
  await renderProfile();
})();

async function renderProfile() {
  const userId = getCurrentUserId();
  const user   = await getCurrentUser();
  const profile = await dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  const stats  = await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  const badgeCount = await dbGet('SELECT COUNT(*) as c FROM user_badges WHERE user_id = ?', [userId]);

  document.getElementById('page-content').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="profile-info">
        <h2>${user.username}</h2>
        <p>${user.email} · Joined ${formatDate(user.created_at)}</p>
        <span class="level-badge">⭐ Level ${stats ? stats.level : 1}</span>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid mb-3">
      <div class="stat-card">
        <div class="stat-icon purple">⚡</div>
        <div class="stat-info"><div class="stat-value">${stats ? stats.total_xp : 0}</div><div class="stat-label">Total XP</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon teal">🔥</div>
        <div class="stat-info"><div class="stat-value">${stats ? stats.current_streak : 0}</div><div class="stat-label">Current Streak</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow">🏅</div>
        <div class="stat-info"><div class="stat-value">${badgeCount ? badgeCount.c : 0}</div><div class="stat-label">Badges</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pink">🔥</div>
        <div class="stat-info"><div class="stat-value">${stats ? stats.longest_streak : 0}</div><div class="stat-label">Best Streak</div></div>
      </div>
    </div>

    <!-- Physical Profile -->
    <div class="card mb-2">
      <div class="settings-section">
        <h3>Physical Profile</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Height</label>
            <input type="number" id="pf-height" class="form-control" value="${profile ? profile.height_cm : ''}" step="0.1">
          </div>
          <div class="form-group">
            <label>Weight</label>
            <input type="number" id="pf-weight" class="form-control" value="${profile ? profile.weight_kg : ''}" step="0.1">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Age</label>
            <input type="number" id="pf-age" class="form-control" value="${profile ? profile.age : ''}">
          </div>
          <div class="form-group">
            <label>Goal</label>
            <select id="pf-goal" class="form-control">
              <option value="cut" ${profile && profile.goal === 'cut' ? 'selected' : ''}>Cut</option>
              <option value="maintain" ${profile && profile.goal === 'maintain' ? 'selected' : ''}>Maintain</option>
              <option value="bulk" ${profile && profile.goal === 'bulk' ? 'selected' : ''}>Bulk</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Activity Level</label>
            <select id="pf-activity" class="form-control">
              <option value="sedentary" ${profile && profile.activity_level === 'sedentary' ? 'selected' : ''}>Sedentary</option>
              <option value="light" ${profile && profile.activity_level === 'light' ? 'selected' : ''}>Light</option>
              <option value="moderate" ${profile && profile.activity_level === 'moderate' ? 'selected' : ''}>Moderate</option>
              <option value="active" ${profile && profile.activity_level === 'active' ? 'selected' : ''}>Active</option>
              <option value="very_active" ${profile && profile.activity_level === 'very_active' ? 'selected' : ''}>Very Active</option>
            </select>
          </div>
          <div class="form-group">
            <label>Body Type</label>
            <select id="pf-bodytype" class="form-control">
              <option value="ectomorph" ${profile && profile.body_type === 'ectomorph' ? 'selected' : ''}>Ectomorph</option>
              <option value="mesomorph" ${profile && profile.body_type === 'mesomorph' ? 'selected' : ''}>Mesomorph</option>
              <option value="endomorph" ${profile && profile.body_type === 'endomorph' ? 'selected' : ''}>Endomorph</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary mt-1" onclick="updateProfile()">Update Profile</button>
      </div>
    </div>

    <!-- Settings -->
    <div class="card mb-2">
      <div class="settings-section">
        <h3>Settings</h3>
        <div class="toggle-group">
          <div>
            <div class="toggle-label">Push Notifications</div>
            <div class="toggle-sublabel">Daily reminder at 9 PM</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="notif-toggle" ${Notification.permission === 'granted' ? 'checked' : ''} onchange="toggleNotifications(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="card">
      <div class="settings-section">
        <h3 style="color:var(--danger)">Danger Zone</h3>
        <button class="btn btn-danger btn-sm" onclick="resetData()">Reset All Data</button>
        <span style="font-size:0.8rem;color:var(--text-muted);margin-left:0.5rem;">This will delete all your data and cannot be undone.</span>
      </div>
    </div>
  `;
}

async function updateProfile() {
  const userId   = getCurrentUserId();
  const height   = parseFloat(document.getElementById('pf-height').value);
  const weight   = parseFloat(document.getElementById('pf-weight').value);
  const age      = parseInt(document.getElementById('pf-age').value);
  const goal     = document.getElementById('pf-goal').value;
  const activity = document.getElementById('pf-activity').value;
  const bodyType = document.getElementById('pf-bodytype').value;
  const profile  = await dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

  const bmi    = calculateBMI(weight, height);
  const bmr    = calculateBMR(weight, height, age, profile.sex);
  const tdee   = calculateTDEE(bmr, activity);
  const target = calculateTargetCalories(tdee, goal);

  await dbRun(`UPDATE user_profiles SET height_cm=?, weight_kg=?, age=?, body_type=?, activity_level=?, goal=?,
    bmi=?, bmr=?, tdee=?, target_calories=?, updated_at=NOW() WHERE user_id=?`,
    [height, weight, age, bodyType, activity, goal, bmi, bmr, tdee, target, userId]);

  showToast('Profile Updated', `TDEE: ${tdee} kcal · Target: ${target} kcal`, '✅');
  await renderProfile();
}

function toggleNotifications(enabled) {
  if (enabled) { requestNotificationPermission(); }
}

async function resetData() {
  if (!confirm('Are you sure? This will delete ALL your data permanently!')) return;
  const userId = getCurrentUserId();
  const tables = ['food_log','workout_log','user_challenges','user_badges','xp_log','weight_log','workout_plans','meal_plans','user_profiles','user_stats'];
  for (const table of tables) {
    await dbRun(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }
  await dbRun('DELETE FROM users WHERE id = ?', [userId]);
  localStorage.removeItem('fitquest_user_id');
  window.location.href = 'index.html';
}
