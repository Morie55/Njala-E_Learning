import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import Department from '../models/Department.js'
import Course from '../models/Course.js'
import User from '../models/User.js'
import Enrollment from '../models/Enrollment.js'
import Assignment from '../models/Assignment.js'
import Submission from '../models/Submission.js'
import Announcement from '../models/Announcement.js'
import Notification from '../models/Notification.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** GET /api/v1/departments — optionally filter by ?schoolId=<id> */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const filter = req.query.schoolId ? { schoolId: req.query.schoolId } : {}
    const departments = await Department.find(filter).populate('schoolId', 'name code').lean()
    res.json({ departments })
  } catch (err) { next(err) }
})

/** POST /api/v1/departments [admin] */
router.post('/', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const { name, code, schoolId } = req.body
    if (!name || !code || !schoolId) {
      return res.status(400).json({ error: 'name, code, and schoolId are required' })
    }

    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      schoolId,
    })
    res.status(201).json(department)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'That department code already exists in this school.' })
    }
    next(err)
  }
})

/** DELETE /api/v1/departments/:id [admin] */
router.delete('/:id', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const inUse = await Course.exists({ departmentId: req.params.id })
    if (inUse) {
      return res.status(409).json({ error: 'Cannot delete a department with courses assigned to it' })
    }

    await Department.findByIdAndDelete(req.params.id)
    res.json({ message: 'Department deleted' })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// DEPT HEAD EXPANDED POWERS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/departments/oversight/workload [dept_head/admin] — Lecturer workload metrics */
router.get('/oversight/workload', ...auth, async (req, res, next) => {
  const { role, departmentId } = req.dbUser
  if (!['dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

  try {
    const targetDeptId = req.query.departmentId || departmentId
    const filter = targetDeptId ? { departmentId: targetDeptId, role: 'lecturer' } : { role: 'lecturer' }

    const lecturers = await User.find(filter).select('fullName email idNumber').lean()

    const workload = await Promise.all(
      lecturers.map(async (l) => {
        const courses = await Course.find({ lecturerId: l._id }).lean()
        const courseIds = courses.map(c => c._id)

        const [enrolledCount, assignmentCount] = await Promise.all([
          Enrollment.countDocuments({ courseId: { $in: courseIds }, status: 'active' }),
          Assignment.countDocuments({ courseId: { $in: courseIds } }),
        ])

        return {
          lecturer: l,
          courseCount: courses.length,
          courses: courses.map(c => ({ _id: c._id, title: c.title, code: c.code, status: c.status, approvalStatus: c.approvalStatus })),
          enrolledStudents: enrolledCount,
          totalAssignments: assignmentCount,
        }
      })
    )

    res.json({ workload })
  } catch (err) { next(err) }
})

/** GET /api/v1/departments/oversight/pending-courses [dept_head/admin] — Pending course approvals */
router.get('/oversight/pending-courses', ...auth, async (req, res, next) => {
  const { role, departmentId } = req.dbUser
  if (!['dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

  try {
    const filter = { approvalStatus: 'pending' }
    if (departmentId && role === 'dept_head') filter.departmentId = departmentId

    const courses = await Course.find(filter)
      .populate('lecturerId', 'fullName email')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ courses })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/departments/oversight/courses/:id/approval [dept_head/admin] — Approve or Reject course */
router.patch('/oversight/courses/:id/approval', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

  try {
    const { approvalStatus, rejectionReason } = req.body
    if (!['approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'approvalStatus must be approved or rejected' })
    }

    const course = await Course.findById(req.params.id)
    if (!course) return res.status(404).json({ error: 'Course not found' })

    course.approvalStatus = approvalStatus
    course.rejectionReason = approvalStatus === 'rejected' ? (rejectionReason || 'Does not meet curriculum criteria') : ''
    course.approvedBy = _id
    if (approvalStatus === 'approved') course.status = 'active'
    await course.save()

    // Notify the lecturer
    const lecturer = await User.findById(course.lecturerId).lean()
    if (lecturer) {
      await Notification.create({
        recipientId: lecturer.clerkId || lecturer._id.toString(),
        senderId: req.auth.userId,
        title: approvalStatus === 'approved' ? 'Course Approved! 🎉' : 'Course Approval Rejected ❌',
        message: approvalStatus === 'approved'
          ? `Your course "${course.title}" (${course.code}) has been approved and is now active.`
          : `Your course "${course.title}" was rejected: ${course.rejectionReason}`,
        type: 'info',
        link: '/courses',
      }).catch(() => {})
    }

    res.json({ course })
  } catch (err) { next(err) }
})

/** POST /api/v1/departments/oversight/announcements [dept_head/admin] — Post department-wide announcement */
router.post('/oversight/announcements', ...auth, async (req, res, next) => {
  const { role, _id, departmentId } = req.dbUser
  if (!['dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

  try {
    const { title, message, targetDeptId } = req.body
    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters' })
    }

    const deptId = targetDeptId || departmentId
    const announcement = await Announcement.create({
      title: title || 'Department Announcement',
      message: message.trim(),
      departmentId: deptId,
      postedBy: _id,
    })

    // Dispatch in-app notifications to all students & lecturers in this department
    const deptUsers = await User.find({ departmentId: deptId, status: 'active' }).select('clerkId _id').lean()
    for (const u of deptUsers) {
      await Notification.create({
        recipientId: u.clerkId || u._id.toString(),
        senderId: req.auth.userId,
        title: `📢 ${title || 'Department Announcement'}`,
        message: message.substring(0, 80) + '…',
        type: 'info',
        link: '/dashboard',
      }).catch(() => {})
    }

    res.status(201).json({ announcement, notifiedCount: deptUsers.length })
  } catch (err) { next(err) }
})

/** POST /api/v1/departments/oversight/enroll [dept_head/admin] — Force-enroll or remove student */
router.post('/oversight/enroll', ...auth, async (req, res, next) => {
  const { role } = req.dbUser
  if (!['dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

  try {
    const { studentId, courseId, action } = req.body // action: 'enroll' | 'drop'
    if (!studentId || !courseId) return res.status(400).json({ error: 'studentId and courseId are required' })

    if (action === 'drop') {
      await Enrollment.findOneAndDelete({ studentId, courseId })
      return res.json({ message: 'Student removed from course' })
    }

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId, courseId },
      { $set: { status: 'active' }, $setOnInsert: { progress: 0 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )
    res.json({ enrollment, message: 'Student successfully enrolled' })
  } catch (err) { next(err) }
})

export default router
