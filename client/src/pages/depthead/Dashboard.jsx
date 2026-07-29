import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function DeptHeadDashboard() {
  const { user } = useClerkUser()
  const [stats, setStats] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/courses?dept=true'),
      api.get('/departments/stats'),
    ]).then(([c, s]) => {
      setCourses(c.data?.courses ?? [])
      setStats(s.data ?? {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const firstName = user?.firstName ?? 'Head'
  const active = courses.filter(c => c.status === 'active').length
  const draft = courses.filter(c => c.status === 'draft').length

  return (
    <AppLayout role="dept_head">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Department Overview</h2>
          <p className="text-[14px] text-[#44474f]">Welcome back, {firstName}. Managing {courses.length} courses across your department.</p>
        </div>
        <Link to="/oversight" className="bg-[#03224d] text-white px-4 py-2 rounded text-[12px] font-bold hover:opacity-90 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">manage_search</span>
          Course Oversight
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {[
          { label: 'Total Courses', value: loading ? '…' : courses.length, icon: 'menu_book', color: 'text-[#03224d]' },
          { label: 'Active', value: loading ? '…' : active, icon: 'check_circle', color: 'text-[#086b53]' },
          { label: 'Draft / Pending', value: loading ? '…' : draft, icon: 'pending', color: 'text-[#dd9235]' },
          { label: 'Total Lecturers', value: loading ? '…' : (stats?.lecturers ?? '—'), icon: 'person', color: 'text-[#03224d]' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#c4c6d0] rounded-lg p-5">
            <span className={`material-symbols-outlined ${s.color} mb-2 block`}>{s.icon}</span>
            <p className="text-[12px] font-bold text-[#44474f] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-[28px] font-bold text-[#1b1c1c]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent courses */}
      <div className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c4c6d0] flex justify-between items-center bg-[#f6f3f2]">
          <h3 className="text-[18px] font-medium text-[#03224d]">Department Courses</h3>
          <Link to="/oversight" className="text-[12px] font-bold text-[#086b53] hover:underline">View All →</Link>
        </div>
        {loading ? <LoadingSkeleton type="table" count={5} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#eae8e7]">
                <tr>
                  {['Code', 'Title', 'Lecturer', 'Status', 'Students'].map(h => (
                    <th key={h} className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c6d0]">
                {courses.slice(0, 8).map(c => (
                  <tr key={c._id} className="hover:bg-[#f6f3f2] transition-colors">
                    <td className="px-6 py-3 text-[14px] font-bold text-[#03224d]">{c.code}</td>
                    <td className="px-6 py-3 text-[14px]">{c.title}</td>
                    <td className="px-6 py-3 text-[14px] text-[#44474f]">{c.lecturerName ?? '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${c.status === 'active' ? 'bg-[#a0f3d4] text-[#167159]' : c.status === 'draft' ? 'bg-[#ffdcbb] text-[#673d00]' : 'bg-[#e4e2e1] text-[#44474f]'}`}>{c.status?.toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-3 text-[14px]">{c.enrollmentCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
