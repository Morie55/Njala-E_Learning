import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import School from '../models/School.js'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Department from '../models/Department.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** GET /api/v1/schools */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const schools = await School.find({}).sort({ isPrimary: -1, code: 1 }).lean()
    const enriched = await Promise.all(
      schools.map(async (s) => {
        const courseCount = await Course.countDocuments({ schoolId: s._id })
        const lecturerCount = await User.countDocuments({ schoolId: s._id, role: 'lecturer' })
        const departmentCount = await Department.countDocuments({ schoolId: s._id })
        return { ...s, courseCount, lecturerCount, departmentCount }
      })
    )
    res.json({ schools: enriched })
  } catch (err) {
    next(err)
  }
})

/** GET /api/v1/schools/stats [admin/dept_head] */
router.get('/stats', ...auth, async (req, res, next) => {
  const { role, schoolId } = req.dbUser
  if (!['admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    if (role === 'dept_head' && !schoolId) {
      return res.json({ lecturers: 0 })
    }
    const filter = role === 'dept_head' ? { schoolId } : {}
    const lecturers = await User.countDocuments({ ...filter, role: 'lecturer' })
    res.json({ lecturers })
  } catch (err) {
    next(err)
  }
})

/** POST /api/v1/schools [admin] */
router.post('/', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const { name, code, headId, isPrimary, status } = req.body
    if (!name || !code) return res.status(400).json({ error: 'Name and Code are required' })

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      isPrimary: Boolean(isPrimary),
      status: status || 'active',
    }
    if (headId && headId.length === 24) payload.headId = headId

    const school = await School.create(payload)
    res.status(201).json(school)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A school with this name or code already exists.' })
    }
    next(err)
  }
})

/** PATCH /api/v1/schools/:id [admin] */
router.patch('/:id', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const { name, code, headId, isPrimary, status } = req.body
    const payload = {}
    if (name) payload.name = name.trim()
    if (code) payload.code = code.trim().toUpperCase()
    if (isPrimary !== undefined) payload.isPrimary = Boolean(isPrimary)
    if (status !== undefined) payload.status = status
    if (headId !== undefined) payload.headId = headId && headId.length === 24 ? headId : null

    const school = await School.findByIdAndUpdate(req.params.id, payload, { returnDocument: 'after' })
    if (!school) return res.status(404).json({ error: 'School not found' })
    res.json(school)
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A school with this name or code already exists.' })
    }
    next(err)
  }
})

/** DELETE /api/v1/schools/:id [admin] */
router.delete('/:id', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const school = await School.findById(req.params.id).lean()
    if (!school) return res.status(404).json({ error: 'School not found' })

    const inUse = await Course.exists({ schoolId: req.params.id })
    if (inUse) {
      return res.status(409).json({
        error: 'Cannot delete a school that has courses assigned to it. Reassign or delete those courses first.',
      })
    }

    // Cascade-clear references from users and delete sub-departments
    await User.updateMany({ schoolId: req.params.id }, { $unset: { schoolId: '' } })
    await Department.deleteMany({ schoolId: req.params.id })
    await School.findByIdAndDelete(req.params.id)
    res.json({ message: 'School deleted' })
  } catch (err) {
    next(err)
  }
})

export default router
