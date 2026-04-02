import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars. Check your .env.local file.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Sport config ────────────────────────────────────────────
export const SPORTS = [
  { id: 'badminton',   label: 'Badminton',    emoji: '🏸' },
  { id: 'pickleball',  label: 'Pickleball',   emoji: '🥒' },
  { id: 'tennis',      label: 'Tennis',       emoji: '🎾' },
  { id: 'tabletennis', label: 'Table Tennis', emoji: '🏓' },
]

export const SPORT_MAP = Object.fromEntries(SPORTS.map(s => [s.id, s]))

// ─── Location hierarchy (Philippines example — expand as needed)
export const REGIONS = [
  { id: 'NCR',     label: 'NCR (Metro Manila)' },
  { id: 'Region3', label: 'Central Luzon' },
  { id: 'Region4', label: 'CALABARZON' },
  { id: 'Region7', label: 'Central Visayas' },
  { id: 'Region11',label: 'Davao Region' },
]

export const CITIES_BY_REGION = {
  NCR:      ['Manila','Quezon City','Makati','Pasig','Taguig','Mandaluyong','Marikina','Muntinlupa'],
  Region3:  ['Angeles','San Fernando','Olongapo','Malolos','Meycauayan'],
  Region4:  ['Antipolo','Calamba','Santa Rosa','Bacoor','Dasmariñas','Imus'],
  Region7:  ['Cebu City','Mandaue','Lapu-Lapu','Talisay','Carcar'],
  Region11: ['Davao City','Tagum','Digos','Panabo'],
}
