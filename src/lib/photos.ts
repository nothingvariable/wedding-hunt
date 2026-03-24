import fs from 'fs'
import path from 'path'

export const PHOTO_DIR = process.env.PHOTO_DIR || '/data/photos'
export const MAX_UPLOAD_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10) // 10MB default

let photoDirEnsured = false

export function ensurePhotoDir(): void {
  if (photoDirEnsured) return
  if (!fs.existsSync(PHOTO_DIR)) {
    fs.mkdirSync(PHOTO_DIR, { recursive: true })
  }
  photoDirEnsured = true
}

export async function savePhoto(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<void> {
  ensurePhotoDir()

  const outputPath = path.join(PHOTO_DIR, filename)

  // Canvas already outputs JPEG — write directly, skip sharp
  await fs.promises.writeFile(outputPath, buffer)
}

export async function deletePhoto(filename: string): Promise<void> {
  const filePath = path.join(PHOTO_DIR, filename)
  try {
    await fs.promises.unlink(filePath)
  } catch {
    // File may not exist, ignore error
  }
}

export function getPhotoPath(filename: string): string {
  return path.join(PHOTO_DIR, filename)
}
