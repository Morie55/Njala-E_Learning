import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import User from '../models/User.js'
import { createClerkClient } from '@clerk/backend'
import { authRateLimiter } from '../middleware/rateLimiter.js'
import { validateBody } from '../middleware/validate.js'
import { updateUserRoleSchema } from '../utils/schemas.js'
import { logAudit } from '../utils/auditLogger.js'
import { generateStudentId } from '../utils/generateStudentId.js'

const router = Router()

/**
 * POST /api/v1/users/sync
 * Creates or updates the MongoDB User from Clerk user data.
 */
router.post('/sync', authRateLimiter, requireAuth, async (req, res, next) => {
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const clerkUser = await clerk.users.getUser(req.auth.userId)
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ')
    const avatarUrl = clerkUser.imageUrl ?? ''
    const clerkRole = clerkUser.publicMetadata?.role

    const rawRequestedRole = req.body.requestedRole || clerkUser.unsafeMetadata?.requestedRole
    const allowedRequestedRoles = ['student', 'lecturer', 'dept_head']
    const sanitizedRequestedRole = allowedRequestedRoles.includes(rawRequestedRole) ? rawRequestedRole : 'student'

    let user = await User.findOne({ clerkId: req.auth.userId })
    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() })
    }

    if (!user) {
      const userCount = await User.countDocuments()
      const isFirstUser = userCount === 0
      user = await User.create({
        clerkId: req.auth.userId,
        email: email || `${req.auth.userId}@njala.edu.sl`,
        fullName: fullName || 'User',
        avatarUrl,
        role: isFirstUser ? 'admin' : 'student',
        requestedRole: isFirstUser ? 'admin' : sanitizedRequestedRole,
        roleSelected: true,
        status: isFirstUser ? 'ACTIVE' : 'PENDING',
      })
    } else {
      if (user.clerkId !== req.auth.userId) {
        const orphaned = await User.find({ clerkId: req.auth.userId, _id: { $ne: user._id } })
        if (orphaned.length) {
          await logAudit({
            req,
            action: 'SYNC_CLERKID_CONFLICT_RESOLVED',
            targetModel: 'User',
            details: { removedUserIds: orphaned.map((u) => u._id) },
          })
        }
        await User.deleteMany({ clerkId: req.auth.userId, _id: { $ne: user._id } })
        user.clerkId = req.auth.userId
      }
      if (email) user.email = email
      if (fullName) user.fullName = fullName
      if (avatarUrl) user.avatarUrl = avatarUrl
      if (!user.role) user.role = clerkRole || 'student'
      if (user.role === 'student' && user.departmentId && !user.idNumber) {
        user.idNumber = await generateStudentId(user.departmentId)
      }
      await user.save()
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/users/me/activate
 * First-time PIN/password activation for bulk-imported pending users.
 */
router.post('/me/activate', authRateLimiter, requireAuth, populateUser, async (req, res, next) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' })
    }

    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    await clerk.users.updateUser(req.auth.userId, { password: newPassword })

    const user = await User.findById(req.dbUser._id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.status = 'ACTIVE'
    user.mustChangePassword = false
    user.activatedAt = new Date()
    await user.save()

    await logAudit({
      req,
      action: 'USER_ACTIVATED',
      targetModel: 'User',
      targetId: user._id.toString(),
      details: { email: user.email },
    })

    res.json(user)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/v1/users/me/select-role
 * Allows a newly registered user to select their desired system role.
 */
router.patch('/me/select-role', requireAuth, populateUser, async (req, res, next) => {
  try {
    const { role } = req.body
    const allowedRoles = ['student', 'lecturer', 'dept_head', 'admin']
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid system role selected.' })
    }

    const user = await User.findById(req.dbUser._id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.role = role
    user.roleSelected = true
    user.status = 'PENDING'
    await user.save()

    await logAudit({
      req,
      action: 'ROLE_SELECTED',
      targetModel: 'User',
      targetId: user._id.toString(),
      details: { selectedRole: role, email: user.email },
    })

    res.json(user)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/v1/users/me/role
 * Allows updating current user's role (useful for dev/testing only)
 */
router.patch('/me/role', requireAuth, populateUser, validateBody(updateUserRoleSchema), async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }
  try {
    const user = await User.findByIdAndUpdate(req.dbUser._id, { role: req.body.role }, { returnDocument: 'after' })
    res.json(user)
  } catch (err) { next(err) }
})

/**
 * GET /api/v1/users/me
 */
router.get('/me', requireAuth, populateUser, (req, res) => {
  res.json(req.dbUser)
})

/**
 * GET /api/v1/users  [Admin only] — Filter active/non-deleted users
 */
router.get('/', requireAuth, populateUser, async (req, res, next) => {
  if (!['admin', 'dept_head'].includes(req.dbUser.role)) return res.status(403).json({ error: 'Admin only' })
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 100
    const filter = { deletedAt: null }

    if (req.query.role) {
      filter.role = req.query.role
    }

    if (req.query.status && ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'ALUMNI', 'ARCHIVED'].includes(req.query.status.toUpperCase())) {
      filter.status = req.query.status.toUpperCase()
    }

    const users = await User.find(filter)
      .populate('schoolId', 'name code')
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    res.json({ users })
  } catch (err) { next(err) }
})

/**
 * PATCH /api/v1/users/:id/approve  [Admin only] — Approve pending account
 */
router.patch('/:id/approve', requireAuth, populateUser, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const { role } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const assignedRole = (role && ['student', 'lecturer', 'dept_head', 'admin'].includes(role))
      ? role
      : (user.requestedRole || user.role || 'student')

    user.role = assignedRole
    user.status = 'ACTIVE'
    user.activatedAt = new Date()
    user.approvedBy = req.dbUser._id
    user.approvedAt = new Date()
    await user.save()

    if (user.clerkId && process.env.CLERK_SECRET_KEY) {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
        await clerk.users.updateUser(user.clerkId, {
          publicMetadata: { role: user.role },
        })
      } catch (clerkErr) {
        console.warn('[CLERK ROLE SYNC WARN]', clerkErr.message)
      }
    }

    await logAudit({
      req,
      action: 'ACCOUNT_APPROVED',
      targetModel: 'User',
      targetId: user._id.toString(),
      details: { assignedRole: user.role, email: user.email, approvedBy: req.dbUser.email },
    })

    res.json(user)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/v1/users/:id/reject  [Admin only] — Reject pending account request
 */
router.patch('/:id/reject', requireAuth, populateUser, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const { reason } = req.body
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    user.status = 'REJECTED'
    user.rejectedBy = req.dbUser._id
    user.rejectedAt = new Date()
    user.rejectionReason = reason || ''
    await user.save()

    await logAudit({
      req,
      action: 'USER_REJECTED',
      targetModel: 'User',
      targetId: user._id.toString(),
      details: { reason: reason || '', email: user.email, rejectedBy: req.dbUser.email },
    })

    res.json(user)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/v1/users/:id/role  [Admin only]
 */
router.patch('/:id/role', requireAuth, populateUser, validateBody(updateUserRoleSchema), async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const previousUser = await User.findById(req.params.id).lean()
    if (!previousUser) return res.status(404).json({ error: 'User not found' })

    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { returnDocument: 'after' })

    if (user.clerkId && process.env.CLERK_SECRET_KEY) {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
        await clerk.users.updateUser(user.clerkId, {
          publicMetadata: { role: req.body.role },
        })
      } catch (clerkErr) {
        console.warn('[CLERK ROLE SYNC WARN]', clerkErr.message)
      }
    }

    await logAudit({
      req,
      action: 'ROLE_CHANGE',
      targetModel: 'User',
      targetId: req.params.id,
      details: { previousRole: previousUser.role, newRole: req.body.role, targetEmail: previousUser.email },
    })

    res.json(user)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/v1/users/:id/status  [Admin only] — User Lifecycle Status Transition
 */
router.patch('/:id/status', requireAuth, populateUser, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  const { status, reason } = req.body
  const upperStatus = status ? String(status).toUpperCase() : ''
  if (!['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'ALUMNI', 'ARCHIVED'].includes(upperStatus)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  try {
    const existingUser = await User.findById(req.params.id)
    if (!existingUser) return res.status(404).json({ error: 'User not found' })

    const update = { status: upperStatus === 'APPROVED' ? 'ACTIVE' : upperStatus }
    if (upperStatus === 'APPROVED' || upperStatus === 'ACTIVE') {
      update.role = existingUser.requestedRole || existingUser.role || 'student'
      update.activatedAt = new Date()
      update.approvedBy = req.dbUser._id
      update.approvedAt = new Date()
      update.suspendedAt = null
      update.suspensionReason = ''
    }
    if (upperStatus === 'REJECTED') {
      update.rejectedBy = req.dbUser._id
      update.rejectedAt = new Date()
      update.rejectionReason = reason || ''
    }
    if (upperStatus === 'SUSPENDED') {
      update.suspendedAt = new Date()
      update.suspensionReason = reason || ''
    }
    if (upperStatus === 'ALUMNI') {
      update.alumniSince = new Date()
    }
    if (upperStatus === 'ARCHIVED') {
      update.archivedAt = new Date()
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })

    if ((upperStatus === 'APPROVED' || upperStatus === 'ACTIVE') && user.clerkId && process.env.CLERK_SECRET_KEY) {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
        await clerk.users.updateUser(user.clerkId, {
          publicMetadata: { role: user.role },
        })
      } catch (clerkErr) {
        console.warn('[CLERK ROLE SYNC WARN]', clerkErr.message)
      }
    }

    await logAudit({
      req,
      action: (upperStatus === 'APPROVED' || upperStatus === 'ACTIVE') ? 'ACCOUNT_APPROVED' : 'STATUS_CHANGE',
      targetModel: 'User',
      targetId: user._id.toString(),
      details: { newStatus: user.status, assignedRole: user.role, reason: reason || '' },
    })

    res.json(user)
  } catch (err) { next(err) }
})

/**
 * PATCH /api/v1/users/:id/assignment  [Admin only] — Assign School, Department, ID Number
 */
router.patch('/:id/assignment', requireAuth, populateUser, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const { schoolId, departmentId, idNumber } = req.body
    const existingUser = await User.findById(req.params.id)
    if (!existingUser) return res.status(404).json({ error: 'User not found' })

    const update = {}
    if (schoolId !== undefined) update.schoolId = (schoolId && schoolId.length === 24) ? schoolId : null
    if (departmentId !== undefined) update.departmentId = (departmentId && departmentId.length === 24) ? departmentId : null
    if (idNumber !== undefined) {
      update.idNumber = String(idNumber).trim()
    } else if (existingUser.role === 'student' && !existingUser.idNumber && (departmentId || existingUser.departmentId)) {
      update.idNumber = await generateStudentId(departmentId || existingUser.departmentId)
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after' })
      .populate('schoolId', 'name code')
      .populate('departmentId', 'name code')

    res.json(user)
  } catch (err) { next(err) }
})

/**
 * DELETE /api/v1/users/:id  [Admin only] — Soft & Hard Delete
 */
router.delete('/:id', requireAuth, populateUser, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  const { hard } = req.query
  // Accept reason from body (preferred) or query param (fallback for compatibility)
  const reason = req.body?.reason || req.query.reason
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (hard === 'true') {
      if (!reason) return res.status(400).json({ error: 'A reason is required for a hard delete.' })
      await logAudit({
        req,
        action: 'HARD_DELETE',
        targetModel: 'User',
        targetId: user._id.toString(),
        details: { reason, email: user.email },
      })
      await User.findByIdAndDelete(user._id)
      return res.json({ message: 'User permanently deleted.' })
    }

    user.deletedAt = new Date()
    await user.save()

    await logAudit({
      req,
      action: 'SOFT_DELETE',
      targetModel: 'User',
      targetId: user._id.toString(),
      details: { email: user.email },
    })

    res.json({ message: 'User soft-deleted.' })
  } catch (err) { next(err) }
})

export default router
