import User from '../models/User.js'

/**
 * Middleware: loads the MongoDB User document for the current Clerk user.
 * Requires requireAuth to have run first.
 * Sets req.dbUser on success.
 */
export async function populateUser(req, res, next) {
  try {
    let user = await User.findOne({ clerkId: req.auth.userId }).lean()
    if (!user) {
      // Do NOT auto-create accounts for unknown Clerk IDs.
      // The /users/sync endpoint is the single source of truth for account creation.
      return res.status(401).json({
        error: 'Account not registered. Please sign in via the portal to activate your account, or contact your administrator.',
      })
    }

    // Auto-normalize status to uppercase Lifecycle status
    if (user.status) {
      const s = String(user.status).toUpperCase()
      user.status = s === 'GRADUATED' ? 'ALUMNI' : s
    } else {
      // No status field — default to PENDING (fail-safe: requires admin approval).
      // ACTIVE is only ever set by the first-user bootstrap or an admin approve action.
      user.status = 'PENDING'
    }

    req.dbUser = user
    next()
  } catch (err) {
    next(err)
  }
}
