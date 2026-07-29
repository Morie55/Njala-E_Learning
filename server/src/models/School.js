import mongoose from 'mongoose'

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    headId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Head of School / Dean
  },
  { timestamps: true }
)

export default mongoose.models.School || mongoose.model('School', schoolSchema)
