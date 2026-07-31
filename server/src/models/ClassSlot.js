import mongoose from 'mongoose'

const classSlotSchema = new mongoose.Schema(
  {
    courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    /** 0=Sunday … 6=Saturday */
    dayOfWeek:  { type: Number, required: true, min: 0, max: 6 },
    startTime:  { type: String, required: true },   // "HH:MM" 24h
    endTime:    { type: String, required: true },
    venue:      { type: String, default: '' },
    academicPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicPeriod', default: null },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

classSlotSchema.index({ courseId: 1, dayOfWeek: 1 })
classSlotSchema.index({ venue: 1, dayOfWeek: 1 })

export default mongoose.models.ClassSlot || mongoose.model('ClassSlot', classSlotSchema)
