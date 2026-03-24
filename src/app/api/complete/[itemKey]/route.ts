import { NextRequest, NextResponse } from 'next/server'
import { runMigrations } from '@/db/migrate'
import { getParticipantFromRequest } from '@/lib/auth'
import { query } from '@/db/client'
import { getItemByKey, CompletionRow } from '@/lib/scores'
import { savePhoto, deletePhoto, MAX_UPLOAD_SIZE } from '@/lib/photos'

export async function POST(
  request: NextRequest,
  { params }: { params: { itemKey: string } }
) {
  await runMigrations()

  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { itemKey } = params
  const item = getItemByKey(itemKey)
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const bonusParam = new URL(request.url).searchParams.get('bonus')
  const bonusAwarded = bonusParam === 'true'

  let photoFilename: string | null = null

  if (item.proofType === 'photo') {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
    }

    const photoFile = formData.get('photo')
    if (!photoFile || !(photoFile instanceof Blob)) {
      return NextResponse.json({ error: 'Photo is required for this item' }, { status: 400 })
    }

    if (photoFile.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `Photo exceeds max size of ${MAX_UPLOAD_SIZE} bytes` },
        { status: 413 }
      )
    }

    const mimeType = photoFile.type || 'image/jpeg'
    const timestamp = Date.now()
    photoFilename = `${participant.team}-${participant.id}-${itemKey}-${timestamp}.jpg`

    const buffer = Buffer.from(await photoFile.arrayBuffer())
    await savePhoto(buffer, mimeType, photoFilename)
  }

  // Check if already completed — upsert
  const existing = await query<CompletionRow>(
    'SELECT id, photo_filename FROM completions WHERE participant_id = $1 AND item_key = $2',
    [participant.id, itemKey]
  )

  let completion: CompletionRow

  if (existing.rows.length > 0) {
    const oldFilename = existing.rows[0].photo_filename
    if (oldFilename && photoFilename && oldFilename !== photoFilename) {
      await deletePhoto(oldFilename)
    }

    const result = await query<CompletionRow>(
      `UPDATE completions
       SET photo_filename = COALESCE($1, photo_filename),
           bonus_awarded = $2,
           completed_at = NOW()
       WHERE participant_id = $3 AND item_key = $4
       RETURNING id, participant_id, item_key, photo_filename, bonus_awarded, completed_at`,
      [photoFilename, bonusAwarded, participant.id, itemKey]
    )
    completion = result.rows[0]
  } else {
    const result = await query<CompletionRow>(
      `INSERT INTO completions (participant_id, item_key, photo_filename, bonus_awarded)
       VALUES ($1, $2, $3, $4)
       RETURNING id, participant_id, item_key, photo_filename, bonus_awarded, completed_at`,
      [participant.id, itemKey, photoFilename, bonusAwarded]
    )
    completion = result.rows[0]
  }

  return NextResponse.json({ completion })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemKey: string } }
) {
  await runMigrations()

  const participant = await getParticipantFromRequest(request)
  if (!participant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { itemKey } = params

  const existing = await query<{ photo_filename: string | null }>(
    'SELECT photo_filename FROM completions WHERE participant_id = $1 AND item_key = $2',
    [participant.id, itemKey]
  )

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: 'Completion not found' }, { status: 404 })
  }

  const filename = existing.rows[0].photo_filename
  if (filename) {
    await deletePhoto(filename)
  }

  await query(
    'DELETE FROM completions WHERE participant_id = $1 AND item_key = $2',
    [participant.id, itemKey]
  )

  return NextResponse.json({ success: true })
}
