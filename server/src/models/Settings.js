import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    label: { type: String, default: '' },
    group: { type: String, default: 'general' },
  },
  { timestamps: true }
)

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema)
