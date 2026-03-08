/* FitQuest — Progress & Stats (Chart.js) */
let weightChart, calorieChart;

(async () => {
  const ready = await initApp('progress');
  if (!ready) return;
  renderProgress();
})();

function renderProgress() {
  const userId = getCurrentUserId();
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

  document.getElementById('page-content').innerHTML = `
    <!-- Weight Trend -->
    <div class="card mb-2">
      <div class="card-header">
        <span class="card-title">Weight Trend</span>
        <button class="btn btn-primary btn-sm" onclick="logWeight()">Log Weight</button>
      </div>
      <div class="chart-container"><canvas id="weight-chart"></canvas></div>
    </div>

    <!-- Calorie Intake vs Target -->
    <div class="card mb-2">
      <div class="card-header">
        <span class="card-title">Calorie Intake (Last 7 Days)</span>
      </div>
      <div class="chart-container"><canvas id="calorie-chart"></canvas></div>
    </div>

    <!-- Workout Heatmap -->
    <div class="card mb-2">
      <div class="card-header">
        <span class="card-title">Workout Heatmap (Last 4 Weeks)</span>
      </div>
      <div class="heatmap-labels">
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
      </div>
      <div class="heatmap-grid" id="heatmap"></div>
    </div>

    <!-- Stats Summary -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon purple">💪</div>
        <div class="stat-info">
          <div class="stat-value">${dbGet('SELECT COUNT(*) as c FROM workout_log WHERE user_id = ?', [userId]).c}</div>
          <div class="stat-label">Total Workouts</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon teal">🍽️</div>
        <div class="stat-info">
          <div class="stat-value">${dbGet('SELECT COUNT(*) as c FROM food_log WHERE user_id = ?', [userId]).c}</div>
          <div class="stat-label">Meals Logged</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow">🔥</div>
        <div class="stat-info">
          <div class="stat-value">${Math.round(dbGet('SELECT COALESCE(SUM(calories_burned),0) as c FROM workout_log WHERE user_id = ?', [userId]).c)}</div>
          <div class="stat-label">Total Burned (kcal)</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🎯</div>
        <div class="stat-info">
          <div class="stat-value">${dbGet('SELECT COUNT(*) as c FROM user_challenges WHERE user_id = ? AND completed = 1', [userId]).c}</div>
          <div class="stat-label">Challenges Done</div>
        </div>
      </div>
    </div>
  `;

  drawWeightChart(userId);
  drawCalorieChart(userId, profile);
  drawHeatmap(userId);
}

function drawWeightChart(userId) {
  const data = dbAll('SELECT date, weight_kg FROM weight_log WHERE user_id = ? ORDER BY date ASC LIMIT 30', [userId]);
  if (data.length === 0) return;

  const ctx = document.getElementById('weight-chart').getContext('2d');
  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.substring(5)),
      datasets: [{
        label: 'Weight (kg)',
        data: data.map(d => d.weight_kg),
        borderColor: '#6c5ce7',
        backgroundColor: 'rgba(108,92,231,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#6c5ce7'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(45,45,94,0.3)' }, ticks: { color: '#8888a8' } },
        y: { grid: { color: 'rgba(45,45,94,0.3)' }, ticks: { color: '#8888a8' } }
      }
    }
  });
}

function drawCalorieChart(userId, profile) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const intake = days.map(d => {
    const r = dbGet('SELECT COALESCE(SUM(calories),0) as c FROM food_log WHERE user_id = ? AND date = ?', [userId, d]);
    return r ? r.c : 0;
  });

  const target = profile ? profile.target_calories : 2000;

  const ctx = document.getElementById('calorie-chart').getContext('2d');
  calorieChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days.map(d => d.substring(5)),
      datasets: [
        {
          label: 'Intake',
          data: intake,
          backgroundColor: 'rgba(0,206,201,0.6)',
          borderRadius: 4
        },
        {
          label: 'Target',
          data: Array(7).fill(target),
          type: 'line',
          borderColor: '#fd79a8',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8888a8' } } },
      scales: {
        x: { grid: { color: 'rgba(45,45,94,0.3)' }, ticks: { color: '#8888a8' } },
        y: { grid: { color: 'rgba(45,45,94,0.3)' }, ticks: { color: '#8888a8' } }
      }
    }
  });
}

function drawHeatmap(userId) {
  const grid = document.getElementById('heatmap');
  const cells = [];
  for (let w = 3; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const dateStr = date.toISOString().split('T')[0];
      const count = dbGet('SELECT COUNT(*) as c FROM workout_log WHERE user_id = ? AND date = ?', [userId, dateStr]);
      const n = count ? count.c : 0;
      const level = n === 0 ? '' : n === 1 ? 'l1' : n === 2 ? 'l2' : n === 3 ? 'l3' : n >= 4 ? 'l4' : 'l5';
      cells.push(`<div class="heatmap-cell ${level}" title="${dateStr}: ${n} workouts"></div>`);
    }
  }
  grid.innerHTML = cells.join('');
}

function logWeight() {
  const weight = prompt('Enter your current weight (kg):');
  if (!weight || isNaN(weight)) return;
  const userId = getCurrentUserId();
  dbRun('INSERT INTO weight_log (user_id, date, weight_kg) VALUES (?, ?, ?)', [userId, getToday(), parseFloat(weight)]);
  awardXP(userId, XP_REWARDS.weight_logged, 'weight_logged');
  renderProgress();
}
