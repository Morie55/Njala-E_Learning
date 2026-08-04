import multer from 'multer'

// Store files in memory so we can pipe the buffer to Cloudinary
const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB limit for course material & video uploads
  fileFilter: (_req, file, cb) => {
    const allowedDocTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
      'application/x-zip-compressed',
    ]

    if (
      allowedDocTypes.includes(file.mimetype) ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('image/')
    ) {
      return cb(null, true)
    }

    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: PDF, PPT, PPTX, DOC, DOCX, ZIP, MP4, WEBM, MOV, MP3.`))
  },
})
