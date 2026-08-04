import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function BulkImportUsers() {
  const [activeTab, setActiveTab] = useState('csv') // 'csv' | 'batch'
  const [csvText, setCsvText] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  // Batch Generation state
  const [batchDept, setBatchDept] = useState('')
  const [batchCount, setBatchCount] = useState(10)
  const [batchRole, setBatchRole] = useState('student')
  const [generatingBatch, setGeneratingBatch] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/schools'),
      api.get('/departments'),
    ]).then(([sRes, dRes]) => {
      setSchools(sRes.data?.schools ?? [])
      setDepartments(dRes.data?.departments ?? [])
    }).catch(() => {})
  }, [])

  function parseCSV(text) {
    if (!text.trim()) {
      setParsedRows([])
      return
    }

    const lines = text.trim().split(/\r?\n/)
    if (lines.length === 0) return

    // Detect header row if present
    const firstLine = lines[0].toLowerCase()
    const hasHeader = firstLine.includes('email') || firstLine.includes('name') || firstLine.includes('role')
    const dataLines = hasHeader ? lines.slice(1) : lines

    const rows = []
    dataLines.forEach((line, idx) => {
      if (!line.trim()) return
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))

      if (hasHeader) {
        const headerCols = lines[0].toLowerCase().split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
        const emailIdx = headerCols.findIndex(h => h.includes('email'))
        const nameIdx = headerCols.findIndex(h => h.includes('name') || h.includes('fullname'))
        const roleIdx = headerCols.findIndex(h => h.includes('role'))
        const idIdx = headerCols.findIndex(h => h.includes('id') || h.includes('number'))

        rows.push({
          email: emailIdx !== -1 ? cols[emailIdx] : cols[0],
          fullName: nameIdx !== -1 ? cols[nameIdx] : (cols[1] || 'User'),
          role: roleIdx !== -1 ? cols[roleIdx]?.toLowerCase() : 'student',
          idNumber: idIdx !== -1 ? cols[idIdx] : '',
        })
      } else {
        // Standard column order: email, fullName, role, idNumber
        rows.push({
          email: cols[0] || '',
          fullName: cols[1] || 'User',
          role: (cols[2] || 'student').toLowerCase(),
          idNumber: cols[3] || '',
        })
      }
    })

    setParsedRows(rows.filter(r => r.email && r.email.includes('@')))
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      setCsvText(content)
      parseCSV(content)
    }
    reader.readAsText(file)
  }

  function handleTextChange(val) {
    setCsvText(val)
    parseCSV(val)
  }

  async function handleImport() {
    if (parsedRows.length === 0) {
      setError('Please provide valid CSV records with email addresses.')
      return
    }

    setImporting(true)
    setError('')
    try {
      const payloadRows = parsedRows.map(r => ({
        ...r,
        schoolId: selectedSchool || undefined,
        departmentId: selectedDept || undefined,
      }))

      const res = await api.post('/admin/users/bulk-import', { rows: payloadRows })
      setResults(res.data?.results ?? [])
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to complete bulk import.')
    } finally {
      setImporting(false)
    }
  }

  async function handleBatchGenerate() {
    if (!batchDept) {
      setError('Please select a target department for batch generation.')
      return
    }
    if (batchCount < 1 || batchCount > 100) {
      setError('Batch count must be between 1 and 100.')
      return
    }

    setGeneratingBatch(true)
    setError('')
    try {
      const res = await api.post('/admin/users/batch-generate', {
        departmentId: batchDept,
        count: batchCount,
        role: batchRole,
      })
      setResults(res.data?.results ?? [])
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to generate batch accounts.')
    } finally {
      setGeneratingBatch(false)
    }
  }

  function copyPinRoster() {
    if (!results) return
    const header = 'ID Number\tFull Name\tEmail\tRole\tStatus\tTemporary PIN\n'
    const content = results.map(r => `${r.idNumber || ''}\t${r.fullName || ''}\t${r.email}\t${r.role || ''}\t${r.status}\t${r.pin || ''}`).join('\n')
    navigator.clipboard.writeText(header + content)
    alert('Temporary PIN roster copied to clipboard!')
  }

  return (
    <AppLayout role="admin">
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/users" className="hover:text-[#03224d]">User Management</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">Batch Provisioning & Import</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Batch Account Provisioning</h2>
          <p className="text-[14px] text-[#44474f]">
            Bulk import users from CSV or instantly generate N accounts with auto-assigned Student IDs and temporary PINs.
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      {!results && (
        <div className="flex gap-2 border-b border-[#c4c6d0] mb-6">
          <button
            onClick={() => { setActiveTab('csv'); setError('') }}
            className={`px-5 py-2.5 text-[14px] font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'csv'
                ? 'border-[#03224d] text-[#03224d]'
                : 'border-transparent text-[#44474f] hover:text-[#03224d]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            CSV Bulk Import
          </button>
          <button
            onClick={() => { setActiveTab('batch'); setError('') }}
            className={`px-5 py-2.5 text-[14px] font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'batch'
                ? 'border-[#03224d] text-[#03224d]'
                : 'border-transparent text-[#44474f] hover:text-[#03224d]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">group_add</span>
            Instant Program Batch Generator (Set of N)
          </button>
        </div>
      )}

      {!results ? (
        <div className="space-y-6">
          {activeTab === 'csv' ? (
            /* CSV Controls box */
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-sm space-y-5">
              <h3 className="font-bold text-[16px] text-[#03224d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                1. Select CSV File or Paste Records
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-2">
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="w-full text-[13px] text-[#44474f] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[12px] file:font-bold file:bg-[#03224d] file:text-white hover:file:opacity-90 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                      Assign School (Optional)
                    </label>
                    <select
                      value={selectedSchool}
                      onChange={e => setSelectedSchool(e.target.value)}
                      className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d]"
                    >
                      <option value="">All / None</option>
                      {schools.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                      Assign Department (Optional)
                    </label>
                    <select
                      value={selectedDept}
                      onChange={e => setSelectedDept(e.target.value)}
                      className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d]"
                    >
                      <option value="">All / None</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  Raw CSV Data (Format: email, fullName, role, idNumber)
                </label>
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder={`email, fullName, role, idNumber\ns20261001@njala.edu.sl, Mariama Kamara, student, 20261001\nj.smith@njala.edu.sl, Dr. John Smith, lecturer, L8840`}
                  className="w-full border border-[#c4c6d0] rounded-lg p-3 text-[13px] font-mono focus:outline-none focus:border-[#03224d] bg-[#fbf9f8]"
                />
              </div>

              {error && (
                <p className="text-[13px] text-[#ba1a1a] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </p>
              )}
            </div>
          ) : (
            /* Instant Batch Generator box */
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-[18px] text-[#03224d] flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[22px] text-[#086b53]">auto_awesome</span>
                  Instant Program Batch Generator
                </h3>
                <p className="text-[13px] text-[#44474f]">
                  Generate a set of accounts for a specific program (e.g. 10 student accounts for Computer Science). Each account is automatically assigned a unique Student ID (e.g. <code>CSC/2026/0001</code>) and temporary 6-digit PIN.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                    Target Department / Program *
                  </label>
                  <select
                    value={batchDept}
                    onChange={e => setBatchDept(e.target.value)}
                    className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#03224d] font-semibold text-[#03224d]"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                    Number of Accounts (1–100) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batchCount}
                    onChange={e => setBatchCount(parseInt(e.target.value) || 1)}
                    className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#03224d] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                    Role *
                  </label>
                  <select
                    value={batchRole}
                    onChange={e => setBatchRole(e.target.value)}
                    className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#03224d] capitalize"
                  >
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                    <option value="dept_head">Department Head</option>
                  </select>
                </div>
              </div>

              {error && (
                <p className="text-[13px] text-[#ba1a1a] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </p>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleBatchGenerate}
                  disabled={generatingBatch || !batchDept}
                  className="bg-[#03224d] text-white px-6 py-3 rounded-lg text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {generatingBatch ? (
                    <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Generating Batch Accounts…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">bolt</span> Generate {batchCount} Accounts Now</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="bg-white border border-[#c4c6d0] rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#c4c6d0] bg-[#f6f3f2] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#086b53]">checklist</span>
                  <h3 className="font-bold text-[14px] text-[#03224d]">
                    Previewing {parsedRows.length} Valid CSV Record{parsedRows.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-[#086b53] text-white px-6 py-2.5 rounded-lg text-[13px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {importing ? (
                    <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Importing…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">publish</span> Process Import & Generate PINs</>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#eae8e7]">
                    <tr>
                      <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">Email Address</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">Full Name</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">Portal Role</th>
                      <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">ID Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4c6d0]">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-[#f6f3f2]">
                        <td className="px-6 py-3 text-[12px] text-[#44474f] font-mono">{i + 1}</td>
                        <td className="px-6 py-3 text-[13px] font-bold text-[#03224d]">{r.email}</td>
                        <td className="px-6 py-3 text-[13px] text-[#1b1c1c]">{r.fullName}</td>
                        <td className="px-6 py-3 text-[12px]">
                          <span className="capitalize font-semibold text-[#1f3864] bg-[#d8e2ff] px-2.5 py-0.5 rounded-full">
                            {r.role}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[12px] text-[#44474f] font-mono">{r.idNumber || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Results Table with Temporary PINs */
        <div className="bg-white border border-[#c4c6d0] rounded-xl overflow-hidden shadow-lg space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c4c6d0] pb-5">
            <div>
              <div className="flex items-center gap-2 text-[#086b53] mb-1">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
                <h3 className="text-[20px] font-bold">Import Process Completed!</h3>
              </div>
              <p className="text-[13px] text-[#44474f]">
                Hand out these temporary 6-digit PINs to new users for first-time account activation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={copyPinRoster}
                className="px-4 py-2 border border-[#03224d] text-[#03224d] rounded-lg text-[12px] font-bold hover:bg-[#03224d] hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">content_copy</span>
                Copy PIN Roster
              </button>
              <button
                onClick={() => { setResults(null); setCsvText(''); setParsedRows([]) }}
                className="px-4 py-2 bg-[#03224d] text-white rounded-lg text-[12px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Import More Users
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f6f3f2]">
                <tr>
                  <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">ID Number</th>
                  <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">Email Address</th>
                  <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">Full Name</th>
                  <th className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-[12px] font-bold text-[#03224d] uppercase tracking-wider">Temporary PIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c6d0]">
                {results.map((r, i) => (
                  <tr key={i} className="hover:bg-[#f6f3f2]">
                    <td className="px-6 py-3 text-[13px] font-mono font-bold text-[#03224d]">{r.idNumber || '—'}</td>
                    <td className="px-6 py-3 text-[13px] font-bold text-[#03224d]">{r.email}</td>
                    <td className="px-6 py-3 text-[13px] text-[#1b1c1c]">{r.fullName || '—'}</td>
                    <td className="px-6 py-3 text-[12px]">
                      {r.status === 'created' ? (
                        <span className="bg-[#a0f3d4] text-[#00513e] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Created (Pending Activation)
                        </span>
                      ) : r.status === 'updated' ? (
                        <span className="bg-[#d8e2ff] text-[#001a41] font-bold px-2.5 py-0.5 rounded-full">
                          Updated
                        </span>
                      ) : (
                        <span className="bg-[#ffdad6] text-[#93000a] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          {r.error}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {r.pin && r.pin.length === 6 ? (
                        <span className="font-mono font-extrabold text-[16px] text-[#086b53] bg-[#a0f3d4]/30 px-3 py-1 rounded-md border border-[#086b53]/40 tracking-wider">
                          {r.pin}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#44474f] italic">{r.pin || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
