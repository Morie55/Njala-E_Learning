import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import Payment from '../models/Payment.js'
import User from '../models/User.js'
import { sendMail, templates } from '../utils/mailer.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

const MONIME_BASE_URL   = 'https://api.monime.io/v1'
const MONIME_TOKEN      = process.env.MONIME_ACCESS_TOKEN || ''
const MONIME_SPACE_ID   = process.env.MONIME_SPACE_ID     || ''
const CLIENT_BASE_URL   = process.env.CLIENT_URL          || 'http://localhost:5173'

/** Fee amounts in SLE */
const FEE_AMOUNTS = {
  registration: 500_000,  // SLE 500,000
  tuition:    1_200_000,  // SLE 1,200,000 per semester
  resit:         50_000,  // SLE 50,000 per resit
  library:       30_000,
  hostel:       800_000,
  other:         10_000,
}

const FEE_LABELS = {
  registration: 'Registration Fee',
  tuition:      'Tuition Fee',
  resit:        'Resit Fee',
  library:      'Library Fee',
  hostel:       'Hostel Fee',
  other:        'Other Fee',
}

/**
 * POST /api/v1/payments/initiate
 * Creates a Monime checkout session and saves a pending payment record.
 */
router.post('/initiate', ...auth, async (req, res, next) => {
  try {
    const { _id, role, email, fullName } = req.dbUser
    if (role !== 'student') return res.status(403).json({ error: 'Only students can initiate payments' })

    const { type, description, semester, academicYear } = req.body
    if (!type || !FEE_AMOUNTS[type]) {
      return res.status(400).json({ error: `Invalid fee type. Must be one of: ${Object.keys(FEE_AMOUNTS).join(', ')}` })
    }

    const amount = FEE_AMOUNTS[type]
    const idempotencyKey = uuidv4()
    const label = FEE_LABELS[type]

    // Call Monime API
    let monimeData = null
    if (MONIME_TOKEN && MONIME_SPACE_ID) {
      const monimeRes = await fetch(`${MONIME_BASE_URL}/checkout-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MONIME_TOKEN}`,
          'Monime-Space-Id': MONIME_SPACE_ID,
          'Idempotency-Key': idempotencyKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Njala University — ${label}`,
          lineItems: [
            {
              type: 'custom',
              name: label,
              description: description || `${label} — ${academicYear ?? ''} ${semester ?? ''}`.trim(),
              price: { currency: 'SLE', value: amount },
              quantity: 1,
            },
          ],
          successUrl: `${CLIENT_BASE_URL}/payments?status=success&ref=${idempotencyKey}`,
          cancelUrl:  `${CLIENT_BASE_URL}/payments?status=cancelled`,
          metadata: {
            studentId: _id.toString(),
            studentName: fullName,
            feeType: type,
            idempotencyKey,
          },
        }),
      })

      if (!monimeRes.ok) {
        const err = await monimeRes.json()
        return res.status(502).json({ error: 'Monime API error: ' + (err?.message ?? monimeRes.statusText) })
      }
      monimeData = await monimeRes.json()
    }

    // Save pending payment
    const payment = await Payment.create({
      studentId: _id,
      sessionId: monimeData?.id ?? `demo_${idempotencyKey}`,
      type,
      description: description || label,
      amount,
      currency: 'SLE',
      status: 'pending',
      checkoutUrl: monimeData?.redirectUrl ?? monimeData?.url ?? `${CLIENT_BASE_URL}/payments?demo=true`,
      academicYear: academicYear ?? '',
      semester: semester ?? '',
    })

    res.status(201).json({
      paymentId: payment._id,
      checkoutUrl: payment.checkoutUrl,
      amount,
      currency: 'SLE',
      label,
    })
  } catch (err) { next(err) }
})

/**
 * POST /api/v1/payments/webhook
 * Receives Monime webhook events. No auth needed — verified by checking sessionId exists.
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body
    if (event?.type !== 'checkout_session.completed') {
      return res.json({ received: true })
    }

    const sessionId = event?.data?.id
    if (!sessionId) return res.status(400).json({ error: 'Missing session ID' })

    const payment = await Payment.findOne({ sessionId })
    if (!payment) return res.status(404).json({ error: 'Payment not found' })

    payment.status = 'completed'
    payment.reference = event?.data?.reference ?? event?.data?.id
    payment.webhookPayload = event
    await payment.save()

    // Send receipt email
    const student = await User.findById(payment.studentId).lean()
    if (student?.email) {
      const tmpl = templates.paymentReceipt(
        student.fullName,
        payment.amount,
        FEE_LABELS[payment.type] ?? payment.type,
        payment.reference,
        new Date()
      )
      await sendMail({ to: student.email, ...tmpl })
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[webhook] Error:', err.message)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

/**
 * GET /api/v1/payments/my — Student's own payment history
 */
router.get('/my', ...auth, async (req, res, next) => {
  try {
    const { _id } = req.dbUser
    const payments = await Payment.find({ studentId: _id })
      .sort({ createdAt: -1 })
      .lean()
    res.json({ payments })
  } catch (err) { next(err) }
})

/**
 * GET /api/v1/payments — Admin: all payments
 */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const { role } = req.dbUser
    if (!['admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

    const { status, type, page = 1, limit = 25 } = req.query
    const filter = {}
    if (status) filter.status = status
    if (type) filter.type = type

    const total = await Payment.countDocuments(filter)
    const payments = await Payment.find(filter)
      .populate('studentId', 'fullName email idNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean()

    res.json({
      payments,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    })
  } catch (err) { next(err) }
})

/**
 * GET /api/v1/payments/fee-schedule — Returns all fee types with amounts
 */
router.get('/fee-schedule', ...auth, async (_req, res) => {
  res.json({
    currency: 'SLE',
    fees: Object.entries(FEE_AMOUNTS).map(([type, amount]) => ({
      type,
      label: FEE_LABELS[type],
      amount,
    })),
  })
})

export default router
