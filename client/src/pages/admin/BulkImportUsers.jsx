import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

const ROLES = [
  { value: 'student',   label: 'Student' },
  { value: 'lecturer',  label: 'Lecturer' },
  { value: 'dept_head', label: 'Department Head' },
]

/* One program row in the multi-batch builder */
function ProgramRow({ row, departments, onChange, onRemove }) {
  return (
    <div className="flex flex-wrap gap-3 items-end bg-[#f6f3f2] border border-[#c4c6d0] rounded-xl px-4 py-3">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Department / Program</label>
        <select
          value={row.departmentId}
          onChange={e => onChange({ ...row, departmentId: e.target.value })}
          className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d] font-semibold text-[#03224d]"
        >
          <option value="">â€” Select Program â€”</option>
          {departments.map(d => (
            <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Accounts</label>
        <input
          type="number" min={1} max={200} value={row.count}
          onChange={e => onChange({ ...row, count: Math.max(1, Math.min(200, parseInt(e.target.value) || 1)) })}
          className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] font-bold bg-white focus:outline-none focus:border-[#03224d] text-center"
        />
      </div>
      <div className="w-44">
        <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Role</label>
        <select
          value={row.role}
          onChange={e => onChange({ ...row, role: e.target.value })}
          className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d] capitalize"
        >
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <button
        onClick={onRemove} title="Remove program"
        className="p-2 rounded-lg text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors mb-0.5"
      >
        <span className="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </div>
  )
}

export default function BulkImportUsers() {
  const [activeTab, setActiveTab]     = useState('multi')
  const [departments, setDepartments] = useState([])
  const [schools, setSchools]         = useState([])
  const [error, setError]             = useState('')
  const [results, setResults]         = useState(null)

  /* CSV */
  const [csvText, setCsvText]           = useState('')
  const [parsedRows, setParsedRows]     = useState([])
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedDept, setSelectedDept]     = useState('')
  const [importing, setImporting]       = useState(false)

  /* Single-program */
  const [batchDept, setBatchDept]   = useState('')
  const [batchCount, setBatchCount] = useState(10)
  const [batchRole, setBatchRole]   = useState('student')
  const [generatingBatch, setGeneratingBatch] = useState(false)

  /* Multi-program */
  const newRow = () => ({ departmentId: '', count: 10, role: 'student', _key: Date.now() + Math.random() })
  const [programs, setPrograms]           = useState([newRow(), newRow(), newRow()])
  const [generatingMulti, setGeneratingMulti] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/schools'), api.get('/departments')])
      .then(([sRes, dRes]) => {
        setSchools(sRes.data?.schools ?? [])
        setDepartments(dRes.data?.departments ?? [])
      }).catch(() => {})
  }, [])

  /* CSV parse */
  function parseCSV(text) {
    if (!text.trim()) { setParsedRows([]); return }
    const lines = text.trim().split(/\r?\n/)
    if (!lines.length) return
    const fl = lines[0].toLowerCase()
    const hasHeader = fl.includes('email') || fl.includes('name') || fl.includes('role')
    const data = hasHeader ? lines.slice(1) : lines
    const rows = []
    data.forEach(line => {
      if (!line.trim()) return
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
      if (hasHeader) {
        const hdr = lines[0].toLowerCase().split(',').map(c => c.trim().replace(/^["']|["']$/g, ''))
        const ix = k => hdr.findIndex(h => h.includes(k))
        rows.push({ email: cols[ix('email')] ?? cols[0] ?? '', fullName: cols[ix('name')] ?? cols[1] ?? 'User', role: (cols[ix('role')] ?? cols[2] ?? 'student').toLowerCase(), idNumber: cols[ix('id')] ?? cols[3] ?? '' })
      } else {
        rows.push({ email: cols[0] || '', fullName: cols[1] || 'User', role: (cols[2] || 'student').toLowerCase(), idNumber: cols[3] || '' })
      }
    })
    setParsedRows(rows.filter(r => r.email && r.email.includes('@')))
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const t = ev.target.result; setCsvText(t); parseCSV(t) }
    reader.readAsText(file)
  }

  /* API calls */
  async function handleImport() {
    if (!parsedRows.length) { setError('Please provide valid CSV records with email addresses.'); return }
    setImporting(true); setError('')
    try {
      const res = await api.post('/admin/users/bulk-import', {
        rows: parsedRows.map(r => ({ ...r, schoolId: selectedSchool || undefined, departmentId: selectedDept || undefined }))
      })
      setResults({ type: 'csv', data: res.data?.results ?? [] })
    } catch (err) { setError(err.message || 'Failed to complete bulk import.') }
    finally { setImporting(false) }
  }

  async function handleBatchGenerate() {
    if (!batchDept) { setError('Please select a department.'); return }
    setGeneratingBatch(true); setError('')
    try {
      const res = await api.post('/admin/users/batch-generate', { departmentId: batchDept, count: batchCount, role: batchRole })
      setResults({ type: 'single', data: res.data?.results ?? [], deptName: res.data?.departmentName })
    } catch (err) { setError(err.message || 'Failed to generate batch.') }
    finally { setGeneratingBatch(false) }
  }

  async function handleMultiBatchGenerate() {
    const valid = programs.filter(p => p.departmentId)
    if (!valid.length) { setError('Add at least one program with a department selected.'); return }
    setGeneratingMulti(true); setError('')
    try {
      const res = await api.post('/admin/users/multi-batch-generate', {
        programs: valid.map(p => ({ departmentId: p.departmentId, count: p.count, role: p.role })),
      })
      setResults({ type: 'multi', batchResults: res.data?.batchResults ?? [], totalCreated: res.data?.totalCreated ?? 0 })
    } catch (err) { setError(err.message || 'Failed to generate multi-program batch.') }
    finally { setGeneratingMulti(false) }
  }

  function copyRoster() {
    if (!results) return
    let rows = []
    if (results.type === 'multi') {
      results.batchResults?.forEach(b => b.accounts?.forEach(a => {
        rows.push(`${a.idNumber || ''}\t${a.fullName || ''}\t${a.email}\t${a.role || ''}\t${b.departmentName}\t${a.status}\t${a.pin || ''}`)
      }))
    } else {
      rows = (results.data ?? []).map(r => `${r.idNumber || ''}\t${r.fullName || ''}\t${r.email}\t${r.role || ''}\t${r.status}\t${r.pin || ''}`)
    }
    const header = results.type === 'multi'
      ? 'ID Number\tFull Name\tEmail\tRole\tDepartment\tStatus\tTemporary PIN'
      : 'ID Number\tFull Name\tEmail\tRole\tStatus\tTemporary PIN'
    navigator.clipboard.writeText(header + '\n' + rows.join('\n'))
    alert('Roster copied to clipboard!')
  }

  const reset = () => { setResults(null); setCsvText(''); setParsedRows([]) }

  /* â”€â”€ RESULTS VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (results) {
    const isMulti = results.type === 'multi'
    return (
      <AppLayout role="admin">
        <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
          <Link to="/users" className="hover:text-[#03224d]">User Management</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#03224d]">Batch Provisioning</span>
        </nav>

        <div className="space-y-6">
          {/* Header */}
          <div className="bg-[#eefaf6] border border-[#86efcc] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#086b53] mb-1">
                <span className="material-symbols-outlined text-[28px]">check_circle</span>
                <h2 className="text-[22px] font-bold">
                  {isMulti
                    ? `${results.totalCreated} Accounts Created Across ${results.batchResults?.length} Program(s)`
                    : `Import Complete â€” ${results.data?.filter(r => r.status === 'created').length ?? 0} Created`}
                </h2>
              </div>
              <p className="text-[13px] text-[#44474f]">Hand out the temporary PINs to new users for first-time account activation.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={copyRoster} className="px-4 py-2 border border-[#03224d] text-[#03224d] rounded-xl text-[12px] font-bold hover:bg-[#03224d] hover:text-white transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">content_copy</span>Copy Roster
              </button>
              <button onClick={reset} className="px-4 py-2 bg-[#03224d] text-white rounded-xl text-[12px] font-bold hover:opacity-90 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">add</span>New Batch
              </button>
            </div>
          </div>

          {/* Multi results â€” grouped by dept */}
          {isMulti ? results.batchResults?.map((batch, bi) => {
            const created = batch.accounts?.filter(a => a.status === 'created').length ?? 0
            const failed  = batch.accounts?.filter(a => a.status === 'failed').length  ?? 0
            return (
              <div key={bi} className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-[#f6f3f2] border-b border-[#c4c6d0] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="bg-[#03224d] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg tracking-widest">{batch.departmentCode}</span>
                    <span className="font-bold text-[15px] text-[#03224d]">{batch.departmentName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="bg-[#a0f3d4] text-[#00513e] font-bold px-2.5 py-0.5 rounded-full">{created} created</span>
                    {failed > 0 && <span className="bg-[#ffdad6] text-[#93000a] font-bold px-2.5 py-0.5 rounded-full">{failed} failed</span>}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#eae8e7]">
                      <tr>{['#','ID Number','Email','Role','Status','Temp PIN'].map(h => (
                        <th key={h} className="px-5 py-3 text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#c4c6d0]">
                      {batch.accounts?.map((a, ai) => (
                        <tr key={ai} className="hover:bg-[#f6f3f2]">
                          <td className="px-5 py-3 text-[12px] text-[#44474f] font-mono">{ai + 1}</td>
                          <td className="px-5 py-3 text-[13px] font-mono font-bold text-[#03224d]">{a.idNumber || 'â€”'}</td>
                          <td className="px-5 py-3 text-[13px] font-bold text-[#03224d]">{a.email}</td>
                          <td className="px-5 py-3">
                            <span className="capitalize text-[12px] font-semibold bg-[#d8e2ff] text-[#1f3864] px-2.5 py-0.5 rounded-full">{a.role}</span>
                          </td>
                          <td className="px-5 py-3">
                            {a.status === 'created'
                              ? <span className="bg-[#a0f3d4] text-[#00513e] font-bold text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><span className="material-symbols-outlined text-[13px]">check_circle</span>Created</span>
                              : <span className="bg-[#ffdad6] text-[#93000a] font-bold text-[11px] px-2 py-0.5 rounded-full w-fit">{a.error || 'Failed'}</span>}
                          </td>
                          <td className="px-5 py-3">
                            {a.pin
                              ? <span className="font-mono font-extrabold text-[15px] text-[#086b53] bg-[#a0f3d4]/30 px-3 py-1 rounded-lg border border-[#086b53]/40 tracking-widest">{a.pin}</span>
                              : <span className="text-[12px] text-[#44474f] italic">â€”</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }) : (
            /* Single / CSV results */
            <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f6f3f2]">
                    <tr>{['ID Number','Email','Full Name','Status','Temp PIN'].map(h => (
                      <th key={h} className="px-6 py-3 text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4c6d0]">
                    {results.data?.map((r, i) => (
                      <tr key={i} className="hover:bg-[#f6f3f2]">
                        <td className="px-6 py-3 text-[13px] font-mono font-bold text-[#03224d]">{r.idNumber || 'â€”'}</td>
                        <td className="px-6 py-3 text-[13px] font-bold text-[#03224d]">{r.email}</td>
                        <td className="px-6 py-3 text-[13px]">{r.fullName || 'â€”'}</td>
                        <td className="px-6 py-3">
                          {r.status === 'created'
                            ? <span className="bg-[#a0f3d4] text-[#00513e] font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit"><span className="material-symbols-outlined text-[13px]">check_circle</span>Created</span>
                            : r.status === 'updated'
                              ? <span className="bg-[#d8e2ff] text-[#001a41] font-bold text-[11px] px-2.5 py-0.5 rounded-full">Updated</span>
                              : <span className="bg-[#ffdad6] text-[#93000a] font-bold text-[11px] px-2.5 py-0.5 rounded-full">{r.error}</span>}
                        </td>
                        <td className="px-6 py-3">
                          {r.pin && r.pin.length === 6
                            ? <span className="font-mono font-extrabold text-[15px] text-[#086b53] bg-[#a0f3d4]/30 px-3 py-1 rounded-lg border border-[#086b53]/40 tracking-widest">{r.pin}</span>
                            : <span className="text-[12px] text-[#44474f] italic">{r.pin || 'â€”'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    )
  }

  /* â”€â”€ SETUP VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const totalMulti = programs.filter(p => p.departmentId).reduce((s, p) => s + (parseInt(p.count) || 0), 0)

  return (
    <AppLayout role="admin">
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/users" className="hover:text-[#03224d]">User Management</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">Batch Provisioning &amp; Import</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Batch Account Provisioning</h2>
          <p className="text-[14px] text-[#44474f]">Provision accounts across multiple programs at once, or import from CSV.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#c4c6d0] mb-6">
        {[
          { key: 'multi',  icon: 'account_tree', label: 'Multi-Program Batch', badge: 'New' },
          { key: 'single', icon: 'group_add',     label: 'Single Program' },
          { key: 'csv',    icon: 'upload_file',   label: 'CSV Import' },
        ].map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setError('') }}
            className={`px-5 py-2.5 text-[13px] font-bold border-b-2 flex items-center gap-2 transition-all ${activeTab === t.key ? 'border-[#03224d] text-[#03224d]' : 'border-transparent text-[#44474f] hover:text-[#03224d]'}`}>
            <span className="material-symbols-outlined text-[17px]">{t.icon}</span>
            {t.label}
            {t.badge && <span className="text-[10px] font-extrabold bg-[#03224d] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-6">

        {/* â”€â”€ MULTI-PROGRAM TAB â”€â”€ */}
        {activeTab === 'multi' && (
          <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-[18px] text-[#03224d] flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[22px] text-[#086b53]">account_tree</span>
                Multi-Program Batch Generator
              </h3>
              <p className="text-[13px] text-[#44474f]">
                Configure sets of accounts for multiple programs simultaneously. Each row is one program â€”
                each account gets a department-prefixed Student ID (e.g.&nbsp;<code className="bg-[#f6f3f2] px-1 rounded">CSC/2026/0001</code>) and a temporary 6-digit PIN.
              </p>
            </div>

            {/* Program rows */}
            <div className="space-y-3">
              {programs.map((row, idx) => (
                <ProgramRow
                  key={row._key}
                  row={row}
                  departments={departments}
                  onChange={updated => setPrograms(prev => prev.map((r, i) => i === idx ? updated : r))}
                  onRemove={() => setPrograms(prev => prev.filter((_, i) => i !== idx))}
                />
              ))}
            </div>

            {/* Live summary chips */}
            {programs.some(p => p.departmentId) && (
              <div className="flex flex-wrap gap-2">
                {programs.filter(p => p.departmentId).map((p, i) => {
                  const dept = departments.find(d => d._id === p.departmentId)
                  return (
                    <span key={i} className="flex items-center gap-1.5 bg-[#d8e2ff] text-[#001a41] text-[12px] font-bold px-3 py-1 rounded-full">
                      <span className="text-[10px] uppercase tracking-wider bg-[#03224d] text-white px-1.5 py-0.5 rounded">{dept?.code}</span>
                      {dept?.name} Ã— {p.count}
                    </span>
                  )
                })}
                <span className="flex items-center gap-1 text-[12px] font-bold text-[#44474f] bg-[#f6f3f2] border border-[#c4c6d0] px-3 py-1 rounded-full">
                  Total: {totalMulti} accounts
                </span>
              </div>
            )}

            {error && <p className="text-[13px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#c4c6d0]">
              <button
                onClick={() => setPrograms(p => [...p, newRow()])}
                disabled={programs.length >= 10}
                className="flex items-center gap-1.5 text-[13px] font-bold text-[#03224d] border border-[#c4c6d0] px-4 py-2 rounded-xl hover:bg-[#f6f3f2] disabled:opacity-40 transition-colors"
              >
                <span className="material-symbols-outlined text-[17px]">add</span>Add Program
              </button>
              <button
                onClick={handleMultiBatchGenerate}
                disabled={generatingMulti || !programs.some(p => p.departmentId)}
                className="bg-[#03224d] text-white px-7 py-3 rounded-xl text-[14px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {generatingMulti
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Generatingâ€¦</>
                  : <><span className="material-symbols-outlined text-[18px]">bolt</span>Generate {totalMulti} Accounts</>}
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ SINGLE PROGRAM TAB â”€â”€ */}
        {activeTab === 'single' && (
          <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-[18px] text-[#03224d] flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[22px] text-[#086b53]">group_add</span>
                Single Program Batch
              </h3>
              <p className="text-[13px] text-[#44474f]">Generate N accounts for one specific program with auto-assigned IDs and PINs.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Department *</label>
                <select value={batchDept} onChange={e => setBatchDept(e.target.value)}
                  className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#03224d] font-semibold text-[#03224d]">
                  <option value="">â€” Select â€”</option>
                  {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Number of Accounts *</label>
                <input type="number" min={1} max={200} value={batchCount}
                  onChange={e => setBatchCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                  className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] font-bold bg-white focus:outline-none focus:border-[#03224d]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Role *</label>
                <select value={batchRole} onChange={e => setBatchRole(e.target.value)}
                  className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#03224d] capitalize">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-[13px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}
            <div className="flex justify-end">
              <button onClick={handleBatchGenerate} disabled={generatingBatch || !batchDept}
                className="bg-[#03224d] text-white px-7 py-3 rounded-xl text-[14px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-sm">
                {generatingBatch
                  ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Generatingâ€¦</>
                  : <><span className="material-symbols-outlined text-[18px]">bolt</span>Generate {batchCount} Accounts</>}
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ CSV IMPORT TAB â”€â”€ */}
        {activeTab === 'csv' && (
          <div className="space-y-5">
            <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="font-bold text-[16px] text-[#03224d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                Select CSV File or Paste Records
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-2">Upload CSV File</label>
                  <input type="file" accept=".csv,.txt" onChange={handleFileUpload}
                    className="w-full text-[13px] text-[#44474f] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[12px] file:font-bold file:bg-[#03224d] file:text-white hover:file:opacity-90 cursor-pointer" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Assign School</label>
                    <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)}
                      className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d]">
                      <option value="">None</option>
                      {schools.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Assign Dept.</label>
                    <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                      className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d]">
                      <option value="">None</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name} ({d.code})</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Raw CSV (email, fullName, role, idNumber)</label>
                <textarea rows={5} value={csvText} onChange={e => { setCsvText(e.target.value); parseCSV(e.target.value) }}
                  placeholder={`email, fullName, role, idNumber\ns20261001@njala.edu.sl, Mariama Kamara, student, 20261001\nj.smith@njala.edu.sl, Dr. John Smith, lecturer, L8840`}
                  className="w-full border border-[#c4c6d0] rounded-xl p-3 text-[13px] font-mono focus:outline-none focus:border-[#03224d] bg-[#fbf9f8]" />
              </div>
              {error && <p className="text-[13px] text-[#ba1a1a] font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}
            </div>

            {parsedRows.length > 0 && (
              <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#c4c6d0] bg-[#f6f3f2] flex items-center justify-between">
                  <h3 className="font-bold text-[14px] text-[#03224d] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#086b53]">checklist</span>
                    Previewing {parsedRows.length} record{parsedRows.length !== 1 ? 's' : ''}
                  </h3>
                  <button onClick={handleImport} disabled={importing}
                    className="bg-[#086b53] text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                    {importing
                      ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Importingâ€¦</>
                      : <><span className="material-symbols-outlined text-[18px]">publish</span>Process Import</>}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#eae8e7]">
                      <tr>{['#','Email','Full Name','Role','ID Number'].map(h => (
                        <th key={h} className="px-6 py-3 text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#c4c6d0]">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-[#f6f3f2]">
                          <td className="px-6 py-3 text-[12px] text-[#44474f] font-mono">{i + 1}</td>
                          <td className="px-6 py-3 text-[13px] font-bold text-[#03224d]">{r.email}</td>
                          <td className="px-6 py-3 text-[13px]">{r.fullName}</td>
                          <td className="px-6 py-3"><span className="capitalize text-[12px] font-semibold bg-[#d8e2ff] text-[#1f3864] px-2.5 py-0.5 rounded-full">{r.role}</span></td>
                          <td className="px-6 py-3 text-[12px] text-[#44474f] font-mono">{r.idNumber || 'â€”'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
