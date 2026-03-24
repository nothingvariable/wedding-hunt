import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PHOTO_DIR } from '@/lib/photos'

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const { filename } = params

  // Sanitize filename to prevent path traversal
  const sanitized = path.basename(filename)
  if (!sanitized || sanitized !== filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const filePath = path.join(PHOTO_DIR, sanitized)

  try {
    const buffer = await fs.promises.readFile(filePath)
    const ext = path.extname(sanitized).toLowerCase()
    const contentType =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
        ? 'image/png'
        : ext === '.gif'
        ? 'image/gif'
        : ext === '.webp'
        ? 'image/webp'
        : 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }
}
