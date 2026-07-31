const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

/**
 * Enforces User Lifecycle Status rules across all API routes.
 */
export function enforceStatus(req, res, next) {
  if (!req.dbUser) return next()

  const { status, mustChangePassword, deletedAt, alumniSince } = req.dbUser
  const fullPath = req.originalUrl || req.path || ''

  // 1. Soft-deleted accounts blocked from all endpoints
  if (deletedAt) {
    return res.status(403).json({ error: 'Account no longer exists.' })
  }

  // 2. Archived accounts blocked from all endpoints
  if (status === 'ARCHIVED') {
    return res.status(403).json({ error: 'This account is archived. Contact the registrar.' })
  }

  // 3. Pending accounts requiring first login password change
  if (status === 'PENDING' && mustChangePassword && !fullPath.includes('/me/activate')) {
    return res.status(428).json({ error: 'PASSWORD_CHANGE_REQUIRED' })
  }

  // 4. Suspended accounts: read-only access (GET/HEAD permitted, write operations blocked)
  if (status === 'SUSPENDED' && !['GET', 'HEAD'].includes(req.method)) {
    return res.status(403).json({
      error: 'Your account is suspended. You can view content but not submit or edit.',
    })
  }

  // 5. Alumni access rule: Course material & assignment access expires 1 year post-graduation
  if (
    status === 'ALUMNI' &&
    alumniSince &&
    fullPath.match(/^\/api\/v1\/(courses\/.+\/(materials|assignments)|assignments)/)
  ) {
    const oneYearPassed = Date.now() - new Date(alumniSince).getTime() > ONE_YEAR_MS
    if (oneYearPassed) {
      return res.status(403).json({
        error: 'Course access period has ended. Transcripts remain available.',
      })
    }
  }

  next()
}
