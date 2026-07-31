import mongoose from 'mongoose'

const materialProgressSchema = new mongoose.Schema(
  {
    studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    materialId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

materialProgressSchema.index({ studentId: 1, courseId: 1 })
materialProgressSchema.index({ studentId: 1, materialId: 1 }, { unique: true })

export default mongoose.models.MaterialProgress || mongoose.model('MaterialProgress', materialProgressSchema)
