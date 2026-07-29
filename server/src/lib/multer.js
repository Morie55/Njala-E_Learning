import multer from 'multer'

// Store files in memory so we can pipe the buffer to Cloudinary
const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB limit for direct document uploads
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ]
    if (allowed.includes(file.mimetype)) {
      return cb(null, true)
    }
    if (file.mimetype.startsWith('video/')) {
      return cb(new Error('Direct video file uploads are disabled to conserve bandwidth. Please select External Link to share YouTube, Vimeo, or Google Drive video links.'))
    }
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: PDF, PPT, PPTX, DOC, DOCX, ZIP.`))
  },
})
