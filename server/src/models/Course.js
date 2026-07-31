import mongoose from 'mongoose'

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, default: '' },
    semester: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    rejectionReason: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    credits: { type: Number, default: 3 },
    creditHours: { type: Number, default: 3, min: 1, max: 12 },
    maxEnrollment: { type: Number, default: null }, // null = unlimited
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
courseSchema.index({ approvalStatus: 1 })

export default mongoose.models.Course || mongoose.model('Course', courseSchema)
