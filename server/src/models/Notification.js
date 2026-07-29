import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: String, // Clerk User ID or Mongo User ID
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      default: 'system',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['grade', 'announcement', 'assignment_due', 'course_update', 'system'],
      default: 'system',
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
