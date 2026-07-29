import { Router } from 'express'
import { createClerkClient } from '@clerk/backend'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Submission from '../models/Submission.js'
import Enrollment from '../models/Enrollment.js'
import Department from '../models/Department.js'
import School from '../models/School.js'
import { logAudit } from '../utils/auditLogger.js'

const router = Router()
const auth = [requireAuth, populateUser]

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
            boundaries: [0, 50, 60, 70, 80, 101],
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

    const gradeRanges = [
      { label: 'Grade A (80-100%)', key: 80, color: '#086b53' },
      { label: 'Grade B (70-79%)', key: 70, color: '#03224d' },
      { label: 'Grade C (60-69%)', labelKey: 60, color: '#dd9235' },
      { label: 'Grade D (50-59%)', labelKey: 50, color: '#747780' },
      { label: 'Fail / F (0-49%)', labelKey: 0, color: '#ba1a1a' }
    ]

    const gradeMap = { 80: 0, 70: 0, 60: 0, 50: 0, 0: 0 }
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
        { name: 'Grade A (80-100%)', count: gradeMap[80], color: '#086b53' },
        { name: 'Grade B (70-79%)', count: gradeMap[70], color: '#03224d' },
        { name: 'Grade C (60-69%)', count: gradeMap[60], color: '#dd9235' },
        { name: 'Grade D (50-59%)', count: gradeMap[50], color: '#747780' },
        { name: 'Fail / F (0-49%)', count: gradeMap[0], color: '#ba1a1a' }
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
        const clerkUser = await clerk.users.createUser({
          emailAddress: [email],
          password: pin,
          skipPasswordChecks: true,
          firstName: fullName.split(' ')[0],
          lastName: fullName.split(' ').slice(1).join(' ') || undefined,
        })

        const payload = {
          clerkId: clerkUser.id,
          email,
          fullName,
          role,
          idNumber: row.idNumber ? String(row.idNumber).trim() : '',
          status: 'PENDING',
          mustChangePassword: true,
        }
        if (row.schoolId && row.schoolId.length === 24) payload.schoolId = row.schoolId
        if (row.departmentId && row.departmentId.length === 24) payload.departmentId = row.departmentId

        user = await User.create(payload)
        results.push({ email, fullName, role, status: 'created', pin, userId: user._id })
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

  res.status(201).json({ results })
})

export default router
