import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function CourseOversight() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState({})
  const [actionError, setActionError] = useState('')

  async function load() {
    try {
      const r = await api.get('/courses?dept=true')
      setCourses(r.data?.courses ?? [])
    } catch (_) {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleApprove(id) {
    setApproving(p => ({ ...p, [id]: true }))
    setActionError('')
    try {
      await api.patch(`/courses/${id}`, { status: 'active' })
      load()
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to approve course.'
      setActionError(msg)
    }
    setApproving(p => ({ ...p, [id]: false }))
  }

  async function handleArchive(id) {
    if (!window.confirm('Archive this course?')) return
    setActionError('')
    try {
      await api.patch(`/courses/${id}`, { status: 'archived' })
      load()
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to archive course.'
      setActionError(msg)
    }
  }

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'title', label: 'Course Title' },
    { key: 'lecturerName', label: 'Lecturer', render: v => v ?? '—' },
    { key: 'semester', label: 'Semester' },
    { key: 'enrollmentCount', label: 'Students', render: v => v ?? 0 },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
  ]

  return (
    <AppLayout role="dept_head">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Course Oversight</h2>
          <p className="text-[14px] text-[#44474f]">Review and approve courses in your department.</p>
        </div>
      </div>

      <div className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden">
        {actionError && (
          <div className="m-4 flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg">
            <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">error</span>
            <p className="text-[14px] text-[#ba1a1a] font-medium">{actionError}</p>
          </div>
        )}
        {loading ? <LoadingSkeleton type="table" count={6} /> : (
          <DataTable
            columns={columns}
            rows={courses}
            emptyMessage="No courses in your department yet."
            actions={row => (
              <>
                {row.status === 'draft' && (
                  <button
                    onClick={() => handleApprove(row._id)}
                    disabled={approving[row._id]}
                    className="text-[12px] font-bold text-[#086b53] hover:underline disabled:opacity-50"
                  >
                    {approving[row._id] ? 'Approving…' : 'Approve'}
                  </button>
                )}
                {row.status === 'active' && (
                  <button onClick={() => handleArchive(row._id)} className="text-[12px] font-bold text-[#ba1a1a] hover:underline">Archive</button>
                )}
              </>
            )}
          />
        )}
      </div>
    </AppLayout>
  )
}
