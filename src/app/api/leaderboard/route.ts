import { NextRequest, NextResponse } from 'next/server'
import { runMigrations } from '@/db/migrate'
import { query } from '@/db/client'
import { calculateScore, CompletionRow } from '@/lib/scores'

interface ParticipantRow {
  id: number
  name: string
  team: string
}

interface CompletionWithTeam extends CompletionRow {
  team: string
  participant_name: string
}

export async function GET(_request: NextRequest) {
  await runMigrations()

  // Get all participants
  const participantsResult = await query<ParticipantRow>(
    'SELECT id, name, team FROM participants ORDER BY id'
  )
  const participants = participantsResult.rows

  // Get all completions with participant info
  const completionsResult = await query<CompletionWithTeam>(
    `SELECT c.id, c.participant_id, c.item_key, c.photo_filename, c.bonus_awarded, c.completed_at,
            p.team, p.name as participant_name
     FROM completions c
     JOIN participants p ON p.id = c.participant_id`
  )
  const allCompletions = completionsResult.rows

  // Group completions by participant
  const completionsByParticipant = new Map<number, CompletionRow[]>()
  for (const c of allCompletions) {
    if (!completionsByParticipant.has(c.participant_id)) {
      completionsByParticipant.set(c.participant_id, [])
    }
    completionsByParticipant.get(c.participant_id)!.push(c)
  }

  // Calculate individual scores
  const individuals = participants.map((p) => {
    const completions = completionsByParticipant.get(p.id) ?? []
    const score = calculateScore(completions)
    return {
      id: p.id,
      name: p.name,
      team: p.team,
      score,
      itemCount: completions.length,
    }
  })

  // Sort individuals by score descending
  individuals.sort((a, b) => b.score - a.score)

  // Calculate team scores
  const teamScores: Record<string, { score: number; itemCount: number }> = {
    bride: { score: 0, itemCount: 0 },
    groom: { score: 0, itemCount: 0 },
  }

  for (const ind of individuals) {
    if (ind.team in teamScores) {
      teamScores[ind.team].score += ind.score
      teamScores[ind.team].itemCount += ind.itemCount
    }
  }

  return NextResponse.json({
    teams: teamScores,
    individuals,
  })
}
