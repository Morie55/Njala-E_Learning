import mongoose from 'mongoose'

const rubricScoreSchema = new mongoose.Schema({
  criterionId: { type: mongoose.Schema.Types.ObjectId },
  criterion:   { type: String },
  score:       { type: Number, default: 0 },
  maxPoints:   { type: Number, default: 0 },
}, { _id: false })

const plagiarismMatchSchema = new mongoose.Schema({
  matchedStudentName: { type: String, default: 'Peer Submission' },
  matchedSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  similarityPct:       { type: Number, default: 0 },
  matchedSnippet:      { type: String, default: '' },
}, { _id: false })

const submissionSchema = new mongoose.Schema(
  {
    assignmentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl:       { type: String, default: '' },
    textContent:   { type: String, default: '' },
    submittedAt:   { type: Date, default: Date.now },

    // ── Grading ──────────────────────────────────────────
    score:         { type: Number, default: null },
    /** Score after applying late penalty */
    finalScore:    { type: Number, default: null },
    /** Points deducted due to late submission */
    penaltyDeducted: { type: Number, default: 0 },
    feedback:      { type: String, default: '' },
    gradedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt:      { type: Date, default: null },

    // ── Rubric scores ────────────────────────────────────
    rubricScores:  { type: [rubricScoreSchema], default: [] },

    // ── Late tracking ────────────────────────────────────
    isLate:        { type: Boolean, default: false },
    daysLate:      { type: Number, default: 0 },

    // ── Plagiarism Detection ──────────────────────────────
    plagiarismScore:   { type: Number, default: null },
    plagiarismStatus:  { type: String, enum: ['unchecked', 'checking', 'checked', 'flagged'], default: 'unchecked' },
    plagiarismMatches: { type: [plagiarismMatchSchema], default: [] },
  },
  { timestamps: true }
)

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true })
submissionSchema.index({ studentId: 1, submittedAt: -1 })
submissionSchema.index({ assignmentId: 1, score: 1 })
submissionSchema.index({ assignmentId: 1, plagiarismScore: -1 })

export default mongoose.model('Submission', submissionSchema)
