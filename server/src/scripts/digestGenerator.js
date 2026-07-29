import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import Assignment from '../models/Assignment.js'
import Announcement from '../models/Announcement.js'
import Enrollment from '../models/Enrollment.js'

export async function generateDailyDigest() {
  console.log('[DIGEST] Starting daily notification & activity digest generation...')

  try {
    const students = await User.find({ role: 'student' }).lean()
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    let digestsGenerated = 0

    for (const student of students) {
      // Find active enrollments
      const enrollments = await Enrollment.find({ studentId: student._id, status: 'active' }).lean()
      const courseIds = enrollments.map(e => e.courseId)

      // Fetch unread notifications
      const unreadNotifs = await Notification.find({
        recipientId: student.clerkId || student._id.toString(),
        read: false,
      }).sort({ createdAt: -1 }).limit(10).lean()

      // Fetch upcoming assignments due in next 48 hours
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)
      const upcomingAssignments = await Assignment.find({
        courseId: { $in: courseIds },
        dueDate: { $gte: now, $lte: in48Hours },
      }).select('title dueDate maxScore').lean()

      // Fetch new announcements in past 24 hours
      const recentAnnouncements = await Announcement.find({
        $or: [{ courseId: { $in: courseIds } }, { courseId: null }],
        postedAt: { $gte: twentyFourHoursAgo },
      }).limit(5).lean()

      if (unreadNotifs.length > 0 || upcomingAssignments.length > 0 || recentAnnouncements.length > 0) {
        digestsGenerated++
        const summary = `Daily Digest for ${student.fullName}: ${unreadNotifs.length} unread notifications, ${upcomingAssignments.length} upcoming assignments due soon, ${recentAnnouncements.length} new announcements.`
        console.log(`[DIGEST] ${student.email || student.fullName}:`, summary)
      }
    }

    console.log(`[DIGEST] Complete. Digests processed for ${digestsGenerated} students.`)
    return { digestsGenerated }
  } catch (err) {
    console.error('[DIGEST ERROR]', err)
    throw err
  }
}

// Allow running directly via CLI (`node src/scripts/digestGenerator.js`)
if (process.argv[1]?.endsWith('digestGenerator.js')) {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in environment')
    process.exit(1)
  }
  mongoose.connect(mongoUri, { dbName: 'nelms' })
    .then(() => generateDailyDigest())
    .then(() => mongoose.disconnect())
    .catch(() => process.exit(1))
}
