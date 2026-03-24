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

  // Dynamically import sharp to avoid issues at build time
  const sharp = (await import('sharp')).default

  const isHeic =
    mimeType === 'image/heic' ||
    mimeType === 'image/heif' ||
    filename.toLowerCase().endsWith('.heic') ||
    filename.toLowerCase().endsWith('.heif')

  const outputPath = path.join(PHOTO_DIR, filename)

  if (isHeic) {
    await sharp(buffer).jpeg({ quality: 85 }).toFile(outputPath)
  } else {
    await sharp(buffer).jpeg({ quality: 85 }).toFile(outputPath)
  }
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
