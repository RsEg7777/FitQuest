# FitQuest 🏋️ — Gamified Fitness & Daily Challenge Website

A Progressive Web App (PWA) that gamifies fitness tracking with XP, levels, streaks, badges, and daily challenges. The UI runs in the browser, while SQL queries are executed on a small **Node.js + MySQL** backend.

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
- **Exercise Library** — Searchable/filterable exercise library with muscle groups & MET values
- **Profile & Settings** — Edit profile, toggle notifications, danger-zone data reset
- **PWA** — Installable on mobile/desktop, offline-capable dashboard, 9 PM streak reminder push notification

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (custom properties, grid, flexbox), Vanilla JavaScript |
| Backend | Node.js HTTP server + `/api/query` SQL endpoint |
| Database | MySQL (see `schema.sql`) |
| Charts | [Chart.js](https://www.chartjs.org/) v4.4.4 (CDN) |
| PWA | Service Worker (cache-first strategy) + Web App Manifest |
| Notifications | Push API + Notification API |
 
> Note: Feature pages make SQL calls via the backend endpoint (`POST /api/query`). If the backend isn’t running, data won’t load or update.

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
│   ├── db.js               # Fetch helpers for `/api/query` + shared queries
│   ├── app.js              # PWA init, sidebar rendering, auth guards, toasts
│   ├── gamification.js     # XP, levels, streaks, badges, BMI/TDEE + badge checks
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

See [SQL_DEMO.md](SQL_DEMO.md) for query examples. For the exact MySQL DDL + seeds used by the backend, use `schema.sql`.

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
- Node.js
- A running MySQL server (see `schema.sql`)

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd fitquest

# Install backend dependencies
npm install

# Seed MySQL schema + seed data (prompts for the MySQL root password)
npm run setup-db

# Start the app (also serves the frontend files)
npm start
```

Then open `http://localhost:3000` in your browser.

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

The Service Worker caches the static frontend assets (HTML/CSS/JS) and can serve a cached page when you go offline.

After the first visit:
- The UI and cached pages can load offline
- SQL-backed features (anything that uses `/api/query`) require the backend to be reachable; without the backend, loading/logging data will fail

---

## License

This project was built as an academic mini project for Semester 4 (2026).

Co-Authored-By: Oz <oz-agent@warp.dev>
