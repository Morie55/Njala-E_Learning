import mongoose from 'mongoose'

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  },
  { timestamps: true }
)

// Unique department code within a single school
departmentSchema.index({ schoolId: 1, code: 1 }, { unique: true })

export default mongoose.models.Department || mongoose.model('Department', departmentSchema)
