import { Router } from 'express'
import { createClerkClient } from '@clerk/backend'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Submission from '../models/Submission.js'
import Enrollment from '../models/Enrollment.js'
import Department from '../models/Department.js'
import School from '../models/School.js'
import Assignment from '../models/Assignment.js'
import AuditLog from '../models/AuditLog.js'
import Settings from '../models/Settings.js'
import { logAudit } from '../utils/auditLogger.js'
import { generateStudentId } from '../utils/generateStudentId.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

function adminOnly(req, res, next) {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  next()
}

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/** GET /api/v1/admin/stats */
router.get('/stats', ...auth, adminOnly, async (req, res, next) => {
  try {
    const [
      totalUsers, students, lecturers, deptHeads,
      totalCourses, activeCourses,
      totalSubmissions, pendingSubmissions,
      totalSchools, totalDepartments,
    ] = await Promise.all([
      User.countDocuments({ deletedAt: null }),
      User.countDocuments({ role: 'student', deletedAt: null }),
      User.countDocuments({ role: 'lecturer', deletedAt: null }),
      User.countDocuments({ role: 'dept_head', deletedAt: null }),
      Course.countDocuments(),
      Course.countDocuments({ status: 'active' }),
      Submission.countDocuments(),
      Submission.countDocuments({ score: null }),
      School.countDocuments(),
      Department.countDocuments(),
    ])
    res.json({ totalUsers, students, lecturers, deptHeads, totalCourses, activeCourses, totalSubmissions, pendingSubmissions, totalSchools, totalDepartments })
  } catch (err) { next(err) }
})

/** GET /api/v1/admin/analytics */
router.get('/analytics', ...auth, adminOnly, async (req, res, next) => {
  try {
    const [
      enrollmentAgg,
      totalStudents,
      totalLecturers,
      totalDeptHeads,
      totalAdmins,
      gradedSubmissionsCount,
      avgScoreAgg,
      gradeDistAgg,
      schoolCounts,
    ] = await Promise.all([
      Enrollment.aggregate([
        { $group: { _id: null, avgProgress: { $avg: '$progress' }, total: { $sum: 1 } } }
      ]),
      User.countDocuments({ role: 'student', deletedAt: null }),
      User.countDocuments({ role: 'lecturer', deletedAt: null }),
      User.countDocuments({ role: 'dept_head', deletedAt: null }),
      User.countDocuments({ role: 'admin', deletedAt: null }),
      Submission.countDocuments({ score: { $ne: null } }),
      Submission.aggregate([
        { $match: { score: { $ne: null } } },
        { $group: { _id: null, avgScore: { $avg: '$score' } } }
      ]),
      Submission.aggregate([
        { $match: { score: { $ne: null } } },
        {
          $bucket: {
            groupBy: '$score',
            // Njala 5-point scale percentage thresholds (applied to raw score/maxScore ratio * 100)
            // Boundaries are raw scores, but we derive letter grades from percentage in application layer.
            // Here we bucket by raw percentage proxy using the score field as-is, then remap in the response.
            // Since raw scores vary, we normalize and distribute into 6 bands: F(<40), E(40-44), D(45-49), C(50-59), B(60-69), A(>=70)
            boundaries: [0, 40, 45, 50, 60, 70, 101],
            default: 'Other',
            output: { count: { $sum: 1 } }
          }
        }
      ]),
      School.aggregate([
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: 'schoolId',
            as: 'courses'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'schoolId',
            as: 'users'
          }
        },
        {
          $project: {
            name: 1,
            code: 1,
            courseCount: { $size: '$courses' },
            userCount: { $size: '$users' }
          }
        }
      ])
    ])

    const avgCompletionRate = Math.round(enrollmentAgg[0]?.avgProgress ?? 0)
    const avgScore = Number((avgScoreAgg[0]?.avgScore ?? 0).toFixed(1))

    // Njala 5-point scale grade distribution map (boundaries: F=0, E=40, D=45, C=50, B=60, A=70)
    const gradeMap = { 0: 0, 40: 0, 45: 0, 50: 0, 60: 0, 70: 0 }
    gradeDistAgg.forEach(b => {
      if (gradeMap[b._id] !== undefined) {
        gradeMap[b._id] = b.count
      }
    })

    res.json({
      kpis: {
        avgCompletionRate,
        totalStudents,
        totalLecturers,
        totalDeptHeads,
        totalAdmins,
        gradedSubmissionsCount,
        avgScore
      },
      roles: [
        { name: 'Students', count: totalStudents, color: '#086b53' },
        { name: 'Lecturers', count: totalLecturers, color: '#03224d' },
        { name: 'Department Heads', count: totalDeptHeads, color: '#dd9235' },
        { name: 'Admins', count: totalAdmins, color: '#747780' }
      ],
      gradeDistribution: [
        { name: 'Grade A (70-100%)', count: gradeMap[70], color: '#086b53' },
        { name: 'Grade B (60-69%)', count: gradeMap[60], color: '#03224d' },
        { name: 'Grade C (50-59%)', count: gradeMap[50], color: '#1f3864' },
        { name: 'Grade D (45-49%)', count: gradeMap[45], color: '#dd9235' },
        { name: 'Grade E (40-44%)', count: gradeMap[40], color: '#747780' },
        { name: 'Fail / F (0-39%)', count: gradeMap[0],  color: '#ba1a1a' }
      ],
      schools: schoolCounts
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/admin/users/bulk-import
 * Body: { rows: [{ fullName, email, role, schoolId, departmentId, idNumber }] }
 */
router.post('/users/bulk-import', ...auth, adminOnly, async (req, res, next) => {
  const { rows } = req.body
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows[] required' })

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const results = []

  for (const row of rows) {
    const email = row.email ? String(row.email).trim().toLowerCase() : ''
    const fullName = row.fullName ? String(row.fullName).trim() : 'User'
    const role = ['student', 'lecturer', 'dept_head', 'admin'].includes(row.role) ? row.role : 'student'
    const pin = generatePin()

    if (!email || !email.includes('@')) {
      results.push({ email: row.email, status: 'failed', error: 'Invalid email address' })
      continue
    }

    try {
      let user = await User.findOne({ email })
      if (user) {
        user.fullName = fullName || user.fullName
        user.role = role || user.role
        if (row.idNumber) user.idNumber = String(row.idNumber).trim()
        if (row.schoolId && row.schoolId.length === 24) user.schoolId = row.schoolId
        if (row.departmentId && row.departmentId.length === 24) user.departmentId = row.departmentId
        await user.save()
        results.push({ email, fullName, role, status: 'updated', pin: 'N/A (Existing user)', userId: user._id })
      } else {
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') + '_' + Math.floor(1000 + Math.random() * 9000)
        let clerkUser
        try {
          clerkUser = await clerk.users.createUser({
            emailAddress: [email],
            username,
            password: pin,
            skipPasswordChecks: true,
            firstName: fullName.split(' ')[0] || 'User',
            lastName: fullName.split(' ').slice(1).join(' ') || undefined,
            publicMetadata: { role },
          })
        } catch (clerkErr) {
          const errMsg = clerkErr.errors?.[0]?.longMessage || clerkErr.errors?.[0]?.message || clerkErr.message || 'Clerk user creation failed'
          results.push({ email, fullName, role, status: 'failed', error: errMsg })
          continue
        }

        let assignedIdNumber = row.idNumber ? String(row.idNumber).trim() : ''
        if (!assignedIdNumber && (role === 'student' || row.departmentId)) {
          assignedIdNumber = await generateStudentId(row.departmentId || 'Technology')
        }

        const payload = {
          clerkId: clerkUser.id,
          email,
          fullName,
          role,
          idNumber: assignedIdNumber,
          status: 'PENDING',
          mustChangePassword: true,
        }
        if (row.schoolId && row.schoolId.length === 24) payload.schoolId = row.schoolId
        if (row.departmentId && row.departmentId.length === 24) payload.departmentId = row.departmentId

        user = await User.create(payload)
        results.push({ email, fullName, role, status: 'created', pin, userId: user._id, idNumber: assignedIdNumber })
      }
    } catch (err) {
      results.push({ email, status: 'failed', error: err.message || 'Import failed' })
    }
  }

  await logAudit({
    req,
    action: 'BULK_IMPORT',
    targetModel: 'User',
    details: `${results.filter(r => r.status === 'created').length} created, ${results.filter(r => r.status === 'updated').length} updated, ${results.filter(r => r.status === 'failed').length} failed`,
  })

  res.json({ results })
})

/**
 * POST /api/v1/admin/users/batch-generate
 * Body: { departmentId, count = 10, role = 'student' }
 * Provision N accounts automatically for a program/department
 */
router.post('/users/batch-generate', ...auth, adminOnly, async (req, res, next) => {
  const { departmentId, count = 10, role = 'student' } = req.body
  const parsedCount = parseInt(count, 10)
  if (!departmentId || isNaN(parsedCount) || parsedCount < 1 || parsedCount > 100) {
    return res.status(400).json({ error: 'departmentId and a count between 1 and 100 are required' })
  }

  const department = await Department.findById(departmentId)
  if (!department) return res.status(404).json({ error: 'Department not found' })

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const results = []

  for (let i = 0; i < parsedCount; i++) {
    const idNumber = await generateStudentId(department.name)
    const pin = generatePin()
    const cleanId = idNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const email = `${cleanId}@njala.edu.sl`
    const fullName = `${role === 'student' ? 'Student' : 'User'} ${idNumber}`

    try {
      let clerkUser
      try {
        clerkUser = await clerk.users.createUser({
          emailAddress: [email],
          username: cleanId + '_' + Math.floor(1000 + Math.random() * 9000),
          password: pin,
          skipPasswordChecks: true,
          firstName: role === 'student' ? 'Student' : 'User',
          lastName: idNumber,
          publicMetadata: { role },
        })
      } catch (clerkErr) {
        const errMsg = clerkErr.errors?.[0]?.longMessage || clerkErr.errors?.[0]?.message || clerkErr.message || 'Clerk user creation failed'
        results.push({ idNumber, email, status: 'failed', error: errMsg })
        continue
      }

      const user = await User.create({
        clerkId: clerkUser.id,
        email,
        fullName,
        role,
        schoolId: department.schoolId,
        departmentId: department._id,
        idNumber,
        status: 'PENDING',
        mustChangePassword: true,
      })

      results.push({ idNumber, email, pin, fullName, role, status: 'created', userId: user._id })
    } catch (err) {
      results.push({ idNumber, email, status: 'failed', error: err.message || 'Creation failed' })
    }
  }

  await logAudit({
    req,
    action: 'BATCH_GENERATE',
    targetModel: 'User',
    details: `Generated ${results.filter(r => r.status === 'created').length} ${role} accounts for ${department.name}`,
  })

  res.status(201).json({ results, departmentName: department.name })
})


/** GET /api/v1/admin/settings — Get all platform settings */
router.get('/settings', ...auth, adminOnly, async (req, res, next) => {
  try {
    const docs = await Settings.find({}).lean()
    // Convert array to key-value map
    const settings = {}
    docs.forEach(d => { settings[d.key] = d.value })
    // Apply defaults for any missing keys
    const defaults = {
      universityName: 'Njala University',
      academicYear: '2025/2026',
      uploadLimitMb: 50,
      allowSelfEnrollment: true,
      requireDeptHeadApproval: false,
      passingGradePercent: 40,
      attendanceThreshold: 75,
      itSupportEmail: 'kmorie18c@njala.edu.sl',
    }
    res.json({ settings: { ...defaults, ...settings } })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/admin/settings — Upsert platform settings */
router.patch('/settings', ...auth, adminOnly, async (req, res, next) => {
  try {
    const updates = req.body // { key: value, ... }
    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Body must be an object of { key: value } pairs' })
    }
    const ops = Object.entries(updates).map(([key, value]) =>
      Settings.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, returnDocument: 'after' }
      )
    )
    await Promise.all(ops)
    await logAudit({ req, action: 'UPDATE_SETTINGS', targetModel: 'Settings', details: `Updated ${Object.keys(updates).join(', ')}` })
    res.json({ message: 'Settings saved successfully' })
  } catch (err) { next(err) }
})

/** GET /api/v1/admin/audit-logs — Paginated audit log viewer */
router.get('/audit-logs', ...auth, adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 25)
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.action) filter.action = req.query.action
    if (req.query.from || req.query.to) {
      filter.createdAt = {}
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from)
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to)
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ])

    const enriched = logs.map(l => ({
      ...l,
      actorName: l.performedByEmail || l.performedBy || 'System',
      actorEmail: l.performedByEmail || '',
      actorRole: l.performedByRole || '',
    }))

    res.json({
      logs: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) { next(err) }
})

/** GET /api/v1/admin/report/course/:id — Per-course report for lecturer/admin */
router.get('/report/course/:id', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const course = await Course.findById(req.params.id).populate('lecturerId', 'fullName email').lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    if (role === 'lecturer' && course.lecturerId?._id?.toString() !== _id.toString()) {
      return res.status(403).json({ error: 'You do not own this course' })
    }

    const [enrollmentCount, assignments, submissions] = await Promise.all([
      Enrollment.countDocuments({ courseId: course._id, status: 'active' }),
      Assignment.find({ courseId: course._id }).lean(),
      Submission.find({
        assignmentId: { $in: await Assignment.find({ courseId: course._id }).distinct('_id') }
      }).lean(),
    ])

    const gradedSubmissions = submissions.filter(s => s.score !== null && s.score !== undefined)
    const avgScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.score, 0) / gradedSubmissions.length)
      : null
    const submissionRate = assignments.length > 0 && enrollmentCount > 0
      ? Math.round((submissions.length / (assignments.length * enrollmentCount)) * 100)
      : 0
    const lateCount = submissions.filter(s => s.isLate).length

    // Grade distribution
    const { calculateGrade } = await import('../utils/grading.js')
    const gradeDist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }
    gradedSubmissions.forEach(s => {
      const g = calculateGrade(s.score, assignments.find(a => a._id.toString() === s.assignmentId.toString())?.maxScore || 100)
      if (gradeDist[g.letterGrade] !== undefined) gradeDist[g.letterGrade]++
    })

    res.json({
      course,
      enrollmentCount,
      assignmentCount: assignments.length,
      submissionCount: submissions.length,
      gradedCount: gradedSubmissions.length,
      pendingGradingCount: submissions.length - gradedSubmissions.length,
      avgScore,
      submissionRate,
      lateSubmissions: lateCount,
      gradeDist,
    })
  } catch (err) { next(err) }
})

/** GET /api/v1/admin/report/department/:id — Dept-level aggregate report */
router.get('/report/department/:id', ...auth, async (req, res, next) => {
  const { role } = req.dbUser
  if (!['dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const dept = await Department.findById(req.params.id).populate('schoolId', 'name code').lean()
    if (!dept) return res.status(404).json({ error: 'Department not found' })

    // Get all courses in dept
    const courses = await Course.find({ departmentId: dept._id })
      .populate('lecturerId', 'fullName email')
      .lean()
    const courseIds = courses.map(c => c._id)

    // Enrollments per course
    const enrollmentCounts = await Enrollment.aggregate([
      { $match: { courseId: { $in: courseIds }, status: 'active' } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ])
    const enrollMap = {}
    enrollmentCounts.forEach(e => { enrollMap[e._id.toString()] = e.count })

    const coursesEnriched = courses.map(c => ({
      ...c,
      enrollmentCount: enrollMap[c._id.toString()] ?? 0,
    }))

    // Total unique students enrolled in this department
    const totalEnrollments = await Enrollment.distinct('studentId', {
      courseId: { $in: courseIds },
      status: 'active',
    })

    // Total lecturers
    const totalLecturers = await User.countDocuments({ departmentId: dept._id, role: 'lecturer' })

    // Submissions
    const assignmentIds = await Assignment.find({ courseId: { $in: courseIds } }).distinct('_id')
    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } }).lean()
    const graded = submissions.filter(s => s.score !== null && s.score !== undefined)
    const avgScore = graded.length > 0
      ? Math.round(graded.reduce((sum, s) => sum + s.score, 0) / graded.length)
      : null

    res.json({
      department: { ...dept, schoolId: undefined, _id: dept._id, name: dept.name, code: dept.code },
      school: dept.schoolId,
      totalStudents: totalEnrollments.length,
      totalLecturers,
      totalCourses: courses.length,
      activeCourses: courses.filter(c => c.status === 'active').length,
      totalSubmissions: submissions.length,
      gradedSubmissions: graded.length,
      avgScore,
      courses: coursesEnriched,
    })
  } catch (err) { next(err) }
})

export default router
