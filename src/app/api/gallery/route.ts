import { NextRequest, NextResponse } from 'next/server'
import { runMigrations } from '@/db/migrate'
import { getParticipantFromRequest } from '@/lib/auth'
import { query } from '@/db/client'
import { getItemByKey } from '@/lib/scores'

interface GalleryRow {
  photo_filename: string
  item_key: string
  completed_at: string
  participant_name: string
  team: string
}

export async function GET(request: NextRequest) {
  await runMigrations()

  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await query<GalleryRow>(
    `SELECT c.photo_filename, c.item_key, c.completed_at,
            p.name as participant_name, p.team
     FROM completions c
     JOIN participants p ON p.id = c.participant_id
     WHERE c.photo_filename IS NOT NULL
     ORDER BY c.completed_at DESC`
  )

  const photos = result.rows.map((row) => {
    const item = getItemByKey(row.item_key)
    return {
      filename: row.photo_filename,
      itemKey: row.item_key,
      itemTitle: item?.title ?? row.item_key,
      category: item?.category ?? 'unknown',
      completedAt: row.completed_at,
      participantName: row.participant_name,
      team: row.team,
    }
  })

  return NextResponse.json({ photos })
}
