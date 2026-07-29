import AuditLog from '../models/AuditLog.js'

export async function logAudit({ req, action, targetModel, targetId = '', details = {} }) {
  try {
    const performedBy = req.auth?.userId || req.dbUser?.clerkId || 'anonymous'
    const performedByEmail = req.dbUser?.email || ''
    const performedByRole = req.dbUser?.role || ''
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || ''

    await AuditLog.create({
      performedBy,
      performedByEmail,
      performedByRole,
      action,
      targetModel,
      targetId: String(targetId),
      details,
      ipAddress,
    })
  } catch (err) {
    console.error('AuditLog Error:', err.message)
  }
}
