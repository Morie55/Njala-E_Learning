import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const EMPTY = { name: '', code: '' }

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
    setForm({ name: s.name, code: s.code })
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
    { key: 'name', label: 'School Name' },
    { key: 'code', label: 'Code' },
    { key: 'departmentCount', label: 'Departments', render: (v) => v ?? 0 },
    { key: 'courseCount', label: 'Courses', render: (v) => v ?? 0 },
    { key: 'lecturerCount', label: 'Lecturers', render: (v) => v ?? 0 },
  ]

  return (
    <AppLayout role="admin">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Schools</h2>
          <p className="text-[14px] text-[#44474f]">Manage Njala academic Schools.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#03224d] text-white px-4 py-2 rounded text-[12px] font-bold hover:opacity-90 flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New School
        </button>
      </div>

      <div className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden">
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
              <>
                <button onClick={() => openEdit(row)} className="p-1 text-[#44474f] hover:text-[#03224d] cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={() => handleDelete(row._id)} className="p-1 text-[#ba1a1a] hover:opacity-70 cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={editing ? 'Edit School' : 'New School'} onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                School Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. School of Technology"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
            <div>
              <label htmlFor="code" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Code
              </label>
              <input
                id="code"
                type="text"
                placeholder="e.g. TECH"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                required
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
            {error && <p className="text-[14px] text-[#ba1a1a]">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#03224d] text-white px-5 py-2.5 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-5 py-2.5 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded] cursor-pointer"
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
