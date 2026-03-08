# FitQuest 🏋️ — Gamified Fitness & Daily Challenge Website

A Progressive Web App (PWA) that gamifies fitness tracking with XP, levels, streaks, badges, and daily challenges. Built entirely with **HTML, CSS, JavaScript, and SQL** (SQLite via sql.js WASM — runs 100% in the browser).

> **Semester 4 Mini Project (2026)**

---

## Features

- **Onboarding Wizard** — Collects height, weight, age, sex, body type, activity level & goal → auto-calculates BMI & TDEE (Mifflin-St Jeor formula) → generates a personalised 7-day workout + meal plan
- **Dashboard** — Daily summary: calories, workouts, XP, streak, today's challenges at a glance
- **Daily Challenges** — 3 difficulty tiers (Easy / Medium / Hard) with XP rewards; refreshes daily
- **My Plan** — View the auto-generated 7-day workout & meal schedule stored in SQL
- **Calorie Tracker** — Search from 100+ Indian foods database, log meals by type, track workout calorie burn using MET formula
- **Progress & Stats** — Interactive Chart.js charts: weight trend, calorie intake, macro breakdown, workout heatmap
- **Leaderboard** — Weekly XP rankings across all users
- **Badges & Achievements** — 20 badges (First Step, Streak Master, Iron Will, etc.) with toast + confetti unlock animations
- **Exercise Library** — Searchable/filterable database of exercises with muscle groups & MET values
- **Profile & Settings** — Edit profile, toggle notifications, export data as JSON, danger-zone data reset
- **PWA** — Installable on mobile/desktop, offline-capable dashboard, 9 PM streak reminder push notification

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (custom properties, grid, flexbox), Vanilla JavaScript (ES6 modules) |
| Database | SQLite via [sql.js](https://github.com/sql-js/sql.js) (WebAssembly) — runs entirely in-browser |
| Persistence | IndexedDB (stores the SQLite database binary) |
| Charts | [Chart.js](https://www.chartjs.org/) v4.4.4 (CDN) |
| PWA | Service Worker (cache-first strategy) + Web App Manifest |
| Notifications | Push API + Notification API |

**No backend server required.** Everything runs client-side.

---

## Project Structure

```
fitquest/
├── index.html              # Landing page
├── auth.html               # Login / Register
├── onboarding.html         # 5-step onboarding wizard
├── dashboard.html          # Main dashboard
├── challenges.html         # Daily challenges
├── plan.html               # 7-day workout & meal plan
├── calories.html           # Calorie tracker
├── progress.html           # Progress & stats (Chart.js)
├── leaderboard.html        # Weekly leaderboard
├── badges.html             # Badges & achievements
├── profile.html            # Profile & settings
├── exercises.html          # Exercise library
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   └── style.css           # All styles (CSS variables, responsive)
├── js/
│   ├── db.js               # SQL schema, seed data, CRUD helpers
│   ├── app.js              # PWA init, navigation, auth guards, toasts
│   ├── gamification.js     # XP, levels, streaks, badges, BMI/TDEE
│   ├── auth.js             # Login & registration logic
│   ├── onboarding.js       # Wizard steps, plan generation
│   ├── dashboard.js        # Dashboard widgets
│   ├── challenges.js       # Challenge cards & completion
│   ├── plan.js             # Plan display (workout + meals)
│   ├── calories.js         # Food search, meal logging, workout burn
│   ├── progress.js         # Chart.js charts & heatmap
│   ├── leaderboard.js      # Leaderboard table
│   ├── badges.js           # Badge grid & unlock animations
│   ├── profile.js          # Settings, export, data reset
│   └── exercises.js        # Exercise search & filter
├── SQL_DEMO.md             # SQL operations demonstration
└── README.md               # This file
```

---

## Database Schema (14 Tables)

- `users` — Account credentials
- `user_profiles` — Physical stats, BMI, TDEE, goal
- `indian_foods` — 100+ Indian foods with nutritional data
- `workout_plans` / `meal_plans` — Auto-generated 7-day plans
- `food_log` / `workout_log` — Daily tracking
- `daily_challenges` / `user_challenges` — Challenge system
- `badges` / `user_badges` — Achievement system
- `xp_log` / `user_stats` — Gamification (XP, level, streak)
- `weight_log` — Weight history for progress charts

See [SQL_DEMO.md](SQL_DEMO.md) for detailed CREATE TABLE statements and query examples.

---

## Key Formulas

| Formula | Equation |
|---------|----------|
| **BMI** | `weight_kg / (height_m)²` |
| **BMR** (Mifflin-St Jeor) | Male: `10 × weight + 6.25 × height - 5 × age + 5` · Female: `10 × weight + 6.25 × height - 5 × age - 161` |
| **TDEE** | `BMR × activity_multiplier` (1.2 – 1.9) |
| **Target Calories** | Cut: `TDEE - 500` · Bulk: `TDEE + 500` · Maintain: `TDEE` |
| **Calorie Burn** | `MET × weight_kg × duration_hours` |
| **Level** | `floor(sqrt(total_xp / 100)) + 1` |

---

## Setup & Running

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- A local HTTP server (required for ES modules and Service Worker)

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd fitquest

# Option 1: Python
python3 -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: VS Code
# Install "Live Server" extension → right-click index.html → "Open with Live Server"
```

Then open `http://localhost:8000` in your browser.

### Install as PWA
On Chrome/Edge: click the install icon in the address bar, or use the browser menu → "Install FitQuest".

---

## SQL Demonstration

The [SQL_DEMO.md](SQL_DEMO.md) file contains comprehensive examples of all SQL operations used in the project:
- **CREATE TABLE** — Schema with constraints (PK, FK, CHECK, DEFAULT)
- **INSERT** — User registration, food logging, XP earning
- **SELECT** — Queries with WHERE, LIKE, JOIN, GROUP BY, ORDER BY, LIMIT, aggregates
- **UPDATE** — Profile edits, streak updates, XP updates
- **DELETE** — Log removal, full data reset
- **JOINs** — INNER JOIN, LEFT JOIN, subqueries

---

## Offline Support

The Service Worker caches all HTML, CSS, JS, and the sql.js WASM binary. After the first visit:
- The dashboard and all pages work offline
- Food database is stored locally in IndexedDB
- Data syncs back when connectivity is restored

---

## License

This project was built as an academic mini project for Semester 4 (2026).

Co-Authored-By: Oz <oz-agent@warp.dev>
