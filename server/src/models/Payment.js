import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** Monime checkout session ID */
    sessionId: { type: String, required: true, unique: true },

    /** Fee type */
    type: {
      type: String,
      enum: ['registration', 'tuition', 'resit', 'library', 'hostel', 'other'],
      required: true,
    },

    description: { type: String, default: '' },

    /** Amount in SLE (Sierra Leonean Leone) */
    amount: { type: Number, required: true, min: 0 },

    currency: { type: String, default: 'SLE' },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },

    /** Monime-generated payment reference (set on webhook) */
    reference: { type: String, default: '' },

    /** URL student is redirected to for payment */
    checkoutUrl: { type: String, default: '' },

    /** Raw Monime webhook payload (for audit) */
    webhookPayload: { type: mongoose.Schema.Types.Mixed },

    academicYear: { type: String, default: '' },
    semester: { type: String, default: '' },
  },
  { timestamps: true }
)

paymentSchema.index({ studentId: 1, status: 1 })
paymentSchema.index({ createdAt: -1 })

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema)
