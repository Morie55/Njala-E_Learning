import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import Modal from '../../components/ui/Modal'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { useUser } from '../../hooks/useUser'

const EMPTY_FORM = { title: '', code: '', semester: '', status: 'draft', schoolId: '', departmentId: '' }

export default function CourseManagement() {
  const navigate = useNavigate()
  const { role } = useUser()
  const [courses, setCourses] = useState([])
  const [schools, setSchools] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  async function load() {
    try {
      const courseEndpoint = role === 'admin' ? '/courses' : '/courses?owned=true'
      const [c, s] = await Promise.all([api.get(courseEndpoint), api.get('/schools')])
      setCourses(c.data?.courses ?? [])
      setSchools(s.data?.schools ?? [])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [role])

  // Fetch departments when school selection changes
  useEffect(() => {
    if (form.schoolId) {
      api.get(`/departments?schoolId=${form.schoolId}`)
        .then((r) => setDepartments(r.data?.departments ?? []))
        .catch(() => setDepartments([]))
    } else {
      setDepartments([])
    }
  }, [form.schoolId])

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModal('create')
    setError('')
  }

  function openEdit(c) {
    setForm({
      title: c.title,
      code: c.code,
      semester: c.semester,
      status: c.status,
      schoolId: c.schoolId?._id || c.schoolId || '',
      departmentId: c.departmentId?._id || c.departmentId || '',
    })
    setEditing(c._id)
    setModal('edit')
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) await api.patch(`/courses/${editing}`, form)
      else await api.post('/courses', form)
      setModal(null)
      load()
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to save course.')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Archive this course?')) return
    setDeleteError('')
    try {
      await api.delete(`/courses/${id}`)
      load()
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to delete course.'
      setDeleteError(msg)
    }
  }

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'title', label: 'Course Title' },
    { key: 'schoolName', label: 'School', render: (v) => v ?? 'N/A' },
    { key: 'departmentName', label: 'Department', render: (v) => v ?? 'N/A' },
    { key: 'enrollmentCount', label: 'Students', render: (v) => v ?? 0 },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  ]

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[24px] sm:text-[32px] font-semibold text-[#03224d]">My Courses</h2>
          <p className="text-[13px] sm:text-[14px] text-[#44474f]">Manage your course portfolio across Njala Schools & Departments.</p>
        </div>
        <button
          onClick={openCreate}
          className="w-full sm:w-auto justify-center bg-[#03224d] text-white px-4 py-2.5 sm:py-2 rounded text-[13px] sm:text-[12px] font-bold hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Course
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg">
          <span className="material-symbols-outlined text-[18px] text-[#ba1a1a] shrink-0">error</span>
          <p className="text-[13px] sm:text-[14px] text-[#ba1a1a] font-medium">{deleteError}</p>
        </div>
      )}

      <div className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden">
        {loading ? (
          <LoadingSkeleton type="table" count={5} />
        ) : (
          <DataTable
            columns={columns}
            rows={courses}
            emptyMessage="You haven't created any courses yet."
            actions={(row) => (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => navigate(`/courses/${row._id}/students`)}
                  className="text-[12px] font-bold text-[#086b53] hover:underline cursor-pointer"
                >
                  Students
                </button>
                <button
                  onClick={() => navigate(`/courses/${row._id}/assignments/new`)}
                  className="text-[12px] font-bold text-[#44474f] hover:underline cursor-pointer"
                >
                  Assignment
                </button>
                <button
                  onClick={() => navigate(`/courses/${row._id}/materials/upload`)}
                  className="text-[12px] font-bold text-[#44474f] hover:underline cursor-pointer"
                >
                  Material
                </button>
                <button
                  onClick={() => navigate(`/courses/${row._id}/attendance`)}
                  className="text-[12px] font-bold text-[#1a4fd8] hover:underline cursor-pointer"
                >
                  Attendance
                </button>
                <button
                  onClick={() => navigate(`/courses/${row._id}/report`)}
                  className="text-[12px] font-bold text-[#dd9235] hover:underline cursor-pointer"
                >
                  Report
                </button>
                <button onClick={() => openEdit(row)} title="Edit course" className="p-1 text-[#44474f] hover:text-[#03224d] cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={() => handleDelete(row._id)} title="Archive course" className="p-1 text-[#ba1a1a] hover:opacity-70 cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            )}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal === 'create' ? 'Create New Course' : 'Edit Course'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            {[
              { id: 'title', label: 'Course Title', type: 'text', placeholder: 'e.g. Introduction to Computer Science' },
              { id: 'code', label: 'Course Code', type: 'text', placeholder: 'e.g. CSC301' },
              { id: 'semester', label: 'Semester', type: 'text', placeholder: 'e.g. 2026/2027 Semester 1' },
            ].map((f) => (
              <div key={f.id}>
                <label htmlFor={f.id} className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  {f.label}
                </label>
                <input
                  id={f.id}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.id]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.id]: e.target.value }))}
                  required
                  className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d] transition-all"
                />
              </div>
            ))}

            <div>
              <label htmlFor="status" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="school" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Parent School
              </label>
              <select
                id="school"
                value={form.schoolId}
                onChange={(e) => setForm((p) => ({ ...p, schoolId: e.target.value, departmentId: '' }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
              >
                <option value="">Select School</option>
                {schools.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dept" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Department (Sub-unit)
              </label>
              <select
                id="dept"
                disabled={!form.schoolId}
                value={form.departmentId}
                onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d] disabled:opacity-50"
              >
                <option value="">Select Department (Optional)</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-[14px] text-[#ba1a1a]">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-full sm:w-auto px-5 py-2.5 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded] justify-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-[#03224d] text-white px-5 py-2.5 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Saving…
                  </>
                ) : (
                  'Save Course'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  )
}
