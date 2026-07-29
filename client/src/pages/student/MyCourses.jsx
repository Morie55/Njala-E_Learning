import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'

export default function MyCourses() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('mine') // 'mine' | 'browse'
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState('')
  const [semesters, setSemesters] = useState([])
  const [enrolling, setEnrolling] = useState({})
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    const endpoint = tab === 'mine' ? '/courses?enrolled=true' : '/courses?browse=true'
    api.get(endpoint)
      .then(r => {
        const list = r.data?.courses ?? []
        setCourses(list)
        const unique = [...new Set(list.map(c => c.semester).filter(Boolean))]
        setSemesters(unique)
      })
      .catch(err => {
        setError(err.response?.data?.error ?? err.message ?? 'Failed to load courses')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab])

  async function handleEnroll(courseId) {
    setEnrolling(p => ({ ...p, [courseId]: true }))
    setError('')
    try {
      await api.post(`/courses/${courseId}/enroll`)
      setTab('mine') // jump back to "My Courses" so student sees newly joined course
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Enrollment failed')
    } finally {
      setEnrolling(p => ({ ...p, [courseId]: false }))
    }
  }

  const filtered = courses.filter(c => {
    const matchSem = !semester || c.semester === semester
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
    return matchSem && matchSearch
  })

  return (
    <AppLayout role="student" onSearch={setSearch}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-2">
            <span>Dashboard</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#03224d]">{tab === 'mine' ? 'My Courses' : 'Browse Courses'}</span>
          </nav>
          <h2 className="text-[32px] font-semibold leading-10 text-[#03224d]">
            {tab === 'mine' ? 'Academic Catalog' : 'Browse & Enroll'}
          </h2>
          <p className="text-[14px] text-[#44474f] mt-1">
            {tab === 'mine'
              ? 'Manage and access your current course enrollments for the academic year.'
              : 'Discover and enroll in active courses available at Njala University.'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex border border-[#c4c6d0] rounded-lg overflow-hidden bg-white">
            <button
              onClick={() => setTab('mine')}
              className={`px-4 py-2 text-[14px] font-bold transition-colors ${tab === 'mine' ? 'bg-[#03224d] text-white' : 'text-[#44474f] hover:bg-[#f6f3f2]'}`}
            >
              My Courses
            </button>
            <button
              onClick={() => setTab('browse')}
              className={`px-4 py-2 text-[14px] font-bold transition-colors ${tab === 'browse' ? 'bg-[#03224d] text-white' : 'text-[#44474f] hover:bg-[#f6f3f2]'}`}
            >
              Browse & Enroll
            </button>
          </div>

          {semesters.length > 0 && (
            <select
              className="bg-[#fbf9f8] border border-[#747780] rounded-lg px-4 py-2 text-[14px] focus:ring-[#03224d] focus:border-[#03224d] cursor-pointer min-w-[180px]"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              <option value="">All Semesters</option>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg">
          <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">error</span>
          <p className="text-[14px] text-[#ba1a1a] font-medium">{error}</p>
        </div>
      )}

      {/* Course grid */}
      {loading ? (
        <LoadingSkeleton type="card" count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="school"
          title="No courses found"
          description={
            search || semester
              ? "Try adjusting your filters or search terms."
              : tab === 'mine'
                ? "You haven't enrolled in any courses yet. Switch to Browse & Enroll to join one."
                : "No open courses to browse right now."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(c => (
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
                <div className="absolute top-3 right-3">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-sm uppercase ${c.status === 'active' ? 'bg-[#a0f3d4] text-[#167159]' : 'bg-[#e4e2e1] text-[#44474f]'}`}>{c.status}</span>
                </div>
              </div>
              {/* Body */}
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-[18px] font-medium leading-6 text-[#03224d] mb-1 line-clamp-2">{c.title}</h3>
                <p className="text-[12px] text-[#44474f] mb-4">{c.lecturerName ? `Instructor: ${c.lecturerName}` : ''}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#c4c6d0]">
                  <div className="flex items-center gap-2 text-[#44474f]">
                    <span className="material-symbols-outlined text-[18px]">credit_card</span>
                    <span className="text-[14px]">{c.credits ?? '—'} Credits</span>
                  </div>
                  {tab === 'mine' ? (
                    <button
                      onClick={() => navigate(`/courses/${c._id}`)}
                      className="px-4 py-2 text-[#086b53] font-bold hover:bg-[#a0f3d4] transition-colors duration-200 rounded text-[14px] flex items-center gap-2"
                    >
                      View Details
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnroll(c._id)}
                      disabled={enrolling[c._id]}
                      className="px-4 py-2 bg-[#03224d] text-white font-bold hover:opacity-90 transition-opacity rounded text-[14px] disabled:opacity-50 flex items-center gap-1"
                    >
                      {enrolling[c._id] ? (
                        <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Enrolling…</>
                      ) : (
                        <><span className="material-symbols-outlined text-[16px]">add</span> Enroll</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
