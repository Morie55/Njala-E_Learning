import mongoose from 'mongoose'

const enrollmentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    /** 'active' | 'dropped' | 'completed' | 'waitlisted' */
    status:    { type: String, enum: ['active', 'dropped', 'completed', 'waitlisted'], default: 'active' },
    progress:  { type: Number, default: 0, min: 0, max: 100 },
    /** Position in the waitlist (1-indexed). null when status !== 'waitlisted' */
    waitlistPosition: { type: Number, default: null },
  },
  { timestamps: true }
)

enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true })
enrollmentSchema.index({ studentId: 1, status: 1, courseId: 1 })
enrollmentSchema.index({ courseId: 1 })
enrollmentSchema.index({ courseId: 1, status: 1, waitlistPosition: 1 })

export default mongoose.model('Enrollment', enrollmentSchema)
