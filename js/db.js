/* ============================================
   FitQuest — Database Layer (MySQL via fetch)
   All queries go to the Node.js backend API.
   ============================================ */

async function initDB() {
  // Connection is handled server-side — just verify the backend is reachable
  try { await fetch('/api/ping'); } catch(e) { console.warn('Backend not reachable'); }
}

/* ---------- Core helpers ---------- */

async function dbAll(sql, params = []) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params, type: 'all' }),
  });
  if (!res.ok) { console.error('dbAll failed:', sql); return []; }
  const data = await res.json();
  return data.rows || [];
}

async function dbGet(sql, params = []) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params, type: 'get' }),
  });
  if (!res.ok) { console.error('dbGet failed:', sql); return null; }
  const data = await res.json();
  return data.row || null;
}

async function dbRun(sql, params = []) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params, type: 'run' }),
  });
  if (!res.ok) { console.error('dbRun failed:', sql); return { insertId: null, affectedRows: 0 }; }
  return await res.json();
}

/* ---------- Auth helpers ---------- */

async function hashPassword(password) {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCurrentUserId() {
  return parseInt(localStorage.getItem('fitquest_user_id')) || null;
}

async function getCurrentUser() {
  const userId = getCurrentUserId();
  if (!userId) return null;
  return await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
}

/* ---------- Date helper ---------- */

function getToday() {
  return new Date().toISOString().split('T')[0];
}

/* ---------- Exercise Library ---------- */

function getExerciseLibrary() {
  return [
    { name: 'Push-ups',           muscle: 'Chest, Triceps',        category: 'strength', equipment: 'none',      met: 8.0,  icon: '💪', difficulty: 'beginner',     instructions: 'Start in plank position, lower chest to floor, push back up.' },
    { name: 'Pull-ups',           muscle: 'Back, Biceps',          category: 'strength', equipment: 'bar',       met: 8.0,  icon: '🏋️', difficulty: 'intermediate', instructions: 'Hang from bar, pull body up until chin over bar.' },
    { name: 'Squats',             muscle: 'Quads, Glutes',         category: 'strength', equipment: 'none',      met: 5.0,  icon: '🦵', difficulty: 'beginner',     instructions: 'Stand with feet shoulder-width, lower hips back and down.' },
    { name: 'Lunges',             muscle: 'Quads, Glutes',         category: 'strength', equipment: 'none',      met: 5.0,  icon: '🚶', difficulty: 'beginner',     instructions: 'Step forward, lower back knee toward ground, push back.' },
    { name: 'Plank',              muscle: 'Core',                  category: 'strength', equipment: 'none',      met: 4.0,  icon: '🧘', difficulty: 'beginner',     instructions: 'Hold body straight in forearm plank position.' },
    { name: 'Burpees',            muscle: 'Full Body',             category: 'hiit',     equipment: 'none',      met: 12.0, icon: '🔥', difficulty: 'advanced',     instructions: 'Squat, jump back to plank, push-up, jump forward, jump up.' },
    { name: 'Mountain Climbers',  muscle: 'Core, Cardio',          category: 'hiit',     equipment: 'none',      met: 10.0, icon: '⛰️', difficulty: 'intermediate', instructions: 'In plank, alternate driving knees to chest rapidly.' },
    { name: 'Jumping Jacks',      muscle: 'Full Body',             category: 'cardio',   equipment: 'none',      met: 8.0,  icon: '⭐', difficulty: 'beginner',     instructions: 'Jump feet apart while raising arms overhead, return.' },
    { name: 'Running (outdoor)',  muscle: 'Legs, Cardio',          category: 'cardio',   equipment: 'none',      met: 9.8,  icon: '🏃', difficulty: 'beginner',     instructions: 'Steady-paced jog or run outdoors.' },
    { name: 'Walking',            muscle: 'Legs',                  category: 'cardio',   equipment: 'none',      met: 3.5,  icon: '🚶', difficulty: 'beginner',     instructions: 'Brisk walking at a moderate pace.' },
    { name: 'Cycling',            muscle: 'Legs, Cardio',          category: 'cardio',   equipment: 'cycle',     met: 7.5,  icon: '🚴', difficulty: 'beginner',     instructions: 'Moderate pace cycling on flat terrain.' },
    { name: 'Skipping / Jump Rope',muscle:'Full Body',             category: 'cardio',   equipment: 'rope',      met: 12.3, icon: '🤸', difficulty: 'intermediate', instructions: 'Swing rope overhead and jump continuously.' },
    { name: 'Surya Namaskar',     muscle: 'Full Body',             category: 'yoga',     equipment: 'mat',       met: 4.0,  icon: '🌅', difficulty: 'beginner',     instructions: '12-pose flowing yoga sequence (Sun Salutation).' },
    { name: 'Deadlifts',          muscle: 'Back, Legs',            category: 'strength', equipment: 'barbell',   met: 6.0,  icon: '🏋️', difficulty: 'intermediate', instructions: 'Hinge at hips, grip bar, lift by extending hips and knees.' },
    { name: 'Bench Press',        muscle: 'Chest, Triceps',        category: 'strength', equipment: 'barbell',   met: 6.0,  icon: '🏋️', difficulty: 'intermediate', instructions: 'Lie on bench, lower bar to chest, press up.' },
    { name: 'Shoulder Press',     muscle: 'Shoulders',             category: 'strength', equipment: 'dumbbells', met: 5.0,  icon: '💪', difficulty: 'intermediate', instructions: 'Press dumbbells overhead from shoulder height.' },
    { name: 'Bicep Curls',        muscle: 'Biceps',                category: 'strength', equipment: 'dumbbells', met: 4.0,  icon: '💪', difficulty: 'beginner',     instructions: 'Curl dumbbells from sides to shoulders.' },
    { name: 'Tricep Dips',        muscle: 'Triceps',               category: 'strength', equipment: 'bench',     met: 5.0,  icon: '💪', difficulty: 'beginner',     instructions: 'Grip edge of bench behind, lower body by bending elbows.' },
    { name: 'Crunches',           muscle: 'Core',                  category: 'strength', equipment: 'none',      met: 3.8,  icon: '🧘', difficulty: 'beginner',     instructions: 'Lie back, curl shoulders up toward knees.' },
    { name: 'Leg Raises',         muscle: 'Core',                  category: 'strength', equipment: 'none',      met: 4.0,  icon: '🦵', difficulty: 'beginner',     instructions: 'Lie flat, raise legs to 90 degrees, lower slowly.' },
    { name: 'Russian Twists',     muscle: 'Obliques',              category: 'strength', equipment: 'none',      met: 4.5,  icon: '🔄', difficulty: 'intermediate', instructions: 'Seated, lean back slightly, rotate torso side to side.' },
    { name: 'High Knees',         muscle: 'Legs, Cardio',          category: 'hiit',     equipment: 'none',      met: 9.0,  icon: '🏃', difficulty: 'beginner',     instructions: 'Run in place, lifting knees high above waist.' },
    { name: 'Box Jumps',          muscle: 'Legs, Power',           category: 'hiit',     equipment: 'box',       met: 10.0, icon: '📦', difficulty: 'intermediate', instructions: 'Jump onto elevated platform, step back down.' },
    { name: 'Swimming',           muscle: 'Full Body',             category: 'cardio',   equipment: 'pool',      met: 8.0,  icon: '🏊', difficulty: 'intermediate', instructions: 'Moderate-pace freestyle swimming.' },
    { name: 'Yoga (Hatha)',       muscle: 'Full Body, Flexibility',category: 'yoga',     equipment: 'mat',       met: 3.0,  icon: '🧘', difficulty: 'beginner',     instructions: 'Gentle yoga with basic poses and breathing.' },
    { name: 'Meditation',         muscle: 'Mind',                  category: 'yoga',     equipment: 'none',      met: 1.0,  icon: '🧘‍♂️',difficulty: 'beginner',    instructions: 'Sit quietly, focus on breathing, clear mind.' },
    { name: 'Battle Ropes',       muscle: 'Arms, Core',            category: 'hiit',     equipment: 'ropes',     met: 10.3, icon: '🪢', difficulty: 'advanced',     instructions: 'Alternate waving heavy ropes rapidly.' },
    { name: 'Farmer Walk',        muscle: 'Grip, Core',            category: 'strength', equipment: 'dumbbells', met: 6.0,  icon: '🚶', difficulty: 'beginner',     instructions: 'Hold heavy weights at sides, walk with good posture.' },
    { name: 'Wall Sit',           muscle: 'Quads',                 category: 'strength', equipment: 'none',      met: 3.5,  icon: '🧱', difficulty: 'beginner',     instructions: 'Lean against wall in sitting position, hold.' },
    { name: 'Stretching',         muscle: 'Flexibility',           category: 'yoga',     equipment: 'none',      met: 2.3,  icon: '🤸', difficulty: 'beginner',     instructions: 'Gentle full-body stretching routine.' },
  ];
}
