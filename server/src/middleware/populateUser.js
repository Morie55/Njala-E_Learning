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
      const userCount = await User.countDocuments()
      const initialRole = userCount === 0 ? 'admin' : 'student'
      const newUser = await User.create({
        clerkId: req.auth.userId,
        email: `${req.auth.userId}@njala.edu.sl`,
        fullName: 'User',
        role: initialRole,
        status: 'ACTIVE',
      })
      user = newUser.toObject()
    }

    // Auto-normalize status to uppercase Lifecycle status
    if (user.status) {
      const s = String(user.status).toUpperCase()
      user.status = s === 'GRADUATED' ? 'ALUMNI' : s
    } else {
      user.status = 'ACTIVE'
    }

    req.dbUser = user
    next()
  } catch (err) {
    next(err)
  }
}
