/**
 * OpenPlay — ELO Rating Engine
 * ─────────────────────────────
 * Standard ELO with sport-aware K-factors and skill tier mapping.
 * Designed to slot into the existing LogGamePage match flow.
 *
 * Usage:
 *   import { processMatchElo } from '../lib/eloEngine'
 *
 *   await processMatchElo({
 *     matchId:     game.id,
 *     sport:       'badminton',
 *     players: [
 *       { userId: 'abc', teamId: 'A' },
 *       { userId: 'xyz', teamId: 'B' },
 *     ],
 *     winningTeam: 'A',
 *   })
 */

import { supabase } from './supabase'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Starting ELO for new players */
const DEFAULT_ELO = 1000

/**
 * K-factor: controls how much a single match can shift your rating.
 * Higher K = more volatile (new players), lower K = more stable (veterans).
 */
const K_FACTOR = {
  new:         32,  // < 20 ranked games
  developing:  24,  // 20–49 ranked games
  established: 16,  // 50+ ranked games
}

/**
 * Skill tier thresholds.
 * Players start at 1000 (Silver boundary).
 * Order matters — checked top to bottom.
 */
const SKILL_TIERS = [
  { name: 'Diamond',  minElo: 1800 },
  { name: 'Platinum', minElo: 1500 },
  { name: 'Gold',     minElo: 1300 },
  { name: 'Silver',   minElo: 1100 },
  { name: 'Bronze',   minElo: 0    },
]

// ─── Core ELO Math ───────────────────────────────────────────────────────────

/**
 * Calculate the expected score (win probability) for a player.
 * Standard ELO formula: E = 1 / (1 + 10^((opponent_elo - player_elo) / 400))
 */
function expectedScore(playerElo, opponentElo) {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
}

/**
 * Calculate new ELO after a match.
 * @param {number} currentElo    - Player's ELO before the match
 * @param {number} opponentElo   - Opponent's ELO before the match
 * @param {number} actualScore   - 1 for win, 0 for loss
 * @param {number} gamesPlayed   - Total ranked games played (for K-factor)
 * @returns {{ newElo: number, delta: number }}
 */
function calculateNewElo(currentElo, opponentElo, actualScore, gamesPlayed) {
  const k = gamesPlayed < 20
    ? K_FACTOR.new
    : gamesPlayed < 50
    ? K_FACTOR.developing
    : K_FACTOR.established

  const expected = expectedScore(currentElo, opponentElo)
  const delta    = Math.round(k * (actualScore - expected))
  // Floor at 100 to prevent humiliating new players
  const newElo   = Math.max(100, currentElo + delta)

  return { newElo, delta }
}

/**
 * Determine skill tier from ELO rating.
 * @param {number} elo
 * @returns {string} tier name
 */
function getSkillTier(elo) {
  for (const tier of SKILL_TIERS) {
    if (elo >= tier.minElo) return tier.name
  }
  return 'Bronze'
}

// ─── Team ELO Helpers ────────────────────────────────────────────────────────

/**
 * Calculate the average ELO for a team.
 * @param {Array<{ elo_rating: number }>} teamPlayers
 * @returns {number}
 */
function teamAverageElo(teamPlayers) {
  if (!teamPlayers.length) return DEFAULT_ELO
  const total = teamPlayers.reduce((sum, p) => sum + (p.elo_rating ?? DEFAULT_ELO), 0)
  return Math.round(total / teamPlayers.length)
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Process ELO updates for a completed match.
 *
 * @param {Object} params
 * @param {string} params.matchId         - The game UUID from the `games` table
 * @param {string} params.sport           - Sport identifier ('badminton', etc.)
 * @param {Array}  params.players         - Array of { userId: string, teamId: 'A'|'B' }
 * @param {string} params.winningTeam     - 'A' or 'B'
 *
 * @returns {Promise<{
 *   success: boolean,
 *   updatedRatings: Array<{ userId, eloBefore, eloAfter, delta, skillTier }>,
 *   error?: string
 * }>}
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

    // ── 1. Fetch all players' current ELO + game count ────────────────────
    const userIds = players.map(p => p.userId)

    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('id, elo_rating, total_wins')
      .in('id', userIds)

    if (fetchError) throw fetchError

    // Build a lookup map: userId → { elo_rating, total_wins }
    const userMap = {}
    for (const u of userData) {
      userMap[u.id] = {
        elo_rating: u.elo_rating ?? DEFAULT_ELO,
        // total_wins approximates games played for K-factor (not perfect but avoids extra query)
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
        const currentElo   = player.elo_rating ?? DEFAULT_ELO
        const gamesPlayed  = (player.total_wins ?? 0) * 2  // rough estimate; wins * 2 ≈ total games
        const opponentId   = team.length === 1
          ? (teamId === 'A' ? teamBPlayers[0]?.userId : teamAPlayers[0]?.userId)
          : null  // for team matches, no single opponent

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

    // ── 4. Persist updates in parallel ────────────────────────────────────
    const userUpdates = updatedRatings.map(r =>
      supabase
        .from('users')
        .update({
          elo_rating:  r.eloAfter,
          skill_tier:  r.skillTier,
          // Increment wins if won — uses existing total_wins column
          ...(r.result === 'win'
            ? { total_wins: (userMap[r.userId]?.total_wins ?? 0) + 1 }
            : {}
          ),
        })
        .eq('id', r.userId)
    )

    const eloHistoryInserts = supabase
      .from('elo_history')
      .insert(
        updatedRatings.map(r => ({
          user_id:     r.userId,
          game_id:     matchId,
          sport,
          elo_before:  r.eloBefore,
          elo_after:   r.eloAfter,
          elo_delta:   r.delta,
          result:      r.result,
          opponent_id: r.opponentId ?? null,
          created_at:  new Date().toISOString(),
        }))
      )

    const results = await Promise.all([...userUpdates, eloHistoryInserts])

    // Check for errors in any of the parallel writes
    const writeErrors = results
      .map(r => r.error)
      .filter(Boolean)

    if (writeErrors.length > 0) {
      console.error('ELO write errors:', writeErrors)
      // Don't throw — match is already saved, ELO is best-effort
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
 * @param {string} userId
 * @param {string} [sport]   - Optional filter by sport
 * @param {number} [limit]   - Max entries to return (default 20)
 */
export async function fetchEloHistory(userId, sport = null, limit = 20) {
  let query = supabase
    .from('elo_history')
    .select('elo_before, elo_after, elo_delta, result, sport, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sport) query = query.eq('sport', sport)

  const { data, error } = await query
  if (error) {
    console.error('fetchEloHistory error:', error)
    return []
  }

  // Return in chronological order for charting
  return (data || []).reverse()
}

/**
 * Get a player's current ELO for a quick display.
 * @param {string} userId
 * @returns {Promise<{ elo_rating: number, skill_tier: string }>}
 */
export async function getPlayerElo(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('elo_rating, skill_tier')
    .eq('id', userId)
    .single()

  if (error || !data) return { elo_rating: DEFAULT_ELO, skill_tier: 'Bronze' }
  return data
}

// ─── Utility Exports ─────────────────────────────────────────────────────────

export { getSkillTier, expectedScore, DEFAULT_ELO, SKILL_TIERS, K_FACTOR }
