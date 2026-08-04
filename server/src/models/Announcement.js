import mongoose from 'mongoose'

const announcementSchema = new mongoose.Schema(
  {
    title:        { type: String, default: 'Announcement' },
    courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null }, // null = system or dept-wide
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null }, // for dept-wide announcements
    postedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message:      { type: String, required: true, minlength: 10 },
    targetRole:   { type: String, enum: ['all', 'student', 'lecturer', 'dept_head'], default: 'all' },
    postedAt:     { type: Date, default: Date.now },
  },
  { timestamps: true }
)

announcementSchema.index({ courseId: 1 })
announcementSchema.index({ departmentId: 1 })
announcementSchema.index({ postedAt: -1 })

export default mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema)
