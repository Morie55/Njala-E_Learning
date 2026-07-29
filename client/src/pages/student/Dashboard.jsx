import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import AppLayout from '../../components/layout/AppLayout'
import CourseCard from '../../components/ui/CourseCard'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'

export default function StudentDashboard() {
  const { user } = useClerkUser()
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/courses?enrolled=true'),
      api.get('/assignments/upcoming?limit=3'),
      api.get('/announcements?limit=2'),
    ])
      .then(([c, a, ann]) => {
        setCourses(c.data?.courses ?? [])
        setAssignments(a.data?.assignments ?? [])
        setAnnouncements(ann.data?.announcements ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.firstName ?? 'Student'
  const dueCount = assignments.filter((a) => {
    const diff = (new Date(a.dueDate) - Date.now()) / (1000 * 3600 * 24)
    return diff >= 0 && diff <= 7
  }).length

  function formatDueDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().split(' ')
  }

  function urgency(date) {
    const hours = (new Date(date) - Date.now()) / 3600000
    if (hours < 24) return { bg: 'bg-[#ffdad6] text-[#93000a]', label: `Due in ${Math.round(hours)}h` }
    const days = Math.floor(hours / 24)
    return { bg: 'bg-[#d8e2ff] text-[#001a41]', label: `${days}d remaining` }
  }

  return (
    <AppLayout role="student">
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-[32px] font-semibold leading-tight text-[#03224d]">
            Welcome back, {firstName}
          </h2>
          <p className="text-[13px] sm:text-[16px] leading-relaxed text-[#44474f] mt-1">
            {dueCount > 0
              ? `You have ${dueCount} assignment${dueCount > 1 ? 's' : ''} due this week. Stay focused!`
              : "You're all caught up this week. Keep it up!"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Link
            to="/grades"
            className="w-full sm:w-auto text-center justify-center bg-[#f0eded] border border-[#c4c6d0] text-[#1b1c1c] px-4 py-2.5 sm:py-2 rounded text-[12px] font-bold tracking-wide hover:bg-[#eae8e7] transition-colors cursor-pointer"
          >
            View Grades
          </Link>
          <Link
            to="/courses"
            className="w-full sm:w-auto text-center justify-center bg-[#03224d] text-white px-4 py-2.5 sm:py-2 rounded text-[12px] font-bold tracking-wide hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Browse Courses
          </Link>
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main — Enrolled Courses */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-[20px] font-semibold leading-7 text-[#03224d]">Enrolled Courses</h3>
            <Link className="text-[12px] font-bold text-[#03224d] hover:underline" to="/courses">
              View All
            </Link>
          </div>

          {loading ? (
            <LoadingSkeleton type="card" count={4} />
          ) : courses.length === 0 ? (
            <EmptyState
              icon="school"
              title="No courses yet"
              description="Enrol in a course to get started."
              action={{ label: 'Browse Courses', onClick: () => {} }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.slice(0, 4).map((c) => (
                <CourseCard key={c._id} course={c} linkTo={`/courses/${c._id}`} />
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
              to="/courses"
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
                      <h5 className="text-[13px] sm:text-[14px] font-bold text-[#1b1c1c] line-clamp-1">
                        {a.message?.slice(0, 40)}…
                      </h5>
                      <span className="text-[11px] sm:text-[12px] text-[#44474f] shrink-0 ml-2">
                        {Math.floor((Date.now() - new Date(a.postedAt)) / 3600000)}h ago
                      </span>
                    </div>
                    <p className="text-[13px] sm:text-[14px] text-[#44474f] line-clamp-2">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Support CTA */}
          <div className="bg-[#1f3864] text-[#8ba2d5] p-5 sm:p-6 rounded-xl relative overflow-hidden group shadow-xs">
            <div className="relative z-10">
              <h4 className="text-base sm:text-[18px] font-medium text-white mb-1.5">Need Academic Support?</h4>
              <p className="text-xs sm:text-[14px] opacity-80 mb-4">Book a 1:1 session with a peer tutor or advisor today.</p>
              <button className="bg-white text-[#03224d] px-4 py-2 rounded text-[12px] font-bold hover:bg-white/90 transition-colors cursor-pointer">
                Book Now
              </button>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-[80px] sm:text-[96px] opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              support_agent
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
