import Settings from '../models/Settings.js'
import Department from '../models/Department.js'

const DEPT_CODES = {
  'Computer Science': 'CSC',
  'Information Technology': 'BIT',
  'Electronics & Telecommunications Engineering': 'ETE',
}

/**
 * Generates an atomic unique student ID in the format: <PREFIX>/<YEAR>/<SEQ>
 * e.g. CSC/2026/0001
 *
 * @param {string} departmentNameOrId - Department name or ObjectId string
 * @param {number} [year] - Year for the sequence (defaults to current year)
 * @returns {Promise<string>}
 */
export async function generateStudentId(departmentNameOrId, year = new Date().getFullYear()) {
  let deptName = ''

  if (departmentNameOrId) {
    if (typeof departmentNameOrId === 'string' && departmentNameOrId.length === 24) {
      const dept = await Department.findById(departmentNameOrId).lean()
      if (dept) deptName = dept.name
    } else if (typeof departmentNameOrId === 'object' && departmentNameOrId._id) {
      deptName = departmentNameOrId.name || ''
    } else if (typeof departmentNameOrId === 'string') {
      deptName = departmentNameOrId
    }
  }

  const prefix = DEPT_CODES[deptName] || (deptName ? deptName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() : 'STU')
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
