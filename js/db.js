/* ============================================
   FitQuest — Database Layer (sql.js / SQLite)
   Runs entirely in-browser via WebAssembly.
   Persisted to IndexedDB for offline support.
   ============================================ */

let db = null;
const DB_NAME = 'fitquest_db';
const DB_STORE = 'sqlitedb';

/* ---------- Initialise sql.js + load/create DB ---------- */
async function initDB() {
  const SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  // Try to load existing DB from IndexedDB
  const saved = await loadFromIndexedDB();
  if (saved) {
    db = new SQL.Database(new Uint8Array(saved));
  } else {
    db = new SQL.Database();
    createTables();
    seedIndianFoods();
    seedBadges();
    seedExercises();
    seedDemoChallenges();
    await saveDB();
  }

  return db;
}

/* ---------- IndexedDB persistence ---------- */
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDB() {
  if (!db) return;
  const data = db.export();
  const idb = await openIDB();
  const tx = idb.transaction(DB_STORE, 'readwrite');
  tx.objectStore(DB_STORE).put(data.buffer, 'db');
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadFromIndexedDB() {
  try {
    const idb = await openIDB();
    const tx = idb.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get('db');
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

/* ---------- Schema Creation ---------- */
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      height_cm REAL,
      weight_kg REAL,
      age INTEGER,
      sex TEXT CHECK(sex IN ('male','female')),
      body_type TEXT CHECK(body_type IN ('ectomorph','mesomorph','endomorph')),
      activity_level TEXT CHECK(activity_level IN ('sedentary','light','moderate','active','very_active')),
      goal TEXT CHECK(goal IN ('cut','bulk','maintain')),
      bmi REAL,
      bmr REAL,
      tdee REAL,
      target_calories REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS indian_foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT CHECK(category IN ('grain','dal','vegetable','fruit','dairy','meat','snack','beverage','sweet','egg','fish')),
      serving_size REAL,
      serving_unit TEXT,
      calories REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      fiber_g REAL,
      is_veg INTEGER DEFAULT 1
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workout_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      day_number INTEGER CHECK(day_number BETWEEN 1 AND 7),
      exercise_name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      duration_min INTEGER,
      met_value REAL,
      muscle_group TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      day_number INTEGER CHECK(day_number BETWEEN 1 AND 7),
      meal_type TEXT CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
      food_name TEXT NOT NULL,
      calories REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS food_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT NOT NULL,
      meal_type TEXT CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
      food_name TEXT NOT NULL,
      food_id INTEGER,
      servings REAL DEFAULT 1,
      calories REAL,
      protein_g REAL,
      carbs_g REAL,
      fat_g REAL,
      logged_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (food_id) REFERENCES indian_foods(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS workout_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      duration_min INTEGER,
      calories_burned REAL,
      met_value REAL,
      logged_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')),
      title TEXT NOT NULL,
      description TEXT,
      xp_reward INTEGER,
      challenge_type TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      challenge_id INTEGER,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      criteria_type TEXT,
      criteria_value INTEGER
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      badge_id INTEGER,
      earned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (badge_id) REFERENCES badges(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS xp_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      xp_amount INTEGER,
      source TEXT,
      source_id INTEGER,
      earned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      total_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS weight_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT NOT NULL,
      weight_kg REAL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

/* ---------- Seed Indian Foods (100+ items) ---------- */
function seedIndianFoods() {
  const foods = [
    // Grains & Staples
    ['Roti (Chapati)', 'grain', 40, 'g (1 pc)', 120, 3.5, 20, 3.5, 1.2, 1],
    ['Plain Rice (cooked)', 'grain', 150, 'g (1 cup)', 180, 3.5, 40, 0.4, 0.4, 1],
    ['Paratha (plain)', 'grain', 60, 'g (1 pc)', 180, 4, 25, 7, 1.5, 1],
    ['Poori', 'grain', 30, 'g (1 pc)', 120, 2, 12, 7, 0.5, 1],
    ['Naan', 'grain', 90, 'g (1 pc)', 260, 7.5, 45, 5, 2, 1],
    ['Idli', 'grain', 60, 'g (2 pcs)', 130, 4, 26, 0.5, 0.8, 1],
    ['Dosa (plain)', 'grain', 100, 'g (1 pc)', 170, 4, 28, 5, 0.8, 1],
    ['Masala Dosa', 'grain', 150, 'g (1 pc)', 250, 5.5, 35, 10, 1.5, 1],
    ['Upma', 'grain', 200, 'g (1 bowl)', 210, 5, 30, 8, 2, 1],
    ['Poha', 'grain', 200, 'g (1 bowl)', 250, 5, 40, 8, 1.5, 1],
    ['Jeera Rice', 'grain', 200, 'g (1 cup)', 220, 4, 42, 4, 0.5, 1],
    ['Biryani (Veg)', 'grain', 250, 'g (1 plate)', 350, 8, 50, 13, 2, 1],
    ['Biryani (Chicken)', 'grain', 250, 'g (1 plate)', 400, 18, 48, 15, 1.5, 0],
    ['Pulao (Veg)', 'grain', 200, 'g (1 cup)', 260, 5, 42, 8, 1.5, 1],
    ['Pav Bhaji', 'grain', 300, 'g (1 plate)', 400, 10, 55, 16, 4, 1],
    ['Chole Bhature', 'grain', 300, 'g (1 plate)', 450, 14, 55, 20, 5, 1],
    ['Aloo Paratha', 'grain', 120, 'g (1 pc)', 280, 6, 38, 12, 2, 1],
    ['Methi Paratha', 'grain', 80, 'g (1 pc)', 200, 5, 28, 8, 2, 1],
    ['Bread Slice (brown)', 'grain', 30, 'g (1 slice)', 75, 3, 14, 1, 1.5, 1],
    ['Oats Porridge', 'grain', 40, 'g (dry)', 150, 5, 27, 2.5, 4, 1],

    // Dals & Legumes
    ['Dal Tadka (Toor)', 'dal', 200, 'g (1 bowl)', 180, 10, 25, 4, 5, 1],
    ['Dal Makhani', 'dal', 200, 'g (1 bowl)', 230, 9, 26, 10, 4, 1],
    ['Chana Dal', 'dal', 200, 'g (1 bowl)', 200, 11, 28, 5, 6, 1],
    ['Moong Dal', 'dal', 200, 'g (1 bowl)', 150, 10, 22, 2, 4, 1],
    ['Rajma (Kidney Beans)', 'dal', 200, 'g (1 bowl)', 210, 12, 32, 4, 7, 1],
    ['Chole (Chickpea Curry)', 'dal', 200, 'g (1 bowl)', 240, 11, 30, 9, 6, 1],
    ['Sambar', 'dal', 200, 'g (1 bowl)', 130, 6, 18, 4, 3, 1],
    ['Rasam', 'dal', 200, 'g (1 bowl)', 60, 2, 10, 1.5, 1, 1],
    ['Sprouts (Moong) boiled', 'dal', 100, 'g', 75, 7, 10, 0.5, 3, 1],
    ['Masoor Dal', 'dal', 200, 'g (1 bowl)', 170, 10, 24, 3, 5, 1],

    // Vegetables
    ['Aloo Gobi', 'vegetable', 200, 'g (1 bowl)', 180, 4, 22, 9, 3, 1],
    ['Palak Paneer', 'vegetable', 200, 'g (1 bowl)', 260, 14, 10, 19, 3, 1],
    ['Bhindi Masala', 'vegetable', 150, 'g (1 bowl)', 120, 3, 12, 7, 3.5, 1],
    ['Baingan Bharta', 'vegetable', 200, 'g (1 bowl)', 160, 3.5, 15, 10, 4, 1],
    ['Mixed Veg Curry', 'vegetable', 200, 'g (1 bowl)', 150, 4, 18, 7, 4, 1],
    ['Matar Paneer', 'vegetable', 200, 'g (1 bowl)', 280, 14, 16, 18, 3, 1],
    ['Aloo Matar', 'vegetable', 200, 'g (1 bowl)', 180, 5, 24, 7, 3.5, 1],
    ['Lauki (Bottle Gourd)', 'vegetable', 200, 'g (1 bowl)', 70, 2, 10, 2.5, 2, 1],
    ['Tinda Masala', 'vegetable', 200, 'g (1 bowl)', 90, 2.5, 12, 4, 2.5, 1],
    ['Kadai Paneer', 'vegetable', 200, 'g (1 bowl)', 300, 15, 12, 22, 2, 1],
    ['Shahi Paneer', 'vegetable', 200, 'g (1 bowl)', 330, 14, 14, 25, 2, 1],
    ['Cabbage Sabzi', 'vegetable', 150, 'g (1 bowl)', 80, 2, 10, 3.5, 2.5, 1],
    ['Green Salad', 'vegetable', 100, 'g', 25, 1.5, 4, 0.3, 2, 1],
    ['Raita (Cucumber)', 'vegetable', 100, 'g', 50, 2.5, 4, 2.5, 0.5, 1],

    // Dairy
    ['Paneer (raw)', 'dairy', 50, 'g', 150, 9, 2, 12, 0, 1],
    ['Milk (full fat)', 'dairy', 200, 'ml (1 glass)', 130, 6, 10, 7, 0, 1],
    ['Milk (toned)', 'dairy', 200, 'ml (1 glass)', 100, 6, 10, 3, 0, 1],
    ['Curd / Dahi', 'dairy', 100, 'g (1 bowl)', 60, 3, 5, 3, 0, 1],
    ['Lassi (sweet)', 'dairy', 250, 'ml (1 glass)', 180, 5, 28, 5, 0, 1],
    ['Lassi (salted)', 'dairy', 250, 'ml (1 glass)', 100, 5, 8, 5, 0, 1],
    ['Buttermilk (Chaas)', 'dairy', 200, 'ml', 40, 2, 4, 1.5, 0, 1],
    ['Ghee', 'dairy', 5, 'g (1 tsp)', 45, 0, 0, 5, 0, 1],
    ['Butter', 'dairy', 10, 'g (1 tbsp)', 72, 0.1, 0, 8, 0, 1],
    ['Cheese Slice', 'dairy', 20, 'g (1 slice)', 60, 3.5, 0.5, 5, 0, 1],

    // Meat & Non-Veg
    ['Chicken Curry', 'meat', 200, 'g (1 bowl)', 280, 22, 8, 18, 1, 0],
    ['Butter Chicken', 'meat', 200, 'g (1 bowl)', 350, 20, 10, 26, 1, 0],
    ['Tandoori Chicken (2 pcs)', 'meat', 150, 'g', 250, 28, 4, 14, 0.5, 0],
    ['Chicken Tikka', 'meat', 100, 'g', 180, 22, 3, 9, 0, 0],
    ['Mutton Curry', 'meat', 200, 'g (1 bowl)', 350, 24, 6, 26, 1, 0],
    ['Keema Matar', 'meat', 200, 'g (1 bowl)', 320, 22, 12, 22, 2, 0],
    ['Grilled Chicken Breast', 'meat', 100, 'g', 165, 31, 0, 3.6, 0, 0],

    // Fish
    ['Fish Curry', 'fish', 200, 'g (1 bowl)', 220, 20, 6, 13, 0.5, 0],
    ['Fish Fry (1 pc)', 'fish', 80, 'g', 160, 14, 5, 9, 0, 0],
    ['Prawn Masala', 'fish', 200, 'g (1 bowl)', 200, 18, 8, 11, 1, 0],

    // Eggs
    ['Boiled Egg (1)', 'egg', 50, 'g', 78, 6, 0.5, 5, 0, 0],
    ['Egg Bhurji (2 eggs)', 'egg', 120, 'g', 200, 14, 3, 15, 0.5, 0],
    ['Omelette (2 eggs)', 'egg', 120, 'g', 190, 13, 1, 14, 0, 0],
    ['Egg Curry (2 eggs)', 'egg', 200, 'g', 250, 14, 8, 18, 1, 0],

    // Snacks
    ['Samosa (1 pc)', 'snack', 80, 'g', 220, 4, 24, 12, 1.5, 1],
    ['Pakora / Bhajiya', 'snack', 100, 'g', 280, 5, 22, 19, 2, 1],
    ['Vada Pav (1)', 'snack', 150, 'g', 300, 6, 38, 14, 2, 1],
    ['Dhokla (2 pcs)', 'snack', 100, 'g', 160, 5, 25, 5, 1, 1],
    ['Khandvi', 'snack', 100, 'g', 140, 5, 18, 5, 1, 1],
    ['Bhel Puri', 'snack', 150, 'g', 200, 5, 30, 7, 2, 1],
    ['Sev Puri (4 pcs)', 'snack', 120, 'g', 220, 4, 28, 10, 2, 1],
    ['Pani Puri (6 pcs)', 'snack', 100, 'g', 180, 3, 26, 7, 1.5, 1],
    ['Sandwich (Veg)', 'snack', 150, 'g', 250, 7, 32, 10, 2, 1],
    ['Roasted Chana', 'snack', 30, 'g (handful)', 110, 6, 18, 2, 4, 1],
    ['Makhana (Fox nuts)', 'snack', 30, 'g', 100, 3, 18, 0.5, 1, 1],
    ['Peanuts (roasted)', 'snack', 30, 'g (handful)', 170, 7, 5, 14, 2.5, 1],
    ['Almonds', 'snack', 20, 'g (10 pcs)', 115, 4, 4, 10, 2.5, 1],
    ['Trail Mix (dry fruits)', 'snack', 30, 'g', 150, 4, 12, 10, 2, 1],

    // Fruits
    ['Banana (1 medium)', 'fruit', 120, 'g', 105, 1.3, 27, 0.4, 3, 1],
    ['Apple (1 medium)', 'fruit', 180, 'g', 95, 0.5, 25, 0.3, 4.4, 1],
    ['Mango (1 cup)', 'fruit', 165, 'g', 100, 1.4, 25, 0.6, 2.6, 1],
    ['Papaya (1 cup)', 'fruit', 145, 'g', 62, 0.7, 16, 0.4, 2.5, 1],
    ['Orange (1 medium)', 'fruit', 130, 'g', 62, 1.2, 15, 0.2, 3, 1],
    ['Guava (1 medium)', 'fruit', 100, 'g', 68, 2.5, 14, 1, 5, 1],
    ['Pomegranate (1/2 cup)', 'fruit', 87, 'g', 72, 1, 16, 1, 3.5, 1],
    ['Watermelon (1 cup)', 'fruit', 150, 'g', 46, 0.9, 12, 0.2, 0.6, 1],
    ['Grapes (1 cup)', 'fruit', 150, 'g', 104, 1, 27, 0.2, 1.4, 1],
    ['Chikoo (Sapota)', 'fruit', 100, 'g', 83, 0.4, 20, 1, 5, 1],

    // Beverages
    ['Chai (with milk & sugar)', 'beverage', 150, 'ml (1 cup)', 80, 2, 12, 2.5, 0, 1],
    ['Black Coffee', 'beverage', 200, 'ml (1 cup)', 5, 0.3, 0, 0, 0, 1],
    ['Coffee with Milk', 'beverage', 200, 'ml (1 cup)', 60, 2, 8, 2, 0, 1],
    ['Green Tea', 'beverage', 200, 'ml (1 cup)', 2, 0, 0, 0, 0, 1],
    ['Coconut Water', 'beverage', 240, 'ml (1 glass)', 46, 1.7, 9, 0.5, 2.6, 1],
    ['Mango Shake', 'beverage', 250, 'ml', 200, 4, 35, 5, 1, 1],
    ['Banana Shake', 'beverage', 250, 'ml', 180, 5, 30, 4, 1.5, 1],
    ['Nimbu Pani (Lemonade)', 'beverage', 250, 'ml', 50, 0.3, 12, 0.1, 0.2, 1],
    ['Sugarcane Juice', 'beverage', 250, 'ml', 180, 0.5, 44, 0, 0, 1],
    ['Protein Shake (whey)', 'beverage', 300, 'ml', 130, 25, 4, 2, 0, 1],

    // Sweets
    ['Gulab Jamun (2 pcs)', 'sweet', 80, 'g', 300, 4, 42, 13, 0.5, 1],
    ['Rasgulla (2 pcs)', 'sweet', 80, 'g', 190, 4, 35, 4, 0, 1],
    ['Jalebi (2 pcs)', 'sweet', 60, 'g', 230, 2, 38, 8, 0, 1],
    ['Kheer (Rice Pudding)', 'sweet', 150, 'g', 200, 5, 30, 7, 0.3, 1],
    ['Ladoo (Besan)', 'sweet', 40, 'g (1 pc)', 180, 3, 20, 10, 1, 1],
    ['Barfi (1 pc)', 'sweet', 30, 'g', 130, 3, 16, 6, 0, 1],
    ['Halwa (Sooji)', 'sweet', 100, 'g', 250, 3.5, 32, 12, 0.5, 1],
    ['Gajar Halwa', 'sweet', 100, 'g', 230, 4, 28, 12, 1, 1],
  ];

  const stmt = db.prepare(`INSERT INTO indian_foods (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, is_veg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  foods.forEach(f => { stmt.run(f); });
  stmt.free();
}

/* ---------- Seed Badges ---------- */
function seedBadges() {
  const badges = [
    ['First Step', 'Complete your first workout', '👟', 'workouts', 1],
    ['Week Warrior', 'Maintain a 7-day streak', '🔥', 'streak', 7],
    ['Monthly Master', '30-day streak', '⚡', 'streak', 30],
    ['Century Club', 'Complete 100 workouts', '💯', 'workouts', 100],
    ['XP Hunter', 'Earn 1000 XP', '🏆', 'xp', 1000],
    ['XP Legend', 'Earn 5000 XP', '👑', 'xp', 5000],
    ['Level 5', 'Reach level 5', '⭐', 'level', 5],
    ['Level 10', 'Reach level 10', '🌟', 'level', 10],
    ['Level 20', 'Reach level 20', '💫', 'level', 20],
    ['Challenge Starter', 'Complete your first challenge', '🎯', 'challenges', 1],
    ['Challenge Pro', 'Complete 25 challenges', '🏅', 'challenges', 25],
    ['Challenge Master', 'Complete 50 challenges', '🥇', 'challenges', 50],
    ['Calorie Tracker', 'Log food for 7 consecutive days', '📊', 'food_log_streak', 7],
    ['Meal Prep Pro', 'Log 50 meals', '🍽️', 'meals', 50],
    ['Weight Watcher', 'Log weight 10 times', '⚖️', 'weight_logs', 10],
    ['Early Bird', 'Log a workout before 8 AM', '🌅', 'special', 1],
    ['Night Owl', 'Log a workout after 9 PM', '🦉', 'special', 1],
    ['Social Butterfly', 'Reach top 3 on leaderboard', '🦋', 'leaderboard', 3],
    ['Iron Will', 'Complete 5 hard challenges', '💪', 'hard_challenges', 5],
    ['Balanced Diet', 'Log all 4 meal types in a day', '🥗', 'special', 1],
  ];

  const stmt = db.prepare(`INSERT INTO badges (name, description, icon, criteria_type, criteria_value) VALUES (?, ?, ?, ?, ?)`);
  badges.forEach(b => { stmt.run(b); });
  stmt.free();
}

/* ---------- Seed Exercise Library ---------- */
function seedExercises() {
  // Stored in JS for the exercise library page - not in SQL to keep it simpler
  // Exercises are accessed via getExerciseLibrary()
}

/* ---------- Seed Demo Challenges ---------- */
function seedDemoChallenges() {
  const today = new Date().toISOString().split('T')[0];
  const challenges = [
    [today, 'easy', 'Morning Stretch', 'Do a 5-minute full body stretch', 25, 'stretch'],
    [today, 'easy', 'Water Challenge', 'Drink 8 glasses of water today', 25, 'hydration'],
    [today, 'easy', 'Walk 2000 Steps', 'Take a short walk around your area', 25, 'cardio'],
    [today, 'medium', '20 Push-ups', 'Complete 20 push-ups (can be split into sets)', 50, 'strength'],
    [today, 'medium', 'Healthy Meal', 'Log a meal under 500 calories', 50, 'nutrition'],
    [today, 'medium', 'Plank Hold', 'Hold a plank for 60 seconds total', 50, 'core'],
    [today, 'hard', '30-Min Workout', 'Complete a 30-minute workout session', 100, 'full_body'],
    [today, 'hard', 'No Sugar Day', 'Avoid all added sugars for the entire day', 100, 'nutrition'],
    [today, 'hard', 'Surya Namaskar x12', 'Complete 12 rounds of Sun Salutation', 100, 'yoga'],
  ];

  const stmt = db.prepare(`INSERT INTO daily_challenges (date, difficulty, title, description, xp_reward, challenge_type) VALUES (?, ?, ?, ?, ?, ?)`);
  challenges.forEach(c => { stmt.run(c); });
  stmt.free();
}

/* ---------- Helper: Run query, return array of objects ---------- */
function dbAll(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/* ---------- Helper: Run query, return first row ---------- */
function dbGet(sql, params = []) {
  const rows = dbAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/* ---------- Helper: Run modification query ---------- */
function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDB(); // auto-persist after every write
}

/* ---------- Simple password hash (SHA-256, NOT production-grade) ---------- */
async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Get current logged-in user ---------- */
function getCurrentUser() {
  const userId = localStorage.getItem('fitquest_user_id');
  if (!userId) return null;
  return dbGet('SELECT * FROM users WHERE id = ?', [parseInt(userId)]);
}

function getCurrentUserId() {
  return parseInt(localStorage.getItem('fitquest_user_id')) || null;
}

/* ---------- Get today's date string ---------- */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/* ---------- Exercise Library Data ---------- */
function getExerciseLibrary() {
  return [
    { name: 'Push-ups', muscle: 'Chest, Triceps', category: 'strength', equipment: 'none', met: 8.0, icon: '💪', difficulty: 'beginner', instructions: 'Start in plank position, lower chest to floor, push back up.' },
    { name: 'Pull-ups', muscle: 'Back, Biceps', category: 'strength', equipment: 'bar', met: 8.0, icon: '🏋️', difficulty: 'intermediate', instructions: 'Hang from bar, pull body up until chin over bar.' },
    { name: 'Squats', muscle: 'Quads, Glutes', category: 'strength', equipment: 'none', met: 5.0, icon: '🦵', difficulty: 'beginner', instructions: 'Stand with feet shoulder-width, lower hips back and down.' },
    { name: 'Lunges', muscle: 'Quads, Glutes', category: 'strength', equipment: 'none', met: 5.0, icon: '🚶', difficulty: 'beginner', instructions: 'Step forward, lower back knee toward ground, push back.' },
    { name: 'Plank', muscle: 'Core', category: 'strength', equipment: 'none', met: 4.0, icon: '🧘', difficulty: 'beginner', instructions: 'Hold body straight in forearm plank position.' },
    { name: 'Burpees', muscle: 'Full Body', category: 'hiit', equipment: 'none', met: 12.0, icon: '🔥', difficulty: 'advanced', instructions: 'Squat, jump back to plank, push-up, jump forward, jump up.' },
    { name: 'Mountain Climbers', muscle: 'Core, Cardio', category: 'hiit', equipment: 'none', met: 10.0, icon: '⛰️', difficulty: 'intermediate', instructions: 'In plank, alternate driving knees to chest rapidly.' },
    { name: 'Jumping Jacks', muscle: 'Full Body', category: 'cardio', equipment: 'none', met: 8.0, icon: '⭐', difficulty: 'beginner', instructions: 'Jump feet apart while raising arms overhead, return.' },
    { name: 'Running (outdoor)', muscle: 'Legs, Cardio', category: 'cardio', equipment: 'none', met: 9.8, icon: '🏃', difficulty: 'beginner', instructions: 'Steady-paced jog or run outdoors.' },
    { name: 'Walking', muscle: 'Legs', category: 'cardio', equipment: 'none', met: 3.5, icon: '🚶', difficulty: 'beginner', instructions: 'Brisk walking at a moderate pace.' },
    { name: 'Cycling', muscle: 'Legs, Cardio', category: 'cardio', equipment: 'cycle', met: 7.5, icon: '🚴', difficulty: 'beginner', instructions: 'Moderate pace cycling on flat terrain.' },
    { name: 'Skipping / Jump Rope', muscle: 'Full Body', category: 'cardio', equipment: 'rope', met: 12.3, icon: '🤸', difficulty: 'intermediate', instructions: 'Swing rope overhead and jump continuously.' },
    { name: 'Surya Namaskar', muscle: 'Full Body', category: 'yoga', equipment: 'mat', met: 4.0, icon: '🌅', difficulty: 'beginner', instructions: '12-pose flowing yoga sequence (Sun Salutation).' },
    { name: 'Deadlifts', muscle: 'Back, Legs', category: 'strength', equipment: 'barbell', met: 6.0, icon: '🏋️', difficulty: 'intermediate', instructions: 'Hinge at hips, grip bar, lift by extending hips and knees.' },
    { name: 'Bench Press', muscle: 'Chest, Triceps', category: 'strength', equipment: 'barbell', met: 6.0, icon: '🏋️', difficulty: 'intermediate', instructions: 'Lie on bench, lower bar to chest, press up.' },
    { name: 'Shoulder Press', muscle: 'Shoulders', category: 'strength', equipment: 'dumbbells', met: 5.0, icon: '💪', difficulty: 'intermediate', instructions: 'Press dumbbells overhead from shoulder height.' },
    { name: 'Bicep Curls', muscle: 'Biceps', category: 'strength', equipment: 'dumbbells', met: 4.0, icon: '💪', difficulty: 'beginner', instructions: 'Curl dumbbells from sides to shoulders.' },
    { name: 'Tricep Dips', muscle: 'Triceps', category: 'strength', equipment: 'bench', met: 5.0, icon: '💪', difficulty: 'beginner', instructions: 'Grip edge of bench behind, lower body by bending elbows.' },
    { name: 'Crunches', muscle: 'Core', category: 'strength', equipment: 'none', met: 3.8, icon: '🧘', difficulty: 'beginner', instructions: 'Lie back, curl shoulders up toward knees.' },
    { name: 'Leg Raises', muscle: 'Core', category: 'strength', equipment: 'none', met: 4.0, icon: '🦵', difficulty: 'beginner', instructions: 'Lie flat, raise legs to 90 degrees, lower slowly.' },
    { name: 'Russian Twists', muscle: 'Obliques', category: 'strength', equipment: 'none', met: 4.5, icon: '🔄', difficulty: 'intermediate', instructions: 'Seated, lean back slightly, rotate torso side to side.' },
    { name: 'High Knees', muscle: 'Legs, Cardio', category: 'hiit', equipment: 'none', met: 9.0, icon: '🏃', difficulty: 'beginner', instructions: 'Run in place, lifting knees high above waist.' },
    { name: 'Box Jumps', muscle: 'Legs, Power', category: 'hiit', equipment: 'box', met: 10.0, icon: '📦', difficulty: 'intermediate', instructions: 'Jump onto elevated platform, step back down.' },
    { name: 'Swimming', muscle: 'Full Body', category: 'cardio', equipment: 'pool', met: 8.0, icon: '🏊', difficulty: 'intermediate', instructions: 'Moderate-pace freestyle swimming.' },
    { name: 'Yoga (Hatha)', muscle: 'Full Body, Flexibility', category: 'yoga', equipment: 'mat', met: 3.0, icon: '🧘', difficulty: 'beginner', instructions: 'Gentle yoga with basic poses and breathing.' },
    { name: 'Meditation', muscle: 'Mind', category: 'yoga', equipment: 'none', met: 1.0, icon: '🧘‍♂️', difficulty: 'beginner', instructions: 'Sit quietly, focus on breathing, clear mind.' },
    { name: 'Battle Ropes', muscle: 'Arms, Core', category: 'hiit', equipment: 'ropes', met: 10.3, icon: '🪢', difficulty: 'advanced', instructions: 'Alternate waving heavy ropes rapidly.' },
    { name: 'Farmer Walk', muscle: 'Grip, Core', category: 'strength', equipment: 'dumbbells', met: 6.0, icon: '🚶', difficulty: 'beginner', instructions: 'Hold heavy weights at sides, walk with good posture.' },
    { name: 'Wall Sit', muscle: 'Quads', category: 'strength', equipment: 'none', met: 3.5, icon: '🧱', difficulty: 'beginner', instructions: 'Lean against wall in sitting position, hold.' },
    { name: 'Stretching', muscle: 'Flexibility', category: 'yoga', equipment: 'none', met: 2.3, icon: '🤸', difficulty: 'beginner', instructions: 'Gentle full-body stretching routine.' },
  ];
}
