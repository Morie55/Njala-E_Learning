import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Uploads a file buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {object} options - folder, resource_type, etc.
 * @returns {Promise<string>} Secure URL
 */
export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'nelms', resource_type: 'auto', ...options },
      (error, result) => {
        if (error) return reject(new Error(error.message))
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}
