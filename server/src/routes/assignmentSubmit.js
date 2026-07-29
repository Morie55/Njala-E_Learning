import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { upload } from '../lib/multer.js'
import { uploadToCloudinary } from '../lib/cloudinary.js'
import Submission from '../models/Submission.js'
import Assignment from '../models/Assignment.js'
import Enrollment from '../models/Enrollment.js'

import { uploadRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()
const auth = [requireAuth, populateUser]

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
      fileUrl = await uploadToCloudinary(req.file.buffer, { folder: 'nelms/submissions' })
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

    const submission = await Submission.findOneAndUpdate(
      { assignmentId: req.params.id, studentId: req.dbUser._id },
      { fileUrl, submittedAt: now, score: null, feedback: '', isLate, daysLate },
      { upsert: true, returnDocument: 'after' }
    )
    res.status(201).json(submission)
  } catch (err) { next(err) }
})

export default router
