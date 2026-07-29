import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import Assignment from '../models/Assignment.js'
import Enrollment from '../models/Enrollment.js'

const router = Router()
const auth = [requireAuth, populateUser]

/** GET /api/v1/assignments – list all assignments for user (with submission status) */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const { role, _id } = req.dbUser
    let assignments = []
    if (role === 'student') {
      const enrollments = await Enrollment.find({ studentId: _id, status: 'active' }).lean()
      const courseIds = enrollments.map(e => e.courseId)
      const list = await Assignment.find({ courseId: { $in: courseIds } })
        .sort({ dueDate: 1 })
        .populate('courseId', 'code title')
        .lean()

      const { default: Submission } = await import('../models/Submission.js')
      const submissions = await Submission.find({ studentId: _id, assignmentId: { $in: list.map(a => a._id) } }).lean()

      assignments = list.map(a => {
        const sub = submissions.find(s => s.assignmentId.toString() === a._id.toString())
        return {
          ...a,
          courseCode: a.courseId?.code,
          courseTitle: a.courseId?.title,
          submission: sub ? {
            _id: sub._id,
            submittedAt: sub.submittedAt,
            score: sub.score,
            feedback: sub.feedback,
            fileUrl: sub.fileUrl,
          } : null,
        }
      })
    } else {
      assignments = await Assignment.find({ createdBy: _id })
        .sort({ dueDate: 1 })
        .populate('courseId', 'code title')
        .lean()
      assignments = assignments.map(a => ({
        ...a,
        courseCode: a.courseId?.code,
        courseTitle: a.courseId?.title,
      }))
    }
    res.json({ assignments })
  } catch (err) { next(err) }
})

/** GET /api/v1/assignments/upcoming  – upcoming assignments for enrolled courses */
router.get('/upcoming', ...auth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const enrollments = await Enrollment.find({ studentId: req.dbUser._id, status: 'active' }).lean()
    const courseIds = enrollments.map(e => e.courseId)
    const assignments = await Assignment.find({ courseId: { $in: courseIds }, dueDate: { $gte: new Date() } })
      .sort({ dueDate: 1 }).limit(limit).populate('courseId', 'code').lean()
    const enriched = assignments.map(a => ({ ...a, courseCode: a.courseId?.code }))
    res.json({ assignments: enriched })
  } catch (err) { next(err) }
})

/** GET /api/v1/assignments/:id/submissions  [lecturer/admin] */
router.get('/:id/submissions', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { default: Submission } = await import('../models/Submission.js')
    const { default: Course } = await import('../models/Course.js')
    const assignment = await Assignment.findById(req.params.id).lean()
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    // Verify the requesting lecturer owns the course (dept_head and admin may bypass)
    if (role === 'lecturer') {
      const course = await Course.findById(assignment.courseId).lean()
      if (!course || course.lecturerId.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'You do not own this course' })
      }
    }

    const submissions = await Submission.find({ assignmentId: req.params.id }).populate('studentId', 'fullName email').lean()
    const enriched = submissions.map(s => ({ ...s, studentName: s.studentId?.fullName, studentEmail: s.studentId?.email }))
    res.json({ assignment, submissions: enriched })
  } catch (err) { next(err) }
})

export default router
