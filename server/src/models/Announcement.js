import mongoose from 'mongoose'

const announcementSchema = new mongoose.Schema(
  {
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null }, // null = university-wide
    postedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message:     { type: String, required: true, minlength: 10 },
    postedAt:    { type: Date, default: Date.now },
  },
  { timestamps: true }
)

announcementSchema.index({ courseId: 1 })
announcementSchema.index({ postedAt: -1 })

export default mongoose.model('Announcement', announcementSchema)
