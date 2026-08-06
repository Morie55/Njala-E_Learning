import mongoose from 'mongoose'

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    headId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Head of School / Dean
    isPrimary: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'upcoming', 'archived'], default: 'active' },
  },
  { timestamps: true }
)

export default mongoose.models.School || mongoose.model('School', schoolSchema)
