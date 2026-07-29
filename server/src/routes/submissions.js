import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import Submission from '../models/Submission.js'
import Assignment from '../models/Assignment.js'
import Course from '../models/Course.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { logAudit } from '../utils/auditLogger.js'

const router = Router()
const auth = [requireAuth, populateUser]

/** GET /api/v1/submissions/me  */
router.get('/me', ...auth, async (req, res, next) => {
  try {
    const subs = await Submission.find({ studentId: req.dbUser._id })
      .populate({ path: 'assignmentId', select: 'title maxScore courseId dueDate', populate: { path: 'courseId', select: 'code title' } })
      .sort({ submittedAt: -1 }).lean()
    const enriched = subs.map(s => ({
      ...s,
      assignmentTitle: s.assignmentId?.title,
      maxScore: s.assignmentId?.maxScore,
      dueDate: s.assignmentId?.dueDate,
      courseId: s.assignmentId?.courseId?._id?.toString() ?? null,
      courseCode: s.assignmentId?.courseId?.code,
      courseTitle: s.assignmentId?.courseId?.title,
    }))
    res.json({ submissions: enriched })
  } catch (err) { next(err) }
})

/** GET /api/v1/submissions/recent  [lecturer/dept_head/admin] */
router.get('/recent', ...auth, async (req, res, next) => {
  const { role, _id, schoolId } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const limit = parseInt(req.query.limit) || 10

    const courseFilter =
      role === 'admin'     ? {} :
      role === 'dept_head' ? (schoolId ? { schoolId } : { _id: { $in: [] } }) :
                             { lecturerId: _id }

    const courses = await Course.find(courseFilter).select('_id title').lean()
    const courseIds = courses.map(c => c._id)
    const assignments = await Assignment.find({ courseId: { $in: courseIds } }).select('_id title courseId').lean()
    const assignmentIds = assignments.map(a => a._id)

    const subs = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate('studentId', 'fullName').populate('assignmentId', 'title courseId').sort({ submittedAt: -1 }).limit(limit).lean()

    const enriched = subs.map(s => ({
      ...s,
      studentName: s.studentId?.fullName,
      assignmentTitle: s.assignmentId?.title,
      courseTitle: courses.find(c => c._id.toString() === s.assignmentId?.courseId?.toString())?.title,
    }))
    res.json({ submissions: enriched })
  } catch (err) { next(err) }
})

/** GET /api/v1/submissions/pending  [lecturer/dept_head/admin] */
router.get('/pending', ...auth, async (req, res, next) => {
  const { role, _id, schoolId } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const courseFilter =
      role === 'admin'     ? {} :
      role === 'dept_head' ? (schoolId ? { schoolId } : { _id: { $in: [] } }) :
                             { lecturerId: _id }

    const courses = await Course.find(courseFilter).lean()
    const results = await Promise.all(courses.map(async c => {
      const assignments = await Assignment.find({ courseId: c._id }).select('_id').lean()
      const count = await Submission.countDocuments({ assignmentId: { $in: assignments.map(a => a._id) }, score: null })
      return { courseId: c._id.toString(), courseTitle: c.title, count }
    }))
    res.json({ pending: results.filter(r => r.count > 0) })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/submissions/:id/grade  [lecturer/dept_head/admin] */
router.patch('/:id/grade', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const sub = await Submission.findById(req.params.id).populate('assignmentId', 'maxScore courseId')
    if (!sub) return res.status(404).json({ error: 'Submission not found' })

    // Lecturers may only grade submissions belonging to their own courses
    if (role === 'lecturer') {
      const course = await Course.findById(sub.assignmentId?.courseId).lean()
      if (!course || course.lecturerId.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'You do not own this course' })
      }
    }

    const max = sub.assignmentId?.maxScore ?? Infinity
    const score = Number(req.body.score)
    if (isNaN(score) || score < 0 || score > max) return res.status(400).json({ error: `Score must be between 0 and ${max}` })
    sub.score = score
    sub.feedback = req.body.feedback ?? ''
    sub.gradedBy = _id
    sub.gradedAt = new Date()
    await sub.save()

    // Populate student user to dispatch notification
    const student = await User.findById(sub.studentId).lean()
    if (student) {
      await Notification.create({
        recipientId: student.clerkId || student._id.toString(),
        senderId: req.auth.userId,
        title: 'Assignment Graded',
        message: `Your submission for "${sub.assignmentId?.title || 'Assignment'}" has been graded: ${score}/${max}`,
        type: 'grade',
        link: '/grades',
      })
    }

    await logAudit({
      req,
      action: 'GRADE_SUBMISSION',
      targetModel: 'Submission',
      targetId: sub._id.toString(),
      details: { score, maxScore: max, studentId: sub.studentId?.toString() },
    })

    res.json(sub)
  } catch (err) { next(err) }
})

export default router
