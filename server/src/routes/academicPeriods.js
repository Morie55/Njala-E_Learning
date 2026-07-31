import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import AcademicPeriod from '../models/AcademicPeriod.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** GET /api/v1/academic-periods */
router.get('/', ...auth, async (_req, res, next) => {
  try {
    const periods = await AcademicPeriod.find().sort({ startDate: -1 }).lean()
    res.json({ periods })
  } catch (err) { next(err) }
})

/** GET /api/v1/academic-periods/active */
router.get('/active', ...auth, async (_req, res, next) => {
  try {
    const period = await AcademicPeriod.findOne({ isActive: true }).lean()
    res.json({ period: period ?? null })
  } catch (err) { next(err) }
})

/** POST /api/v1/academic-periods  [admin] */
router.post('/', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admins only' })
  try {
    const period = await AcademicPeriod.create({ ...req.body, createdBy: req.dbUser._id })
    res.status(201).json({ period })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/academic-periods/:id  [admin] */
router.patch('/:id', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admins only' })
  try {
    const period = await AcademicPeriod.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!period) return res.status(404).json({ error: 'Period not found' })
    res.json({ period })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/academic-periods/:id/activate  [admin] – makes this period active, deactivates all others */
router.patch('/:id/activate', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admins only' })
  try {
    await AcademicPeriod.updateMany({}, { isActive: false })
    const period = await AcademicPeriod.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true })
    if (!period) return res.status(404).json({ error: 'Period not found' })
    res.json({ period })
  } catch (err) { next(err) }
})

/** DELETE /api/v1/academic-periods/:id  [admin] */
router.delete('/:id', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admins only' })
  try {
    await AcademicPeriod.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
