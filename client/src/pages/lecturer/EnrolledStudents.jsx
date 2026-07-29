import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function EnrolledStudents() {
  const { id } = useParams()
  const [students, setStudents] = useState([])
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${id}/students`),
      api.get(`/courses/${id}`),
    ]).then(([s, c]) => {
      setStudents(s.data?.students ?? [])
      setCourse(c.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const filtered = students.filter(s =>
    !search || s.fullName?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: 'fullName', label: 'Student Name' },
    { key: 'email', label: 'Email' },
    { key: 'enrolledAt', label: 'Enrolled', render: v => new Date(v).toLocaleDateString() },
    { key: 'status', label: 'Status', render: v => (
      <span className={`text-[12px] font-bold px-2 py-0.5 rounded ${v === 'active' ? 'bg-[#a0f3d4] text-[#167159]' : 'bg-[#e4e2e1] text-[#44474f]'}`}>{v}</span>
    )},
    { key: 'submissionsCount', label: 'Submissions', render: v => v ?? 0 },
  ]

  return (
    <AppLayout role="lecturer">
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">{course?.title ?? 'Course'}</span>
      </nav>

      <div className="flex gap-2 mb-6 border-b border-[#c4c6d0]">
        <span className="px-4 py-2 text-[14px] font-bold text-[#03224d] border-b-2 border-[#03224d]">Students</span>
        <Link to={`/courses/${id}/assignments`} className="px-4 py-2 text-[14px] font-bold text-[#44474f] hover:text-[#03224d]">Assignments</Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Enrolled Students</h2>
          <p className="text-[14px] text-[#44474f]">{course?.code} • {students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#44474f]">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students..."
            className="pl-9 pr-4 py-2 border border-[#c4c6d0] rounded-lg text-[14px] focus:outline-none focus:border-[#03224d] w-full sm:w-64"
          />
        </div>
      </div>

      <div className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden">
        {loading ? <LoadingSkeleton type="table" count={5} /> : (
          <DataTable
            columns={columns}
            rows={filtered}
            emptyMessage={search ? 'No students match your search.' : 'No students enrolled yet.'}
          />
        )}
      </div>
    </AppLayout>
  )
}
