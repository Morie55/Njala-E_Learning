// Vercel Blob storage helper — replaces Cloudinary
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

/**
 * Uploads a file buffer to Vercel Blob.
 * @param {Buffer} buffer      - File buffer from multer memoryStorage
 * @param {string} originalname - Original filename (used to preserve extension)
 * @param {{ folder?: string }} options
 * @returns {Promise<string>} Public URL of the stored blob
 */
export async function uploadToBlob(buffer, originalname, options = {}) {
  const ext = path.extname(originalname || '')
  const folder = options.folder ? `${options.folder}/` : ''
  const pathname = `${folder}${uuidv4()}${ext}`

  const blob = await put(pathname, buffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return blob.url
}
