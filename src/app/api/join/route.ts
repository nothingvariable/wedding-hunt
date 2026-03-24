import { NextRequest, NextResponse } from 'next/server'
import { runMigrations } from '@/db/migrate'
import { query } from '@/db/client'

export async function POST(request: NextRequest) {
  await runMigrations()

  let body: { name?: string; team?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, team } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (team !== 'bride' && team !== 'groom') {
    return NextResponse.json({ error: 'Team must be bride or groom' }, { status: 400 })
  }

  const trimmedName = name.trim().slice(0, 100)

  const result = await query<{
    id: number
    name: string
    team: string
    session_token: string
  }>(
    'INSERT INTO participants (name, team) VALUES ($1, $2) RETURNING id, name, team, session_token',
    [trimmedName, team]
  )

  const participant = result.rows[0]

  return NextResponse.json({
    sessionToken: participant.session_token,
    participant: {
      id: participant.id,
      name: participant.name,
      team: participant.team,
    },
  })
}
