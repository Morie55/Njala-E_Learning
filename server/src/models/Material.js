import mongoose from 'mongoose'

const materialSchema = new mongoose.Schema(
  {
    courseId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title:     { type: String, required: true, trim: true },
    type:      { type: String, enum: ['pdf', 'slides', 'video', 'link'], required: true },
    fileUrl:   { type: String, required: true },
    uploadedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

materialSchema.index({ courseId: 1 })

export default mongoose.model('Material', materialSchema)
