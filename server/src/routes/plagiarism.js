import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import Submission from '../models/Submission.js'
import Assignment from '../models/Assignment.js'
import Course from '../models/Course.js'
import { computeSimilarity } from '../utils/plagiarismEngine.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/** POST /api/v1/submissions/:id/check-plagiarism [lecturer/dept_head/admin] */
router.post('/submissions/:id/check-plagiarism', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

  try {
    const targetSub = await Submission.findById(req.params.id).populate('studentId', 'fullName email').lean()
    if (!targetSub) return res.status(404).json({ error: 'Submission not found' })

    const assignment = await Assignment.findById(targetSub.assignmentId).lean()
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    // Verify lecturer ownership
    if (role === 'lecturer') {
      const course = await Course.findById(assignment.courseId).lean()
      if (!course || course.lecturerId.toString() !== _id.toString()) {
        return res.status(403).json({ error: 'Forbidden — You do not own this course' })
      }
    }

    // Fetch all other submissions for this assignment
    const peerSubs = await Submission.find({
      assignmentId: targetSub.assignmentId,
      _id: { $ne: targetSub._id },
    }).populate('studentId', 'fullName').lean()

    const targetText = targetSub.textContent || targetSub.fileUrl || ''
    const matches = []
    let maxScore = 0

    for (const peer of peerSubs) {
      const peerText = peer.textContent || peer.fileUrl || ''
      const { similarityPct, matchedSnippet } = computeSimilarity(targetText, peerText)

      if (similarityPct > 5) {
        matches.push({
          matchedStudentName: peer.studentId?.fullName ?? 'Peer Student',
          matchedSubmissionId: peer._id,
          similarityPct,
          matchedSnippet,
        })
        if (similarityPct > maxScore) maxScore = similarityPct
      }
    }

    // Sort matches by highest similarity
    matches.sort((a, b) => b.similarityPct - a.similarityPct)

    const status = maxScore >= 25 ? 'flagged' : 'checked'

    const updated = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          plagiarismScore: maxScore,
          plagiarismStatus: status,
          plagiarismMatches: matches,
        },
      },
      { new: true }
    )

    res.json({
      message: 'Plagiarism scan completed',
      submissionId: updated._id,
      plagiarismScore: maxScore,
      plagiarismStatus: status,
      matches,
    })
  } catch (err) { next(err) }
})

/** POST /api/v1/assignments/:id/check-all-plagiarism [lecturer/dept_head/admin] */
router.post('/assignments/:id/check-all-plagiarism', ...auth, async (req, res, next) => {
  const { role, _id } = req.dbUser
  if (!['lecturer', 'dept_head', 'admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' })

  try {
    const assignment = await Assignment.findById(req.params.id).lean()
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' })

    const subs = await Submission.find({ assignmentId: req.params.id }).populate('studentId', 'fullName').lean()
    let scannedCount = 0

    for (let i = 0; i < subs.length; i++) {
      const subA = subs[i]
      const textA = subA.textContent || subA.fileUrl || ''
      const matches = []
      let maxScore = 0

      for (let j = 0; j < subs.length; j++) {
        if (i === j) continue
        const subB = subs[j]
        const textB = subB.textContent || subB.fileUrl || ''

        const { similarityPct, matchedSnippet } = computeSimilarity(textA, textB)
        if (similarityPct > 5) {
          matches.push({
            matchedStudentName: subB.studentId?.fullName ?? 'Peer Student',
            matchedSubmissionId: subB._id,
            similarityPct,
            matchedSnippet,
          })
          if (similarityPct > maxScore) maxScore = similarityPct
        }
      }

      matches.sort((a, b) => b.similarityPct - a.similarityPct)
      const status = maxScore >= 25 ? 'flagged' : 'checked'

      await Submission.findByIdAndUpdate(subA._id, {
        $set: {
          plagiarismScore: maxScore,
          plagiarismStatus: status,
          plagiarismMatches: matches,
        },
      })
      scannedCount++
    }

    res.json({ message: `Scanned ${scannedCount} submissions for plagiarism`, scannedCount })
  } catch (err) { next(err) }
})

export default router
