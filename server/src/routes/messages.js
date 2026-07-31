import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import Enrollment from '../models/Enrollment.js'
import Course from '../models/Course.js'
import Notification from '../models/Notification.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/**
 * GET /api/v1/messages/contacts
 * Returns context-aware contacts for messaging.
 * - Students: Lecturers of their enrolled courses.
 * - Lecturers: Students enrolled in their courses.
 * - Admins/Dept Heads: All active users.
 */
router.get('/contacts', ...auth, async (req, res, next) => {
  try {
    const { _id, role } = req.dbUser
    let contacts = []

    if (role === 'student') {
      const enrollments = await Enrollment.find({ studentId: _id, status: 'active' }).lean()
      const courseIds = enrollments.map(e => e.courseId)
      const courses = await Course.find({ _id: { $in: courseIds } }).select('lecturerId title code').lean()
      const lecturerIds = [...new Set(courses.map(c => c.lecturerId.toString()))]

      const lecturers = await User.find({ _id: { $in: lecturerIds } }).select('fullName email role departmentId').lean()
      contacts = lecturers.map(l => {
        const taught = courses.filter(c => c.lecturerId.toString() === l._id.toString())
        return {
          ...l,
          context: taught.map(c => c.code).join(', '),
        }
      })
    } else if (role === 'lecturer') {
      const myCourses = await Course.find({ lecturerId: _id }).select('_id title code').lean()
      const courseIds = myCourses.map(c => c._id)
      const enrollments = await Enrollment.find({ courseId: { $in: courseIds }, status: 'active' })
        .populate('studentId', 'fullName email idNumber role').lean()

      const studentMap = new Map()
      enrollments.forEach(e => {
        if (e.studentId) {
          studentMap.set(e.studentId._id.toString(), e.studentId)
        }
      })
      contacts = Array.from(studentMap.values())
    } else {
      // admin, dept_head: all users
      contacts = await User.find({ _id: { $ne: _id }, status: 'active' })
        .select('fullName email role idNumber')
        .limit(100)
        .lean()
    }

    res.json({ contacts })
  } catch (err) { next(err) }
})

/**
 * GET /api/v1/messages/conversations
 * Returns recent conversation threads for the logged-in user.
 */
router.get('/conversations', ...auth, async (req, res, next) => {
  try {
    const userId = req.dbUser._id

    // Find all distinct counterpart user IDs where current user is sender or recipient
    const messages = await Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }]
    })
      .sort({ createdAt: -1 })
      .populate('senderId', 'fullName email role')
      .populate('recipientId', 'fullName email role')
      .lean()

    const convMap = new Map()
    for (const m of messages) {
      const counterpart = m.senderId._id.toString() === userId.toString() ? m.recipientId : m.senderId
      if (!counterpart?._id) continue

      const key = counterpart._id.toString()
      if (!convMap.has(key)) {
        convMap.set(key, {
          counterpart,
          lastMessage: m,
          unreadCount: 0,
        })
      }

      if (m.recipientId._id.toString() === userId.toString() && !m.isRead) {
        const item = convMap.get(key)
        item.unreadCount += 1
      }
    }

    res.json({ conversations: Array.from(convMap.values()) })
  } catch (err) { next(err) }
})

/**
 * GET /api/v1/messages/thread/:otherUserId
 * Returns message history with a specific contact and marks unread messages as read.
 */
router.get('/thread/:otherUserId', ...auth, async (req, res, next) => {
  try {
    const userId = req.dbUser._id
    const { otherUserId } = req.params

    const otherUser = await User.findById(otherUserId).select('fullName email role').lean()
    if (!otherUser) return res.status(404).json({ error: 'User not found' })

    // Mark unread messages sent by otherUser to userId as read
    await Message.updateMany(
      { senderId: otherUserId, recipientId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    )

    const thread = await Message.find({
      $or: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('courseId', 'title code')
      .lean()

    res.json({ otherUser, messages: thread })
  } catch (err) { next(err) }
})

async function canMessage(senderId, senderRole, recipientId, recipientRole) {
  if (['admin', 'dept_head'].includes(senderRole) || ['admin', 'dept_head'].includes(recipientRole)) {
    return true
  }

  const courseIds = await Course.find({
    lecturerId: senderRole === 'lecturer' ? senderId : recipientId,
  }).distinct('_id')

  const sharedCourse = await Enrollment.exists({
    studentId: senderRole === 'student' ? senderId : recipientId,
    courseId: { $in: courseIds },
    status: 'active',
  })

  return Boolean(sharedCourse)
}

/**
 * POST /api/v1/messages
 * Send a direct message.
 */
router.post('/', ...auth, async (req, res, next) => {
  try {
    const { recipientId, content, courseId, attachments } = req.body
    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ error: 'Recipient and content are required' })
    }

    const recipient = await User.findById(recipientId).lean()
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' })

    if (!(await canMessage(req.dbUser._id, req.dbUser.role, recipientId, recipient.role))) {
      return res.status(403).json({ error: 'You can only message lecturers or students you share a course with' })
    }

    const message = await Message.create({
      senderId: req.dbUser._id,
      recipientId,
      courseId: courseId || null,
      content: content.trim(),
      attachments: attachments || [],
    })

    // Send in-app notification to recipient
    await Notification.create({
      recipientId: recipient.clerkId || recipient._id.toString(),
      senderId: req.auth.userId,
      title: `New Message from ${req.dbUser.fullName}`,
      message: content.length > 60 ? `${content.substring(0, 60)}…` : content,
      type: 'info',
      link: '/messages',
    }).catch(() => {})

    const populated = await Message.findById(message._id)
      .populate('senderId', 'fullName email')
      .populate('recipientId', 'fullName email')
      .lean()

    res.status(201).json({ message: populated })
  } catch (err) { next(err) }
})

export default router
