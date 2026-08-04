import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import Submission from '../models/Submission.js'
import Assignment from '../models/Assignment.js'
import Course from '../models/Course.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { logAudit } from '../utils/auditLogger.js'
import { calculateGrade } from '../utils/grading.js'
import { sendMail, templates } from '../utils/mailer.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** GET /api/v1/submissions/me  */
router.get('/me', ...auth, async (req, res, next) => {
  try {
    const subs = await Submission.find({ studentId: req.dbUser._id })
      .populate({ path: 'assignmentId', select: 'title maxScore courseId dueDate', populate: { path: 'courseId', select: 'code title semester' } })
      .sort({ submittedAt: -1 }).lean()
    const enriched = subs.map(s => ({
      ...s,
      assignmentTitle: s.assignmentId?.title,
      maxScore: s.assignmentId?.maxScore,
      dueDate: s.assignmentId?.dueDate,
      courseId: s.assignmentId?.courseId?._id?.toString() ?? null,
      courseCode: s.assignmentId?.courseId?.code,
      courseTitle: s.assignmentId?.courseId?.title,
      courseSemester: s.assignmentId?.courseId?.semester || 'Unassigned',
    }))
    res.json({ submissions: enriched })
  } catch (err) { next(err) }
})

/** GET /api/v1/submissions/transcript */
router.get('/transcript', ...auth, async (req, res, next) => {
  try {
    const student = await User.findById(req.dbUser._id)
      .populate('schoolId', 'name code')
      .populate('departmentId', 'name code')
      .lean()

    if (!student) return res.status(404).json({ error: 'Student profile not found' })

    const subs = await Submission.find({ studentId: req.dbUser._id })
      .populate({
        path: 'assignmentId',
        select: 'title maxScore courseId dueDate',
        populate: { path: 'courseId', select: 'code title' },
      })
      .sort({ submittedAt: -1 })
      .lean()

    const graded = subs.filter((s) => s.score !== null && s.score !== undefined)

    let totalGP = 0
    let totalPercentage = 0

    const records = graded.map((s) => {
      const g = calculateGrade(s.score, s.assignmentId?.maxScore)
      totalGP += g.gradePoint
      totalPercentage += g.percentage
      return {
        submissionId: s._id.toString(),
        assignmentTitle: s.assignmentId?.title || 'Assignment',
        courseCode: s.assignmentId?.courseId?.code || 'N/A',
        courseTitle: s.assignmentId?.courseId?.title || 'N/A',
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
        score: s.score,
        maxScore: s.assignmentId?.maxScore,
        percentage: g.percentage,
        letterGrade: g.letterGrade,
        gradePoint: g.gradePoint,
        classification: g.classification,
        feedback: s.feedback || '',
      }
    })

    const totalGraded = records.length
    const cgpa = totalGraded > 0 ? Number((totalGP / totalGraded).toFixed(2)) : 0.0
    const avgPercentage = totalGraded > 0 ? Number((totalPercentage / totalGraded).toFixed(1)) : 0.0

    let academicStanding = 'Good Standing'
    if (cgpa >= 4.5) academicStanding = 'First Class Honours'
    else if (cgpa >= 3.6) academicStanding = 'Second Class Upper Division'
    else if (cgpa >= 2.8) academicStanding = 'Second Class Lower Division'
    else if (cgpa >= 2.0) academicStanding = 'Third Class Honours'
    else if (cgpa >= 1.5) academicStanding = 'Pass Degree'
    else if (totalGraded > 0) academicStanding = 'Academic Probation'

    if (req.query.format === 'csv') {
      const filename = `Njala_Transcript_${(student.fullName || 'Student').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

      let csv = `NJALA UNIVERSITY OFFICIAL ACADEMIC TRANSCRIPT (5.0 SCALE)\n`
      csv += `Student Name,${student.fullName || ''}\n`
      csv += `Student ID,${student.idNumber || 'N/A'}\n`
      csv += `Email,${student.email || ''}\n`
      csv += `School,${student.schoolId?.name || 'Unassigned'}\n`
      csv += `Department,${student.departmentId?.name || 'Unassigned'}\n`
      csv += `Cumulative GPA (CGPA),${cgpa} / 5.0\n`
      csv += `Academic Standing,${academicStanding}\n`
      csv += `Date Generated,${new Date().toLocaleDateString()}\n\n`

      csv += `Assignment,Course Code,Course Title,Date Submitted,Score,Max Score,Percentage,Letter Grade,Grade Point,Classification,Feedback\n`

      records.forEach((r) => {
        csv += `"${r.assignmentTitle}","${r.courseCode}","${r.courseTitle}","${new Date(r.submittedAt).toLocaleDateString()}",${r.score},${r.maxScore},${r.percentage}%,${r.letterGrade},${r.gradePoint},"${r.classification}","${(r.feedback || '').replace(/"/g, '""')}"\n`
      })

      return res.status(200).send(csv)
    }

    res.json({
      student: {
        fullName: student.fullName,
        email: student.email,
        idNumber: student.idNumber,
        schoolName: student.schoolId?.name,
        departmentName: student.departmentId?.name,
      },
      summary: {
        totalGraded,
        avgPercentage,
        cgpa,
        scale: '5.0',
        academicStanding,
      },
      records,
    })
  } catch (err) {
    next(err)
  }
})

/** GET /api/v1/submissions/recent  [lecturer/dept_head/admin] */
router.get('/recent', ...auth, async (req, res, next) => {
  const { role, _id, schoolId } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const limit = parseInt(req.query.limit) || 10

    const courseFilter =
      role === 'admin'     ? {} :
      role === 'dept_head' ? (schoolId ? { schoolId } : { _id: { $in: [] } }) :
                             { lecturerId: _id }

    const courses = await Course.find(courseFilter).select('_id title').lean()
    const courseIds = courses.map(c => c._id)
    const assignments = await Assignment.find({ courseId: { $in: courseIds } }).select('_id title courseId').lean()
    const assignmentIds = assignments.map(a => a._id)

    const subs = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate('studentId', 'fullName').populate('assignmentId', 'title courseId').sort({ submittedAt: -1 }).limit(limit).lean()

    const enriched = subs.map(s => ({
      ...s,
      studentName: s.studentId?.fullName,
      assignmentTitle: s.assignmentId?.title,
      courseTitle: courses.find(c => c._id.toString() === s.assignmentId?.courseId?.toString())?.title,
    }))
    res.json({ submissions: enriched })
  } catch (err) { next(err) }
})

/** GET /api/v1/submissions/pending  [lecturer/dept_head/admin] */
router.get('/pending', ...auth, async (req, res, next) => {
  const { role, _id, schoolId } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const courseFilter =
      role === 'admin'     ? {} :
      role === 'dept_head' ? (schoolId ? { schoolId } : { _id: { $in: [] } }) :
                             { lecturerId: _id }

    const courses = await Course.find(courseFilter).lean()
    const results = await Promise.all(courses.map(async c => {
      const assignments = await Assignment.find({ courseId: c._id }).select('_id').lean()
      const count = await Submission.countDocuments({ assignmentId: { $in: assignments.map(a => a._id) }, score: null })
      return { courseId: c._id.toString(), courseTitle: c.title, count }
    }))
    res.json({ pending: results.filter(r => r.count > 0) })
  } catch (err) { next(err) }
})

/** PATCH /api/v1/submissions/:id/grade  [lecturer/dept_head/admin] */
router.patch('/:id/grade', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })
  try {
    const sub = await Submission.findById(req.params.id).populate('assignmentId', 'maxScore courseId')
    if (!sub) return res.status(404).json({ error: 'Submission not found' })

    // Lecturers may only grade submissions belonging to their own courses
    if (role === 'lecturer') {
      const course = await Course.findById(sub.assignmentId?.courseId).lean()
      if (!course || course.lecturerId.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'You do not own this course' })
      }
    }

    const max = sub.assignmentId?.maxScore ?? Infinity
    const score = Number(req.body.score)
    if (isNaN(score) || score < 0 || score > max) return res.status(400).json({ error: `Score must be between 0 and ${max}` })

    // ── Rubric scores ─────────────────────────────────────────────────────────
    const rubricScores = req.body.rubricScores ?? []
    if (rubricScores.length > 0) sub.rubricScores = rubricScores

    // ── Late Penalty Calculation ──────────────────────────────────────────────
    const assignment = sub.assignmentId
    let penaltyDeducted = 0
    let finalScore = score
    if (sub.isLate && assignment?.latePenaltyType && assignment.latePenaltyType !== 'none') {
      if (assignment.latePenaltyType === 'hard_cutoff') {
        // Hard cutoff: 0 marks for late submission
        penaltyDeducted = score
        finalScore = 0
      } else if (assignment.latePenaltyType === 'percent_per_day') {
        const pctPerDay = assignment.latePenaltyPerDay ?? 5
        const maxPct = assignment.maxPenaltyPct ?? 25
        const rawPct = Math.min(pctPerDay * (sub.daysLate ?? 0), maxPct)
        penaltyDeducted = Math.round((rawPct / 100) * max * 100) / 100
        finalScore = Math.max(0, Math.round((score - penaltyDeducted) * 100) / 100)
      }
    }

    sub.score = score
    sub.finalScore = finalScore
    sub.penaltyDeducted = penaltyDeducted
    sub.feedback = req.body.feedback ?? ''
    sub.gradedBy = _id
    sub.gradedAt = new Date()
    await sub.save()

    // Populate student user to dispatch notification + email
    const student = await User.findById(sub.studentId).lean()
    if (student) {
      const displayScore = finalScore !== score ? `${finalScore}/${max} (−${penaltyDeducted} late penalty)` : `${score}/${max}`
      await Notification.create({
        recipientId: student.clerkId || student._id.toString(),
        senderId: req.auth.userId,
        title: 'Assignment Graded',
        message: `Your submission for "${sub.assignmentId?.title || 'Assignment'}" has been graded: ${displayScore}`,
        type: 'grade',
        link: '/grades',
      })
      // Send email receipt
      if (student.email) {
        const courseName = sub.assignmentId?.courseId?.title ?? 'your course'
        const tmpl = templates.gradePosted(
          student.fullName,
          courseName,
          sub.assignmentId?.title ?? 'Assignment',
          finalScore,
          max,
          `${process.env.CLIENT_URL || 'http://localhost:5173'}/grades`
        )
        sendMail({ to: student.email, ...tmpl }).catch(() => {})
      }
    }

    await logAudit({
      req,
      action: 'GRADE_SUBMISSION',
      targetModel: 'Submission',
      targetId: sub._id.toString(),
      details: { score, finalScore, penaltyDeducted, maxScore: max, studentId: sub.studentId?.toString() },
    })

    res.json(sub)
  } catch (err) { next(err) }
})

/** GET /api/v1/submissions/gpa — Student cumulative and semester GPA */
router.get('/gpa', ...auth, async (req, res, next) => {
  if (req.dbUser.role !== 'student') return res.status(403).json({ error: 'Students only' })
  try {
    const { _id } = req.dbUser

    const subs = await Submission.find({ studentId: _id, score: { $ne: null } })
      .populate({
        path: 'assignmentId',
        select: 'maxScore courseId',
        populate: { path: 'courseId', select: 'title code semester creditHours' },
      })
      .lean()

    // Group by course
    const courseMap = {}
    for (const s of subs) {
      const course = s.assignmentId?.courseId
      if (!course) continue
      const cid = course._id.toString()
      if (!courseMap[cid]) {
        courseMap[cid] = {
          course,
          creditHours: course.creditHours || 3,
          scores: [],
          maxScores: [],
        }
      }
      courseMap[cid].scores.push(s.score)
      courseMap[cid].maxScores.push(s.assignmentId.maxScore || 100)
    }

    // Calculate per-course grade point using Njala scale
    const courseGrades = Object.values(courseMap).map(c => {
      const totalScore = c.scores.reduce((a, b) => a + b, 0)
      const totalMax = c.maxScores.reduce((a, b) => a + b, 0)
      const pct = totalMax > 0 ? (totalScore / totalMax) * 100 : 0
      const g = calculateGrade(totalScore, totalMax)
      return {
        course: c.course,
        creditHours: c.creditHours,
        percentage: Math.round(pct),
        letterGrade: g.letterGrade,
        gradePoint: g.gradePoint,
        classification: g.classification,
        qualityPoints: g.gradePoint * c.creditHours,
      }
    })

    // Group by semester for semester GPA
    const semesterMap = {}
    for (const cg of courseGrades) {
      const sem = cg.course.semester || 'Unknown'
      if (!semesterMap[sem]) semesterMap[sem] = []
      semesterMap[sem].push(cg)
    }

    const semesters = Object.entries(semesterMap).map(([semester, courses]) => {
      const totalCH = courses.reduce((a, c) => a + c.creditHours, 0)
      const totalQP = courses.reduce((a, c) => a + c.qualityPoints, 0)
      return {
        semester,
        courses,
        totalCreditHours: totalCH,
        gpa: totalCH > 0 ? Math.round((totalQP / totalCH) * 100) / 100 : 0,
      }
    })

    // Cumulative GPA across all semesters
    const totalCH = courseGrades.reduce((a, c) => a + c.creditHours, 0)
    const totalQP = courseGrades.reduce((a, c) => a + c.qualityPoints, 0)
    const cumulativeGpa = totalCH > 0 ? Math.round((totalQP / totalCH) * 100) / 100 : 0

    // Classification based on cumulative GPA (Njala 5-point scale)
    let cumulativeClass = 'No Grade Yet'
    if (cumulativeGpa >= 4.5) cumulativeClass = 'First Class Honours'
    else if (cumulativeGpa >= 3.5) cumulativeClass = 'Second Class Upper'
    else if (cumulativeGpa >= 2.5) cumulativeClass = 'Second Class Lower'
    else if (cumulativeGpa >= 1.5) cumulativeClass = 'Third Class'
    else if (cumulativeGpa >= 1.0) cumulativeClass = 'Pass'
    else if (totalCH > 0) cumulativeClass = 'Fail'

    res.json({
      cumulativeGpa,
      cumulativeClass,
      totalCreditHours: totalCH,
      semesters,
      courseGrades,
    })
  } catch (err) { next(err) }
})

export default router
