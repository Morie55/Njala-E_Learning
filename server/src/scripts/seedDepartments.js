import 'dotenv/config'
import mongoose from 'mongoose'
import School from '../models/School.js'
import Department from '../models/Department.js'

const DEFAULT_SCHOOLS = [
  { name: 'School of Technology', code: 'TECH', isPrimary: true, status: 'active' },
  { name: 'School of Agriculture & Food Sciences', code: 'AFS', isPrimary: false, status: 'active' },
  { name: 'School of Education', code: 'EDU', isPrimary: false, status: 'active' },
  { name: 'School of Environmental Sciences', code: 'ENV', isPrimary: false, status: 'active' },
  { name: 'School of Social Sciences', code: 'SOC', isPrimary: false, status: 'active' },
  { name: 'School of Basic Sciences', code: 'SBS', isPrimary: false, status: 'active' },
  { name: 'School of Basic Education', code: 'SBE', isPrimary: false, status: 'active' },
  { name: 'School of Community Health Sciences', code: 'CHS', isPrimary: false, status: 'active' },
  { name: 'School of Natural Resources Management', code: 'NRM', isPrimary: false, status: 'active' },
  { name: 'School of Nursing and Midwifery', code: 'SNM', isPrimary: false, status: 'active' },
  { name: 'School of Veterinary Medicine', code: 'VET', isPrimary: false, status: 'active' },
  { name: 'School of Postgraduate Studies', code: 'PGS', isPrimary: false, status: 'active' },
]

const BY_SCHOOL_CODE = {
  TECH: [
    { name: 'Computer Science', code: 'CSC' },
    { name: 'Information Technology', code: 'BIT' },
    { name: 'Electronics & Telecommunications Engineering', code: 'ETE' },
    { name: 'Agricultural Engineering', code: 'AGE' },
    { name: 'Civil Engineering', code: 'CVE' },
    { name: 'Mechanical Engineering', code: 'MEE' },
    { name: 'Electrical & Electronic Engineering', code: 'EEE' },
  ],
}

async function seed() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in environment')
    process.exit(1)
  }

  await mongoose.connect(mongoUri, { dbName: 'nelms' })
  console.log('[SEED] Connected to MongoDB')

  // 1. Ensure default Schools exist and set primary flag
  for (const s of DEFAULT_SCHOOLS) {
    await School.findOneAndUpdate(
      { code: s.code },
      { $set: { isPrimary: s.isPrimary, status: s.status }, $setOnInsert: { name: s.name, code: s.code } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    )
  }

  // 2. Seed sub-departments under each School
  for (const [schoolCode, depts] of Object.entries(BY_SCHOOL_CODE)) {
    const school = await School.findOne({ code: schoolCode })
    if (!school) {
      console.log(`[SEED] Skipping ${schoolCode} — school not found`)
      continue
    }

    for (const d of depts) {
      const res = await Department.findOneAndUpdate(
        { schoolId: school._id, code: d.code },
        { $setOnInsert: { ...d, schoolId: school._id } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      )
      console.log(`[SEED] ${school.name} -> ${res.name} (${res.code})`)
    }
  }

  await mongoose.disconnect()
  console.log('[SEED] Department seeding completed cleanly.')
}

seed().catch((err) => {
  console.error('[SEED ERROR]', err)
  process.exit(1)
})
