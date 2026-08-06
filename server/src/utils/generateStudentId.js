import Settings from '../models/Settings.js'
import Department from '../models/Department.js'

/**
 * Generates an atomic unique student ID in the format: <PREFIX>/<YEAR>/<SEQ>
 * e.g. CSC/2026/0001
 *
 * Prefix is derived from the department's `code` field in MongoDB (e.g. "CSC", "BIT", "ETE").
 * Falls back to the first 3 letters of the department name if no code is found.
 *
 * @param {string|object} departmentNameOrId - Department ObjectId string, name string, or populated dept object
 * @param {number} [year] - Year for the sequence (defaults to current year)
 * @returns {Promise<string>}
 */
export async function generateStudentId(departmentNameOrId, year = new Date().getFullYear()) {
  let prefix = 'STU'

  if (departmentNameOrId) {
    if (typeof departmentNameOrId === 'string' && departmentNameOrId.length === 24) {
      const dept = await Department.findById(departmentNameOrId).lean()
      if (dept) {
        prefix = dept.code || dept.name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
      }
    } else if (typeof departmentNameOrId === 'object' && departmentNameOrId._id) {
      prefix = departmentNameOrId.code ||
               (departmentNameOrId.name || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() ||
               'STU'
    } else if (typeof departmentNameOrId === 'string') {
      // Plain name string — match by name in DB first, then fall back to derived prefix
      const dept = await Department.findOne({ name: departmentNameOrId }).lean()
      prefix = dept?.code || departmentNameOrId.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'STU'
    }
  }

  const key = `student_id_seq:${prefix}:${year}`

  const doc = await Settings.findOneAndUpdate(
    { key },
    {
      $inc: { value: 1 },
      $setOnInsert: { group: 'id_sequences', label: `Student ID Sequence for ${prefix} (${year})` },
    },
    { upsert: true, returnDocument: 'after' }
  )

  const seq = String(doc.value).padStart(4, '0')
  return `${prefix}/${year}/${seq}`
}
