/* ============================================
   FitQuest — SQLite Database Initialiser
   Zero config. Just call initDb(path).
   ============================================ */
const Database = require('better-sqlite3');
const crypto   = require('crypto');

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY, height_cm REAL, weight_kg REAL, age INTEGER,
  sex TEXT CHECK(sex IN ('male','female')),
  body_type TEXT CHECK(body_type IN ('ectomorph','mesomorph','endomorph')),
  activity_level TEXT CHECK(activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal TEXT CHECK(goal IN ('cut','bulk','maintain')),
  bmi REAL, bmr REAL, tdee REAL, target_calories REAL,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS indian_foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  category TEXT CHECK(category IN ('grain','dal','vegetable','fruit','dairy','meat','snack','beverage','sweet','egg','fish')),
  serving_size REAL, serving_unit TEXT,
  calories REAL, protein_g REAL, carbs_g REAL, fat_g REAL, fiber_g REAL, is_veg INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS workout_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, day_number INTEGER,
  exercise_name TEXT NOT NULL, sets INTEGER, reps INTEGER, duration_min INTEGER,
  met_value REAL, muscle_group TEXT, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, day_number INTEGER,
  meal_type TEXT CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
  food_name TEXT NOT NULL, calories REAL, protein_g REAL, carbs_g REAL, fat_g REAL,
  FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS food_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT NOT NULL,
  meal_type TEXT CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
  food_name TEXT NOT NULL, food_id INTEGER, servings REAL DEFAULT 1,
  calories REAL, protein_g REAL, carbs_g REAL, fat_g REAL,
  logged_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (food_id) REFERENCES indian_foods(id));
CREATE TABLE IF NOT EXISTS workout_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT NOT NULL,
  exercise_name TEXT NOT NULL, duration_min INTEGER, calories_burned REAL, met_value REAL,
  logged_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
  difficulty TEXT CHECK(difficulty IN ('easy','medium','hard')),
  title TEXT NOT NULL, description TEXT, xp_reward INTEGER, challenge_type TEXT);
CREATE TABLE IF NOT EXISTS user_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, challenge_id INTEGER,
  completed INTEGER DEFAULT 0, completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (challenge_id) REFERENCES daily_challenges(id));
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT,
  icon TEXT, criteria_type TEXT, criteria_value INTEGER);
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, badge_id INTEGER,
  earned_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (badge_id) REFERENCES badges(id));
CREATE TABLE IF NOT EXISTS xp_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, xp_amount INTEGER,
  source TEXT, source_id INTEGER, earned_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY, total_xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0, last_active_date TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS weight_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT NOT NULL, weight_kg REAL,
  FOREIGN KEY (user_id) REFERENCES users(id));
`;

const BADGES = [
  ['First Step','Complete your first workout','👟','workouts',1],
  ['Week Warrior','Maintain a 7-day streak','🔥','streak',7],
  ['Monthly Master','30-day streak','⚡','streak',30],
  ['Century Club','Complete 100 workouts','💯','workouts',100],
  ['XP Hunter','Earn 1000 XP','🏆','xp',1000],
  ['XP Legend','Earn 5000 XP','👑','xp',5000],
  ['Level 5','Reach level 5','⭐','level',5],
  ['Level 10','Reach level 10','🌟','level',10],
  ['Level 20','Reach level 20','💫','level',20],
  ['Challenge Starter','Complete your first challenge','🎯','challenges',1],
  ['Challenge Pro','Complete 25 challenges','🏅','challenges',25],
  ['Challenge Master','Complete 50 challenges','🥇','challenges',50],
  ['Calorie Tracker','Log food for 7 consecutive days','📊','food_log_streak',7],
  ['Meal Prep Pro','Log 50 meals','🍽️','meals',50],
  ['Weight Watcher','Log weight 10 times','⚖️','weight_logs',10],
  ['Early Bird','Log a workout before 8 AM','🌅','special',1],
  ['Night Owl','Log a workout after 9 PM','🦉','special',1],
  ['Social Butterfly','Reach top 3 on leaderboard','🦋','leaderboard',3],
  ['Iron Will','Complete 5 hard challenges','💪','hard_challenges',5],
  ['Balanced Diet','Log all 4 meal types in a day','🥗','special',1],
];

const FOODS = [
  ['Roti (Chapati)','grain',40,'g (1 pc)',120,3.5,20,3.5,1.2,1],
  ['Plain Rice (cooked)','grain',150,'g (1 cup)',180,3.5,40,0.4,0.4,1],
  ['Paratha (plain)','grain',60,'g (1 pc)',180,4,25,7,1.5,1],
  ['Poori','grain',30,'g (1 pc)',120,2,12,7,0.5,1],
  ['Naan','grain',90,'g (1 pc)',260,7.5,45,5,2,1],
  ['Idli','grain',60,'g (2 pcs)',130,4,26,0.5,0.8,1],
  ['Dosa (plain)','grain',100,'g (1 pc)',170,4,28,5,0.8,1],
  ['Masala Dosa','grain',150,'g (1 pc)',250,5.5,35,10,1.5,1],
  ['Upma','grain',200,'g (1 bowl)',210,5,30,8,2,1],
  ['Poha','grain',200,'g (1 bowl)',250,5,40,8,1.5,1],
  ['Jeera Rice','grain',200,'g (1 cup)',220,4,42,4,0.5,1],
  ['Biryani (Veg)','grain',250,'g (1 plate)',350,8,50,13,2,1],
  ['Biryani (Chicken)','grain',250,'g (1 plate)',400,18,48,15,1.5,0],
  ['Pulao (Veg)','grain',200,'g (1 cup)',260,5,42,8,1.5,1],
  ['Pav Bhaji','grain',300,'g (1 plate)',400,10,55,16,4,1],
  ['Chole Bhature','grain',300,'g (1 plate)',450,14,55,20,5,1],
  ['Aloo Paratha','grain',120,'g (1 pc)',280,6,38,12,2,1],
  ['Methi Paratha','grain',80,'g (1 pc)',200,5,28,8,2,1],
  ['Bread Slice (brown)','grain',30,'g (1 slice)',75,3,14,1,1.5,1],
  ['Oats Porridge','grain',40,'g (dry)',150,5,27,2.5,4,1],
  ['Dal Tadka (Toor)','dal',200,'g (1 bowl)',180,10,25,4,5,1],
  ['Dal Makhani','dal',200,'g (1 bowl)',230,9,26,10,4,1],
  ['Chana Dal','dal',200,'g (1 bowl)',200,11,28,5,6,1],
  ['Moong Dal','dal',200,'g (1 bowl)',150,10,22,2,4,1],
  ['Rajma (Kidney Beans)','dal',200,'g (1 bowl)',210,12,32,4,7,1],
  ['Chole (Chickpea Curry)','dal',200,'g (1 bowl)',240,11,30,9,6,1],
  ['Sambar','dal',200,'g (1 bowl)',130,6,18,4,3,1],
  ['Rasam','dal',200,'g (1 bowl)',60,2,10,1.5,1,1],
  ['Sprouts (Moong) boiled','dal',100,'g',75,7,10,0.5,3,1],
  ['Masoor Dal','dal',200,'g (1 bowl)',170,10,24,3,5,1],
  ['Aloo Gobi','vegetable',200,'g (1 bowl)',180,4,22,9,3,1],
  ['Palak Paneer','vegetable',200,'g (1 bowl)',260,14,10,19,3,1],
  ['Bhindi Masala','vegetable',150,'g (1 bowl)',120,3,12,7,3.5,1],
  ['Baingan Bharta','vegetable',200,'g (1 bowl)',160,3.5,15,10,4,1],
  ['Mixed Veg Curry','vegetable',200,'g (1 bowl)',150,4,18,7,4,1],
  ['Matar Paneer','vegetable',200,'g (1 bowl)',280,14,16,18,3,1],
  ['Aloo Matar','vegetable',200,'g (1 bowl)',180,5,24,7,3.5,1],
  ['Lauki (Bottle Gourd)','vegetable',200,'g (1 bowl)',70,2,10,2.5,2,1],
  ['Tinda Masala','vegetable',200,'g (1 bowl)',90,2.5,12,4,2.5,1],
  ['Kadai Paneer','vegetable',200,'g (1 bowl)',300,15,12,22,2,1],
  ['Shahi Paneer','vegetable',200,'g (1 bowl)',330,14,14,25,2,1],
  ['Cabbage Sabzi','vegetable',150,'g (1 bowl)',80,2,10,3.5,2.5,1],
  ['Green Salad','vegetable',100,'g',25,1.5,4,0.3,2,1],
  ['Raita (Cucumber)','vegetable',100,'g',50,2.5,4,2.5,0.5,1],
  ['Paneer (raw)','dairy',50,'g',150,9,2,12,0,1],
  ['Milk (full fat)','dairy',200,'ml (1 glass)',130,6,10,7,0,1],
  ['Milk (toned)','dairy',200,'ml (1 glass)',100,6,10,3,0,1],
  ['Curd / Dahi','dairy',100,'g (1 bowl)',60,3,5,3,0,1],
  ['Lassi (sweet)','dairy',250,'ml (1 glass)',180,5,28,5,0,1],
  ['Lassi (salted)','dairy',250,'ml (1 glass)',100,5,8,5,0,1],
  ['Buttermilk (Chaas)','dairy',200,'ml',40,2,4,1.5,0,1],
  ['Ghee','dairy',5,'g (1 tsp)',45,0,0,5,0,1],
  ['Butter','dairy',10,'g (1 tbsp)',72,0.1,0,8,0,1],
  ['Cheese Slice','dairy',20,'g (1 slice)',60,3.5,0.5,5,0,1],
  ['Chicken Curry','meat',200,'g (1 bowl)',280,22,8,18,1,0],
  ['Butter Chicken','meat',200,'g (1 bowl)',350,20,10,26,1,0],
  ['Tandoori Chicken (2 pcs)','meat',150,'g',250,28,4,14,0.5,0],
  ['Chicken Tikka','meat',100,'g',180,22,3,9,0,0],
  ['Mutton Curry','meat',200,'g (1 bowl)',350,24,6,26,1,0],
  ['Keema Matar','meat',200,'g (1 bowl)',320,22,12,22,2,0],
  ['Grilled Chicken Breast','meat',100,'g',165,31,0,3.6,0,0],
  ['Fish Curry','fish',200,'g (1 bowl)',220,20,6,13,0.5,0],
  ['Fish Fry (1 pc)','fish',80,'g',160,14,5,9,0,0],
  ['Prawn Masala','fish',200,'g (1 bowl)',200,18,8,11,1,0],
  ['Boiled Egg (1)','egg',50,'g',78,6,0.5,5,0,0],
  ['Egg Bhurji (2 eggs)','egg',120,'g',200,14,3,15,0.5,0],
  ['Omelette (2 eggs)','egg',120,'g',190,13,1,14,0,0],
  ['Egg Curry (2 eggs)','egg',200,'g',250,14,8,18,1,0],
  ['Samosa (1 pc)','snack',80,'g',220,4,24,12,1.5,1],
  ['Pakora / Bhajiya','snack',100,'g',280,5,22,19,2,1],
  ['Vada Pav (1)','snack',150,'g',300,6,38,14,2,1],
  ['Dhokla (2 pcs)','snack',100,'g',160,5,25,5,1,1],
  ['Bhel Puri','snack',150,'g',200,5,30,7,2,1],
  ['Sev Puri (4 pcs)','snack',120,'g',220,4,28,10,2,1],
  ['Pani Puri (6 pcs)','snack',100,'g',180,3,26,7,1.5,1],
  ['Sandwich (Veg)','snack',150,'g',250,7,32,10,2,1],
  ['Roasted Chana','snack',30,'g (handful)',110,6,18,2,4,1],
  ['Makhana (Fox nuts)','snack',30,'g',100,3,18,0.5,1,1],
  ['Peanuts (roasted)','snack',30,'g (handful)',170,7,5,14,2.5,1],
  ['Almonds','snack',20,'g (10 pcs)',115,4,4,10,2.5,1],
  ['Trail Mix (dry fruits)','snack',30,'g',150,4,12,10,2,1],
  ['Banana (1 medium)','fruit',120,'g',105,1.3,27,0.4,3,1],
  ['Apple (1 medium)','fruit',180,'g',95,0.5,25,0.3,4.4,1],
  ['Mango (1 cup)','fruit',165,'g',100,1.4,25,0.6,2.6,1],
  ['Papaya (1 cup)','fruit',145,'g',62,0.7,16,0.4,2.5,1],
  ['Orange (1 medium)','fruit',130,'g',62,1.2,15,0.2,3,1],
  ['Guava (1 medium)','fruit',100,'g',68,2.5,14,1,5,1],
  ['Watermelon (1 cup)','fruit',150,'g',46,0.9,12,0.2,0.6,1],
  ['Grapes (1 cup)','fruit',150,'g',104,1,27,0.2,1.4,1],
  ['Chai (with milk & sugar)','beverage',150,'ml (1 cup)',80,2,12,2.5,0,1],
  ['Black Coffee','beverage',200,'ml (1 cup)',5,0.3,0,0,0,1],
  ['Coffee with Milk','beverage',200,'ml (1 cup)',60,2,8,2,0,1],
  ['Green Tea','beverage',200,'ml (1 cup)',2,0,0,0,0,1],
  ['Coconut Water','beverage',240,'ml (1 glass)',46,1.7,9,0.5,2.6,1],
  ['Mango Shake','beverage',250,'ml',200,4,35,5,1,1],
  ['Banana Shake','beverage',250,'ml',180,5,30,4,1.5,1],
  ['Nimbu Pani (Lemonade)','beverage',250,'ml',50,0.3,12,0.1,0.2,1],
  ['Protein Shake (whey)','beverage',300,'ml',130,25,4,2,0,1],
  ['Gulab Jamun (2 pcs)','sweet',80,'g',300,4,42,13,0.5,1],
  ['Rasgulla (2 pcs)','sweet',80,'g',190,4,35,4,0,1],
  ['Jalebi (2 pcs)','sweet',60,'g',230,2,38,8,0,1],
  ['Kheer (Rice Pudding)','sweet',150,'g',200,5,30,7,0.3,1],
  ['Ladoo (Besan)','sweet',40,'g (1 pc)',180,3,20,10,1,1],
  ['Halwa (Sooji)','sweet',100,'g',250,3.5,32,12,0.5,1],
  ['Gajar Halwa','sweet',100,'g',230,4,28,12,1,1],
];

const CHALLENGES = [
  ['easy','Morning Stretch','Do a 5-minute full body stretch',25,'stretch'],
  ['easy','Water Challenge','Drink 8 glasses of water today',25,'hydration'],
  ['easy','Walk 2000 Steps','Take a short walk around your area',25,'cardio'],
  ['medium','20 Push-ups','Complete 20 push-ups (can be split into sets)',50,'strength'],
  ['medium','Healthy Meal','Log a meal under 500 calories',50,'nutrition'],
  ['medium','Plank Hold','Hold a plank for 60 seconds total',50,'core'],
  ['hard','30-Min Workout','Complete a 30-minute workout session',100,'full_body'],
  ['hard','No Sugar Day','Avoid all added sugars for the entire day',100,'nutrition'],
  ['hard','Surya Namaskar x12','Complete 12 rounds of Sun Salutation',100,'yoga'],
];

function sha256(str) { return crypto.createHash('sha256').update(str,'utf8').digest('hex'); }
function today()     { return new Date().toISOString().split('T')[0]; }
function daysAgo(n)  { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0]; }

function initDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  if (!db.prepare('SELECT id FROM badges LIMIT 1').get()) {
    const s = db.prepare('INSERT INTO badges (name,description,icon,criteria_type,criteria_value) VALUES (?,?,?,?,?)');
    db.transaction(() => BADGES.forEach(b => s.run(...b)))();
    console.log('✓ Seeded badges');
  }
  if (!db.prepare('SELECT id FROM indian_foods LIMIT 1').get()) {
    const s = db.prepare('INSERT INTO indian_foods (name,category,serving_size,serving_unit,calories,protein_g,carbs_g,fat_g,fiber_g,is_veg) VALUES (?,?,?,?,?,?,?,?,?,?)');
    db.transaction(() => FOODS.forEach(f => s.run(...f)))();
    console.log(`✓ Seeded ${FOODS.length} Indian foods`);
  }
  const t = today();
  if (!db.prepare('SELECT id FROM daily_challenges WHERE date = ? LIMIT 1').get(t)) {
    const s = db.prepare('INSERT INTO daily_challenges (date,difficulty,title,description,xp_reward,challenge_type) VALUES (?,?,?,?,?,?)');
    db.transaction(() => CHALLENGES.forEach(c => s.run(t,...c)))();
    console.log(`✓ Seeded ${CHALLENGES.length} challenges for ${t}`);
  }
  return db;
}

function seedTestUsers(db) {
  if (db.prepare('SELECT id FROM users LIMIT 1').get()) return;
  const hash = sha256('Test@123');
  const t    = today();
  const users = [
    {u:'testuser1',  e:'testuser1@fitquest.test', age:25,sex:'male',  w:70,h:175,type:'mesomorph', act:'moderate',   goal:'cut',     xp:850, lvl:3,str:5, lng:7 },
    {u:'priya_fit',  e:'priya@fitquest.test',     age:22,sex:'female',w:55,h:162,type:'ectomorph', act:'light',      goal:'bulk',    xp:1250,lvl:4,str:8, lng:12},
    {u:'rahul_strong',e:'rahul@fitquest.test',    age:28,sex:'male',  w:85,h:180,type:'endomorph', act:'active',     goal:'cut',     xp:2100,lvl:5,str:12,lng:15},
    {u:'anita_yoga', e:'anita@fitquest.test',     age:30,sex:'female',w:62,h:165,type:'mesomorph', act:'very_active',goal:'maintain',xp:500, lvl:2,str:2, lng:5 },
    {u:'vikram_beast',e:'vikram@fitquest.test',   age:35,sex:'male',  w:90,h:182,type:'endomorph', act:'active',     goal:'cut',     xp:3500,lvl:6,str:20,lng:20},
  ];
  const iU  = db.prepare('INSERT INTO users (username,email,password_hash) VALUES (?,?,?)');
  const iP  = db.prepare('INSERT INTO user_profiles (user_id,height_cm,weight_kg,age,sex,body_type,activity_level,goal,bmi,bmr,tdee,target_calories) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  const iS  = db.prepare('INSERT INTO user_stats (user_id,total_xp,level,current_streak,longest_streak,last_active_date) VALUES (?,?,?,?,?,?)');
  const iWk = db.prepare('INSERT INTO workout_log (user_id,date,exercise_name,duration_min,calories_burned,met_value) VALUES (?,?,?,?,?,?)');
  const iF  = db.prepare('INSERT INTO food_log (user_id,date,meal_type,food_name,servings,calories,protein_g,carbs_g,fat_g) VALUES (?,?,?,?,1,?,?,?,?)');
  const iWt = db.prepare('INSERT INTO weight_log (user_id,date,weight_kg) VALUES (?,?,?)');
  const exs = [{n:'Running (outdoor)',met:9.8,dur:30},{n:'Push-ups',met:8.0,dur:15},{n:'Squats',met:5.0,dur:20},{n:'Burpees',met:12.0,dur:12}];
  const fds = [{meal:'breakfast',n:'Oats Porridge',cal:150,pro:5,carb:27,fat:2.5},{meal:'lunch',n:'Roti (Chapati)',cal:240,pro:7,carb:40,fat:7},{meal:'dinner',n:'Palak Paneer',cal:260,pro:14,carb:10,fat:19}];
  db.transaction(() => {
    for (const u of users) {
      const r  = iU.run(u.u,u.e,hash); const uid=r.lastInsertRowid;
      const hm = u.h/100; const bmi=+(u.w/(hm*hm)).toFixed(1);
      const bmr= u.sex==='male'?Math.round(10*u.w+6.25*u.h-5*u.age+5):Math.round(10*u.w+6.25*u.h-5*u.age-161);
      const mult={sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very_active:1.9}[u.act];
      const tdee=Math.round(bmr*mult); const tgt=u.goal==='cut'?tdee-500:u.goal==='bulk'?tdee+500:tdee;
      iP.run(uid,u.h,u.w,u.age,u.sex,u.type,u.act,u.goal,bmi,bmr,tdee,tgt);
      iS.run(uid,u.xp,u.lvl,u.str,u.lng,t);
      for(let d=1;d<=5;d+=2){const ex=exs[(d+uid)%exs.length];iWk.run(uid,daysAgo(d),ex.n,ex.dur,Math.round(ex.met*u.w*(ex.dur/60)),ex.met);}
      for(let d=0;d<3;d++){const f=fds[d%fds.length];iF.run(uid,daysAgo(d),f.meal,f.n,f.cal,f.pro,f.carb,f.fat);}
      for(let w=0;w<3;w++){iWt.run(uid,daysAgo(w*7),+(u.w+w*0.3*(u.goal==='cut'?-1:1)).toFixed(1));}
    }
  })();
  console.log('✓ Seeded 5 test users (password: Test@123)');
}

module.exports = { initDb, seedTestUsers };
