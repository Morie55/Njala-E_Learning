import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import Department from '../models/Department.js'
import Course from '../models/Course.js'

const router = Router()
const auth = [requireAuth, populateUser]

/** GET /api/v1/departments — optionally filter by ?schoolId=<id> */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const filter = req.query.schoolId ? { schoolId: req.query.schoolId } : {}
    const departments = await Department.find(filter).populate('schoolId', 'name code').lean()
    res.json({ departments })
  } catch (err) {
    next(err)
  }
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
    const dept = await Department.findById(req.params.id).lean()
    const inUse = await Course.exists({ departmentId: req.params.id })
    if (inUse) {
      return res.status(409).json({ error: 'Cannot delete a department with courses assigned to it' })
    }

    await Department.findByIdAndDelete(req.params.id)
    res.json({ message: 'Department deleted' })
  } catch (err) {
    next(err)
  }
})

export default router
