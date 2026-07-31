import mongoose from 'mongoose'

const subjectGradeSchema = new mongoose.Schema({
  subject:   { type: String, required: true },
  grade:     { type: String, required: true, enum: ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'] },
  isCredit:  { type: Boolean, default: false },
}, { _id: false })

const entryQualificationSchema = new mongoose.Schema(
  {
    studentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    indexNumber:   { type: String, required: true, trim: true },
    examYear:      { type: Number, required: true },
    examCenter:    { type: String, default: '' },
    subjects:      { type: [subjectGradeSchema], default: [] },
    totalCredits:  { type: Number, default: 0 },
    hasEnglishCredit: { type: Boolean, default: false },
    hasMathCredit:    { type: Boolean, default: false },
    isDegreeEligible: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ['unverified', 'verified', 'rejected'], default: 'unverified' },
    verifiedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedAt:    { type: Date, default: null },
  },
  { timestamps: true }
)

entryQualificationSchema.index({ indexNumber: 1 })

export default mongoose.model('EntryQualification', entryQualificationSchema)
