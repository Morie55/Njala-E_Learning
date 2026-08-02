import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import AppLayout from '../../components/layout/AppLayout'
import CourseCard from '../../components/ui/CourseCard'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function StudentDashboard() {
  const { user } = useClerkUser()
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [activePeriod, setActivePeriod] = useState(null)
  const [gpaData, setGpaData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/courses?enrolled=true'),
      api.get('/assignments/upcoming?limit=3'),
      api.get('/announcements?limit=2'),
      api.get('/academic-periods/active'),
      api.get('/submissions/gpa').catch(() => ({ data: null })),
    ])
      .then(([c, a, ann, p, g]) => {
        setCourses(c.data?.courses ?? [])
        setAssignments(a.data?.assignments ?? [])
        setAnnouncements(ann.data?.announcements ?? [])
        setActivePeriod(p.data?.period ?? null)
        setGpaData(g.data)
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.firstName ?? 'Student'
  const dueAssignments = assignments.filter((a) => {
    const diff = (new Date(a.dueDate) - Date.now()) / (1000 * 3600 * 24)
    return diff >= 0 && diff <= 7
  })
  const dueCount = dueAssignments.length

  function formatDueDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().split(' ')
  }

  function urgency(date) {
    const hours = (new Date(date) - Date.now()) / 3600000
    if (hours < 24) return { bg: 'bg-[#ffdad6] text-[#93000a]', label: `Due in ${Math.round(hours)}h` }
    const days = Math.floor(hours / 24)
    return { bg: 'bg-[#d8e2ff] text-[#001a41]', label: `${days}d remaining` }
  }

  const cumulativeGpa = gpaData?.cumulativeGpa ?? null
  const cumulativeClass = gpaData?.cumulativeClass ?? null

  return (
    <AppLayout role="student">
      {/* Personalized Header */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-[32px] font-semibold leading-tight text-[#03224d]">
            Welcome back, {firstName}!
          </h2>
          <p className="text-[13px] sm:text-[15px] leading-relaxed text-[#44474f] mt-1">
            {cumulativeGpa && cumulativeGpa > 0 ? (
              <span className="flex items-center gap-2">
                <span>Academic Standing:</span>
                <strong className="text-[#086b53] bg-[#a0f3d4] px-2.5 py-0.5 rounded-full text-[12px]">
                  GPA {cumulativeGpa.toFixed(2)} ({cumulativeClass})
                </strong>
                <span>— Keep up the great work!</span>
              </span>
            ) : (
              dueCount > 0
                ? `You have ${dueCount} assignment${dueCount > 1 ? 's' : ''} due this week. Stay focused!`
                : "You're all caught up this week. Keep it up!"
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activePeriod && (
            <div className="bg-[#03224d] text-white px-4 py-2 rounded-xl flex items-center gap-3 shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[#a0f3d4] text-[20px]">date_range</span>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#a0f3d4] tracking-wider">{activePeriod.academicYear} · Active Semester</p>
                <p className="text-[12px] font-bold">{activePeriod.name}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/browse-courses"
              className="bg-[#03224d] text-white px-4 py-2.5 sm:py-2 rounded-xl text-[12px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Browse Courses
            </Link>
          </div>
        </div>
      </div>

      {/* Prominent Alert Banner: Assignments Due This Week */}
      {dueCount > 0 && (
        <div className="mb-6 bg-gradient-to-r from-[#ba1a1a] to-[#73000a] text-white p-4 rounded-2xl shadow-md flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">warning</span>
            </div>
            <div>
              <h4 className="font-bold text-[14px]">Upcoming Assignment Deadlines</h4>
              <p className="text-[12px] opacity-90">
                You have <strong>{dueCount} assignment{dueCount > 1 ? 's' : ''}</strong> due within the next 7 days.
              </p>
            </div>
          </div>
          <Link
            to="/assignments"
            className="bg-white text-[#ba1a1a] px-4 py-2 rounded-xl text-[12px] font-bold hover:bg-white/90 transition-colors shrink-0"
          >
            View Due Assignments →
          </Link>
        </div>
      )}

      {/* Onboarding Card for New Students (0 enrolled courses) */}
      {!loading && courses.length === 0 && (
        <div className="mb-8 bg-gradient-to-r from-[#03224d] to-[#1f3864] text-white rounded-2xl p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl space-y-4">
            <h3 className="text-[26px] font-black leading-tight">Welcome to Njala E-Learning Portal!</h3>
            <p className="text-[14px] text-white/80 leading-relaxed">
              You are not enrolled in any active courses yet. Browse Njala University's course catalog to enroll, access lecture materials, submit assignments, and participate in discussions.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/browse-courses"
                className="bg-[#a0f3d4] text-[#002117] px-6 py-3 rounded-xl font-extrabold text-[13px] hover:bg-[#83e9c4] transition-colors flex items-center gap-2"
              >
                <span>Browse Course Catalog</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-[180px] opacity-10 text-white pointer-events-none">
            school
          </span>
        </div>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main — Enrolled Courses */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-[20px] font-semibold leading-7 text-[#03224d]">Enrolled Courses</h3>
            <Link className="text-[12px] font-bold text-[#03224d] hover:underline" to="/courses">
              View All ({courses.length})
            </Link>
          </div>

          {loading ? (
            <LoadingSkeleton type="card" count={4} />
          ) : courses.length === 0 ? (
            <div className="bg-white border border-[#c4c6d0] rounded-2xl p-8 text-center text-[#747780]">
              <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">menu_book</span>
              <p className="text-[14px] font-bold text-[#1b1c1c]">No Enrolled Courses</p>
              <p className="text-[12px] text-[#9e9e9e] mt-1">Use the Browse Courses button above to join a class.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.slice(0, 4).map((c) => (
                <div key={c._id} className="relative">
                  <CourseCard course={c} linkTo={`/courses/${c._id}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar widgets */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Deadlines */}
          <section className="bg-white border border-[#c4c6d0] rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-[20px] font-semibold text-[#03224d]">Deadlines</h3>
              <span className="material-symbols-outlined text-[#44474f]">event_note</span>
            </div>
            {assignments.length === 0 ? (
              <p className="text-[14px] text-[#44474f] text-center py-6">No upcoming deadlines 🎉</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const [day, mon] = formatDueDate(a.dueDate)
                  const u = urgency(a.dueDate)
                  return (
                    <div
                      key={a._id}
                      className="flex items-start gap-3.5 p-3 rounded-lg bg-[#f6f3f2] border border-transparent hover:border-[#c4c6d0] transition-all"
                    >
                      <div className={`${u.bg} w-11 h-11 sm:w-12 sm:h-12 rounded flex flex-col items-center justify-center shrink-0`}>
                        <span className="text-[9px] sm:text-[10px] font-bold">{mon}</span>
                        <span className="text-[16px] sm:text-[18px] font-bold leading-none">{day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-[12px] font-bold text-[#44474f] truncate">{a.courseCode}</p>
                        <h5 className="text-[13px] sm:text-[14px] font-bold text-[#1b1c1c] truncate">{a.title}</h5>
                        <p className="text-[11px] sm:text-[12px] text-[#ba1a1a] font-medium mt-0.5">{u.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <Link
              to="/assignments"
              className="w-full mt-5 block text-center py-2 border border-[#03224d] text-[#03224d] text-[12px] font-bold rounded hover:bg-[#03224d]/5 transition-colors"
            >
              All Assignments
            </Link>
          </section>

          {/* Announcements */}
          <section className="bg-white border border-[#c4c6d0] rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-[20px] font-semibold text-[#03224d]">Announcements</h3>
              <span className="material-symbols-outlined text-[#44474f]">campaign</span>
            </div>
            {announcements.length === 0 ? (
              <p className="text-[14px] text-[#44474f] text-center py-6">No announcements yet.</p>
            ) : (
              <div className="space-y-4">
                {announcements.map((a) => (
                  <div key={a._id} className="border-b border-[#c4c6d0] pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[11px] sm:text-[12px] text-[#44474f] shrink-0">
                        {a.createdAt
                          ? `${Math.floor((Date.now() - new Date(a.createdAt)) / 3600000)}h ago`
                          : 'Recent'}
                      </span>
                    </div>
                    <p className="text-[13px] sm:text-[14px] text-[#44474f] line-clamp-3">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
