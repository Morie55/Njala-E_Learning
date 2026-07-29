import { verifyToken } from '@clerk/backend'

/**
 * Middleware: verifies the Clerk JWT from Authorization header.
 * Sets req.auth = { userId, sessionId } on success.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    req.auth = { userId: payload.sub, sessionId: payload.sid }
    next()
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message)
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

/**
 * Middleware factory: checks that req.dbUser.role is in allowedRoles.
 * Must be used AFTER requireAuth and populateUser.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.dbUser?.role
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${allowedRoles.join(' or ')}` })
    }
    next()
  }
}
