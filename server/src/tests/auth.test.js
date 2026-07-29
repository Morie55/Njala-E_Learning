import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import userRoutes from '../routes/users.js'
import courseRoutes from '../routes/courses.js'
import announcementRoutes from '../routes/announcements.js'
import submissionRoutes from '../routes/submissions.js'
import materialRoutes from '../routes/materials.js'
import assignmentSubmitRoutes from '../routes/assignmentSubmit.js'

import adminRoutes from '../routes/admin.js'

import Course from '../models/Course.js'
import Submission from '../models/Submission.js'
import Enrollment from '../models/Enrollment.js'
import Assignment from '../models/Assignment.js'
import User from '../models/User.js'

// Mock Clerk auth & database middleware
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.auth = { userId: req.headers['x-test-user-id'] || 'test_clerk_id_1' }
    next()
  },
}))

vi.mock('../middleware/populateUser.js', () => ({
  populateUser: (req, res, next) => {
    const role = req.headers['x-test-role'] || 'student'
    const id = req.headers['x-test-mongo-id'] || '60c72b2f9b1d8b2a1c8b4567'
    const schoolId = req.headers['x-test-school-id'] || '60c72b2f9b1d8b2a1c8b4500'
    const deptId = req.headers['x-test-dept-id'] || '60c72b2f9b1d8b2a1c8b4511'
    const status = req.headers['x-test-status'] || 'active'

    if (status !== 'active') {
      return res.status(403).json({ error: `Your account is currently ${status}. Please contact an administrator.` })
    }

    req.dbUser = {
      _id: id,
      clerkId: req.auth.userId,
      email: 'test@njala.edu.sl',
      role,
      schoolId,
      departmentId: deptId,
      status,
    }
    next()
  },
}))

vi.mock('../middleware/rateLimiter.js', () => ({
  authRateLimiter: (_req, _res, next) => next(),
  uploadRateLimiter: (_req, _res, next) => next(),
}))

vi.mock('../models/User.js', () => ({
  default: {
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('../models/Course.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    exists: vi.fn(),
  },
}))

vi.mock('../models/Submission.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}))

vi.mock('../models/Enrollment.js', () => ({
  default: {
    exists: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('../models/Assignment.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
  },
}))

describe('NELMS Authorization & Security Integration Tests', () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use('/api/v1/users', userRoutes)
    app.use('/api/v1/courses', courseRoutes)
    app.use('/api/v1/announcements', announcementRoutes)
    app.use('/api/v1/submissions', submissionRoutes)
    app.use('/api/v1/materials', materialRoutes)
    app.use('/api/v1/assignments', assignmentSubmitRoutes)
    app.use('/api/v1/admin', adminRoutes)
  })

  it('1. Prevents non-admin users from fetching user list', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('x-test-role', 'student')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Admin only')
  })

  it('2. Prevents non-admin users from changing user roles', async () => {
    const res = await request(app)
      .patch('/api/v1/users/60c72b2f9b1d8b2a1c8b4588/role')
      .set('x-test-role', 'lecturer')
      .send({ role: 'admin' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Admin only')
  })

  it('3. Rejects invalid role specified in user role update payload (Zod validation)', async () => {
    const res = await request(app)
      .patch('/api/v1/users/60c72b2f9b1d8b2a1c8b4588/role')
      .set('x-test-role', 'admin')
      .send({ role: 'super_hero' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('4. Rejects students from creating courses', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('x-test-role', 'student')
      .send({ title: 'Hacking 101', code: 'HACK101' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Forbidden')
  })

  it('5. Rejects students from posting announcements', async () => {
    const res = await request(app)
      .post('/api/v1/announcements')
      .set('x-test-role', 'student')
      .send({ message: 'Free grades for everyone!' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Forbidden')
  })

  it("6. Prevents lecturer A from grading a submission in lecturer B's course", async () => {
    const mockSubmission = {
      _id: 'sub123',
      assignmentId: { _id: 'ass123', maxScore: 100, courseId: 'courseB' },
      populate: vi.fn().mockReturnThis(),
    }
    Submission.findById.mockReturnValue(mockSubmission)
    Course.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'courseB', lecturerId: 'lecturerB_id' }),
    })

    const res = await request(app)
      .patch('/api/v1/submissions/sub123/grade')
      .set('x-test-role', 'lecturer')
      .set('x-test-mongo-id', 'lecturerA_id')
      .send({ score: 95 })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('You do not own this course')
  })

  it("7. Prevents lecturer A from uploading material to lecturer B's course", async () => {
    Course.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'courseB', lecturerId: 'lecturerB_id' }),
    })

    const res = await request(app)
      .post('/api/v1/materials')
      .set('x-test-role', 'lecturer')
      .set('x-test-mongo-id', 'lecturerA_id')
      .send({ courseId: 'courseB', title: 'Lecture 1', type: 'link', url: 'https://example.com' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('You do not own this course')
  })

  it("8. Prevents non-enrolled student from submitting to an assignment", async () => {
    Assignment.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'ass123', courseId: 'courseX' }),
    })
    Enrollment.exists.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/v1/assignments/ass123/submissions')
      .set('x-test-role', 'student')
      .set('x-test-mongo-id', 'student1')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Not enrolled in this course')
  })

  it("9. Prevents non-enrolled student from accessing course assignments", async () => {
    Course.findById.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'courseX', lecturerId: 'lecturerB_id' }),
    })
    Enrollment.exists.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/v1/courses/courseX/assignments')
      .set('x-test-role', 'student')
      .set('x-test-mongo-id', 'student1')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Forbidden')
  })

  it("10. Blocks suspended user accounts from accessing API endpoints", async () => {
    const res = await request(app)
      .get('/api/v1/courses')
      .set('x-test-role', 'student')
      .set('x-test-status', 'suspended')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Your account is currently suspended. Please contact an administrator.')
  })

  it("11. Rejects non-admin users from batch importing user roster", async () => {
    const res = await request(app)
      .post('/api/v1/admin/users/bulk-import')
      .set('x-test-role', 'lecturer')
      .send({ rows: [{ fullName: 'Test', email: 'test@njala.edu.sl' }] })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Admin only')
  })
})
