import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import Announcement from '../models/Announcement.js'
import Enrollment from '../models/Enrollment.js'
import Course from '../models/Course.js'

import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { validateBody } from '../middleware/validate.js'
import { createAnnouncementSchema } from '../utils/schemas.js'

import { sendMail, templates } from '../utils/mailer.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

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
      query = {
        $or: [
          { courseId: { $in: courseIds } },
          { courseId: null, targetRole: { $in: ['all', 'student'] } }
        ]
      }
    } else if (role === 'lecturer') {
      const ownedCourses = await Course.find({ lecturerId: _id }).select('_id').lean()
      const ownedIds = ownedCourses.map(c => c._id)
      query = {
        $or: [
          { courseId: { $in: ownedIds } },
          { courseId: null, targetRole: { $in: ['all', 'lecturer'] } }
        ]
      }
    } else if (role === 'dept_head') {
      query = {
        $or: [
          { courseId: { $ne: null } },
          { courseId: null, targetRole: { $in: ['all', 'dept_head'] } }
        ]
      }
    }

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 }).limit(limit)
      .populate('postedBy', 'fullName').lean()

    const enriched = announcements.map(a => ({ ...a, postedByName: a.postedBy?.fullName }))
    res.json({ announcements: enriched })
  } catch (err) { next(err) }
})

/** POST /api/v1/announcements  [lecturer/admin/dept_head] */
router.post('/', ...auth, validateBody(createAnnouncementSchema), async (req, res, next) => {
  const { role, _id, fullName } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { courseId, message, title = 'Announcement', targetRole = 'all' } = req.body
    const targetCourseId = courseId === 'global' ? null : courseId

    // Lecturers can only post to courses they own
    if (targetCourseId && role === 'lecturer') {
      const course = await Course.findById(targetCourseId).lean()
      if (!course) return res.status(404).json({ error: 'Course not found' })
      if (course.lecturerId.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'You do not own this course' })
      }
    }

    const announcement = await Announcement.create({
      courseId: targetCourseId,
      title,
      message,
      targetRole,
      postedBy: _id,
    })

    // Dispatch in-app notifications and broadcast emails
    if (targetCourseId) {
      const enrollments = await Enrollment.find({ courseId: targetCourseId, status: 'active' }).populate('studentId')
      const notifs = enrollments.map((e) => ({
        recipientId: e.studentId?.clerkId || e.studentId?._id?.toString(),
        senderId: req.auth.userId,
        title: `Announcement: ${title}`,
        message: message.slice(0, 100),
        type: 'announcement',
        link: `/courses/${targetCourseId}`,
      })).filter(n => n.recipientId)

      if (notifs.length > 0) await Notification.insertMany(notifs)
    } else {
      // Global announcement -> target specified role(s)
      const userFilter = { deletedAt: null }
      if (targetRole !== 'all') {
        userFilter.role = targetRole
      }

      const targetUsers = await User.find(userFilter).select('clerkId email fullName role').lean()

      const notifs = targetUsers.map((u) => ({
        recipientId: u.clerkId || u._id.toString(),
        senderId: req.auth.userId,
        title: `Broadcast: ${title}`,
        message: message.slice(0, 100),
        type: 'announcement',
        link: '/dashboard',
      }))
      if (notifs.length > 0) await Notification.insertMany(notifs)

      // Send broadcast email to all targeted email addresses in background batches
      const eligibleUsers = targetUsers.filter(u => u.email && u.email.includes('@'))
      if (eligibleUsers.length > 0) {
        ;(async () => {
          const BATCH_SIZE = 5
          const DELAY_MS = 200
          for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
            const chunk = eligibleUsers.slice(i, i + BATCH_SIZE)
            await Promise.allSettled(
              chunk.map(u => {
                const emailData = templates.broadcastAnnouncement(
                  u.fullName || 'User',
                  fullName || 'Platform Administrator',
                  title,
                  message,
                  'https://nelms.njala.edu.sl/dashboard'
                )
                return sendMail({ to: u.email, subject: emailData.subject, html: emailData.html })
              })
            )
            if (i + BATCH_SIZE < eligibleUsers.length) {
              await new Promise(r => setTimeout(r, DELAY_MS))
            }
          }
        })().catch(e => console.warn('[ANNOUNCEMENT MAIL BATCH WARN]', e.message))
      }
    }

    res.status(201).json(announcement)
  } catch (err) { next(err) }
})

export default router
