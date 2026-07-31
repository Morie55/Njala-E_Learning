import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import EntryQualification from '../models/EntryQualification.js'
import User from '../models/User.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

const CREDIT_GRADES = new Set(['A1', 'B2', 'B3', 'C4', 'C5', 'C6'])

/** Helper to compute total credits and degree eligibility according to Njala admission policy */
function calculateWassceEligibility(subjects = []) {
  let totalCredits = 0
  let hasEnglishCredit = false
  let hasMathCredit = false

  const processedSubjects = subjects.map(s => {
    const isCredit = CREDIT_GRADES.has(s.grade)
    if (isCredit) totalCredits++

    const subLower = (s.subject || '').toLowerCase()
    if (subLower.includes('english') && isCredit) hasEnglishCredit = true
    if ((subLower.includes('math') || subLower.includes('mathematics')) && isCredit) hasMathCredit = true

    return {
      subject: s.subject,
      grade: s.grade,
      isCredit,
    }
  })

  // Degree eligibility: 5 or more credits including English and Mathematics
  const isDegreeEligible = totalCredits >= 5 && hasEnglishCredit && hasMathCredit

  return { processedSubjects, totalCredits, hasEnglishCredit, hasMathCredit, isDegreeEligible }
}

/** POST /api/v1/wassce/save — Save/Import WASSCE results for student */
router.post('/save', ...auth, async (req, res, next) => {
  try {
    const { indexNumber, examYear, examCenter, subjects, targetStudentId } = req.body

    // Students can update their own; admins/dept_heads can update for any student
    let studentId = req.dbUser._id
    if (targetStudentId && ['admin', 'dept_head'].includes(req.dbUser.role)) {
      studentId = targetStudentId
    }

    if (!indexNumber || !examYear || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'Index number, exam year, and subjects array are required.' })
    }

    const { processedSubjects, totalCredits, hasEnglishCredit, hasMathCredit, isDegreeEligible } =
      calculateWassceEligibility(subjects)

    const record = await EntryQualification.findOneAndUpdate(
      { studentId },
      {
        $set: {
          indexNumber: indexNumber.trim(),
          examYear: Number(examYear),
          examCenter: (examCenter || '').trim(),
          subjects: processedSubjects,
          totalCredits,
          hasEnglishCredit,
          hasMathCredit,
          isDegreeEligible,
        },
      },
      { upsert: true, returnDocument: 'after' }
    )

    res.status(200).json({
      message: 'WASSCE qualification results saved successfully',
      qualification: record,
    })
  } catch (err) { next(err) }
})

/** GET /api/v1/wassce/me — Get current student's WASSCE result record */
router.get('/me', ...auth, async (req, res, next) => {
  try {
    const record = await EntryQualification.findOne({ studentId: req.dbUser._id }).lean()
    res.json({ qualification: record || null })
  } catch (err) { next(err) }
})

/** GET /api/v1/wassce/student/:studentId — Admin / Dept Head inspect student WASSCE record */
router.get('/student/:studentId', ...auth, async (req, res, next) => {
  if (!['admin', 'dept_head', 'lecturer'].includes(req.dbUser.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  try {
    const record = await EntryQualification.findOne({ studentId: req.params.studentId })
      .populate('studentId', 'fullName email idNumber')
      .lean()
    res.json({ qualification: record || null })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/wassce/:id/verify — Admin verify official WAEC result slip */
router.patch('/:id/verify', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  try {
    const { status } = req.body // 'verified' | 'rejected'
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "verified" or "rejected".' })
    }

    const record = await EntryQualification.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          verificationStatus: status,
          verifiedBy: req.dbUser._id,
          verifiedAt: new Date(),
        },
      },
      { new: true }
    )

    res.json({ message: `WASSCE result ${status} successfully`, qualification: record })
  } catch (err) { next(err) }
})

export default router
