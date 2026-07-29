import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const EMPTY = { name: '', code: '', schoolId: '' }

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([])
  const [schools, setSchools] = useState([])
  const [selectedSchool, setSelectedSchool] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  async function loadSchools() {
    try {
      const res = await api.get('/schools')
      setSchools(res.data?.schools ?? [])
    } catch (_) {}
  }

  async function loadDepartments(schoolId) {
    setLoading(true)
    try {
      const url = schoolId ? `/departments?schoolId=${schoolId}` : '/departments'
      const res = await api.get(url)
      setDepartments(res.data?.departments ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadSchools()
    loadDepartments('')
  }, [])

  const handleFilterChange = (schoolId) => {
    setSelectedSchool(schoolId)
    loadDepartments(schoolId)
  }

  function openCreate() {
    setForm({ name: '', code: '', schoolId: selectedSchool || (schools[0]?._id ?? '') })
    setModal('form')
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/departments', form)
      setModal(null)
      loadDepartments(selectedSchool)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to create department.')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this department?')) return
    setDeleteError('')
    try {
      await api.delete(`/departments/${id}`)
      loadDepartments(selectedSchool)
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to delete department.'
      setDeleteError(msg)
    }
  }

  const columns = [
    { key: 'name', label: 'Department Name' },
    { key: 'code', label: 'Code' },
    { key: 'schoolName', label: 'Parent School', render: (_, row) => row.schoolId?.name ?? 'Unassigned' },
  ]

  return (
    <AppLayout role="admin">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Departments</h2>
          <p className="text-[14px] text-[#44474f]">Manage academic sub-departments within Njala Schools.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedSchool}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="border border-[#c4c6d0] rounded-md px-3 py-2 text-[13px] font-semibold text-[#03224d] bg-white focus:outline-none"
          >
            <option value="">All Schools</option>
            {schools.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="bg-[#03224d] text-white px-4 py-2 rounded text-[12px] font-bold hover:opacity-90 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Department
          </button>
        </div>
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
            rows={departments}
            emptyMessage="No departments found for the selected school."
            actions={(row) => (
              <button onClick={() => handleDelete(row._id)} className="p-1 text-[#ba1a1a] hover:opacity-70 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title="New Department" onClose={() => setModal(null)} size="sm">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="schoolId" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Parent School
              </label>
              <select
                id="schoolId"
                value={form.schoolId}
                onChange={(e) => setForm((p) => ({ ...p, schoolId: e.target.value }))}
                required
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
              >
                <option value="">Select Parent School</option>
                {schools.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="name" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Department Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Computer Science"
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
                placeholder="e.g. CSC"
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
                {saving ? 'Creating…' : 'Create'}
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
