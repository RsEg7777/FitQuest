/* ============================================
   FitQuest — Gamification Engine
   XP, levels, streaks, badges, leaderboard
   ============================================ */

const XP_REWARDS = {
  workout_complete: 50,
  meal_logged: 10,
  challenge_easy: 25,
  challenge_medium: 50,
  challenge_hard: 100,
  daily_login: 10,
  weight_logged: 5
};

function calculateLevel(totalXP) { return Math.floor(Math.sqrt(totalXP / 100)) + 1; }
function xpForLevel(level)       { return (level - 1) * (level - 1) * 100; }
function xpForNextLevel(level)   { return level * level * 100; }

function xpProgress(totalXP) {
  const level = calculateLevel(totalXP);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForNextLevel(level);
  const progress = totalXP - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return { level, progress, needed, percent: Math.min(100, (progress / needed) * 100) };
}

async function awardXP(userId, amount, source, sourceId = null) {
  await dbRun('INSERT INTO xp_log (user_id, xp_amount, source, source_id) VALUES (?, ?, ?, ?)',
    [userId, amount, source, sourceId]);

  const stats = await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
  const newTotalXP = (stats ? stats.total_xp : 0) + amount;
  const newLevel = calculateLevel(newTotalXP);

  if (stats) {
    const oldLevel = stats.level;
    await dbRun('UPDATE user_stats SET total_xp = ?, level = ? WHERE user_id = ?',
      [newTotalXP, newLevel, userId]);
    if (newLevel > oldLevel) showToast('Level Up! 🎉', `You reached Level ${newLevel}!`, '⬆️');
  } else {
    await dbRun('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, 1, 1, ?)',
      [userId, newTotalXP, newLevel, getToday()]);
  }
  showToast('+' + amount + ' XP', source.replace(/_/g, ' '), '✨');
  await checkBadges(userId);
}

async function checkBadges(userId) {
  const allBadges = await dbAll('SELECT * FROM badges');
  const earnedRows = await dbAll('SELECT badge_id FROM user_badges WHERE user_id = ?', [userId]);
  const earnedBadgeIds = earnedRows.map(b => b.badge_id);

  for (const badge of allBadges) {
    if (earnedBadgeIds.includes(badge.id)) continue;
    let earned = false;

    switch (badge.criteria_type) {
      case 'workouts': {
        const r = await dbGet('SELECT COUNT(*) as c FROM workout_log WHERE user_id = ?', [userId]);
        if (r && r.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'streak': {
        const r = await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
        if (r && r.longest_streak >= badge.criteria_value) earned = true;
        break;
      }
      case 'xp': {
        const r = await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
        if (r && r.total_xp >= badge.criteria_value) earned = true;
        break;
      }
      case 'level': {
        const r = await dbGet('SELECT * FROM user_stats WHERE user_id = ?', [userId]);
        if (r && r.level >= badge.criteria_value) earned = true;
        break;
      }
      case 'challenges': {
        const r = await dbGet('SELECT COUNT(*) as c FROM user_challenges WHERE user_id = ? AND completed = 1', [userId]);
        if (r && r.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'hard_challenges': {
        const r = await dbGet(`SELECT COUNT(*) as c FROM user_challenges uc
          JOIN daily_challenges dc ON uc.challenge_id = dc.id
          WHERE uc.user_id = ? AND uc.completed = 1 AND dc.difficulty = 'hard'`, [userId]);
        if (r && r.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'meals': {
        const r = await dbGet('SELECT COUNT(*) as c FROM food_log WHERE user_id = ?', [userId]);
        if (r && r.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'weight_logs': {
        const r = await dbGet('SELECT COUNT(*) as c FROM weight_log WHERE user_id = ?', [userId]);
        if (r && r.c >= badge.criteria_value) earned = true;
        break;
      }
      case 'food_log_streak': {
        const logs = await dbAll('SELECT DISTINCT date FROM food_log WHERE user_id = ? ORDER BY date DESC', [userId]);
        if (logs.length >= badge.criteria_value) {
          let consecutive = 1;
          for (let i = 1; i < logs.length; i++) {
            const prev = new Date(logs[i - 1].date);
            const curr = new Date(logs[i].date);
            if ((prev - curr) / 86400000 === 1) consecutive++;
            else break;
          }
          if (consecutive >= badge.criteria_value) earned = true;
        }
        break;
      }
    }

    if (earned) {
      await dbRun('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [userId, badge.id]);
      showBadgeToast(badge.name, badge.icon);
    }
  }
}

async function getLeaderboard() {
  const weekStart = getWeekStart();
  return await dbAll(`
    SELECT u.id, u.username, us.total_xp, us.level, us.current_streak,
      COALESCE((SELECT SUM(xp_amount) FROM xp_log WHERE user_id = u.id AND earned_at >= ?), 0) AS weekly_xp
    FROM users u
    LEFT JOIN user_stats us ON u.id = us.user_id
    ORDER BY weekly_xp DESC
  `, [weekStart]);
}

async function ensureDemoLeaderboard() {
  const r = await dbGet('SELECT COUNT(*) as c FROM users');
  if (r && r.c >= 5) return;

  const demoUsers = [
    ['arjun_fit',    'arjun@demo.com'],
    ['priya_yoga',   'priya@demo.com'],
    ['rahul_runner', 'rahul@demo.com'],
    ['sneha_strong', 'sneha@demo.com'],
    ['vikram_beast', 'vikram@demo.com'],
    ['anita_cardio', 'anita@demo.com'],
    ['karan_lifts',  'karan@demo.com'],
    ['meera_flex',   'meera@demo.com'],
  ];

  const existing = (await dbAll('SELECT username FROM users')).map(u => u.username);
  const weekStart = getWeekStart();

  for (const [username, email] of demoUsers) {
    if (existing.includes(username)) continue;
    try {
      await dbRun('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, 'demo_hash']);
      const user = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
      if (user) {
        const xp = Math.floor(Math.random() * 800) + 100;
        const level = calculateLevel(xp);
        const streak = Math.floor(Math.random() * 15) + 1;
        await dbRun('INSERT INTO user_stats (user_id, total_xp, level, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, xp, level, streak, streak, getToday()]);
        await dbRun('INSERT INTO xp_log (user_id, xp_amount, source, earned_at) VALUES (?, ?, ?, ?)',
          [user.id, Math.floor(Math.random() * 400) + 50, 'weekly_activity', weekStart]);
      }
    } catch (e) { /* ignore duplicates */ }
  }
}

function calculateCaloriesBurned(metValue, weightKg, durationMin) {
  return round(metValue * weightKg * (durationMin / 60), 0);
}

function calculateBMI(weightKg, heightCm) {
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

function calculateBMR(weightKg, heightCm, age, sex) {
  if (sex === 'male') return round(10 * weightKg + 6.25 * heightCm - 5 * age + 5, 0);
  return round(10 * weightKg + 6.25 * heightCm - 5 * age - 161, 0);
}

function getActivityMultiplier(activityLevel) {
  const m = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return m[activityLevel] || 1.55;
}

function calculateTDEE(bmr, activityLevel) {
  return round(bmr * getActivityMultiplier(activityLevel), 0);
}

function calculateTargetCalories(tdee, goal) {
  if (goal === 'cut')  return tdee - 500;
  if (goal === 'bulk') return tdee + 500;
  return tdee;
}
