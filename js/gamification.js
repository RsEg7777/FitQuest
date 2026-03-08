/* ============================================
   FitQuest — Gamification Engine
   XP, levels, streaks, badges, leaderboard
   ============================================ */

/* ---------- XP Constants ---------- */
const XP_REWARDS = {
  workout_complete: 50,
  meal_logged: 10,
  challenge_easy: 25,
  challenge_medium: 50,
  challenge_hard: 100,
  daily_login: 10,
  weight_logged: 5
};

/* ---------- Level Calculation ---------- */
function calculateLevel(totalXP) {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

function xpForLevel(level) {
  return (level - 1) * (level - 1) * 100;
}

function xpForNextLevel(level) {
  return level * level * 100;
}

function xpProgress(totalXP) {
  const level = calculateLevel(totalXP);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const progress = totalXP - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return { level, progress, needed, percent: Math.min(100, (progress / needed) * 100) };
}

/* ---------- Award XP ---------- */
function awardXP(userId, amount, source, sourceId = null) {
  dbRun('INSERT INTO xp_log (user_id, xp_amount, source, source_id) VALUES (?, ?, ?, ?)',
    [userId, amount, source, sourceId]);

  const stats = dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  const newTotalXP = (stats ? stats.total_xp : 0) + amount;
  const newLevel = calculateLevel(newTotalXP);

  if (stats) {
    const oldLevel = stats.level;
    dbRun('UPDATE user_stats SET total_xp = ?, level = ? WHERE user_id = ?',
      [newTotalXP, newLevel, userId]);
    if (newLevel > oldLevel) {
      showToast('Level Up! 🎉', `You reached Level ${newLevel}!`, '⬆️');
    }
  } else {
    dbRun('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, 1, 1, ?)',
      [userId, newTotalXP, newLevel, getToday()]);
  }

  showToast('+' + amount + ' XP', source.replace(/_/g, ' '), '✨');
  checkBadges(userId);
}

/* ---------- Badge Checking ---------- */
function checkBadges(userId) {
  const allBadges = dbAll('SELECT * FROM badges');
  const earnedBadgeIds = dbAll('SELECT badge_id FROM user_badges WHERE user_id = ?', [userId])
    .map(b => b.badge_id);

  allBadges.forEach(badge => {
    if (earnedBadgeIds.includes(badge.id)) return;

    let earned = false;

    switch (badge.criteria_type) {
      case 'workouts': {
        const count = dbGet('SELECT COUNT(*) as c FROM workout_log WHERE user_id = ?', [userId]);
        if (count && count.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'streak': {
        const stats = dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
        if (stats && stats.longest_streak >= badge.criteria_value) earned = true;
        break;
      }
      case 'xp': {
        const stats = dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
        if (stats && stats.total_xp >= badge.criteria_value) earned = true;
        break;
      }
      case 'level': {
        const stats = dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
        if (stats && stats.level >= badge.criteria_value) earned = true;
        break;
      }
      case 'challenges': {
        const count = dbGet('SELECT COUNT(*) as c FROM user_challenges WHERE user_id = ? AND completed = 1', [userId]);
        if (count && count.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'hard_challenges': {
        const count = dbGet(`SELECT COUNT(*) as c FROM user_challenges uc
          JOIN daily_challenges dc ON uc.challenge_id = dc.id
          WHERE uc.user_id = ? AND uc.completed = 1 AND dc.difficulty = 'hard'`, [userId]);
        if (count && count.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'meals': {
        const count = dbGet('SELECT COUNT(*) as c FROM food_log WHERE user_id = ?', [userId]);
        if (count && count.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'weight_logs': {
        const count = dbGet('SELECT COUNT(*) as c FROM weight_log WHERE user_id = ?', [userId]);
        if (count && count.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'food_log_streak': {
        // Check if user has logged food for badge.criteria_value consecutive days
        const logs = dbAll('SELECT DISTINCT date FROM food_log WHERE user_id = ? ORDER BY date DESC', [userId]);
        if (logs.length >= badge.criteria_value) {
          let consecutive = 1;
          for (let i = 1; i < logs.length; i++) {
            const prev = new Date(logs[i - 1].date);
            const curr = new Date(logs[i].date);
            const diff = (prev - curr) / (1000 * 60 * 60 * 24);
            if (diff === 1) consecutive++;
            else break;
          }
          if (consecutive >= badge.criteria_value) earned = true;
        }
        break;
      }
    }

    if (earned) {
      dbRun('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [userId, badge.id]);
      showBadgeToast(badge.name, badge.icon);
    }
  });
}

/* ---------- Leaderboard Data ---------- */
function getLeaderboard() {
  // Get all users with their stats for this week
  const weekStart = getWeekStart();
  const users = dbAll(`
    SELECT u.id, u.username, us.total_xp, us.level, us.current_streak,
      COALESCE((SELECT SUM(xp_amount) FROM xp_log WHERE user_id = u.id AND earned_at >= ?), 0) as weekly_xp
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    ORDER BY weekly_xp DESC
  `, [weekStart]);

  return users;
}

/* ---------- Generate Demo Leaderboard Users ---------- */
function ensureDemoLeaderboard() {
  const userCount = dbGet('SELECT COUNT(*) as c FROM users');
  if (userCount && userCount.c >= 5) return; // Already have enough users

  // Create demo users for leaderboard (only if not enough users exist)
  const demoUsers = [
    ['arjun_fit', 'arjun@demo.com', 'demo'],
    ['priya_yoga', 'priya@demo.com', 'demo'],
    ['rahul_runner', 'rahul@demo.com', 'demo'],
    ['sneha_strong', 'sneha@demo.com', 'demo'],
    ['vikram_beast', 'vikram@demo.com', 'demo'],
    ['anita_cardio', 'anita@demo.com', 'demo'],
    ['karan_lifts', 'karan@demo.com', 'demo'],
    ['meera_flex', 'meera@demo.com', 'demo'],
  ];

  const existingUsers = dbAll('SELECT username FROM users').map(u => u.username);
  const weekStart = getWeekStart();

  demoUsers.forEach(([username, email, pass]) => {
    if (existingUsers.includes(username)) return;
    try {
      dbRun('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, 'demo_hash']);
      const user = dbGet('SELECT id FROM users WHERE username = ?', [username]);
      if (user) {
        const xp = Math.floor(Math.random() * 800) + 100;
        const level = calculateLevel(xp);
        const streak = Math.floor(Math.random() * 15) + 1;
        dbRun('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, xp, level, streak, streak, getToday()]);
        // Add weekly XP
        dbRun('INSERT INTO xp_log (user_id, xp_amount, source, earned_at) VALUES (?, ?, ?, ?)',
          [user.id, Math.floor(Math.random() * 400) + 50, 'weekly_activity', weekStart]);
      }
    } catch (e) { /* ignore duplicates */ }
  });
}

/* ---------- Calorie Burn Calculator (MET formula) ---------- */
function calculateCaloriesBurned(metValue, weightKg, durationMin) {
  // Calories = MET × weight(kg) × duration(hours)
  return round(metValue * weightKg * (durationMin / 60), 0);
}

/* ---------- BMI & TDEE Calculators ---------- */
function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

function calculateBMR(weightKg, heightCm, age, sex) {
  // Mifflin-St Jeor Equation
  if (sex === 'male') {
    return round(10 * weightKg + 6.25 * heightCm - 5 * age + 5, 0);
  } else {
    return round(10 * weightKg + 6.25 * heightCm - 5 * age - 161, 0);
  }
}

function getActivityMultiplier(activityLevel) {
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  return multipliers[activityLevel] || 1.55;
}

function calculateTDEE(bmr, activityLevel) {
  return round(bmr * getActivityMultiplier(activityLevel), 0);
}

function calculateTargetCalories(tdee, goal) {
  switch (goal) {
    case 'cut': return tdee - 500;
    case 'bulk': return tdee + 500;
    default: return tdee;
  }
}
