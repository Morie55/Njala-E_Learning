import mongoose from 'mongoose'

const rubricCriterionSchema = new mongoose.Schema({
  criterion:   { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  maxPoints:   { type: Number, required: true, min: 0 },
}, { _id: true })

const assignmentSchema = new mongoose.Schema(
  {
    courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title:        { type: String, required: true, trim: true },
    instructions: { type: String, default: '' },
    dueDate:      { type: Date, required: true },
    maxScore:     { type: Number, required: true, min: 1 },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Late Penalty Engine ──────────────────────────────
    /** 'none' | 'percent_per_day' | 'hard_cutoff' */
    latePenaltyType:   { type: String, enum: ['none', 'percent_per_day', 'hard_cutoff'], default: 'none' },
    /** Percentage deducted per day late (used when type=percent_per_day) */
    latePenaltyPerDay: { type: Number, default: 5, min: 0, max: 100 },
    /** Maximum total deduction as % of maxScore */
    maxPenaltyPct:     { type: Number, default: 25, min: 0, max: 100 },

    // ── Rubric Builder ───────────────────────────────────
    /** Optional marking rubric. If present, maxScore should equal sum of rubric maxPoints */
    rubric: { type: [rubricCriterionSchema], default: [] },

    // ── Submission type ──────────────────────────────────
    /** 'file' | 'text' | 'both' */
    submissionType: { type: String, enum: ['file', 'text', 'both'], default: 'file' },
  },
  { timestamps: true }
)

assignmentSchema.index({ courseId: 1 })
assignmentSchema.index({ dueDate: 1 })

export default mongoose.model('Assignment', assignmentSchema)
