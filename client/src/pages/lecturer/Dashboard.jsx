import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import AppLayout from '../../components/layout/AppLayout'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function LecturerDashboard() {
  const { user } = useClerkUser()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/courses?owned=true'),
      api.get('/submissions/recent?limit=5'),
      api.get('/submissions/pending'),
    ]).then(([c, s, p]) => {
      setCourses(c.data?.courses ?? [])
      setSubmissions(s.data?.submissions ?? [])
      setPending(p.data?.pending ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const firstName = user?.firstName ?? 'Lecturer'
  const totalPending = pending.reduce((sum, p) => sum + (p.count ?? 0), 0)

  return (
    <AppLayout role="lecturer">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Lecturer Overview</h2>
          <p className="text-[14px] text-[#44474f]">
            Welcome back, {firstName}. {totalPending > 0 ? `You have ${totalPending} pending assignment${totalPending !== 1 ? 's' : ''} to review today.` : 'No pending reviews. Great work!'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#f0eded] border border-[#747780] text-[#03224d] text-[14px] font-medium rounded hover:bg-[#eae8e7] transition-all">
            Generate Report
          </button>
          <Link to="/courses" className="px-4 py-2 bg-[#03224d] text-white text-[14px] font-medium rounded hover:opacity-90 transition-opacity flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Course
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Quick Actions + Pending Grading panel */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <h3 className="text-[18px] font-medium text-[#03224d]">Quick Actions</h3>
          <div className="bg-white border border-[#c4c6d0] p-4 rounded-lg space-y-3">
            {[
              { icon: 'upload_file', label: 'Upload Material', sub: 'Syllabus, slides, or notes', to: courses[0] ? `/courses/${courses[0]._id}/materials/upload` : '/courses' },
              { icon: 'campaign', label: 'Post Announcement', sub: 'Notify all active courses', to: '/announcements/new' },
              { icon: 'assignment_add', label: 'Create Assignment', sub: 'Set deadlines and rubrics', to: courses[0] ? `/courses/${courses[0]._id}/assignments/new` : '/courses' },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 p-3 bg-[#f6f3f2] hover:bg-[#a0f3d4] transition-all rounded text-left group"
              >
                <span className="material-symbols-outlined text-[#086b53] group-hover:scale-110 transition-transform">{a.icon}</span>
                <div>
                  <p className="text-[14px] font-bold text-[#1b1c1c]">{a.label}</p>
                  <p className="text-[12px] text-[#44474f]">{a.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Pending Grading card */}
          <div className="bg-[#03224d] text-white p-6 rounded-lg shadow-sm overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-[18px] font-medium mb-4">Pending Grading</h3>
              {pending.length === 0 ? (
                <p className="text-[14px] opacity-70">All caught up!</p>
              ) : (
                <div className="space-y-3">
                  {pending.slice(0, 3).map(p => (
                    <Link
                      key={p.courseId}
                      to={`/courses/${p.courseId}/assignments`}
                      className="flex justify-between items-center border-b border-[#1f3864] pb-2 hover:opacity-80"
                    >
                      <span className="text-[14px] opacity-90 truncate mr-2">{p.courseTitle}</span>
                      <span className="px-2 py-0.5 bg-[#a0f3d4] text-[#002117] rounded-sm font-bold text-[12px] shrink-0">{String(p.count).padStart(2, '0')}</span>
                    </Link>
                  ))}
                </div>
              )}
              <Link to="/courses" className="mt-5 w-full block text-center py-2 bg-white text-[#03224d] font-bold rounded-sm hover:bg-[#d8e2ff] transition-colors text-[12px]">
                View Grading Queue
              </Link>
            </div>
            <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[120px] opacity-10" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
          </div>
        </div>

        {/* Main content */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Courses Taught */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-medium text-[#03224d]">Courses Taught</h3>
              <Link to="/courses" className="text-[12px] font-bold text-[#086b53] hover:underline">View All Courses</Link>
            </div>
            {loading ? <LoadingSkeleton type="card" count={3} /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {courses.slice(0, 3).map(c => (
                  <div
                    key={c._id}
                    onClick={() => navigate(`/courses/${c._id}/students`)}
                    className="bg-white border border-[#c4c6d0] p-5 rounded-lg hover:border-[#03224d] transition-all group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-[#f0eded] flex items-center justify-center rounded">
                        <span className="material-symbols-outlined text-[#03224d]">menu_book</span>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <h4 className="text-[18px] font-medium text-[#03224d] mb-1 line-clamp-2">{c.title}</h4>
                    <p className="text-[14px] text-[#44474f] mb-4">{c.code} • {c.semester}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-[#c4c6d0]">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#44474f] text-[20px]">group</span>
                        <span className="text-[14px] font-bold">{c.enrollmentCount ?? 0} Students</span>
                      </div>
                      <span className="material-symbols-outlined text-[#c4c6d0] group-hover:text-[#03224d] transition-colors">arrow_forward</span>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && !loading && (
                  <div className="col-span-3 text-center py-12 text-[#44474f]">
                    <p className="text-[14px]">No courses yet. <Link to="/courses" className="text-[#03224d] font-bold hover:underline">Create your first course →</Link></p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Submissions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 bg-[#f6f3f2] border-b border-[#c4c6d0] flex justify-between items-center">
                <h3 className="text-[18px] font-medium text-[#03224d]">Recent Submissions</h3>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[#c4c6d0]">
                {submissions.length === 0 ? (
                  <p className="text-center py-12 text-[14px] text-[#44474f]">No recent submissions.</p>
                ) : submissions.map(s => (
                  <div key={s._id} className="p-4 hover:bg-[#f6f3f2] transition-colors flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1f3864] flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                      {s.studentName?.[0]?.toUpperCase() ?? 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold truncate">{s.studentName}</p>
                      <p className="text-[12px] text-[#44474f] truncate">Submitted "{s.assignmentTitle}" in {s.courseTitle}</p>
                      <p className="text-[12px] text-[#086b53] mt-0.5">{Math.round((Date.now() - new Date(s.submittedAt)) / 3600000)}h ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-white border border-[#c4c6d0] rounded-lg p-6 flex flex-col h-[400px]">
              <h3 className="text-[18px] font-medium text-[#03224d] mb-2">At a Glance</h3>
              <p className="text-[14px] text-[#44474f] mb-6">Summary for your active courses.</p>
              <div className="space-y-4 flex-1">
                {[
                  { label: 'Total Courses', value: courses.length, icon: 'menu_book', color: 'text-[#03224d]' },
                  { label: 'Total Students', value: courses.reduce((sum, c) => sum + (c.enrollmentCount ?? 0), 0), icon: 'group', color: 'text-[#086b53]' },
                  { label: 'Pending Reviews', value: totalPending, icon: 'pending_actions', color: 'text-[#dd9235]' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-4 p-3 bg-[#f6f3f2] rounded-lg">
                    <span className={`material-symbols-outlined ${s.color}`}>{s.icon}</span>
                    <div className="flex-1">
                      <p className="text-[12px] font-bold text-[#44474f] uppercase tracking-wide">{s.label}</p>
                      <p className="text-[20px] font-bold text-[#1b1c1c]">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
