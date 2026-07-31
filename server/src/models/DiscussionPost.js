import mongoose from 'mongoose'

const replySchema = new mongoose.Schema(
  {
    authorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body:      { type: String, required: true, trim: true, maxLength: 5000 },
    likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    edited:    { type: Boolean, default: false },
  },
  { timestamps: true }
)

const discussionPostSchema = new mongoose.Schema(
  {
    courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    authorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title:     { type: String, required: true, trim: true, maxLength: 200 },
    body:      { type: String, required: true, trim: true, maxLength: 10000 },
    pinned:    { type: Boolean, default: false },
    closed:    { type: Boolean, default: false },
    likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies:   [replySchema],
    views:     { type: Number, default: 0 },
  },
  { timestamps: true }
)

discussionPostSchema.index({ courseId: 1, createdAt: -1 })
discussionPostSchema.index({ authorId: 1 })

export default mongoose.models.DiscussionPost || mongoose.model('DiscussionPost', discussionPostSchema)
