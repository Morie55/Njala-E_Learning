import mongoose from 'mongoose'

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, default: '' },
    semester: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
    credits: { type: Number, default: 3 },
    thumbnailUrl: { type: String, default: '' },
    lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  },
  { timestamps: true }
)

courseSchema.index({ lecturerId: 1 })
courseSchema.index({ schoolId: 1 })
courseSchema.index({ departmentId: 1 })
courseSchema.index({ status: 1 })

export default mongoose.models.Course || mongoose.model('Course', courseSchema)
