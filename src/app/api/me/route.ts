import { NextRequest, NextResponse } from 'next/server'
import { runMigrations } from '@/db/migrate'
import { getParticipantFromRequest } from '@/lib/auth'
import { query } from '@/db/client'
import { calculateScore, CompletionRow } from '@/lib/scores'

export async function GET(request: NextRequest) {
  await runMigrations()

  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const completionsResult = await query<CompletionRow>(
    'SELECT id, participant_id, item_key, photo_filename, bonus_awarded, completed_at FROM completions WHERE participant_id = $1 ORDER BY completed_at DESC',
    [participant.id]
  )

  const completions = completionsResult.rows
  const myScore = calculateScore(completions)

  // Get all completions for the team to calculate team score
  const teamCompletionsResult = await query<CompletionRow>(
    `SELECT c.id, c.participant_id, c.item_key, c.photo_filename, c.bonus_awarded, c.completed_at
     FROM completions c
     JOIN participants p ON p.id = c.participant_id
     WHERE p.team = $1`,
    [participant.team]
  )

  const teamScore = calculateScore(teamCompletionsResult.rows)

  return NextResponse.json({
    participant: {
      id: participant.id,
      name: participant.name,
      team: participant.team,
    },
    completions,
    myScore,
    teamScore,
  })
}
