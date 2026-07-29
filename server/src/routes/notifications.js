import express from 'express'
import Notification from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// GET /api/notifications — Fetch user's notifications and unread count
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(20)

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      read: false,
    })

    res.json({ notifications, unreadCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/notifications/:id/read — Mark single notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: userId },
      { read: true },
      { returnDocument: 'after' }
    )

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ notification })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/notifications/read-all — Mark all notifications for user as read
router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId
    await Notification.updateMany({ recipientId: userId, read: false }, { read: true })
    res.json({ message: 'All notifications marked as read' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
