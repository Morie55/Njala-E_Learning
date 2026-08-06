/**
 * purgeAllUsers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Deletes EVERY user from both Clerk and MongoDB.
 *
 * Usage (from the server/ directory):
 *   node --env-file=.env src/scripts/purgeAllUsers.js
 *   # or if your Node version is older:
 *   npx dotenv -e .env node src/scripts/purgeAllUsers.js
 *
 * ⚠  THIS IS DESTRUCTIVE AND IRREVERSIBLE. Run only in development/reset scenarios.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { createClerkClient } from '@clerk/backend'
import User from '../models/User.js'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const MONGODB_URI      = process.env.MONGODB_URI || process.env.MONGO_URI

if (!CLERK_SECRET_KEY) { console.error('❌  CLERK_SECRET_KEY is not set'); process.exit(1) }
if (!MONGODB_URI)      { console.error('❌  MONGODB_URI is not set');      process.exit(1) }

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })

/* ── helpers ── */

async function deleteAllClerkUsers() {
  let deleted = 0
  let offset  = 0
  const limit = 100

  while (true) {
    const { data: users } = await clerk.users.getUserList({ limit, offset })
    if (!users || users.length === 0) break

    for (const u of users) {
      try {
        await clerk.users.deleteUser(u.id)
        console.log(`  [Clerk] deleted ${u.emailAddresses[0]?.emailAddress ?? u.id}`)
        deleted++
      } catch (err) {
        console.warn(`  [Clerk] failed to delete ${u.id}: ${err.message}`)
      }
    }

    if (users.length < limit) break
    offset += limit
  }

  return deleted
}

async function deleteAllMongoUsers() {
  const result = await User.deleteMany({})
  return result.deletedCount
}

/* ── main ── */

async function run() {
  console.log('\n⚠  PURGE ALL USERS — starting...\n')

  // 1. Delete from Clerk
  console.log('── Step 1: Deleting Clerk users ──')
  const clerkCount = await deleteAllClerkUsers()
  console.log(`✅  Clerk: ${clerkCount} user(s) deleted\n`)

  // 2. Delete from MongoDB
  console.log('── Step 2: Deleting MongoDB users ──')
  await mongoose.connect(MONGODB_URI)
  console.log('   Connected to MongoDB')

  const mongoCount = await deleteAllMongoUsers()
  console.log(`✅  MongoDB: ${mongoCount} user(s) deleted\n`)

  await mongoose.disconnect()
  console.log('── Done ──')
  console.log(`Total purged → Clerk: ${clerkCount}, MongoDB: ${mongoCount}\n`)
}

run().catch(err => {
  console.error('\n❌  PURGE FAILED:', err)
  process.exit(1)
})
