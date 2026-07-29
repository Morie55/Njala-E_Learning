import 'dotenv/config'
import mongoose from 'mongoose'

/**
 * One-time migration:
 * 1. Renames the `departments` collection to `schools` if present.
 * 2. Creates a new `departments` collection for sub-units.
 * 3. Renames `departmentId` -> `schoolId` on Course and User documents.
 */
async function migrate() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!mongoUri) {
    console.error('[MIGRATE ERROR] MONGODB_URI missing from environment.')
    process.exit(1)
  }

  await mongoose.connect(mongoUri, { dbName: 'nelms' })
  const db = mongoose.connection.db
  console.log('[MIGRATE] Connected to MongoDB')

  const collections = (await db.listCollections().toArray()).map((c) => c.name)

  if (collections.includes('departments') && !collections.includes('schools')) {
    await db.collection('departments').rename('schools')
    console.log('[MIGRATE] Renamed collection: departments -> schools')
  }

  // Rename departmentId -> schoolId on courses
  const courseRes = await db.collection('courses').updateMany(
    { departmentId: { $exists: true, $ne: null } },
    { $rename: { departmentId: 'schoolId' } }
  )
  console.log(`[MIGRATE] Updated ${courseRes.modifiedCount} courses (departmentId -> schoolId)`)

  // Rename departmentId -> schoolId on users
  const userRes = await db.collection('users').updateMany(
    { departmentId: { $exists: true, $ne: null } },
    { $rename: { departmentId: 'schoolId' } }
  )
  console.log(`[MIGRATE] Updated ${userRes.modifiedCount} users (departmentId -> schoolId)`)

  await mongoose.disconnect()
  console.log('[MIGRATE] Migration finished successfully.')
}

migrate().catch((err) => {
  console.error('[MIGRATE ERROR]', err)
  process.exit(1)
})
