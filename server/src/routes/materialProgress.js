import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import MaterialProgress from '../models/MaterialProgress.js'
import Material from '../models/Material.js'
import Enrollment from '../models/Enrollment.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/**
 * POST /api/v1/materials/progress/:id/complete  [student]
 * Mark a material as completed for the authenticated student.
 */
router.post('/:id/complete', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const material = await Material.findById(req.params.id).lean()
    if (!material) return res.status(404).json({ error: 'Material not found' })

    // Verify enrollment
    const enrolled = await Enrollment.exists({ courseId: material.courseId, studentId: req.dbUser._id, status: 'active' })
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this course' })

    const progress = await MaterialProgress.findOneAndUpdate(
      { studentId: req.dbUser._id, materialId: req.params.id },
      { $setOnInsert: { courseId: material.courseId, completedAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    )
    res.json({ progress })
  } catch (err) { next(err) }
})

/**
 * DELETE /api/v1/materials/progress/:id/complete  [student]
 * Unmark a material (toggle off).
 */
router.delete('/:id/complete', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    await MaterialProgress.deleteOne({ studentId: req.dbUser._id, materialId: req.params.id })
    res.json({ success: true })
  } catch (err) { next(err) }
})

/**
 * GET /api/v1/materials/progress/:courseId  [student]
 * Return all completed materialIds for this student in the given course.
 */
router.get('/:courseId', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const completed = await MaterialProgress.find({
      studentId: req.dbUser._id,
      courseId: req.params.courseId,
    }).select('materialId completedAt').lean()
    res.json({ completed })
  } catch (err) { next(err) }
})

export default router
