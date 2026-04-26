/**
 * OpenPlay — ELO Rating Engine
 * ─────────────────────────────
 * Standard ELO with sport-aware K-factors and skill tier mapping.
 *
 * Column names match supabase_schema.sql elo_history table:
 *   rating_before, rating_after, rating_delta  (NOT elo_before/elo_after/elo_delta)
 */

import { supabase } from './supabase'

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_ELO = 1000

const K_FACTOR = {
  new:         32,
  developing:  24,
  established: 16,
}

const SKILL_TIERS = [
  { name: 'Diamond',  minElo: 1800 },
  { name: 'Platinum', minElo: 1500 },
  { name: 'Gold',     minElo: 1300 },
  { name: 'Silver',   minElo: 1100 },
  { name: 'Bronze',   minElo: 0    },
]

// ─── Core ELO Math ───────────────────────────────────────────────────────────

function expectedScore(playerElo, opponentElo) {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
}

function calculateNewElo(currentElo, opponentElo, actualScore, gamesPlayed) {
  const k = gamesPlayed < 20
    ? K_FACTOR.new
    : gamesPlayed < 50
    ? K_FACTOR.developing
    : K_FACTOR.established

  const expected = expectedScore(currentElo, opponentElo)
  const delta    = Math.round(k * (actualScore - expected))
  const newElo   = Math.max(100, currentElo + delta)

  return { newElo, delta }
}

function getSkillTier(elo) {
  for (const tier of SKILL_TIERS) {
    if (elo >= tier.minElo) return tier.name
  }
  return 'Bronze'
}

function teamAverageElo(teamPlayers) {
  if (!teamPlayers.length) return DEFAULT_ELO
  const total = teamPlayers.reduce((sum, p) => sum + (p.elo_rating ?? DEFAULT_ELO), 0)
  return Math.round(total / teamPlayers.length)
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Process ELO updates for a completed match.
 * Writes to elo_history using the correct column names from supabase_schema.sql:
 *   rating_before, rating_after, rating_delta  (not elo_before/elo_after/elo_delta)
 */
export async function processMatchElo({ matchId, sport, players, winningTeam }) {
  try {
    if (!matchId || !sport || !players?.length || !winningTeam) {
      throw new Error('processMatchElo: missing required parameters')
    }

    const teamA = players.filter(p => p.teamId === 'A')
    const teamB = players.filter(p => p.teamId === 'B')

    if (!teamA.length || !teamB.length) {
      throw new Error('processMatchElo: both teams must have at least one player')
    }

    // ── 1. Fetch current ELO + win count for all players ──────────────────
    const userIds = players.map(p => p.userId)

    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, elo_rating, total_wins')
      .in('id', userIds)

    if (fetchError) throw fetchError

    const userMap = {}
    for (const u of userData) {
      userMap[u.id] = {
        elo_rating: u.elo_rating ?? DEFAULT_ELO,
        total_wins: u.total_wins ?? 0,
      }
    }

    // ── 2. Calculate average team ELOs ────────────────────────────────────
    const teamAPlayers = teamA.map(p => ({ ...p, ...userMap[p.userId] }))
    const teamBPlayers = teamB.map(p => ({ ...p, ...userMap[p.userId] }))

    const avgEloA = teamAverageElo(teamAPlayers)
    const avgEloB = teamAverageElo(teamBPlayers)

    // ── 3. Calculate new ELO for every player ─────────────────────────────
    const updatedRatings = []

    const allTeams = [
      { team: teamAPlayers, teamId: 'A', opponentAvgElo: avgEloB },
      { team: teamBPlayers, teamId: 'B', opponentAvgElo: avgEloA },
    ]

    for (const { team, teamId, opponentAvgElo } of allTeams) {
      const isWinner    = teamId === winningTeam
      const actualScore = isWinner ? 1 : 0
      const result      = isWinner ? 'win' : 'loss'

      for (const player of team) {
        const currentElo  = player.elo_rating ?? DEFAULT_ELO
        const gamesPlayed = (player.total_wins ?? 0) * 2
        const opponentId  = team.length === 1
          ? (teamId === 'A' ? teamBPlayers[0]?.userId : teamAPlayers[0]?.userId)
          : null

        const { newElo, delta } = calculateNewElo(
          currentElo,
          opponentAvgElo,
          actualScore,
          gamesPlayed,
        )

        const newTier = getSkillTier(newElo)

        updatedRatings.push({
          userId:     player.userId,
          teamId,
          result,
          eloBefore:  currentElo,
          eloAfter:   newElo,
          delta,
          skillTier:  newTier,
          opponentId,
        })
      }
    }

    // ── 4. Persist updates ────────────────────────────────────────────────
    const userUpdates = updatedRatings.map(r =>
      supabase
        .from('users')
        .update({
          elo_rating: r.eloAfter,
          skill_tier: r.skillTier,
          ...(r.result === 'win'
            ? { total_wins: (userMap[r.userId]?.total_wins ?? 0) + 1 }
            : {}
          ),
        })
        .eq('id', r.userId)
    )

    // ── KEY FIX: use rating_before / rating_after / rating_delta ──────────
    // These match the actual column names in supabase_schema.sql elo_history table.
    const eloHistoryInserts = supabase
      .from('elo_history')
      .insert(
        updatedRatings.map(r => ({
          user_id:       r.userId,
          game_id:       matchId,
          sport,
          rating_before: r.eloBefore,   // ← was elo_before (wrong)
          rating_after:  r.eloAfter,    // ← was elo_after  (wrong)
          rating_delta:  r.delta,       // ← was elo_delta   (wrong)
          result:        r.result,
          opponent_id:   r.opponentId ?? null,
          created_at:    new Date().toISOString(),
        }))
      )

    const results = await Promise.all([...userUpdates, eloHistoryInserts])

    const writeErrors = results.map(r => r.error).filter(Boolean)

    if (writeErrors.length > 0) {
      console.error('ELO write errors:', writeErrors)
      return {
        success:        false,
        updatedRatings,
        error: writeErrors.map(e => e.message).join('; '),
      }
    }

    return { success: true, updatedRatings }

  } catch (err) {
    console.error('processMatchElo error:', err)
    return { success: false, updatedRatings: [], error: err.message }
  }
}

/**
 * Fetch a player's ELO history for a sparkline chart.
 * Uses rating_before / rating_after to match the DB schema.
 */
export async function fetchEloHistory(userId, sport = null, limit = 20) {
  let query = supabase
    .from('elo_history')
    .select('rating_before, rating_after, rating_delta, result, sport, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sport) query = query.eq('sport', sport)

  const { data, error } = await query
  if (error) {
    console.error('fetchEloHistory error:', error)
    return []
  }

  // Map to the shape EloSparkline expects (elo_after)
  return (data || []).reverse().map(row => ({
    ...row,
    elo_after:  row.rating_after,
    elo_before: row.rating_before,
    elo_delta:  row.rating_delta,
  }))
}

export async function getPlayerElo(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('elo_rating, skill_tier')
    .eq('id', userId)
    .single()

  if (error || !data) return { elo_rating: DEFAULT_ELO, skill_tier: 'Bronze' }
  return data
}

export { getSkillTier, expectedScore, DEFAULT_ELO, SKILL_TIERS, K_FACTOR }
