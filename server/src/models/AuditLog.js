import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: String, // Clerk User ID
      required: true,
      index: true,
    },
    performedByEmail: {
      type: String,
      default: '',
    },
    performedByRole: {
      type: String,
      default: '',
    },
    action: {
      type: String,
      required: true, // e.g., ROLE_CHANGE, GRADE_SUBMISSION, DELETE_DEPARTMENT, COURSE_UPDATE
    },
    targetModel: {
      type: String,
      required: true, // User, Course, Submission, Department, etc.
    },
    targetId: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema)
