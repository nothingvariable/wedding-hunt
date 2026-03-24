import { NextRequest } from 'next/server'
import { query } from '@/db/client'

export interface Participant {
  id: number
  name: string
  team: string
  session_token: string
  created_at: string
}

export async function getParticipantFromRequest(
  request: NextRequest
): Promise<Participant | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7).trim()
  if (!token) return null

  try {
    const result = await query<Participant>(
      'SELECT id, name, team, session_token, created_at FROM participants WHERE session_token = $1',
      [token]
    )
    return result.rows[0] ?? null
  } catch {
    return null
  }
}
