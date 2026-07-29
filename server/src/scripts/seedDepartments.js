import 'dotenv/config'
import mongoose from 'mongoose'
import School from '../models/School.js'
import Department from '../models/Department.js'

const DEFAULT_SCHOOLS = [
  { name: 'School of Technology', code: 'TECH' },
  { name: 'School of Agriculture & Food Sciences', code: 'AFS' },
  { name: 'School of Education', code: 'EDU' },
  { name: 'School of Environmental Sciences', code: 'ENV' },
  { name: 'School of Social Sciences', code: 'SOC' },
]

const BY_SCHOOL_CODE = {
  TECH: [
    { name: 'Computer Science', code: 'CSC' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Agricultural Engineering', code: 'AGE' },
    { name: 'Civil Engineering', code: 'CVE' },
    { name: 'Mechanical Engineering', code: 'MEE' },
    { name: 'Electrical & Electronic Engineering', code: 'EEE' },
  ],
  AFS: [
    { name: 'Crop Science', code: 'CRS' },
    { name: 'Soil Science', code: 'SOS' },
    { name: 'Animal Science', code: 'ANS' },
    { name: 'Agricultural Economics', code: 'AEC' },
    { name: 'Agricultural Extension', code: 'AEX' },
  ],
  EDU: [
    { name: 'Curriculum Studies', code: 'CUS' },
    { name: 'Educational Administration', code: 'EDA' },
    { name: 'Science Education', code: 'SCE' },
    { name: 'Arts Education', code: 'ARE' },
    { name: 'Guidance & Counselling', code: 'GDC' },
  ],
  ENV: [
    { name: 'Environmental Management', code: 'EVM' },
    { name: 'Forestry & Wood Science', code: 'FWS' },
  ],
  SOC: [
    { name: 'Sociology & Social Work', code: 'SSW' },
    { name: 'Economics & Development', code: 'ECD' },
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

  // 1. Ensure default Schools exist
  for (const s of DEFAULT_SCHOOLS) {
    await School.findOneAndUpdate(
      { code: s.code },
      { $setOnInsert: s },
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
