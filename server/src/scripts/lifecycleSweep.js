import cron from 'node-cron'
import User from '../models/User.js'

const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000

export function startLifecycleSweep() {
  // Daily scheduled sweep at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      const now = Date.now()
      const toArchive = await User.find({
        status: 'ALUMNI',
        alumniSince: { $lte: new Date(now - TWO_YEARS_MS) },
        deletedAt: null,
      })

      for (const u of toArchive) {
        u.status = 'ARCHIVED'
        u.archivedAt = new Date()
        await u.save()
      }

      if (toArchive.length > 0) {
        console.log(`[LIFECYCLE] Archived ${toArchive.length} alumni accounts (2-year policy threshold reached).`)
      }
    } catch (err) {
      console.error('[LIFECYCLE SWEEP ERROR]', err.message)
    }
  })

  console.log('[LIFECYCLE] User lifecycle sweep task initialized (scheduled daily at 3:00 AM).')
}
