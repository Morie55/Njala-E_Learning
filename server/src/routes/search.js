import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { populateUser } from '../middleware/populateUser.js'
import { enforceStatus } from '../middleware/enforceStatus.js'
import Course from '../models/Course.js'
import Assignment from '../models/Assignment.js'
import Material from '../models/Material.js'
import Announcement from '../models/Announcement.js'
import User from '../models/User.js'
import { Quiz } from '../models/Quiz.js'

const router = Router()
const auth = [requireAuth, populateUser, enforceStatus]

/**
 * GET /api/v1/search?q=&type=
 * type: all | courses | assignments | materials | announcements | users (admin only)
 */
router.get('/', ...auth, async (req, res, next) => {
  try {
    const { q, type = 'all' } = req.query
    if (!q || q.trim().length < 2) return res.json({ results: [] })

    const { _id, role } = req.dbUser
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const results = []

    // ── Courses ──────────────────────────────────────────────────────
    if (['all', 'courses'].includes(type)) {
      let courseQuery = { status: 'active', $or: [{ title: regex }, { code: regex }, { description: regex }] }
      if (role === 'student') {
        // students see active courses only
      } else if (role === 'lecturer') {
        courseQuery = { lecturerId: _id, $or: [{ title: regex }, { code: regex }] }
      }
      const courses = await Course.find(courseQuery).select('title code description status creditHours').limit(8).lean()
      courses.forEach(c => results.push({ type: 'course', id: c._id, title: c.title, subtitle: c.code, meta: `${c.creditHours} credit hrs`, url: `/courses/${c._id}` }))
    }

    // ── Assignments ──────────────────────────────────────────────────
    if (['all', 'assignments'].includes(type)) {
      const assignments = await Assignment.find({ title: regex })
        .populate('courseId', 'title code')
        .select('title dueDate maxScore courseId')
        .limit(8).lean()
      assignments.forEach(a => results.push({
        type: 'assignment',
        id: a._id,
        title: a.title,
        subtitle: a.courseId?.code ?? '',
        meta: a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString('en-GB')}` : '',
        url: '/assignments',
      }))
    }

    // ── Materials ────────────────────────────────────────────────────
    if (['all', 'materials'].includes(type)) {
      const materials = await Material.find({ $or: [{ title: regex }, { description: regex }] })
        .populate('courseId', 'title code')
        .select('title type courseId')
        .limit(8).lean()
      materials.forEach(m => results.push({
        type: 'material',
        id: m._id,
        title: m.title,
        subtitle: m.courseId?.title ?? '',
        meta: m.type,
        url: `/courses/${m.courseId?._id}`,
      }))
    }

    // ── Quizzes ───────────────────────────────────────────────────────
    if (['all', 'quizzes'].includes(type)) {
      const quizFilter = { status: 'published', title: regex }
      if (['lecturer', 'admin', 'dept_head'].includes(role)) delete quizFilter.status

      const quizzes = await Quiz.find(quizFilter)
        .populate('courseId', 'title code')
        .select('title duration courseId status')
        .limit(6).lean()

      quizzes.forEach(q => results.push({
        type: 'quiz',
        id: q._id,
        title: q.title,
        subtitle: q.courseId?.code ?? '',
        meta: q.duration ? `${q.duration} mins` : 'Untimed',
        url: role === 'student' ? `/quizzes/${q._id}/take` : `/quizzes/create`,
      }))
    }

    // ── Announcements ────────────────────────────────────────────────
    if (['all', 'announcements'].includes(type)) {
      const announcements = await Announcement.find({ $or: [{ title: regex }, { message: regex }] })
        .populate('courseId', 'title code')
        .select('title message courseId createdAt')
        .limit(6).lean()
      announcements.forEach(a => results.push({
        type: 'announcement',
        id: a._id,
        title: a.title,
        subtitle: a.courseId?.title ?? 'General',
        meta: new Date(a.createdAt).toLocaleDateString('en-GB'),
        url: `/courses/${a.courseId?._id}`,
      }))
    }

    // ── Users (admin only) ───────────────────────────────────────────
    if (['all', 'users'].includes(type) && ['admin', 'dept_head'].includes(role)) {
      const users = await User.find({
        $or: [{ fullName: regex }, { email: regex }, { idNumber: regex }]
      }).select('fullName email role idNumber').limit(8).lean()
      users.forEach(u => results.push({
        type: 'user',
        id: u._id,
        title: u.fullName,
        subtitle: u.email,
        meta: u.role,
        url: `/users`,
      }))
    }

    res.json({ results, query: q })
  } catch (err) { next(err) }
})

export default router
