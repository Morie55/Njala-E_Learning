import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import messageRoutes from '../routes/messages.js'
import materialProgressRoutes from '../routes/materialProgress.js'
import plagiarismRoutes from '../routes/plagiarism.js'

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

    req.dbUser = {
      _id: id,
      clerkId: req.auth.userId,
      email: 'test@njala.edu.sl',
      role,
      status: 'active',
    }
    next()
  },
}))

vi.mock('../middleware/enforceStatus.js', () => ({
  enforceStatus: (_req, _res, next) => next(),
}))

vi.mock('../models/Material.js', () => ({
  default: {
    findById: vi.fn(),
  },
}))

vi.mock('../models/Enrollment.js', () => ({
  default: {
    exists: vi.fn(),
  },
}))

vi.mock('../models/MaterialProgress.js', () => ({
  default: {
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    find: vi.fn(),
  },
}))

vi.mock('../models/Submission.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}))

vi.mock('../models/Assignment.js', () => ({
  default: {
    findById: vi.fn(),
  },
}))

vi.mock('../models/Course.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}))

vi.mock('../models/User.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}))

vi.mock('../models/Message.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('../models/Notification.js', () => ({
  default: {
    create: vi.fn().mockResolvedValue({}),
  },
}))

import Material from '../models/Material.js'
import Enrollment from '../models/Enrollment.js'
import MaterialProgress from '../models/MaterialProgress.js'
import Submission from '../models/Submission.js'
import Assignment from '../models/Assignment.js'
import Course from '../models/Course.js'
import User from '../models/User.js'
import Message from '../models/Message.js'

describe('Dedicated Mount Points & Message Authorization', () => {
  let app

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())
    app.use('/api/v1/materials/progress', materialProgressRoutes)
    app.use('/api/v1/plagiarism', plagiarismRoutes)
    app.use('/api/v1/messages', messageRoutes)
  })

  it('1. GET /api/v1/materials/progress/:courseId returns student progress', async () => {
    MaterialProgress.find.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ materialId: 'mat123', completedAt: new Date() }]),
      }),
    })

    const res = await request(app)
      .get('/api/v1/materials/progress/course123')
      .set('x-test-role', 'student')

    expect(res.status).toBe(200)
    expect(res.body.completed).toHaveLength(1)
  })

  it('2. POST /api/v1/materials/progress/:id/complete marks material complete', async () => {
    Material.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'mat123', courseId: 'course123' }),
    })
    Enrollment.exists.mockResolvedValue(true)
    MaterialProgress.findOneAndUpdate.mockResolvedValue({ studentId: '60c72b2f9b1d8b2a1c8b4567', materialId: 'mat123' })

    const res = await request(app)
      .post('/api/v1/materials/progress/mat123/complete')
      .set('x-test-role', 'student')

    expect(res.status).toBe(200)
    expect(res.body.progress).toBeDefined()
  })

  it('3. POST /api/v1/plagiarism/submissions/:id runs single submission check', async () => {
    Submission.findById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: 'sub123',
          assignmentId: 'assign123',
          studentId: { fullName: 'Student One' },
          textContent: 'Sample submission text',
        }),
      }),
    })
    Assignment.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'assign123', courseId: 'course123' }),
    })
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'course123', lecturerId: '60c72b2f9b1d8b2a1c8b4567' }),
    })
    Submission.find.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })
    Submission.findByIdAndUpdate.mockResolvedValue({
      _id: 'sub123',
      plagiarismScore: 0,
      plagiarismStatus: 'checked',
    })

    const res = await request(app)
      .post('/api/v1/plagiarism/submissions/sub123')
      .set('x-test-role', 'lecturer')

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Plagiarism scan completed')
  })

  it('4. POST /api/v1/plagiarism/assignments/:id runs batch plagiarism check', async () => {
    Assignment.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'assign123', courseId: 'course123' }),
    })
    Submission.find.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })

    const res = await request(app)
      .post('/api/v1/plagiarism/assignments/assign123')
      .set('x-test-role', 'lecturer')

    expect(res.status).toBe(200)
    expect(res.body.message).toContain('Scanned 0 submissions for plagiarism')
  })

  it('5. POST /api/v1/messages blocks messaging when no shared course exists', async () => {
    User.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'recip123', role: 'lecturer', status: 'active' }),
    })
    Course.find.mockReturnValue({
      distinct: vi.fn().mockResolvedValue(['course999']),
    })
    Enrollment.exists.mockResolvedValue(false)

    const res = await request(app)
      .post('/api/v1/messages')
      .set('x-test-role', 'student')
      .send({ recipientId: 'recip123', content: 'Hello' })

    expect(res.status).toBe(403)
    expect(res.body.error).toContain('You can only message lecturers or students you share a course with')
  })

  it('6. POST /api/v1/messages allows messaging when a shared course exists', async () => {
    User.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'recip123', role: 'lecturer', status: 'active', clerkId: 'clerk_recip' }),
    })
    Course.find.mockReturnValue({
      distinct: vi.fn().mockResolvedValue(['course123']),
    })
    Enrollment.exists.mockResolvedValue(true)
    Message.create.mockResolvedValue({ _id: 'msg123' })
    Message.findById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: 'msg123', content: 'Hello' }),
        }),
      }),
    })

    const res = await request(app)
      .post('/api/v1/messages')
      .set('x-test-role', 'student')
      .send({ recipientId: 'recip123', content: 'Hello' })

    expect(res.status).toBe(201)
    expect(res.body.message).toBeDefined()
  })

  it('7. POST /api/v1/messages allows admin to message any user', async () => {
    User.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'recip123', role: 'student', status: 'active' }),
    })
    Message.create.mockResolvedValue({ _id: 'msg123' })
    Message.findById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: 'msg123', content: 'Admin notice' }),
        }),
      }),
    })

    const res = await request(app)
      .post('/api/v1/messages')
      .set('x-test-role', 'admin')
      .send({ recipientId: 'recip123', content: 'Admin notice' })

    expect(res.status).toBe(201)
  })
})
