import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import { validateBody } from '../middleware/validate.js'
import { createCourseSchema, createAssignmentSchema } from '../utils/schemas.js'
import { logAudit } from '../utils/auditLogger.js'
import { sendMail, templates } from '../utils/mailer.js'
import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'
import Assignment from '../models/Assignment.js'
import Material from '../models/Material.js'
import Submission from '../models/Submission.js'
import User from '../models/User.js'

function csvSafe(value) {
  const str = String(value ?? '')
  const escaped = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
  return `"${escaped.replace(/"/g, '""')}"`
}

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/**
 * GET /api/v1/courses
 * ?enrolled=true  → courses this student is enrolled in
 * ?owned=true     → courses this lecturer owns
 * ?dept=true      → courses in this dept_head's school
 */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const { role, _id, schoolId } = req.dbUser

    let query = {}
    if (req.query.enrolled === 'true' && role === 'student') {
      const enrollments = await Enrollment.find({ studentId: _id, status: 'active' }).lean()
      const ids = enrollments.map(e => e.courseId)
      query = { _id: { $in: ids } }
    } else if (req.query.browse === 'true' && role === 'student') {
      // Active courses the student hasn't already joined
      const existing = await Enrollment.find({ studentId: _id }).select('courseId').lean()
      const excludeIds = existing.map(e => e.courseId)
      query = { status: 'active', _id: { $nin: excludeIds } }
    } else if (req.query.owned === 'true') {
      query = { lecturerId: _id }
    } else if (req.query.dept === 'true' && (role === 'dept_head' || role === 'admin')) {
      if (schoolId) query = { schoolId }
      else if (role === 'admin') query = {}
      else query = { _id: { $in: [] } }
    } else if (role === 'admin') {
      query = {}
    } else if (role === 'student') {
      query = { status: 'active' }
    } else {
      query = { lecturerId: _id }
    }

    const courses = await Course.find(query)
      .populate('lecturerId', 'fullName')
      .populate('schoolId', 'name code')
      .populate('departmentId', 'name code')
      .lean()

    // Enrich with enrollment counts, enrollment progress, lecturer name
    const enriched = await Promise.all(courses.map(async c => {
      const enrollmentCount = await Enrollment.countDocuments({ courseId: c._id, status: 'active' })
      const enrollment = role === 'student' ? await Enrollment.findOne({ courseId: c._id, studentId: _id }).lean() : null
      return {
        ...c,
        enrollmentCount,
        progress: enrollment?.progress ?? 0,
        lecturerName: c.lecturerId?.fullName ?? null,
        schoolName: c.schoolId?.name ?? null,
        departmentName: c.departmentId?.name ?? null,
      }
    }))

    res.json({ courses: enriched })
  } catch (err) { next(err) }
})

/** GET /api/v1/courses/:id */
router.get('/:id', ...auth, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('lecturerId', 'fullName')
      .populate('schoolId', 'name code')
      .populate('departmentId', 'name code')
      .lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    res.json({
      ...course,
      lecturerName: course.lecturerId?.fullName,
      schoolName: course.schoolId?.name,
      departmentName: course.departmentId?.name,
    })
  } catch (err) { next(err) }
})

/** POST /api/v1/courses  [lecturer/admin] */
router.post('/', ...auth, validateBody(createCourseSchema), async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { title, code, description, semester, status, credits, schoolId, departmentId } = req.body
    if (!title || !code) return res.status(400).json({ error: 'Title and Code are required' })

    const payload = {
      title: title.trim(),
      code: code.trim().toUpperCase(),
      description: description ?? '',
      semester: semester ?? '',
      status: status ?? 'draft',
      credits: Number(credits) || 3,
      lecturerId: _id,
    }
    if (schoolId && schoolId.length === 24) payload.schoolId = schoolId
    if (departmentId && departmentId.length === 24) payload.departmentId = departmentId

    const course = await Course.create(payload)
    res.status(201).json(course)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A course with this code already exists.' })
    }
    next(err)
  }
})

/** PATCH /api/v1/courses/:id  [owner or admin/dept_head] */
router.patch('/:id', ...auth, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const { role, _id } = req.dbUser
    const isOwner = course.lecturerId.toString() === _id.toString()
    if (!isOwner && !['admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

    const { title, code, description, semester, status, credits, schoolId, departmentId } = req.body
    if (title) course.title = title.trim()
    if (code) course.code = code.trim().toUpperCase()
    if (description !== undefined) course.description = description
    if (semester !== undefined) course.semester = semester
    if (status !== undefined) course.status = status
    if (credits !== undefined) course.credits = Number(credits) || 3
    if (schoolId !== undefined) {
      course.schoolId = (schoolId && schoolId.length === 24) ? schoolId : null
    }
    if (departmentId !== undefined) {
      course.departmentId = (departmentId && departmentId.length === 24) ? departmentId : null
    }

    await course.save()
    res.json(course)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A course with this code already exists.' })
    }
    next(err)
  }
})

/** DELETE /api/v1/courses/:id  [owner or admin] */
router.delete('/:id', ...auth, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const { role, _id } = req.dbUser
    if (course.lecturerId.toString() !== _id.toString() && role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    await course.deleteOne()
    res.json({ message: 'Course deleted' })
  } catch (err) { next(err) }
})

/** GET /api/v1/courses/:id/students */
router.get('/:id/students', ...auth, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const { role, _id } = req.dbUser
    const isOwner = course.lecturerId.toString() === _id.toString()
    if (!isOwner && !['dept_head', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const enrollments = await Enrollment.find({ courseId: req.params.id }).populate('studentId', 'fullName email').lean()
    const courseAssignments = await Assignment.find({ courseId: req.params.id }).select('_id').lean()
    const assignmentIds = courseAssignments.map(a => a._id)
    const students = await Promise.all(enrollments.map(async e => {
      const submissionsCount = await Submission.countDocuments({ studentId: e.studentId?._id, assignmentId: { $in: assignmentIds } })
      return {
        _id: e.studentId?._id,
        fullName: e.studentId?.fullName,
        email: e.studentId?.email,
        status: e.status,
        progress: e.progress,
        enrolledAt: e.createdAt,
        submissionsCount,
      }
    }))
    res.json({ students })
  } catch (err) { next(err) }
})

/** GET /api/v1/courses/:id/materials */
router.get('/:id/materials', ...auth, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const { role, _id } = req.dbUser
    const isOwner = course.lecturerId.toString() === _id.toString()
    const isEnrolled = await Enrollment.exists({ courseId: req.params.id, studentId: _id, status: 'active' })

    if (!isOwner && !isEnrolled && !['dept_head', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const materials = await Material.find({ courseId: req.params.id }).sort({ createdAt: -1 }).lean()
    res.json({ materials })
  } catch (err) { next(err) }
})

/** POST /api/v1/courses/:id/materials  (for direct URL/link materials) */
router.post('/:id/materials', ...auth, async (req, res, next) => {
  try {
    const { role, _id } = req.dbUser
    if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
    const course = await Course.findById(req.params.id).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const isOwner = course.lecturerId.toString() === _id.toString()
    if (!isOwner && !['dept_head', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'You do not own this course' })
    }

    const { title, type, url: fileUrl } = req.body
    if (!title || !type || !fileUrl) return res.status(400).json({ error: 'title, type, url are required' })
    const material = await Material.create({ courseId: req.params.id, title, type, fileUrl, uploadedBy: _id })
    res.status(201).json(material)
  } catch (err) { next(err) }
})

/** GET /api/v1/courses/:id/assignments */
router.get('/:id/assignments', ...auth, async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const { role, _id } = req.dbUser
    const isOwner = course.lecturerId.toString() === _id.toString()
    const isEnrolled = await Enrollment.exists({ courseId: req.params.id, studentId: _id, status: 'active' })

    if (!isOwner && !isEnrolled && !['dept_head', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const assignments = await Assignment.find({ courseId: req.params.id }).sort({ dueDate: 1 }).lean()

    // Only the owner (or dept_head/admin) needs grading counts — skip the extra queries for students
    if (isOwner || ['dept_head', 'admin'].includes(role)) {
      const enriched = await Promise.all(assignments.map(async a => {
        const submissionCount = await Submission.countDocuments({ assignmentId: a._id })
        const ungradedCount = await Submission.countDocuments({ assignmentId: a._id, score: null })
        return { ...a, submissionCount, ungradedCount }
      }))
      return res.json({ assignments: enriched })
    }

    res.json({ assignments })
  } catch (err) { next(err) }
})

/** POST /api/v1/courses/:id/assignments  [lecturer/admin] */
router.post('/:id/assignments', ...auth, validateBody(createAssignmentSchema), async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const course = await Course.findById(req.params.id).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const isOwner = course.lecturerId.toString() === _id.toString()
    if (!isOwner && !['dept_head', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'You do not own this course' })
    }

    const assignment = await Assignment.create({ ...req.body, courseId: req.params.id, createdBy: _id })
    res.status(201).json(assignment)

    // Notify enrolled students by email (fire-and-forget)
    setImmediate(async () => {
      try {
        const enrollments = await Enrollment.find({ courseId: req.params.id, status: 'active' })
          .populate('studentId', 'fullName email').lean()
        for (const e of enrollments) {
          if (!e.studentId?.email) continue
          const tmpl = templates.assignmentCreated(
            e.studentId.fullName,
            course.title,
            assignment.title,
            assignment.dueDate,
            `${process.env.CLIENT_URL || 'http://localhost:5173'}/assignments`
          )
          await sendMail({ to: e.studentId.email, ...tmpl })
        }
      } catch (e) { console.error('[mailer] Assignment notification failed:', e.message) }
    })
  } catch (err) { next(err) }
})

/** POST /api/v1/courses/:id/enroll  [student] */
router.post('/:id/enroll', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const course = await Course.findById(req.params.id).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    if (course.status !== 'active') return res.status(400).json({ error: 'This course is not open for enrollment' })

    const enrollment = await Enrollment.findOneAndUpdate(
      { studentId: _id, courseId: req.params.id },
      { $setOnInsert: { status: 'active', progress: 0 } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )
    res.status(201).json(enrollment)
  } catch (err) { next(err) }
})

/** GET /api/v1/courses/:id/gradebook/export  [lecturer/dept_head/admin] – Export CSV Gradebook */
router.get('/:id/gradebook/export', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const course = await Course.findById(req.params.id).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const isOwner = course.lecturerId.toString() === _id.toString()
    if (!isOwner && !['dept_head', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'You do not own this course' })
    }

    const enrollments = await Enrollment.find({ courseId: course._id, status: 'active' }).populate('studentId', 'fullName email').lean()
    const assignments = await Assignment.find({ courseId: course._id }).sort({ createdAt: 1 }).lean()
    const assignmentIds = assignments.map(a => a._id)

    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).lean()

    const maxTotal = assignments.reduce((acc, a) => acc + (a.maxScore || 0), 0)

    // Build CSV Header
    const headers = [csvSafe('Student Name'), csvSafe('Email')]
    assignments.forEach(a => headers.push(csvSafe(`${a.title} (Max ${a.maxScore})`)))
    headers.push(csvSafe('Total Score'), csvSafe('Max Score'), csvSafe('Percentage (%)'))

    const csvRows = [headers.join(',')]

    for (const e of enrollments) {
      const student = e.studentId
      if (!student) continue

      const row = [csvSafe(student.fullName || 'Student'), csvSafe(student.email || '')]
      let studentTotal = 0

      for (const a of assignments) {
        const sub = submissions.find(s => s.studentId?.toString() === student._id?.toString() && s.assignmentId?.toString() === a._id?.toString())
        if (sub && sub.score !== null && sub.score !== undefined) {
          row.push(csvSafe(sub.score))
          studentTotal += Number(sub.score)
        } else {
          row.push(csvSafe('N/A'))
        }
      }

      const percentage = maxTotal > 0 ? ((studentTotal / maxTotal) * 100).toFixed(2) : '0.00'
      row.push(csvSafe(studentTotal), csvSafe(maxTotal), csvSafe(`${percentage}%`))
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')
    const filename = `${course.code.replace(/[^a-zA-Z0-9]/g, '_')}_Gradebook.csv`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.status(200).send(csvContent)
  } catch (err) { next(err) }
})

export default router
