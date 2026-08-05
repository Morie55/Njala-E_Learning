import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, unique: true, index: true },
    fullName: { type: String, default: '' },
    role: { type: String, enum: ['student', 'lecturer', 'dept_head', 'admin'], default: 'student' },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    avatarUrl: { type: String, default: '' },
    idNumber: { type: String, default: '', index: true },

    // User Lifecycle Model (Supports legacy lowercase values for seamless backward compatibility)
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'ALUMNI', 'ARCHIVED', 'active', 'suspended', 'graduated', 'pending', 'approved', 'rejected', 'alumni', 'archived'],
      default: 'PENDING',
      set: (val) => {
        if (!val) return 'PENDING'
        const upper = String(val).toUpperCase()
        if (upper === 'GRADUATED') return 'ALUMNI'
        return upper
      },
      index: true,
    },
    roleSelected: { type: Boolean, default: false },
    requestedRole: {
      type: String,
      enum: ['student', 'lecturer', 'dept_head'],
      default: 'student',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
    mustChangePassword: { type: Boolean, default: false },
    activatedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, default: '' },
    alumniSince: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
    lastLiteracyCheckAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model('User', userSchema)
