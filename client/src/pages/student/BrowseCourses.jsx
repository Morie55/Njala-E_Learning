import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'

export default function BrowseCourses() {
  const [courses, setCourses] = useState([])
  const [enrolledIds, setEnrolledIds] = useState(new Set())
  const [waitlistMap, setWaitlistMap] = useState(new Map()) // courseId -> position
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [enrolling, setEnrolling] = useState({})   // courseId → true/false
  const [status, setStatus] = useState({})          // courseId → { ok: bool, msg: string }

  const load = () => {
    Promise.all([
      api.get('/courses'),
      api.get('/courses?enrolled=true'),
    ]).then(([all, enrolled]) => {
      const allList = all.data?.courses ?? []
      setCourses(allList)

      const activeIds = new Set()
      const wlMap = new Map()

      allList.forEach(c => {
        if (c.enrollmentStatus === 'active') activeIds.add(c._id)
        if (c.enrollmentStatus === 'waitlisted') wlMap.set(c._id, c.waitlistPosition)
      })

      setEnrolledIds(activeIds)
      setWaitlistMap(wlMap)
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleEnroll(courseId) {
    const targetCourse = courses.find(c => c._id === courseId)
    const isFull = targetCourse?.maxEnrollment && targetCourse.enrollmentCount >= targetCourse.maxEnrollment

    // Save previous state for potential rollback
    const prevEnrolled = new Set(enrolledIds)
    const prevWaitlist = new Map(waitlistMap)

    // ⚡ Optimistic UI Update: Update state immediately
    if (isFull) {
      setWaitlistMap(prev => new Map(prev).set(courseId, (targetCourse?.waitlistCount ?? 0) + 1))
      setStatus(p => ({ ...p, [courseId]: { ok: true, msg: 'Added to waitlist!' } }))
    } else {
      setEnrolledIds(prev => new Set([...prev, courseId]))
      setStatus(p => ({ ...p, [courseId]: { ok: true, msg: 'Enrolled successfully!' } }))
    }

    setEnrolling(p => ({ ...p, [courseId]: true }))

    try {
      const { data } = await api.post(`/courses/${courseId}/enroll`)
      if (data.waitlisted) {
        setWaitlistMap(prev => new Map(prev).set(courseId, data.position))
        setStatus(p => ({ ...p, [courseId]: { ok: true, msg: `Course full. Added to waitlist at #${data.position}` } }))
      } else {
        setEnrolledIds(prev => new Set([...prev, courseId]))
        setStatus(p => ({ ...p, [courseId]: { ok: true, msg: 'Enrolled successfully!' } }))
      }
      load()
    } catch (err) {
      // Revert optimistic update on failure
      console.error('[Optimistic UI Rollback] Enrollment failed:', err)
      setEnrolledIds(prevEnrolled)
      setWaitlistMap(prevWaitlist)

      const msg = err.response?.data?.error ?? err.message ?? 'Enrollment failed. Please try again.'
      setStatus(p => ({ ...p, [courseId]: { ok: false, msg } }))
    } finally {
      setEnrolling(p => ({ ...p, [courseId]: false }))
    }
  }

  const filtered = courses.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.lecturerName?.toLowerCase().includes(q)
  })

  return (
    <AppLayout role="student" onSearch={setSearch}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-2">
            <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#03224d]">Browse Courses</span>
          </nav>
          <h2 className="text-[32px] font-semibold leading-10 text-[#03224d]">Browse All Courses</h2>
          <p className="text-[14px] text-[#44474f] mt-1">Discover and enroll in active courses available at Njala University.</p>
        </div>
        <div className="text-[14px] text-[#44474f]">
          {!loading && <span><strong className="text-[#03224d]">{filtered.length}</strong> course{filtered.length !== 1 ? 's' : ''} available</span>}
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <LoadingSkeleton type="card" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No courses found"
          description={search ? 'Try adjusting your search.' : 'No active courses are available right now.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.slice((page - 1) * 6, page * 6).map(c => {
            const isEnrolled = enrolledIds.has(c._id)
            const isWaitlisted = waitlistMap.has(c._id)
            const waitlistPos = waitlistMap.get(c._id)
            const isEnrolling = enrolling[c._id]
            const cardStatus = status[c._id]
            const isFull = c.maxEnrollment && c.enrollmentCount >= c.maxEnrollment

            return (
              <div key={c._id} className="bg-white border border-[#c4c6d0] rounded-lg overflow-hidden flex flex-col group card-hover">
                {/* Thumbnail */}
                <div className="h-40 relative overflow-hidden bg-[#eae8e7]">
                  {c.thumbnailUrl ? (
                    <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={c.thumbnailUrl} alt={c.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-[#c4c6d0]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 px-3 py-1 bg-[#03224d] text-white text-[12px] font-bold rounded-sm">{c.code}</div>

                  {isEnrolled && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-[#a0f3d4] text-[#167159] text-[10px] font-bold rounded-sm uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      Enrolled
                    </div>
                  )}

                  {isWaitlisted && !isEnrolled && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-[#ffdcbb] text-[#5a3b00] text-[10px] font-bold rounded-sm uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                      Waitlist #{waitlistPos ?? 1}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-[18px] font-medium leading-6 text-[#03224d] mb-1 line-clamp-2">{c.title}</h3>
                  <p className="text-[12px] text-[#44474f] mb-1">{c.lecturerName ? `Instructor: ${c.lecturerName}` : ''}</p>
                  {c.semester && <p className="text-[12px] text-[#74777f] mb-3">{c.semester}</p>}

                  {/* Enrollment Capacity Indicator */}
                  {c.maxEnrollment ? (
                    <div className="mb-4 bg-[#f6f3f2] p-2.5 rounded-lg border border-[#c4c6d0]/40">
                      <div className="flex justify-between items-center text-[11px] font-bold text-[#44474f] mb-1">
                        <span>Capacity</span>
                        <span className={isFull ? 'text-[#ba1a1a]' : 'text-[#086b53]'}>
                          {c.enrollmentCount} / {c.maxEnrollment} seats {isFull ? '(FULL)' : ''}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#c4c6d0]/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isFull ? 'bg-[#ba1a1a]' : 'bg-[#086b53]'}`}
                          style={{ width: `${Math.min(100, Math.round((c.enrollmentCount / c.maxEnrollment) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Status message */}
                  {cardStatus && (
                    <p className={`text-[12px] font-medium mb-3 ${cardStatus.ok ? 'text-[#086b53]' : 'text-[#ba1a1a]'}`}>
                      {cardStatus.ok && <span className="material-symbols-outlined text-[14px] align-middle mr-1">check_circle</span>}
                      {cardStatus.msg}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#c4c6d0]">
                    <div className="flex items-center gap-2 text-[#44474f]">
                      <span className="material-symbols-outlined text-[18px]">credit_card</span>
                      <span className="text-[14px]">{c.credits ?? '—'} Credits</span>
                    </div>

                    {isEnrolled ? (
                      <Link
                        to={`/courses/${c._id}`}
                        className="px-4 py-2 text-[#086b53] font-bold hover:bg-[#a0f3d4] transition-colors duration-200 rounded text-[14px] flex items-center gap-1"
                      >
                        View Course
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                    ) : isWaitlisted ? (
                      <span className="px-3 py-1.5 bg-[#ffdcbb] text-[#5a3b00] font-bold rounded text-[12px] flex items-center gap-1">
                        Waitlisted (#{waitlistPos})
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnroll(c._id)}
                        disabled={isEnrolling}
                        className={`px-4 py-2 font-bold transition-opacity duration-200 rounded text-[13px] flex items-center gap-1 disabled:opacity-50 ${
                          isFull
                            ? 'bg-[#5a3b00] text-white hover:opacity-90'
                            : 'bg-[#03224d] text-white hover:opacity-90'
                        }`}
                      >
                        {isEnrolling ? (
                          <><span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span> Processing…</>
                        ) : isFull ? (
                          <><span className="material-symbols-outlined text-[14px]">hourglass_empty</span> Join Waitlist</>
                        ) : (
                          <><span className="material-symbols-outlined text-[14px]">add</span> Enroll</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {filtered.length > 6 && (
        <div className="mt-8 flex items-center justify-between bg-white border border-[#c4c6d0] rounded-xl px-4 py-3">
          <p className="text-[12px] text-[#44474f]">
            Showing <span className="font-bold text-[#03224d]">{(page - 1) * 6 + 1}</span>–<span className="font-bold text-[#03224d]">{Math.min(page * 6, filtered.length)}</span> of <span className="font-bold text-[#03224d]">{filtered.length}</span> courses
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-[#c4c6d0] rounded text-[12px] font-bold text-[#03224d] hover:bg-[#f0eded] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[12px] font-bold text-[#03224d] px-2">Page {page} of {Math.ceil(filtered.length / 6)}</span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / 6), p + 1))}
              disabled={page >= Math.ceil(filtered.length / 6)}
              className="px-3 py-1.5 border border-[#c4c6d0] rounded text-[12px] font-bold text-[#03224d] hover:bg-[#f0eded] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
