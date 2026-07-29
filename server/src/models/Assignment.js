import mongoose from 'mongoose'

const assignmentSchema = new mongoose.Schema(
  {
    courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title:        { type: String, required: true, trim: true },
    instructions: { type: String, default: '' },
    dueDate:      { type: Date, required: true },
    maxScore:     { type: Number, required: true, min: 1 },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

assignmentSchema.index({ courseId: 1 })
assignmentSchema.index({ dueDate: 1 })

export default mongoose.model('Assignment', assignmentSchema)
