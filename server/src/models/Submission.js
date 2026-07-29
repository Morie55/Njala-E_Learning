import mongoose from 'mongoose'

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl:      { type: String, default: '' },
    submittedAt:  { type: Date, default: Date.now },
    score:        { type: Number, default: null },
    feedback:     { type: String, default: '' },
    gradedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt:     { type: Date, default: null },
    isLate:       { type: Boolean, default: false },
    daysLate:     { type: Number, default: 0 },
  },
  { timestamps: true }
)

submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true })
submissionSchema.index({ studentId: 1, submittedAt: -1 })
submissionSchema.index({ assignmentId: 1, score: 1 })

export default mongoose.model('Submission', submissionSchema)
