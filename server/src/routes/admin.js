import { Router } from 'express'
import { createClerkClient } from '@clerk/backend'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Submission from '../models/Submission.js'
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
