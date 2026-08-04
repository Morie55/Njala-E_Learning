import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import { upload } from '../lib/multer.js'
import { uploadToBlob } from '../lib/vercelBlob.js'
import Material from '../models/Material.js'
import Course from '../models/Course.js'
import multer from 'multer'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** Custom middleware to handle Multer upload errors cleanly */
function handleUploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size exceeds the 100 MB limit for direct uploads. Please compress the file or use an External Link (YouTube/Vimeo/Drive) for larger video files.',
        })
      }
      return res.status(400).json({ error: err.message || 'File upload error' })
    }
    next()
  })
}

/** POST /api/v1/materials [lecturer] – multipart file upload */
router.post('/', ...auth, handleUploadMiddleware, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { courseId, title, type } = req.body
    if (!courseId || !title || !type) return res.status(400).json({ error: 'courseId, title, type are required' })

    const course = await Course.findById(courseId).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const isOwner = course.lecturerId.toString() === _id.toString()
    if (!isOwner && !['dept_head', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'You do not own this course' })
    }

    let fileUrl = req.body.url ?? ''
    if (req.file) {
      fileUrl = await uploadToBlob(req.file.buffer, req.file.originalname, { folder: 'nelms/materials' })
    }
    if (!fileUrl) return res.status(400).json({ error: 'A file or URL is required' })

    const material = await Material.create({ courseId, title, type, fileUrl, uploadedBy: _id })
    res.status(201).json(material)
  } catch (err) {
    next(err)
  }
})

export default router
