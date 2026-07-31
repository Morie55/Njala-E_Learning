import mongoose from 'mongoose'

const academicPeriodSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },  // e.g. "2025/2026 - Semester 1"
    academicYear:    { type: String, required: true, trim: true },  // e.g. "2025/2026"
    semester:        { type: String, required: true, trim: true },  // e.g. "First Semester"
    startDate:       { type: Date, required: true },
    endDate:         { type: Date, required: true },
    enrollmentOpen:  { type: Date, required: true },
    enrollmentClose: { type: Date, required: true },
    examStart:       { type: Date, default: null },
    examEnd:         { type: Date, default: null },
    /** Only one period should be active at a time */
    isActive:        { type: Boolean, default: false, index: true },
    createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

academicPeriodSchema.index({ academicYear: 1, semester: 1 })

export default mongoose.models.AcademicPeriod || mongoose.model('AcademicPeriod', academicPeriodSchema)
