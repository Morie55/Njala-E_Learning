import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import Announcement from '../models/Announcement.js'
import Enrollment from '../models/Enrollment.js'
import Course from '../models/Course.js'

import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { validateBody } from '../middleware/validate.js'
import { createAnnouncementSchema } from '../utils/schemas.js'

const router = Router()
const auth = [requireAuth, populateUser]

/** GET /api/v1/announcements  – relevant to current user */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const { role, _id } = req.dbUser
    const limit = parseInt(req.query.limit) || 20
    const courseId = req.query.courseId

    let query = {}
    if (courseId) {
      query = { courseId }
    } else if (role === 'student') {
      const enrollments = await Enrollment.find({ studentId: _id, status: 'active' }).lean()
      const courseIds = enrollments.map(e => e.courseId)
      query = { $or: [{ courseId: { $in: courseIds } }, { courseId: null }] }
    }

    const announcements = await Announcement.find(query)
      .sort({ postedAt: -1 }).limit(limit)
      .populate('postedBy', 'fullName').lean()

    const enriched = announcements.map(a => ({ ...a, postedByName: a.postedBy?.fullName }))
    res.json({ announcements: enriched })
  } catch (err) { next(err) }
})

/** POST /api/v1/announcements  [lecturer/admin/dept_head] */
router.post('/', ...auth, validateBody(createAnnouncementSchema), async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { courseId, message } = req.body
    const targetCourseId = courseId === 'global' ? null : courseId

    // Lecturers can only post to courses they own
    if (targetCourseId && role === 'lecturer') {
      const course = await Course.findById(targetCourseId).lean()
      if (!course) return res.status(404).json({ error: 'Course not found' })
      if (course.lecturerId.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'You do not own this course' })
      }
    }

    const announcement = await Announcement.create({ courseId: targetCourseId, message, postedBy: _id })

    // Dispatch notifications to target recipients
    if (targetCourseId) {
      const enrollments = await Enrollment.find({ courseId: targetCourseId, status: 'active' }).populate('studentId')
      const notifs = enrollments.map((e) => ({
        recipientId: e.studentId?.clerkId || e.studentId?._id?.toString(),
        senderId: req.auth.userId,
        title: 'New Course Announcement',
        message: message.slice(0, 100),
        type: 'announcement',
        link: `/courses/${targetCourseId}`,
      })).filter(n => n.recipientId)

      if (notifs.length > 0) await Notification.insertMany(notifs)
    } else {
      // Global announcement -> notify students
      const students = await User.find({ role: 'student' }).lean()
      const notifs = students.map((s) => ({
        recipientId: s.clerkId || s._id.toString(),
        senderId: req.auth.userId,
        title: 'Platform Announcement',
        message: message.slice(0, 100),
        type: 'announcement',
        link: '/dashboard',
      }))
      if (notifs.length > 0) await Notification.insertMany(notifs)
    }

    res.status(201).json(announcement)
  } catch (err) { next(err) }
})

export default router
