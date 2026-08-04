import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

/**
 * Uploads a file buffer to Vercel Blob if BLOB_READ_WRITE_TOKEN is configured,
 * otherwise saves locally to the /uploads directory.
 * @param {Buffer} buffer      - File buffer from multer memoryStorage
 * @param {string} originalname - Original filename (used to preserve extension)
 * @param {{ folder?: string }} options
 * @returns {Promise<string>} Public URL of the stored file/blob
 */
export async function uploadToBlob(buffer, originalname, options = {}) {
  const ext = path.extname(originalname || '')
  const filename = `${uuidv4()}${ext}`
  const folder = options.folder ? `${options.folder}/` : ''

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const pathname = `${folder}${filename}`
      const blob = await put(pathname, buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      return blob.url
    } catch (err) {
      console.warn('[uploadToBlob] Vercel Blob upload failed, falling back to local storage:', err.message)
    }
  }

  // Local fallback storage
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const filePath = path.join(uploadsDir, filename)
  await fs.promises.writeFile(filePath, buffer)

  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4000}`
  return `${serverUrl}/uploads/${filename}`
}
