import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'

const ROLES_MAP = {
  'kmorie18c@njala.edu.sl': 'lecturer',
  'keitaazlan@gmail.com':   'dept_head',
  'anama1999june@gmail.com': 'student',
  'anama119june@gmail.com':  'student',
}

async function seed() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!mongoUri) {
    console.error('Missing MONODB_URI in environment')
    process.exit(1)
  }

  await mongoose.connect(mongoUri)
  console.log('[SEED] Connected to MongoDB Atlas')

  for (const [email, role] of Object.entries(ROLES_MAP)) {
    const res = await User.updateOne(
      { email: email.toLowerCase() },
      { $set: { role } }
    )
    if (res.matchedCount > 0) {
      console.log(`[SEED] Updated ${email} -> role: ${role}`)
    } else {
      console.log(`[SEED] User ${email} not in DB yet (will be assigned role "${role}" automatically on first login)`)
    }
  }

  await mongoose.disconnect()
  console.log('[SEED] Completed successfully')
}

seed().catch(err => {
  console.error('[SEED ERROR]', err)
  process.exit(1)
})
