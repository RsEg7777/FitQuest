/* FitQuest — My Plan Page */
let selectedDay = 1;

(async () => {
  const ready = await initApp('plan');
  if (!ready) return;
  renderPlan();
})();

function renderPlan() {
  const userId = getCurrentUserId();
  const profile = dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
  const workouts = dbAll('SELECT * FROM workout_plans WHERE user_id = ? AND day_number = ? ORDER BY id', [userId, selectedDay]);
  const meals = dbAll('SELECT * FROM meal_plans WHERE user_id = ? AND day_number = ? ORDER BY CASE meal_type WHEN "breakfast" THEN 1 WHEN "lunch" THEN 2 WHEN "snack" THEN 3 WHEN "dinner" THEN 4 END', [userId, selectedDay]);

  const totalMealCal = meals.reduce((s, m) => s + m.calories, 0);

  document.getElementById('page-content').innerHTML = `
    <div class="plan-tabs">
      ${[1,2,3,4,5,6,7].map(d => `
        <button class="plan-tab ${d === selectedDay ? 'active' : ''}" onclick="selectDay(${d})">
          ${getDayName(d).substring(0,3)}
        </button>
      `).join('')}
    </div>

    <div class="plan-section">
      <h3>🏋️ Workout Plan — ${getDayName(selectedDay)}</h3>
      ${workouts.length === 0 ? '<p style="color:var(--text-muted)">Rest day or no workouts assigned.</p>' :
        workouts.map(w => `
          <div class="plan-item">
            <div class="pi-info">
              <div class="pi-name">${w.exercise_name}</div>
              <div class="pi-detail">${w.sets} sets × ${w.reps} reps · ${w.duration_min} min · ${w.muscle_group}</div>
            </div>
            <div class="pi-cal">MET ${w.met_value}</div>
          </div>
        `).join('')}
      ${workouts.length > 0 && profile ? `
        <div style="text-align:right;margin-top:0.5rem;font-size:0.85rem;color:var(--text-muted);">
          Est. burn: <strong style="color:var(--accent)">${Math.round(workouts.reduce((s,w) => s + calculateCaloriesBurned(w.met_value, profile.weight_kg, w.duration_min), 0))} kcal</strong>
        </div>` : ''}
    </div>

    <div class="plan-section">
      <h3>🍽️ Meal Plan — ${getDayName(selectedDay)}</h3>
      ${['breakfast','lunch','snack','dinner'].map(type => {
        const items = meals.filter(m => m.meal_type === type);
        if (items.length === 0) return '';
        const icon = type === 'breakfast' ? '🌅' : type === 'lunch' ? '☀️' : type === 'snack' ? '🍪' : '🌙';
        return `
          <h4 style="font-size:0.9rem;color:var(--text-muted);margin:0.75rem 0 0.5rem;text-transform:capitalize;">${icon} ${type}</h4>
          ${items.map(m => `
            <div class="plan-item">
              <div class="pi-info">
                <div class="pi-name">${m.food_name}</div>
                <div class="pi-detail">P: ${m.protein_g}g · C: ${m.carbs_g}g · F: ${m.fat_g}g</div>
              </div>
              <div class="pi-cal">${Math.round(m.calories)} kcal</div>
            </div>
          `).join('')}
        `;
      }).join('')}
      <div style="text-align:right;margin-top:0.5rem;font-size:0.85rem;color:var(--text-muted);">
        Total: <strong style="color:var(--secondary)">${Math.round(totalMealCal)} kcal</strong>
        ${profile ? ` / Target: ${Math.round(profile.target_calories)} kcal` : ''}
      </div>
    </div>
  `;
}

function selectDay(d) {
  selectedDay = d;
  renderPlan();
}
