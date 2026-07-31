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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[24px] sm:text-[32px] font-semibold text-[#03224d]">Lecturer Overview</h2>
          <p className="text-[13px] sm:text-[14px] text-[#44474f]">
            Welcome back, {firstName}. {totalPending > 0 ? `You have ${totalPending} pending assignment${totalPending !== 1 ? 's' : ''} to review today.` : 'No pending reviews. Great work!'}
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
          {courses[0] && (
            <button
              onClick={() => navigate(`/courses/${courses[0]._id}/report`)}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#f0eded] border border-[#747780] text-[#03224d] text-[13px] sm:text-[14px] font-medium rounded hover:bg-[#eae8e7] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              Generate Report
            </button>
          )}
          <Link
            to="/courses"
            className="flex-1 sm:flex-none px-4 py-2 bg-[#03224d] text-white text-[13px] sm:text-[14px] font-medium rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Course
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Quick Actions + Pending Grading panel */}
        <div className="col-span-12 lg:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div className="space-y-2">
              <h3 className="text-[16px] sm:text-[18px] font-medium text-[#03224d]">Quick Actions</h3>
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
                    <span className="material-symbols-outlined text-[#086b53] group-hover:scale-110 transition-transform shrink-0">{a.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[13px] sm:text-[14px] font-bold text-[#1b1c1c] truncate">{a.label}</p>
                      <p className="text-[11px] sm:text-[12px] text-[#44474f] truncate">{a.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pending Grading card */}
            <div className="flex flex-col justify-between bg-[#03224d] text-white p-5 sm:p-6 rounded-lg shadow-sm overflow-hidden relative min-h-[220px]">
              <div className="relative z-10">
                <h3 className="text-[16px] sm:text-[18px] font-medium mb-3 sm:mb-4">Pending Grading</h3>
                {pending.length === 0 ? (
                  <p className="text-[13px] sm:text-[14px] opacity-70">All caught up!</p>
                ) : (
                  <div className="space-y-2.5">
                    {pending.slice(0, 3).map(p => (
                      <Link
                        key={p.courseId}
                        to={`/courses/${p.courseId}/assignments`}
                        className="flex justify-between items-center border-b border-[#1f3864] pb-2 hover:opacity-80"
                      >
                        <span className="text-[13px] sm:text-[14px] opacity-90 truncate mr-2">{p.courseTitle}</span>
                        <span className="px-2 py-0.5 bg-[#a0f3d4] text-[#002117] rounded-sm font-bold text-[12px] shrink-0">{String(p.count).padStart(2, '0')}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative z-10 mt-4">
                <Link to="/courses" className="w-full block text-center py-2 bg-white text-[#03224d] font-bold rounded-sm hover:bg-[#d8e2ff] transition-colors text-[12px]">
                  View Grading Queue
                </Link>
              </div>
              <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[100px] sm:text-[120px] opacity-10 pointer-events-none" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Courses Taught */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] sm:text-[18px] font-medium text-[#03224d]">Courses Taught</h3>
              <Link to="/courses" className="text-[12px] font-bold text-[#086b53] hover:underline">View All Courses</Link>
            </div>
            {loading ? <LoadingSkeleton type="card" count={3} /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {courses.slice(0, 3).map(c => (
                  <div
                    key={c._id}
                    onClick={() => navigate(`/courses/${c._id}/students`)}
                    className="bg-white border border-[#c4c6d0] p-4 sm:p-5 rounded-lg hover:border-[#03224d] transition-all group cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#f0eded] flex items-center justify-center rounded shrink-0">
                          <span className="material-symbols-outlined text-[#03224d] text-[20px] sm:text-[24px]">menu_book</span>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <h4 className="text-[16px] sm:text-[18px] font-medium text-[#03224d] mb-1 line-clamp-2">{c.title}</h4>
                      <p className="text-[13px] sm:text-[14px] text-[#44474f] mb-4 truncate">{c.code} • {c.semester}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-[#c4c6d0]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[#44474f] text-[18px] sm:text-[20px] shrink-0">group</span>
                        <span className="text-[13px] sm:text-[14px] font-bold truncate">{c.enrollmentCount ?? 0} Students</span>
                      </div>
                      <span className="material-symbols-outlined text-[#c4c6d0] group-hover:text-[#03224d] transition-colors shrink-0">arrow_forward</span>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && !loading && (
                  <div className="col-span-1 sm:col-span-2 xl:col-span-3 text-center py-12 text-[#44474f]">
                    <p className="text-[14px]">No courses yet. <Link to="/courses" className="text-[#03224d] font-bold hover:underline">Create your first course →</Link></p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Submissions & At a Glance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden flex flex-col h-[360px] sm:h-[400px]">
              <div className="p-3.5 sm:p-4 bg-[#f6f3f2] border-b border-[#c4c6d0] flex justify-between items-center">
                <h3 className="text-[16px] sm:text-[18px] font-medium text-[#03224d]">Recent Submissions</h3>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-[#c4c6d0]">
                {submissions.length === 0 ? (
                  <p className="text-center py-12 text-[14px] text-[#44474f]">No recent submissions.</p>
                ) : submissions.map(s => (
                  <div key={s._id} className="p-3.5 sm:p-4 hover:bg-[#f6f3f2] transition-colors flex gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1f3864] flex items-center justify-center text-white text-[13px] sm:text-[14px] font-bold shrink-0">
                      {s.studentName?.[0]?.toUpperCase() ?? 'S'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] sm:text-[14px] font-bold truncate">{s.studentName}</p>
                      <p className="text-[11px] sm:text-[12px] text-[#44474f] truncate">Submitted "{s.assignmentTitle}" in {s.courseTitle}</p>
                      <p className="text-[11px] sm:text-[12px] text-[#086b53] mt-0.5">{Math.round((Date.now() - new Date(s.submittedAt)) / 3600000)}h ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-white border border-[#c4c6d0] rounded-lg p-5 sm:p-6 flex flex-col h-[360px] sm:h-[400px]">
              <h3 className="text-[16px] sm:text-[18px] font-medium text-[#03224d] mb-1 sm:mb-2">At a Glance</h3>
              <p className="text-[13px] sm:text-[14px] text-[#44474f] mb-4 sm:mb-6">Summary for your active courses.</p>
              <div className="space-y-3 sm:space-y-4 flex-1">
                {[
                  { label: 'Total Courses', value: courses.length, icon: 'menu_book', color: 'text-[#03224d]' },
                  { label: 'Total Students', value: courses.reduce((sum, c) => sum + (c.enrollmentCount ?? 0), 0), icon: 'group', color: 'text-[#086b53]' },
                  { label: 'Pending Reviews', value: totalPending, icon: 'pending_actions', color: 'text-[#dd9235]' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 sm:gap-4 p-3 bg-[#f6f3f2] rounded-lg">
                    <span className={`material-symbols-outlined ${s.color} shrink-0`}>{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-[12px] font-bold text-[#44474f] uppercase tracking-wide truncate">{s.label}</p>
                      <p className="text-[18px] sm:text-[20px] font-bold text-[#1b1c1c]">{s.value}</p>
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
