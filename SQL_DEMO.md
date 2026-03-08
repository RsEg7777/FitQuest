# FitQuest — SQL Operations Demonstration

This document demonstrates all SQL operations (CREATE, INSERT, SELECT, UPDATE, DELETE, JOINs) as they are used throughout the FitQuest project. The database runs on **SQLite** via **sql.js** (WebAssembly) entirely in the browser.

---

## 1. CREATE TABLE — Schema Definition

### Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### User Profiles Table (with Foreign Key and CHECK constraints)
```sql
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
```

### Indian Foods Table
```sql
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
```

### Food Log Table (Multiple Foreign Keys)
```sql
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
```

### Other Tables Created
- `workout_plans` — 7-day workout plan per user
- `meal_plans` — 7-day meal plan per user
- `workout_log` — logged workouts
- `daily_challenges` — daily challenges (easy/medium/hard)
- `user_challenges` — tracking which challenges a user completed
- `badges` — badge definitions
- `user_badges` — badges earned by users
- `xp_log` — XP earning history
- `user_stats` — aggregated stats (XP, level, streak)
- `weight_log` — weight tracking over time

---

## 2. INSERT — Adding Data

### Registering a New User
```sql
INSERT INTO users (username, email, password_hash)
VALUES ('rahul_fit', 'rahul@example.com', 'a3f2b8c9d1e4...');
```

### Inserting User Profile (after onboarding wizard)
```sql
INSERT INTO user_profiles
    (user_id, height_cm, weight_kg, age, sex, body_type, activity_level, goal, bmi, bmr, tdee, target_calories)
VALUES (1, 175, 70, 20, 'male', 'mesomorph', 'moderate', 'cut', 22.9, 1648, 2554, 2054);
```

### Seeding Indian Foods (batch insert with prepared statement)
```sql
INSERT INTO indian_foods
    (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, is_veg)
VALUES ('Roti (Chapati)', 'grain', 40, 'g (1 pc)', 120, 3.5, 20, 3.5, 1.2, 1);

INSERT INTO indian_foods
    (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, is_veg)
VALUES ('Dal Tadka (Toor)', 'dal', 200, 'g (1 bowl)', 180, 10, 25, 4, 5, 1);

INSERT INTO indian_foods
    (name, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, is_veg)
VALUES ('Palak Paneer', 'vegetable', 200, 'g (1 bowl)', 260, 14, 10, 19, 3, 1);
```

### Logging a Meal
```sql
INSERT INTO food_log
    (user_id, date, meal_type, food_name, food_id, servings, calories, protein_g, carbs_g, fat_g)
VALUES (1, '2026-03-08', 'lunch', 'Plain Rice (cooked)', 2, 1, 180, 3.5, 40, 0.4);
```

### Logging a Workout
```sql
INSERT INTO workout_log (user_id, date, exercise_name, duration_min, calories_burned, met_value)
VALUES (1, '2026-03-08', 'Running (outdoor)', 30, 343, 9.8);
```

### Earning XP
```sql
INSERT INTO xp_log (user_id, xp_amount, source, source_id)
VALUES (1, 50, 'workout_complete', NULL);
```

### Earning a Badge
```sql
INSERT INTO user_badges (user_id, badge_id)
VALUES (1, 1);  -- "First Step" badge
```

---

## 3. SELECT — Querying Data

### Basic SELECT — Get user by username
```sql
SELECT * FROM users WHERE username = 'rahul_fit';
```

### SELECT with WHERE — Login validation
```sql
SELECT * FROM users WHERE username = 'rahul_fit' AND password_hash = 'a3f2b8c9d1e4...';
```

### Aggregate Functions — Today's calorie intake
```sql
SELECT COALESCE(SUM(calories), 0) AS total_cal
FROM food_log
WHERE user_id = 1 AND date = '2026-03-08';
```

### COUNT — Total workouts
```sql
SELECT COUNT(*) AS total_workouts
FROM workout_log
WHERE user_id = 1;
```

### LIKE — Search Indian foods
```sql
SELECT * FROM indian_foods
WHERE name LIKE '%paneer%'
LIMIT 15;
```
Result: Paneer (raw), Palak Paneer, Matar Paneer, Kadai Paneer, Shahi Paneer

### ORDER BY + LIMIT — Recent weight entries
```sql
SELECT date, weight_kg
FROM weight_log
WHERE user_id = 1
ORDER BY date DESC
LIMIT 10;
```

### DISTINCT — Unique dates with food logs
```sql
SELECT DISTINCT date
FROM food_log
WHERE user_id = 1
ORDER BY date DESC;
```

### CASE Expression — Order meals by type
```sql
SELECT * FROM meal_plans
WHERE user_id = 1 AND day_number = 1
ORDER BY CASE meal_type
    WHEN 'breakfast' THEN 1
    WHEN 'lunch' THEN 2
    WHEN 'snack' THEN 3
    WHEN 'dinner' THEN 4
END;
```

---

## 4. UPDATE — Modifying Data

### Update User Profile (when editing in Settings)
```sql
UPDATE user_profiles
SET height_cm = 176, weight_kg = 68, goal = 'maintain',
    bmi = 21.9, bmr = 1638, tdee = 2539, target_calories = 2539,
    updated_at = datetime('now')
WHERE user_id = 1;
```

### Update Streak
```sql
UPDATE user_stats
SET current_streak = 8, longest_streak = 8, last_active_date = '2026-03-08'
WHERE user_id = 1;
```

### Update XP and Level
```sql
UPDATE user_stats
SET total_xp = 350, level = 2
WHERE user_id = 1;
```

### Mark Challenge Complete
```sql
-- First INSERT the completion record
INSERT INTO user_challenges (user_id, challenge_id, completed, completed_at)
VALUES (1, 5, 1, datetime('now'));
```

---

## 5. DELETE — Removing Data

### Delete a Food Log Entry
```sql
DELETE FROM food_log WHERE id = 42;
```

### Delete a Workout Log Entry
```sql
DELETE FROM workout_log WHERE id = 15;
```

### Reset All User Data (Danger Zone in Settings)
```sql
DELETE FROM food_log WHERE user_id = 1;
DELETE FROM workout_log WHERE user_id = 1;
DELETE FROM user_challenges WHERE user_id = 1;
DELETE FROM user_badges WHERE user_id = 1;
DELETE FROM xp_log WHERE user_id = 1;
DELETE FROM weight_log WHERE user_id = 1;
DELETE FROM workout_plans WHERE user_id = 1;
DELETE FROM meal_plans WHERE user_id = 1;
DELETE FROM user_profiles WHERE user_id = 1;
DELETE FROM user_stats WHERE user_id = 1;
DELETE FROM users WHERE id = 1;
```

---

## 6. JOIN Operations

### INNER JOIN — Get completed challenges with details
```sql
SELECT uc.id, dc.title, dc.difficulty, dc.xp_reward, uc.completed_at
FROM user_challenges uc
INNER JOIN daily_challenges dc ON uc.challenge_id = dc.id
WHERE uc.user_id = 1 AND uc.completed = 1;
```

### LEFT JOIN — Leaderboard (all users with stats)
```sql
SELECT u.id, u.username, us.total_xp, us.level, us.current_streak
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
ORDER BY us.total_xp DESC;
```

### JOIN with Subquery — Weekly leaderboard with XP
```sql
SELECT u.id, u.username, us.total_xp, us.level, us.current_streak,
    COALESCE(
        (SELECT SUM(xp_amount) FROM xp_log
         WHERE user_id = u.id AND earned_at >= '2026-03-03'),
    0) AS weekly_xp
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id
ORDER BY weekly_xp DESC;
```

### JOIN — Count hard challenges completed (for badge checking)
```sql
SELECT COUNT(*) AS hard_done
FROM user_challenges uc
JOIN daily_challenges dc ON uc.challenge_id = dc.id
WHERE uc.user_id = 1
    AND uc.completed = 1
    AND dc.difficulty = 'hard';
```

### JOIN — Food log with food details
```sql
SELECT fl.date, fl.meal_type, fl.food_name, fl.calories,
       if2.category, if2.is_veg
FROM food_log fl
LEFT JOIN indian_foods if2 ON fl.food_id = if2.id
WHERE fl.user_id = 1
ORDER BY fl.date DESC, fl.logged_at DESC;
```

---

## 7. Advanced Queries Used in the Project

### Calorie intake per day for the last 7 days (for Chart.js)
```sql
SELECT date, SUM(calories) AS daily_calories
FROM food_log
WHERE user_id = 1 AND date >= date('now', '-7 days')
GROUP BY date
ORDER BY date;
```

### Check if user logged all 4 meal types today (Balanced Diet badge)
```sql
SELECT COUNT(DISTINCT meal_type) AS meal_types
FROM food_log
WHERE user_id = 1 AND date = '2026-03-08';
-- If result = 4, award the badge
```

### Workout heatmap data (count per day)
```sql
SELECT date, COUNT(*) AS workout_count
FROM workout_log
WHERE user_id = 1 AND date >= date('now', '-28 days')
GROUP BY date;
```

---

## 8. Summary of SQL Concepts Demonstrated

| Concept | Where Used |
|---------|-----------|
| CREATE TABLE | Schema creation (14 tables) |
| PRIMARY KEY, AUTOINCREMENT | All tables |
| FOREIGN KEY | user_profiles, food_log, workout_log, etc. |
| CHECK constraints | sex, body_type, meal_type, difficulty |
| DEFAULT values | datetime('now'), DEFAULT 1 |
| INSERT | Registration, food logging, XP earning |
| SELECT with WHERE | Login, food search, profile lookup |
| UPDATE | Profile editing, streak update, XP update |
| DELETE | Removing food/workout logs, data reset |
| INNER JOIN | Challenge details with completion |
| LEFT JOIN | Leaderboard (users with optional stats) |
| Subquery | Weekly XP calculation |
| Aggregate: SUM, COUNT | Calorie totals, workout counts |
| COALESCE | Null-safe aggregation |
| LIKE | Food search (name matching) |
| ORDER BY, LIMIT | Sorted results, pagination |
| GROUP BY | Daily calorie totals, heatmap |
| DISTINCT | Unique food log dates |
| CASE | Meal type ordering |
| Prepared Statements | Batch food inserts (parameterized) |

---

*All queries above are actual SQL used in the FitQuest codebase (`js/db.js`, `js/gamification.js`, and page-specific JS files).*
