import { describe, it, expect, vi } from 'vitest'
import { enforceStatus } from '../middleware/enforceStatus.js'

function createMockReqRes({ dbUser, method = 'GET', originalUrl = '/api/v1/courses', path = '/api/v1/courses' } = {}) {
  const req = {
    dbUser,
    method,
    originalUrl,
    path,
  }
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  const next = vi.fn()
  return { req, res, next }
}

describe('enforceStatus Middleware Integration Tests', () => {
  it('1. Passes through if req.dbUser is undefined', () => {
    const { req, res, next } = createMockReqRes({ dbUser: undefined })
    enforceStatus(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('2. Blocks soft-deleted accounts (deletedAt set)', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'ACTIVE', deletedAt: new Date() },
    })
    enforceStatus(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Account no longer exists.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('3. Blocks archived accounts (status ARCHIVED)', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'ARCHIVED' },
    })
    enforceStatus(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'This account is archived. Contact the registrar.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('4. Enforces password change (428) for pending accounts on general routes', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'PENDING', mustChangePassword: true },
      originalUrl: '/api/v1/courses',
    })
    enforceStatus(req, res, next)
    expect(res.status).toHaveBeenCalledWith(428)
    expect(res.json).toHaveBeenCalledWith({ error: 'PASSWORD_CHANGE_REQUIRED' })
    expect(next).not.toHaveBeenCalled()
  })

  it('5. Allows pending accounts to access /api/v1/users/me/activate for password setting', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'PENDING', mustChangePassword: true },
      originalUrl: '/api/v1/users/me/activate',
      path: '/me/activate',
    })
    enforceStatus(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('6. Allows suspended accounts read-only GET/HEAD requests', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'SUSPENDED' },
      method: 'GET',
    })
    enforceStatus(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('7. Blocks suspended accounts write operations (POST/PATCH/DELETE)', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'SUSPENDED' },
      method: 'POST',
    })
    enforceStatus(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Your account is suspended. You can view content but not submit or edit.',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('8. Blocks alumni accounts past 1-year cutoff from materials and assignments', () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'ALUMNI', alumniSince: twoYearsAgo },
      originalUrl: '/api/v1/courses/course123/materials',
      path: '/course123/materials',
    })
    enforceStatus(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Course access period has ended. Transcripts remain available.',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('9. Allows alumni accounts within 1-year cutoff to access materials', () => {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'ALUMNI', alumniSince: sixMonthsAgo },
      originalUrl: '/api/v1/courses/course123/materials',
      path: '/course123/materials',
    })
    enforceStatus(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('10. Blocks pending approval accounts from protected endpoints (403 ACCOUNT_PENDING_APPROVAL)', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'PENDING', mustChangePassword: false },
      originalUrl: '/api/v1/courses',
    })
    enforceStatus(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'ACCOUNT_PENDING_APPROVAL',
      message: 'Your account is awaiting administrator approval.',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('11. Allows pending approval accounts to access /api/v1/users/me and /api/v1/users/me/select-role', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'PENDING' },
      originalUrl: '/api/v1/users/me/select-role',
    })
    enforceStatus(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('12. Blocks rejected accounts from protected endpoints (403 ACCOUNT_REJECTED)', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'REJECTED', rejectionReason: 'Invalid credentials' },
      originalUrl: '/api/v1/courses',
    })
    enforceStatus(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'ACCOUNT_REJECTED',
      message: 'Your account request has been rejected.',
      reason: 'Invalid credentials',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('13. Allows active and approved accounts unrestricted access', () => {
    const { req, res, next } = createMockReqRes({
      dbUser: { status: 'APPROVED' },
      method: 'POST',
    })
    enforceStatus(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
