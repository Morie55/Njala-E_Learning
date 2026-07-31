import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import ClassSlot from '../models/ClassSlot.js'
import Enrollment from '../models/Enrollment.js'
import Course from '../models/Course.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** GET /api/v1/timetable/my  – Student or lecturer weekly timetable */
router.get('/my', ...auth, async (req, res, next) => {
  try {
    const { _id, role } = req.dbUser
    let courseIds = []

    if (role === 'student') {
      const enrollments = await Enrollment.find({ studentId: _id, status: 'active' }).lean()
      courseIds = enrollments.map(e => e.courseId)
    } else if (role === 'lecturer') {
      const courses = await Course.find({ lecturerId: _id, status: 'active' }).lean()
      courseIds = courses.map(c => c._id)
    } else {
      // admin/dept_head: return all slots
      const slots = await ClassSlot.find().populate('courseId', 'title code').sort({ dayOfWeek: 1, startTime: 1 }).lean()
      return res.json({ slots })
    }

    const slots = await ClassSlot.find({ courseId: { $in: courseIds } })
      .populate('courseId', 'title code lecturerId')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean()

    res.json({ slots })
  } catch (err) { next(err) }
})

/** POST /api/v1/timetable  [lecturer/admin] – Create class slot */
router.post('/', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { courseId, dayOfWeek, startTime, endTime, venue, academicPeriodId } = req.body
    if (!courseId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'courseId, dayOfWeek, startTime, endTime are required' })
    }

    // Check for venue clash (same venue, same day, overlapping time)
    if (venue) {
      const clash = await ClassSlot.findOne({
        venue: { $regex: new RegExp(`^${venue.trim()}$`, 'i') },
        dayOfWeek,
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      }).populate('courseId', 'title code')

      if (clash) {
        return res.status(409).json({
          error: `Venue clash: ${venue} is already booked ${clash.startTime}–${clash.endTime} on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]} for ${clash.courseId?.code ?? 'another course'}`
        })
      }
    }

    const slot = await ClassSlot.create({ courseId, dayOfWeek, startTime, endTime, venue: venue ?? '', academicPeriodId: academicPeriodId ?? null, createdBy: _id })
    const populated = await ClassSlot.findById(slot._id).populate('courseId', 'title code').lean()
    res.status(201).json({ slot: populated })
  } catch (err) { next(err) }
})

/** DELETE /api/v1/timetable/:id  [lecturer/admin] */
router.delete('/:id', ...auth, async (req, res, next) => {
  const { role } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    await ClassSlot.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
