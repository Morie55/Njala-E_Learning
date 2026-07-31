import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import { Quiz, Question, QuizAttempt } from '../models/Quiz.js'
import Enrollment from '../models/Enrollment.js'
import Notification from '../models/Notification.js'
import Course from '../models/Course.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

// ─────────────────────────────────────────────────────────────────────────────
// LECTURER / ADMIN — Quiz Management
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/v1/quizzes?courseId=  — List quizzes for a course */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const { courseId } = req.query
    const { _id, role } = req.dbUser
    const filter = {}
    if (courseId) filter.courseId = courseId
    if (role === 'lecturer') filter.createdBy = _id  // lecturers see their own quizzes only
    if (role === 'student') filter.status = 'published'  // students see published only

    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 }).lean()
    // For students: attach attempt count
    if (role === 'student') {
      const enriched = await Promise.all(quizzes.map(async q => {
        const attempts = await QuizAttempt.countDocuments({ quizId: q._id, studentId: _id })
        const lastAttempt = await QuizAttempt.findOne({ quizId: q._id, studentId: _id }).sort({ startedAt: -1 }).lean()
        return { ...q, attemptCount: attempts, lastAttempt }
      }))
      return res.json({ quizzes: enriched })
    }

    res.json({ quizzes })
  } catch (err) { next(err) }
})

/** POST /api/v1/quizzes  [lecturer/admin] — Create quiz */
router.post('/', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { courseId, title, description, duration, maxAttempts, passMark, questionOrder, startAt, endAt, showAnswers, questions } = req.body
    if (!courseId || !title) return res.status(400).json({ error: 'courseId and title are required' })

    const quiz = await Quiz.create({ courseId, title, description, duration, maxAttempts, passMark, questionOrder, startAt, endAt, showAnswers, createdBy: _id })

    // Bulk-insert questions if provided
    if (Array.isArray(questions) && questions.length > 0) {
      const qs = questions.map((q, i) => ({ ...q, quizId: quiz._id, order: i }))
      await Question.insertMany(qs)
    }

    res.status(201).json({ quiz })
  } catch (err) { next(err) }
})

/** GET /api/v1/quizzes/:id  — Get quiz with questions */
router.get('/:id', ...auth, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean()
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

    const { role, _id } = req.dbUser
    let questions = await Question.find({ quizId: req.params.id }).sort({ order: 1 }).lean()

    // For students: hide correct answers
    if (role === 'student') {
      if (quiz.status !== 'published') return res.status(403).json({ error: 'Quiz not available' })
      questions = questions.map(q => ({
        ...q,
        correctAnswer: undefined,
        options: q.options.map(o => ({ _id: o._id, text: o.text })),  // hide isCorrect
        explanation: undefined,
      }))
    }

    // Randomise if set
    if (quiz.questionOrder === 'random' && role === 'student') {
      questions = questions.sort(() => Math.random() - 0.5)
    }

    res.json({ quiz, questions })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/quizzes/:id  [lecturer/admin] */
router.patch('/:id', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' })
    res.json({ quiz })
  } catch (err) { next(err) }
})

/** DELETE /api/v1/quizzes/:id  [lecturer/admin] */
router.delete('/:id', ...auth, async (req, res, next) => {
  const { role } = req.dbUser
  if (!['lecturer', 'admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    await Promise.all([
      Quiz.findByIdAndDelete(req.params.id),
      Question.deleteMany({ quizId: req.params.id }),
      QuizAttempt.deleteMany({ quizId: req.params.id }),
    ])
    res.json({ success: true })
  } catch (err) { next(err) }
})

/** POST /api/v1/quizzes/:id/questions  [lecturer] — Add/replace questions */
router.post('/:id/questions', ...auth, async (req, res, next) => {
  const { role } = req.dbUser
  if (!['lecturer', 'admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { questions } = req.body
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions array required' })
    await Question.deleteMany({ quizId: req.params.id })
    const qs = questions.map((q, i) => ({ ...q, quizId: req.params.id, order: i }))
    const saved = await Question.insertMany(qs)
    res.json({ questions: saved })
  } catch (err) { next(err) }
})

/** GET /api/v1/quizzes/:id/results  [lecturer/admin] — All attempts */
router.get('/:id/results', ...auth, async (req, res, next) => {
  const { role } = req.dbUser
  if (!['lecturer', 'admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const attempts = await QuizAttempt.find({ quizId: req.params.id })
      .populate('studentId', 'fullName idNumber email')
      .sort({ submittedAt: -1 }).lean()
    res.json({ attempts })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT — Attempting Quizzes
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/v1/quizzes/:id/attempt/start  [student] — Begin a quiz attempt */
router.post('/:id/attempt/start', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const quiz = await Quiz.findById(req.params.id).lean()
    if (!quiz || quiz.status !== 'published') return res.status(404).json({ error: 'Quiz not available' })

    // Check enrollment
    const enrolled = await Enrollment.exists({ courseId: quiz.courseId, studentId: req.dbUser._id, status: 'active' })
    if (!enrolled) return res.status(403).json({ error: 'Not enrolled in this course' })

    // Check window
    const now = new Date()
    if (quiz.startAt && now < new Date(quiz.startAt)) return res.status(403).json({ error: 'Quiz has not started yet' })
    if (quiz.endAt && now > new Date(quiz.endAt)) return res.status(403).json({ error: 'Quiz window has closed' })

    // Check max attempts
    const attemptCount = await QuizAttempt.countDocuments({ quizId: req.params.id, studentId: req.dbUser._id })
    if (quiz.maxAttempts && attemptCount >= quiz.maxAttempts) {
      return res.status(403).json({ error: `Maximum ${quiz.maxAttempts} attempt(s) reached` })
    }

    // Check no in-progress attempt
    const inProgress = await QuizAttempt.findOne({ quizId: req.params.id, studentId: req.dbUser._id, status: 'in_progress' })
    if (inProgress) return res.json({ attempt: inProgress, resumed: true })

    const questions = await Question.find({ quizId: req.params.id }).lean()
    const maxScore = questions.reduce((s, q) => s + q.points, 0)

    const attempt = await QuizAttempt.create({
      quizId: req.params.id,
      studentId: req.dbUser._id,
      maxScore,
      startedAt: new Date(),
    })
    res.status(201).json({ attempt, maxScore })
  } catch (err) { next(err) }
})

/** POST /api/v1/quizzes/:id/attempt/submit  [student] — Submit answers & auto-grade */
router.post('/:id/attempt/submit', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const { attemptId, answers } = req.body  // answers: { [questionId]: string }
    const attempt = await QuizAttempt.findOne({ _id: attemptId, studentId: req.dbUser._id, status: 'in_progress' })
    if (!attempt) return res.status(404).json({ error: 'Active attempt not found' })

    const quiz = await Quiz.findById(req.params.id).lean()
    const questions = await Question.find({ quizId: req.params.id }).lean()

    let score = 0
    const gradedAnswers = {}
    let needsManualGrading = false

    for (const q of questions) {
      const studentAnswer = answers?.[q._id.toString()] ?? ''
      gradedAnswers[q._id.toString()] = studentAnswer

      if (q.type === 'mcq') {
        const correct = q.options.find(o => o.isCorrect)
        if (correct && studentAnswer === correct._id.toString()) score += q.points
      } else if (q.type === 'truefalse') {
        if (studentAnswer?.toLowerCase() === q.correctAnswer?.toLowerCase()) score += q.points
      } else if (q.type === 'short_answer') {
        // Case-insensitive exact match
        if (studentAnswer?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase()) score += q.points
        else needsManualGrading = true  // short answers may need review
      } else {
        needsManualGrading = true  // essays always need manual grading
      }
    }

    const pct = attempt.maxScore > 0 ? Math.round((score / attempt.maxScore) * 100) : 0
    const passed = pct >= (quiz.passMark ?? 50)
    const now = new Date()

    attempt.answers = gradedAnswers
    attempt.score = score
    attempt.pct = pct
    attempt.passed = passed
    attempt.submittedAt = now
    attempt.timeTaken = Math.round((now - attempt.startedAt) / 1000)
    attempt.status = needsManualGrading ? 'submitted' : 'graded'
    await attempt.save()

    // Send notification
    await Notification.create({
      recipientId: req.dbUser.clerkId || req.dbUser._id.toString(),
      senderId: req.dbUser._id.toString(),
      title: passed ? '✅ Quiz Passed!' : '❌ Quiz Not Passed',
      message: `${quiz.title}: ${score}/${attempt.maxScore} (${pct}%)${passed ? ' — Passed!' : ''}`,
      type: 'grade',
      link: '/assignments',
    }).catch(() => {})

    res.json({ attempt, score, pct, passed, needsManualGrading })
  } catch (err) { next(err) }
})

/** GET /api/v1/quizzes/:id/attempt/my  [student] — Get student's latest attempt */
router.get('/:id/attempt/my', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const attempts = await QuizAttempt.find({ quizId: req.params.id, studentId: req.dbUser._id })
      .sort({ startedAt: -1 }).lean()
    res.json({ attempts })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/quizzes/:id/attempts/:aId/grade  [lecturer] — Manual grade short/essay */
router.patch('/:id/attempts/:aId/grade', ...auth, async (req, res, next) => {
  const { role } = req.dbUser
  if (!['lecturer', 'admin', 'dept_head'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const { score, gradingNotes } = req.body
    const attempt = await QuizAttempt.findById(req.params.aId)
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' })
    const quiz = await Quiz.findById(req.params.id).lean()
    const pct = attempt.maxScore > 0 ? Math.round((score / attempt.maxScore) * 100) : 0
    attempt.score = score
    attempt.pct = pct
    attempt.passed = pct >= (quiz?.passMark ?? 50)
    attempt.gradingNotes = gradingNotes ?? ''
    attempt.status = 'graded'
    await attempt.save()
    res.json({ attempt })
  } catch (err) { next(err) }
})

export default router
