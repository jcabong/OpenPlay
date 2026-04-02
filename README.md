# 🏸 OpenPlay — Social Racket Sports PWA

A Strava-style mobile-first Progressive Web App for **Badminton, Pickleball, Tennis, and Table Tennis** players.

## Features

| Feature | Details |
|---|---|
| **Global Feed** | Posts with photos/video, GG (likes), comments, sport + location tags |
| **Match Logging** | Sport, court, city/region, opponent tagging, score, result, intensity, media upload |
| **Leaderboards** | Per-sport rankings drillable by National → Region → City/Municipality |
| **Events** | Browse and register for tournaments, open play sessions, clinics; host your own |
| **Profile** | Per-sport win rates, career stats, editable bio + location |
| **PWA** | Installable, offline-capable, mobile-optimised |

---

## Tech Stack

- **React 18** + **Vite 6**
- **Tailwind CSS** with custom design tokens
- **Supabase** — Auth (Google OAuth), Postgres, Storage, Realtime
- **vite-plugin-pwa** — service worker + manifest

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo>
cd openplay
npm install
```

### 2. Create a Supabase project

1. Go to [app.supabase.com](https://app.supabase.com) → New project
2. **Project Settings → API** — copy your `Project URL` and `anon public` key

### 3. Set up environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Run the database schema

Open **Supabase → SQL Editor** and paste + run the full contents of:

```
supabase_schema.sql
```

This creates all tables, RLS policies, and the auto-profile trigger.

### 5. Create the media storage bucket

In **Supabase → Storage → New bucket**:
- Name: `openplay-media`
- Public: ✅ enabled

Or run in SQL Editor:
```sql
insert into storage.buckets (id, name, public)
values ('openplay-media', 'openplay-media', true)
on conflict do nothing;
```

Add a storage policy so authenticated users can upload:
```sql
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (auth.role() = 'authenticated');

create policy "Media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'openplay-media');
```

### 6. Enable Google OAuth

1. **Supabase → Authentication → Providers → Google** → Enable
2. Add your OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
3. Add these to **Authorized redirect URIs** in Google Cloud:
   - `http://localhost:5173`
   - `https://your-production-domain.com`
4. Add both URLs to **Supabase → Auth → URL Configuration → Redirect URLs**

### 7. Run dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Bottom nav + page wrapper (5 tabs)
│   ├── LoadingScreen.jsx   # Branded splash screen
│   ├── PostCard.jsx        # Feed post card with likes/comments/media
│   └── UsernameSetup.jsx   # 2-step onboarding (username + location)
├── hooks/
│   └── useAuth.jsx         # Auth context, Google sign-in, profile fetch
├── lib/
│   └── supabase.js         # Client, SPORTS config, REGIONS/CITIES data
├── pages/
│   ├── LoginPage.jsx       # Google OAuth entry
│   ├── FeedPage.jsx        # Global feed with sport filter + realtime
│   ├── LogGamePage.jsx     # Match recorder with media upload
│   ├── LeaderboardPage.jsx # Rankings — National / Region / City
│   ├── EventsPage.jsx      # Browse + register events; host modal
│   └── ProfilePage.jsx     # Stats, per-sport win rates, edit profile
├── App.jsx                 # Router + auth guard + username check
├── main.jsx
└── index.css               # Tailwind + custom CSS tokens
supabase_schema.sql         # Full DB schema — run once in SQL Editor
```

---

## Database Schema

### Tables created by `supabase_schema.sql`

| Table | Purpose |
|---|---|
| `users` | Mirrors `auth.users`, adds username / city / region / bio |
| `games` | Individual match records with sport, score, result, location |
| `posts` | Feed posts — linked to a game, optional media (images/video) |
| `likes` | Post reactions (unique per user per post) |
| `comments` | Post comments |
| `events` | Tournaments, open play sessions, clinics |
| `event_registrations` | Join/leave event registrations |

---

## Adding More Cities / Regions

Edit `src/lib/supabase.js` — extend `REGIONS` and `CITIES_BY_REGION`:

```js
export const REGIONS = [
  { id: 'NCR', label: 'NCR (Metro Manila)' },
  // add more...
]

export const CITIES_BY_REGION = {
  NCR: ['Manila', 'Quezon City', ...],
  // add more...
}
```

---

## Deploy to Vercel

```bash
npm run build
# push to GitHub, connect repo in vercel.com
# add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as Environment Variables
```

The included `vercel.json` handles SPA routing automatically.

---

## Roadmap

- [ ] Head-to-head rival tracking
- [ ] Push notifications (match challenges, event reminders)
- [ ] Club / group sessions
- [ ] GPS court finder
- [ ] Match video trimming / highlight reels
- [ ] Skill rating system (ELO-based)
- [ ] Tournament bracket management
