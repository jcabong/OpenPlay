import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars. Check your .env.local file.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,      // keep session alive across page reloads
    autoRefreshToken: true,    // silently refresh token before it expires
    storageKey: 'openplay-auth', // consistent key so iOS PWA doesn't lose it on kill
    detectSessionInUrl: true,  // needed for OAuth (Google) callback to work
  },
})

// ─── Sport config ────────────────────────────────────────────
export const SPORTS = [
  { id: 'badminton',   label: 'Badminton',    emoji: '🏸' },
  { id: 'pickleball',  label: 'Pickleball',   emoji: '🥒' },
  { id: 'tennis',      label: 'Tennis',       emoji: '🎾' },
  { id: 'tabletennis', label: 'Table Tennis', emoji: '🏓' },
]

export const SPORT_MAP = Object.fromEntries(SPORTS.map(s => [s.id, s]))
