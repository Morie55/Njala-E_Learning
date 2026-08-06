import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const EMPTY = { name: '', code: '', isPrimary: false, status: 'active' }

export default function SchoolManagement() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  async function load() {
    try {
      const r = await api.get('/schools')
      setSchools(r.data?.schools ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setForm(EMPTY)
    setEditing(null)
    setModal('form')
    setError('')
  }

  function openEdit(s) {
    setForm({
      name: s.name,
      code: s.code,
      isPrimary: s.isPrimary ?? false,
      status: s.status ?? 'active',
    })
    setEditing(s._id)
    setModal('form')
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) await api.patch(`/schools/${editing}`, form)
      else await api.post('/schools', form)
      setModal(null)
      load()
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to save school.')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this school? This will also remove sub-departments.')) return
    setDeleteError('')
    try {
      await api.delete(`/schools/${id}`)
      load()
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to delete school.'
      setDeleteError(msg)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'School Name',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#03224d]">{v}</span>
          {row.isPrimary && (
            <span className="bg-[#a0f3d4] text-[#00513e] border border-[#086b53]/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">star</span>
              PRIMARY FACULTY
            </span>
          )}
        </div>
      ),
    },
    { key: 'code', label: 'Code', render: (v) => <span className="font-mono font-bold text-[#03224d]">{v}</span> },
    {
      key: 'status',
      label: 'Operational Status',
      render: (v, row) => (
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          row.isPrimary
            ? 'bg-[#a0f3d4]/30 border-[#086b53] text-[#00513e]'
            : 'bg-[#d8e2ff]/40 border-[#1f3864] text-[#001a41]'
        }`}>
          {row.isPrimary ? 'Primary Active Focus' : 'Expansion Space Ready'}
        </span>
      ),
    },
    { key: 'departmentCount', label: 'Departments', render: (v) => v ?? 0 },
    { key: 'courseCount', label: 'Courses', render: (v) => v ?? 0 },
    { key: 'lecturerCount', label: 'Lecturers', render: (v) => v ?? 0 },
  ]

  return (
    <AppLayout role="admin">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Njala University Schools & Faculties</h2>
          <p className="text-[14px] text-[#44474f]">Configured with School of Technology (TECH) as primary focus, with active space for all university schools.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#03224d] text-white px-4 py-2.5 rounded-xl text-[12px] font-bold hover:opacity-90 flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add New School
        </button>
      </div>

      {/* Info Architecture Banner */}
      <div className="mb-6 p-4 bg-[#eefaf6] border border-[#86efcc] rounded-2xl flex items-start gap-3 text-[#00513e]">
        <span className="material-symbols-outlined text-[24px] shrink-0 mt-0.5">account_balance</span>
        <div className="text-[13px]">
          <p className="font-bold">Faculty Architecture & Provisioning Scope</p>
          <p className="opacity-90 leading-relaxed">
            The platform is centered on the <strong>School of Technology (TECH)</strong> for active course deployment, batch student provisioning, and gradebook operations. Space is provisioned for all 12 Njala University schools for future expansion.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm">
        {deleteError && (
          <div className="m-4 flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg">
            <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">error</span>
            <p className="text-[14px] text-[#ba1a1a] font-medium">{deleteError}</p>
          </div>
        )}
        {loading ? (
          <LoadingSkeleton type="table" count={5} />
        ) : (
          <DataTable
            columns={columns}
            rows={schools}
            emptyMessage="No schools created yet."
            actions={(row) => (
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(row)} title="Edit School" className="p-1 text-[#44474f] hover:text-[#03224d] cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                {!row.isPrimary && (
                  <button onClick={() => handleDelete(row._id)} title="Delete School" className="p-1 text-[#ba1a1a] hover:opacity-70 cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Edit School Configuration' : 'Add New Academic School'} onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                School Name *
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. School of Technology"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Code *
              </label>
              <input
                id="code"
                type="text"
                placeholder="e.g. TECH"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                required
                className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d] uppercase"
              />
            </div>

            <div className="pt-2 border-t border-[#c4c6d0]/50 space-y-3">
              <label className="flex items-center gap-2 text-[13px] font-bold text-[#03224d] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) => setForm((p) => ({ ...p, isPrimary: e.target.checked }))}
                  className="w-4 h-4 rounded text-[#086b53] focus:ring-[#086b53]"
                />
                <span>Set as Primary Active Focus School</span>
              </label>

              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] bg-white focus:outline-none focus:border-[#03224d]"
                >
                  <option value="active">Active Operational</option>
                  <option value="upcoming">Upcoming Expansion Space</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {error && <p className="text-[14px] text-[#ba1a1a]">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#03224d] text-white px-5 py-2.5 rounded-xl text-[14px] font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : editing ? 'Update School' : 'Create School'}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-5 py-2.5 border border-[#c4c6d0] text-[#44474f] rounded-xl text-[14px] font-bold hover:bg-[#f0eded] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  )
}
