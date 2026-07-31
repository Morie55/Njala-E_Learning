import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import AttendanceSession from '../models/AttendanceSession.js'
import Course from '../models/Course.js'
import Enrollment from '../models/Enrollment.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** POST /api/v1/attendance — Create a new attendance session [lecturer] */
router.post('/', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { courseId, topic, records, date } = req.body
    if (!courseId) return res.status(400).json({ error: 'courseId is required' })

    const course = await Course.findById(courseId).lean()
    if (!course) return res.status(404).json({ error: 'Course not found' })
    if (role === 'lecturer' && course.lecturerId.toString() !== _id.toString()) {
      return res.status(403).json({ error: 'You do not own this course' })
    }

    // If no records provided, auto-populate with all enrolled students marked absent
    let sessionRecords = records
    if (!sessionRecords || sessionRecords.length === 0) {
      const enrollments = await Enrollment.find({ courseId, status: 'active' }).lean()
      sessionRecords = enrollments.map(e => ({ studentId: e.studentId, status: 'absent' }))
    }

    const session = await AttendanceSession.create({
      courseId,
      lecturerId: _id,
      date: date ? new Date(date) : new Date(),
      topic: topic || '',
      records: sessionRecords,
    })
    res.status(201).json(session)
  } catch (err) { next(err) }
})

/** PATCH /api/v1/attendance/:id — Update attendance records for a session */
router.patch('/:id', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const session = await AttendanceSession.findById(req.params.id)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    if (role === 'lecturer' && session.lecturerId.toString() !== _id.toString()) {
      return res.status(403).json({ error: 'You do not own this session' })
    }
    const { records, topic } = req.body
    if (records) session.records = records
    if (topic !== undefined) session.topic = topic
    await session.save()
    res.json(session)
  } catch (err) { next(err) }
})

/** GET /api/v1/attendance/course/:courseId — All sessions for a course */
router.get('/course/:courseId', ...auth, async (req, res, next) => {
  try {
    const sessions = await AttendanceSession.find({ courseId: req.params.courseId })
      .sort({ date: -1 })
      .populate('records.studentId', 'fullName email idNumber')
      .lean()
    res.json({ sessions })
  } catch (err) { next(err) }
})

/** GET /api/v1/attendance/course/:courseId/summary — Per-student attendance summary */
router.get('/course/:courseId/summary', ...auth, async (req, res, next) => {
  try {
    const sessions = await AttendanceSession.find({ courseId: req.params.courseId })
      .populate('records.studentId', 'fullName email idNumber')
      .lean()

    const totalSessions = sessions.length
    const studentMap = {}

    for (const session of sessions) {
      for (const record of session.records) {
        const sid = record.studentId?._id?.toString()
        if (!sid) continue
        if (!studentMap[sid]) {
          studentMap[sid] = {
            student: record.studentId,
            present: 0, absent: 0, late: 0, excused: 0,
          }
        }
        studentMap[sid][record.status] = (studentMap[sid][record.status] || 0) + 1
      }
    }

    const summary = Object.values(studentMap).map(s => ({
      ...s,
      total: totalSessions,
      attendanceRate: totalSessions > 0
        ? Math.round(((s.present + s.late + s.excused) / totalSessions) * 100)
        : 0,
    }))

    res.json({ totalSessions, summary })
  } catch (err) { next(err) }
})

/** GET /api/v1/attendance/my — Student's own attendance across all courses */
router.get('/my', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const { _id } = req.dbUser
    const enrollments = await Enrollment.find({ studentId: _id, status: 'active' }).populate('courseId', 'title code').lean()
    const courseIds = enrollments.map(e => e.courseId?._id)

    const results = await Promise.all(enrollments.map(async (enr) => {
      const courseId = enr.courseId?._id
      if (!courseId) return null
      const sessions = await AttendanceSession.find({ courseId }).lean()
      const total = sessions.length
      let present = 0, absent = 0, late = 0, excused = 0
      for (const s of sessions) {
        const record = s.records.find(r => r.studentId.toString() === _id.toString())
        if (record) {
          if (record.status === 'present') present++
          else if (record.status === 'absent') absent++
          else if (record.status === 'late') late++
          else if (record.status === 'excused') excused++
        }
      }
      const attended = present + late + excused
      return {
        course: enr.courseId,
        total,
        present, absent, late, excused,
        attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 100,
        belowThreshold: total > 0 && Math.round((attended / total) * 100) < 75,
      }
    }))

    res.json({ attendance: results.filter(Boolean) })
  } catch (err) { next(err) }
})

/** DELETE /api/v1/attendance/:id — Delete a session [admin/dept_head] */
router.delete('/:id', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    await AttendanceSession.findByIdAndDelete(req.params.id)
    res.json({ message: 'Session deleted' })
  } catch (err) { next(err) }
})

export default router
