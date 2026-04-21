import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '🚨 Missing Supabase environment variables.\n' +
    'Create a .env.local file with:\n' +
    '  VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE\n\n' +
    'Get these from: https://app.supabase.com → Project Settings → API'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'openplay-auth',
    detectSessionInUrl: true,
    flowType: 'pkce', // Fix: PKCE required for Safari/iOS OAuth compatibility
  },
})

// ─── Sport config ─────────────────────────────────────────────
// IMPORTANT: these IDs must match the CHECK constraint in your DB:
// sport in ('badminton','pickleball','tennis','tabletennis')
export const SPORTS = [
  { id: 'badminton',   label: 'Badminton',    emoji: '🏸' },
  { id: 'pickleball',  label: 'Pickleball',   emoji: '🥒' },
  { id: 'tennis',      label: 'Tennis',       emoji: '🎾' },
  { id: 'tabletennis', label: 'Table Tennis', emoji: '🏓' },
]

export const SPORT_MAP = Object.fromEntries(SPORTS.map(s => [s.id, s]))
