/* ============================================
   FitQuest — Onboarding Wizard Logic
   Multi-step form, BMI/TDEE, plan generation
   ============================================ */

let onboardingData = { bodyType: '', goal: '' };

(async () => {
  await initDB();
  if (!getCurrentUserId()) { window.location.href = 'auth.html'; return; }
  // If already onboarded, go to dashboard
  const profile = await dbGet('SELECT * FROM user_profiles WHERE user_id = ?', [getCurrentUserId()]);
  if (profile) { window.location.href = 'dashboard.html'; }
})();

/* ---------- Step Navigation ---------- */
function nextStep(current) {
  if (!validateStep(current)) return;
  if (current === 4) computeResults();
  goToStep(current + 1);
}

function prevStep(current) {
  goToStep(current - 1);
}

function goToStep(num) {
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + num).classList.add('active');
  // Update indicators
  for (let i = 1; i <= 5; i++) {
    const ind = document.getElementById('step-ind-' + i);
    ind.classList.remove('active', 'done');
    if (i < num) ind.classList.add('done');
    if (i === num) ind.classList.add('active');
  }
}

/* ---------- Validation ---------- */
function validateStep(step) {
  switch (step) {
    case 1: {
      const h = document.getElementById('ob-height').value;
      const w = document.getElementById('ob-weight').value;
      const a = document.getElementById('ob-age').value;
      const s = document.getElementById('ob-sex').value;
      if (!h || !w || !a || !s) { alert('Please fill in all fields.'); return false; }
      return true;
    }
    case 2:
      if (!onboardingData.bodyType) { alert('Please select a body type.'); return false; }
      return true;
    case 3:
      if (!document.getElementById('ob-activity').value) { alert('Please select your activity level.'); return false; }
      return true;
    case 4:
      if (!onboardingData.goal) { alert('Please select a goal.'); return false; }
      return true;
    default: return true;
  }
}

/* ---------- Selectors ---------- */
function selectBodyType(type) {
  onboardingData.bodyType = type;
  document.querySelectorAll('.body-type-option').forEach(o => o.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

function selectGoal(goal) {
  onboardingData.goal = goal;
  document.querySelectorAll('.goal-option').forEach(o => o.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

/* ---------- Compute BMI, BMR, TDEE, Target ---------- */
function computeResults() {
  const height = parseFloat(document.getElementById('ob-height').value);
  const weight = parseFloat(document.getElementById('ob-weight').value);
  const age = parseInt(document.getElementById('ob-age').value);
  const sex = document.getElementById('ob-sex').value;
  const activity = document.getElementById('ob-activity').value;
  const goal = onboardingData.goal;

  const bmi = calculateBMI(weight, height);
  const bmr = calculateBMR(weight, height, age, sex);
  const tdee = calculateTDEE(bmr, activity);
  const target = calculateTargetCalories(tdee, goal);

  onboardingData = { ...onboardingData, height, weight, age, sex, activity, bmi, bmr, tdee, target };

  // Display results
  const grid = document.getElementById('results-grid');
  grid.innerHTML = `
    <div class="result-item">
      <div class="value">${bmi}</div>
      <div class="label">BMI</div>
    </div>
    <div class="result-item">
      <div class="value">${bmr}</div>
      <div class="label">BMR (kcal)</div>
    </div>
    <div class="result-item">
      <div class="value">${tdee}</div>
      <div class="label">TDEE (kcal)</div>
    </div>
    <div class="result-item">
      <div class="value" style="color: var(--secondary)">${target}</div>
      <div class="label">Target (kcal/day)</div>
    </div>
  `;

  // BMI interpretation
  let interp = '';
  if (bmi < 18.5) interp = 'Underweight — Consider a bulk plan to build healthy mass.';
  else if (bmi < 25) interp = 'Normal weight — Great foundation for any fitness goal!';
  else if (bmi < 30) interp = 'Overweight — A cut plan can help you reach optimal range.';
  else interp = 'Obese — Focus on gradual, sustainable fat loss with proper nutrition.';
  document.getElementById('bmi-interpretation').textContent = interp;
}

/* ---------- Save Profile & Generate Plan ---------- */
async function finishOnboarding() {
  const d = onboardingData;
  const userId = getCurrentUserId();

  // INSERT profile
  await dbRun(`INSERT INTO user_profiles (user_id, height_cm, weight_kg, age, sex, body_type, activity_level, goal, bmi, bmr, tdee, target_calories)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, d.height, d.weight, d.age, d.sex, d.bodyType, d.activity, d.goal, d.bmi, d.bmr, d.tdee, d.target]);

  // Log initial weight
  await dbRun('INSERT INTO weight_log (user_id, date, weight_kg) VALUES (?, ?, ?)',
    [userId, getToday(), d.weight]);

  // Generate workout plan
  await generateWorkoutPlan(userId, d);

  // Generate meal plan
  await generateMealPlan(userId, d);

  // Award daily login XP
  await awardXP(userId, XP_REWARDS.daily_login, 'daily_login');

  // Ensure demo leaderboard users
  await ensureDemoLeaderboard();

  window.location.href = 'dashboard.html';
}

/* ---------- Workout Plan Generator ---------- */
async function generateWorkoutPlan(userId, d) {
  const plans = {
    cut: {
      ectomorph: [
        [{ name: 'Walking', sets: 1, reps: 1, dur: 30, met: 3.5, grp: 'Cardio' }, { name: 'Push-ups', sets: 3, reps: 15, dur: 10, met: 8.0, grp: 'Chest' }],
        [{ name: 'Squats', sets: 3, reps: 20, dur: 10, met: 5.0, grp: 'Legs' }, { name: 'Plank', sets: 3, reps: 1, dur: 5, met: 4.0, grp: 'Core' }],
        [{ name: 'Running (outdoor)', sets: 1, reps: 1, dur: 20, met: 9.8, grp: 'Cardio' }, { name: 'Crunches', sets: 3, reps: 20, dur: 8, met: 3.8, grp: 'Core' }],
        [{ name: 'Yoga (Hatha)', sets: 1, reps: 1, dur: 30, met: 3.0, grp: 'Flexibility' }],
        [{ name: 'Cycling', sets: 1, reps: 1, dur: 25, met: 7.5, grp: 'Cardio' }, { name: 'Lunges', sets: 3, reps: 15, dur: 10, met: 5.0, grp: 'Legs' }],
        [{ name: 'Jumping Jacks', sets: 3, reps: 30, dur: 10, met: 8.0, grp: 'Cardio' }, { name: 'Mountain Climbers', sets: 3, reps: 20, dur: 10, met: 10.0, grp: 'HIIT' }],
        [{ name: 'Stretching', sets: 1, reps: 1, dur: 20, met: 2.3, grp: 'Recovery' }],
      ],
    },
    bulk: {
      ectomorph: [
        [{ name: 'Bench Press', sets: 4, reps: 10, dur: 15, met: 6.0, grp: 'Chest' }, { name: 'Push-ups', sets: 3, reps: 15, dur: 8, met: 8.0, grp: 'Chest' }],
        [{ name: 'Squats', sets: 4, reps: 12, dur: 15, met: 5.0, grp: 'Legs' }, { name: 'Lunges', sets: 3, reps: 12, dur: 10, met: 5.0, grp: 'Legs' }],
        [{ name: 'Shoulder Press', sets: 4, reps: 10, dur: 12, met: 5.0, grp: 'Shoulders' }, { name: 'Bicep Curls', sets: 3, reps: 12, dur: 10, met: 4.0, grp: 'Arms' }],
        [{ name: 'Stretching', sets: 1, reps: 1, dur: 20, met: 2.3, grp: 'Recovery' }],
        [{ name: 'Deadlifts', sets: 4, reps: 8, dur: 15, met: 6.0, grp: 'Back' }, { name: 'Pull-ups', sets: 3, reps: 8, dur: 10, met: 8.0, grp: 'Back' }],
        [{ name: 'Tricep Dips', sets: 3, reps: 12, dur: 10, met: 5.0, grp: 'Arms' }, { name: 'Plank', sets: 3, reps: 1, dur: 5, met: 4.0, grp: 'Core' }],
        [{ name: 'Yoga (Hatha)', sets: 1, reps: 1, dur: 30, met: 3.0, grp: 'Recovery' }],
      ],
    },
    maintain: {
      ectomorph: [
        [{ name: 'Push-ups', sets: 3, reps: 15, dur: 10, met: 8.0, grp: 'Chest' }, { name: 'Walking', sets: 1, reps: 1, dur: 20, met: 3.5, grp: 'Cardio' }],
        [{ name: 'Squats', sets: 3, reps: 15, dur: 12, met: 5.0, grp: 'Legs' }, { name: 'Crunches', sets: 3, reps: 20, dur: 8, met: 3.8, grp: 'Core' }],
        [{ name: 'Running (outdoor)', sets: 1, reps: 1, dur: 20, met: 9.8, grp: 'Cardio' }],
        [{ name: 'Stretching', sets: 1, reps: 1, dur: 20, met: 2.3, grp: 'Recovery' }],
        [{ name: 'Cycling', sets: 1, reps: 1, dur: 25, met: 7.5, grp: 'Cardio' }, { name: 'Shoulder Press', sets: 3, reps: 12, dur: 10, met: 5.0, grp: 'Shoulders' }],
        [{ name: 'Surya Namaskar', sets: 1, reps: 12, dur: 15, met: 4.0, grp: 'Full Body' }, { name: 'Plank', sets: 3, reps: 1, dur: 5, met: 4.0, grp: 'Core' }],
        [{ name: 'Yoga (Hatha)', sets: 1, reps: 1, dur: 30, met: 3.0, grp: 'Recovery' }],
      ],
    },
  };

  const goalPlan = plans[d.goal] || plans.maintain;
  const workouts = goalPlan.ectomorph;

  for (let dayIdx = 0; dayIdx < workouts.length; dayIdx++) {
    for (const ex of workouts[dayIdx]) {
      await dbRun(`INSERT INTO workout_plans (user_id, day_number, exercise_name, sets, reps, duration_min, met_value, muscle_group)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, dayIdx + 1, ex.name, ex.sets, ex.reps, ex.dur, ex.met, ex.grp]);
    }
  }
}

/* ---------- Meal Plan Generator ---------- */
async function generateMealPlan(userId, d) {
  const mealTemplates = [
    // Day 1
    { breakfast: ['Oats Porridge', 'Banana (1 medium)'], lunch: ['Plain Rice (cooked)', 'Dal Tadka (Toor)', 'Green Salad'], snack: ['Chai (with milk & sugar)', 'Almonds'], dinner: ['Roti (Chapati)', 'Palak Paneer', 'Raita (Cucumber)'] },
    // Day 2
    { breakfast: ['Idli', 'Sambar'], lunch: ['Jeera Rice', 'Rajma (Kidney Beans)', 'Green Salad'], snack: ['Buttermilk (Chaas)', 'Roasted Chana'], dinner: ['Roti (Chapati)', 'Chicken Curry'] },
    // Day 3
    { breakfast: ['Poha', 'Chai (with milk & sugar)'], lunch: ['Plain Rice (cooked)', 'Chole (Chickpea Curry)', 'Raita (Cucumber)'], snack: ['Apple (1 medium)', 'Peanuts (roasted)'], dinner: ['Paratha (plain)', 'Mixed Veg Curry'] },
    // Day 4
    { breakfast: ['Dosa (plain)', 'Coconut Water'], lunch: ['Pulao (Veg)', 'Moong Dal', 'Green Salad'], snack: ['Makhana (Fox nuts)', 'Green Tea'], dinner: ['Roti (Chapati)', 'Aloo Gobi', 'Curd / Dahi'] },
    // Day 5
    { breakfast: ['Upma', 'Banana (1 medium)'], lunch: ['Plain Rice (cooked)', 'Sambar', 'Bhindi Masala'], snack: ['Orange (1 medium)', 'Trail Mix (dry fruits)'], dinner: ['Roti (Chapati)', 'Matar Paneer'] },
    // Day 6
    { breakfast: ['Paratha (plain)', 'Curd / Dahi'], lunch: ['Biryani (Veg)', 'Raita (Cucumber)'], snack: ['Lassi (salted)', 'Guava (1 medium)'], dinner: ['Roti (Chapati)', 'Dal Makhani'] },
    // Day 7
    { breakfast: ['Oats Porridge', 'Mango (1 cup)'], lunch: ['Plain Rice (cooked)', 'Chana Dal', 'Cabbage Sabzi'], snack: ['Protein Shake (whey)'], dinner: ['Roti (Chapati)', 'Baingan Bharta', 'Green Salad'] },
  ];

  for (let dayIdx = 0; dayIdx < mealTemplates.length; dayIdx++) {
    const day = mealTemplates[dayIdx];
    for (const [mealType, foods] of Object.entries(day)) {
      for (const foodName of foods) {
        const food = await dbGet('SELECT * FROM indian_foods WHERE name = ?', [foodName]);
        if (food) {
          await dbRun(`INSERT INTO meal_plans (user_id, day_number, meal_type, food_name, calories, protein_g, carbs_g, fat_g)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, dayIdx + 1, mealType, food.name, food.calories, food.protein_g, food.carbs_g, food.fat_g]);
        }
      }
    }
  }
}
