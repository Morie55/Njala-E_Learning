import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import { upload } from '../lib/multer.js'
import { uploadToBlob } from '../lib/vercelBlob.js'
import Submission from '../models/Submission.js'
import Assignment from '../models/Assignment.js'
import Enrollment from '../models/Enrollment.js'
import { uploadRateLimiter } from '../middleware/rateLimiter.js'
import { fileTypeFromBuffer } from 'file-type'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'text/plain',
])
const MAX_FILE_SIZE_MB = 50

/** POST /api/v1/assignments/:id/submissions  [student] – submit assignment */
router.post('/:id/submissions', ...auth, uploadRateLimiter, upload.single('file'), async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const assignment = await Assignment.findById(req.params.id).lean()
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    const enrolled = await Enrollment.exists({ courseId: assignment.courseId, studentId: req.dbUser._id, status: 'active' })
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this course' })

    let fileUrl = ''
    if (req.file) {
      // Validate file size
      const sizeMB = req.file.size / (1024 * 1024)
      if (sizeMB > MAX_FILE_SIZE_MB) {
        return res.status(400).json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` })
      }
      // Detect actual MIME from buffer (ignores spoofed extensions)
      const detected = await fileTypeFromBuffer(req.file.buffer)
      const mime = detected?.mime ?? req.file.mimetype
      if (!ALLOWED_MIMES.has(mime)) {
        return res.status(400).json({
          error: `File type "${detected?.ext ?? 'unknown'}" is not allowed. Accepted: PDF, Word, PowerPoint, Excel, ZIP, images, video.`,
        })
      }
      fileUrl = await uploadToBlob(req.file.buffer, req.file.originalname, { folder: 'nelms/submissions' })
    }

    const now = new Date()
    let isLate = false
    let daysLate = 0

    if (assignment.dueDate) {
      const due = new Date(assignment.dueDate)
      if (now > due) {
        isLate = true
        const diffMs = now.getTime() - due.getTime()
        daysLate = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      }
    }

    const textContent = req.body.textContent ?? ''

    if (!fileUrl && !textContent.trim()) {
      return res.status(400).json({ error: 'Please provide either a file upload or text submission.' })
    }

    // Upsert: only set score/feedback/gradedBy/gradedAt on INSERT (first submission).
    // On resubmit, preserve any existing grade the lecturer already entered.
    const submission = await Submission.findOneAndUpdate(
      { assignmentId: req.params.id, studentId: req.dbUser._id },
      {
        $set: { fileUrl, textContent: textContent.trim(), submittedAt: now, isLate, daysLate },
        $setOnInsert: { score: null, feedback: '', gradedBy: null, gradedAt: null },
      },
      { upsert: true, returnDocument: 'after' }
    )
    res.status(201).json(submission)
  } catch (err) { next(err) }
})

export default router
