# OpenPlay — Bug Fixes Applied

## Summary of all fixes in this patch

---

### 🔴 Fix 1: `ProfilePage.jsx` — Missing `MapPin` import (crash)
**File:** `src/pages/ProfilePage.jsx`  
**Problem:** `MapPin` was used in `MatchRow` and `PostRow` but never imported. This caused a runtime crash whenever the Profile page loaded.  
**Fix:** Added `MapPin` to the lucide-react import line.

---

### 🔴 Fix 2: `App.jsx` — Missing `/profile/:userId` route (silent 404)
**File:** `src/App.jsx`  
**Problem:** Clicking a user's avatar/name in the Feed navigated to `/user/:username`, but there was no corresponding route registered. Every tap silently fell through to `Navigate to="/"`.  
**Fix:** Added both `/profile/:userId` and `/user/:username` routes pointing to `PublicProfilePage`.

---

### 🔴 Fix 3: `PublicProfilePage.jsx` — Only supported UUID param, not username
**File:** `src/pages/PublicProfilePage.jsx`  
**Problem:** The page only read `useParams().userId` (UUID). When navigating via `/user/:username`, the query failed because it was looking up a username string in the UUID column.  
**Fix:** Page now reads both `userId` (UUID) and `username` params and branches the Supabase query accordingly.

---

### 🔴 Fix 4: `lib/supabase.js` — Credentials security + PKCE auth
**File:** `src/lib/supabase.js`  
**Problem:** Missing env vars would silently fall back to undefined, causing cryptic errors. Also missing `flowType: 'pkce'` required for Safari/iOS OAuth.  
**Fix:** Throws a clear error if env vars are missing. Added `flowType: 'pkce'` to auth config.

---

### 🟡 Fix 5: `LogGamePage.jsx` — Double-submit guard
**File:** `src/pages/LogGamePage.jsx`  
**Problem:** Tapping "Sync Game" twice quickly (common on mobile) could insert duplicate game + post records.  
**Fix:** Added `isSubmittingRef` guard that blocks re-entry while a submission is in flight.

---

### 🟡 Fix 6: `.gitignore` — Ensure credentials are never committed
**File:** `.gitignore`  
**Problem:** `.env.local` was in gitignore but the entry wasn't comprehensive — other `.env.*` variants could slip through.  
**Fix:** Explicit entries for `.env`, `.env.local`, `.env*.local`, `.env.production`, `.env.staging`.

---

### 🟡 Fix 7: `supabase_schema.sql` — Missing tables + wrong column names
**File:** `supabase_schema.sql`  
**Problem:** Several issues:
- `comment_likes` table missing (used in PostCard.jsx)
- `comment_replies` table missing (used in PostCard.jsx)  
- `notifications` table had `read` column but code uses `is_read`
- `posts` table missing `created_at` (only had `inserted_at`)
- `users` table missing `avatar_type` column
- Storage policies for delete were missing

**Fix:** Added all missing tables, migration-safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements, correct column names, storage delete policy, and performance indexes.

---

### 🟡 Fix 8: `useAuth.jsx` — Loading race condition (username modal flash)
**File:** `src/hooks/useAuth.jsx`  
**Problem:** The loading state was set to `false` before the profile fetch completed. For ~100–300ms, `loading=false` and `profile=null` were both true simultaneously, which triggered the username setup modal for existing users.  
**Fix:** `setLoading(false)` now only fires inside `fetchProfile`'s `finally` block, after the profile data is available.

---

### 🟡 Fix 9: `AuthCallback.jsx` — PKCE support for Safari/iOS
**File:** `src/pages/AuthCallback.jsx`  
**Problem:** Callback only handled the legacy implicit (hash-based) OAuth flow. Safari and modern iOS require PKCE (code-based) flow, which sends a `?code=` query param instead.  
**Fix:** Added `supabase.auth.exchangeCodeForSession(code)` branch for PKCE flow, with fallback to legacy hash flow.

---

### 🟢 Fix 10: `FeedPage.jsx` — Pagination stability + infinite scroll fix
**File:** `src/pages/FeedPage.jsx`  
**Problem:** `pageOffset` was included in `fetchFeed`'s `useCallback` deps, causing a new function reference on every page load and triggering infinite re-renders. Also the "end of feed" state wasn't shown.  
**Fix:** Removed `pageOffset` from deps (manages it via local variable instead). Added "You've seen it all" end state. Added fetch guard ref to prevent concurrent fetches.

---

## How to deploy

```bash
# 1. Ensure .env.local is configured
cp .env.example .env.local
# Edit .env.local with your real values

# 2. Run the deploy script
chmod +x deploy.sh
./deploy.sh "fix: apply audit fixes"

# 3. Set env vars in Vercel dashboard
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_GOOGLE_MAPS_KEY  (if using location features)
```

## Database migration

Run the updated `supabase_schema.sql` in your Supabase SQL Editor.  
It's safe to re-run — all statements use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`.
