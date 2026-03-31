# 🏸 OpenPlay — Social Sports PWA

A mobile-first Progressive Web App for tracking badminton and pickleball games, inspired by Strava.

## Stack
- **React 18** + **Vite** — Fast frontend tooling
- **Tailwind CSS** — Utility-first styling
- **Supabase** — Auth (Google OAuth), Postgres DB, Realtime
- **vite-plugin-pwa** — PWA manifest + service worker

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd openplay
npm install
```

### 2. Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com) and create a new project
2. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Set Up the Database

In your Supabase project, open the **SQL Editor** and run the full schema found in:

```
src/lib/supabase.js  (the comment block at the bottom)
```

This creates:
- `users` table + RLS policies
- `games` table + RLS policies
- `game_players` table + RLS policies
- Auto-create profile trigger on sign-up

### 5. Enable Google OAuth

1. In Supabase: **Authentication → Providers → Google**
2. Enable Google and add your OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
3. Add `http://localhost:5173` and your production URL to:
   - Google Cloud Console → Authorized redirect URIs
   - Supabase → Auth → URL Configuration → Redirect URLs

### 6. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📁 Project Structure

```
src/
├── components/
│   ├── GameCard.jsx       # Reusable game card
│   ├── Layout.jsx         # Bottom nav + page wrapper
│   └── LoadingScreen.jsx  # Splash loading screen
├── hooks/
│   └── useAuth.jsx        # Auth context + provider
├── lib/
│   └── supabase.js        # Supabase client + DB schema
├── pages/
│   ├── LoginPage.jsx      # Google OAuth login
│   ├── FeedPage.jsx       # Home feed with realtime
│   ├── LogGamePage.jsx    # Log a game form
│   ├── LeaderboardPage.jsx # Top 10 by wins
│   └── ProfilePage.jsx    # User stats + game history
├── App.jsx                # Router + auth guard
├── main.jsx               # Entry point
└── index.css              # Global styles + Tailwind
```

---

## 🗄️ Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | refs auth.users |
| name | text | |
| avatar_url | text | from Google |
| created_at | timestamptz | |

### `games`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| user_id | uuid | refs users.id |
| sport | text | 'badminton' \| 'pickleball' |
| score | text | free-form e.g. "21-18" |
| location | text | |
| result | text | 'win' \| 'loss' \| 'draw' |
| created_at | timestamptz | |

### `game_players`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| game_id | uuid | refs games.id |
| player_name | text | opponent name |

---

## 🏗️ Build for Production

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, or Cloudflare Pages.

---

## ✨ Features

- **Google Sign-In** via Supabase OAuth
- **Live Feed** — realtime game updates via Supabase channels
- **Log Game** — sport, score, result, location, opponents
- **Leaderboard** — top 10 players ranked by wins with podium UI
- **Profile** — win rate progress bar, stats grid, game history
- **PWA** — installable, offline-capable, mobile-optimized
- **Dark theme** — sleek black UI with neon-lime accents

---

## 🔮 Future Features

- [ ] Comments / reactions on games
- [ ] Club / group sessions
- [ ] GPS location via browser API
- [ ] Push notifications (game challenges)
- [ ] Head-to-head rival tracking
- [ ] Match photos / media
# OpenPlay
# OpenPlay
