import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    senderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    content:     { type: String, required: true, trim: true },
    attachments: [
      {
        name:     { type: String },
        url:      { type: String },
        fileType: { type: String },
      },
    ],
    isRead:      { type: Boolean, default: false, index: true },
    readAt:      { type: Date, default: null },
  },
  { timestamps: true }
)

// Index for efficient thread loading and unread count queries
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 })
messageSchema.index({ recipientId: 1, isRead: 1 })

export default mongoose.models.Message || mongoose.model('Message', messageSchema)
