/* FitQuest — Calorie Tracker */
let selectedMealType = 'breakfast';

(async () => {
  const ready = await initApp('calories');
  if (!ready) return;
  renderCalorieTracker();
})();

function renderCalorieTracker() {
  const userId = getCurrentUserId();
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  const today = getToday();
  const target = profile ? profile.target_calories : 2000;

  const todayFood = dbAll('SELECT * FROM food_log WHERE user_id = ? AND date = ? ORDER BY logged_at DESC', [userId, today]);
  const todayWorkouts = dbAll('SELECT * FROM workout_log WHERE user_id = ? AND date = ? ORDER BY logged_at DESC', [userId, today]);
  const totalCal = todayFood.reduce((s, f) => s + f.calories, 0);
  const totalProtein = todayFood.reduce((s, f) => s + f.protein_g, 0);
  const totalCarbs = todayFood.reduce((s, f) => s + f.carbs_g, 0);
  const totalFat = todayFood.reduce((s, f) => s + f.fat_g, 0);
  const totalBurned = todayWorkouts.reduce((s, w) => s + w.calories_burned, 0);

  document.getElementById('page-content').innerHTML = `
    <!-- Summary Cards -->
    <div class="calorie-summary">
      <div class="stat-card">
        <div class="stat-icon green">🍽️</div>
        <div class="stat-info">
          <div class="stat-value">${Math.round(totalCal)}</div>
          <div class="stat-label">Eaten</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon pink">🔥</div>
        <div class="stat-info">
          <div class="stat-value">${Math.round(totalBurned)}</div>
          <div class="stat-label">Burned</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon teal">🎯</div>
        <div class="stat-info">
          <div class="stat-value">${Math.round(target)}</div>
          <div class="stat-label">Target</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon ${totalCal - totalBurned > target ? 'pink' : 'green'}">📊</div>
        <div class="stat-info">
          <div class="stat-value">${Math.round(target - totalCal + totalBurned)}</div>
          <div class="stat-label">Remaining</div>
        </div>
      </div>
    </div>

    <!-- Macro Summary -->
    <div class="card mb-2">
      <div class="card-title mb-1">Macros Today</div>
      <div style="display:flex;gap:2rem;font-size:0.9rem;">
        <div><strong style="color:var(--info)">${round(totalProtein)}g</strong> Protein</div>
        <div><strong style="color:var(--warning)">${round(totalCarbs)}g</strong> Carbs</div>
        <div><strong style="color:var(--accent)">${round(totalFat)}g</strong> Fat</div>
      </div>
    </div>

    <!-- Food Search -->
    <div class="card mb-2">
      <div class="card-header">
        <span class="card-title">Log Food</span>
        <select class="form-control" style="width:auto;" onchange="selectedMealType=this.value">
          <option value="breakfast">🌅 Breakfast</option>
          <option value="lunch">☀️ Lunch</option>
          <option value="snack">🍪 Snack</option>
          <option value="dinner">🌙 Dinner</option>
        </select>
      </div>
      <div class="food-search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="food-search" placeholder="Search Indian foods (e.g. roti, dal, biryani...)" oninput="searchFood(this.value)">
      </div>
      <div class="food-results" id="food-results"></div>
    </div>

    <!-- Log Workout -->
    <div class="card mb-2">
      <div class="card-header">
        <span class="card-title">Log Workout</span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Exercise</label>
          <select id="workout-exercise" class="form-control" onchange="updateBurnCalc()">
            ${getExerciseLibrary().map(e => `<option value="${e.name}" data-met="${e.met}">${e.name} (MET: ${e.met})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Duration (min)</label>
          <input type="number" id="workout-duration" class="form-control" value="30" min="1" oninput="updateBurnCalc()">
        </div>
      </div>
      <div class="burn-calc" id="burn-calc">
        <div class="burn-value">${profile ? calculateCaloriesBurned(8.0, profile.weight_kg, 30) : 0}</div>
        <div class="burn-label">Estimated calories burned</div>
      </div>
      <button class="btn btn-primary btn-block mt-2" onclick="logWorkout()">Log Workout 💪</button>
    </div>

    <!-- Today's Log -->
    <div class="card">
      <div class="card-title mb-1">Today's Food Log</div>
      ${['breakfast','lunch','snack','dinner'].map(type => {
        const items = todayFood.filter(f => f.meal_type === type);
        if (items.length === 0) return '';
        const icon = type === 'breakfast' ? '🌅' : type === 'lunch' ? '☀️' : type === 'snack' ? '🍪' : '🌙';
        return `
          <div class="meal-section">
            <h3>${icon} ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
            ${items.map(f => `
              <div class="logged-food">
                <span class="lf-name">${f.food_name} ${f.servings > 1 ? '×' + f.servings : ''}</span>
                <span class="lf-cal">${Math.round(f.calories)} kcal</span>
                <button class="lf-delete" onclick="deleteFood(${f.id})">✕</button>
              </div>
            `).join('')}
          </div>
        `;
      }).join('') || '<p style="color:var(--text-muted)">No food logged yet today. Search above to start!</p>'}

      ${todayWorkouts.length > 0 ? `
        <div class="meal-section">
          <h3>💪 Workouts</h3>
          ${todayWorkouts.map(w => `
            <div class="logged-food">
              <span class="lf-name">${w.exercise_name} · ${w.duration_min} min</span>
              <span class="lf-cal" style="color:var(--accent)">-${Math.round(w.calories_burned)} kcal</span>
              <button class="lf-delete" onclick="deleteWorkout(${w.id})">✕</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function searchFood(query) {
  const results = document.getElementById('food-results');
  if (query.length < 2) { results.classList.remove('show'); return; }

  const foods = dbAll('SELECT * FROM indian_foods WHERE name LIKE ? LIMIT 15', ['%' + query + '%']);
  if (foods.length === 0) { results.innerHTML = '<div style="padding:1rem;color:var(--text-muted)">No results found.</div>'; results.classList.add('show'); return; }

  results.innerHTML = foods.map(f => `
    <div class="food-result-item" onclick="logFood(${f.id})">
      <div>
        <div class="fr-name">${f.name} ${f.is_veg ? '🟢' : '🔴'}</div>
        <div class="fr-serving">${f.serving_size} ${f.serving_unit}</div>
      </div>
      <div class="fr-cal">${Math.round(f.calories)} kcal</div>
    </div>
  `).join('');
  results.classList.add('show');
}

function logFood(foodId) {
  const userId = getCurrentUserId();
  const food = dbGet('SELECT * FROM indian_foods WHERE id = ?', [foodId]);
  if (!food) return;

  dbRun('INSERT INTO food_log (user_id, date, meal_type, food_name, food_id, servings, calories, protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)',
    [userId, getToday(), selectedMealType, food.name, food.id, food.calories, food.protein_g, food.carbs_g, food.fat_g]);

  awardXP(userId, XP_REWARDS.meal_logged, 'meal_logged', foodId);
  document.getElementById('food-search').value = '';
  document.getElementById('food-results').classList.remove('show');
  renderCalorieTracker();
}

function deleteFood(id) {
  dbRun('DELETE FROM food_log WHERE id = ?', [id]);
  renderCalorieTracker();
}

function updateBurnCalc() {
  const sel = document.getElementById('workout-exercise');
  const met = parseFloat(sel.options[sel.selectedIndex].dataset.met);
  const dur = parseInt(document.getElementById('workout-duration').value) || 0;
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [getCurrentUserId()]);
  const burn = profile ? calculateCaloriesBurned(met, profile.weight_kg, dur) : 0;
  const calc = document.getElementById('burn-calc');
  if (calc) {
    calc.querySelector('.burn-value').textContent = burn;
  }
}

function logWorkout() {
  const userId = getCurrentUserId();
  const sel = document.getElementById('workout-exercise');
  const name = sel.value;
  const met = parseFloat(sel.options[sel.selectedIndex].dataset.met);
  const dur = parseInt(document.getElementById('workout-duration').value) || 0;
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  const burn = profile ? calculateCaloriesBurned(met, profile.weight_kg, dur) : 0;

  dbRun('INSERT INTO workout_log (user_id, date, exercise_name, duration_min, calories_burned, met_value) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, getToday(), name, dur, burn, met]);

  awardXP(userId, XP_REWARDS.workout_complete, 'workout_complete');
  renderCalorieTracker();
}

function deleteWorkout(id) {
  dbRun('DELETE FROM workout_log WHERE id = ?', [id]);
  renderCalorieTracker();
}
