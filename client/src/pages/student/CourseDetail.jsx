import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import api from '../../lib/api'

const TABS = ['Materials', 'Assignments', 'Announcements']

export default function CourseDetail() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [materials, setMaterials] = useState([])
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [tab, setTab] = useState('Materials')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/courses/${id}/materials`),
      api.get(`/courses/${id}/assignments`),
      api.get(`/announcements?courseId=${id}`),
    ]).then(([c, m, a, ann]) => {
      setCourse(c.data)
      setMaterials(m.data?.materials ?? [])
      setAssignments(a.data?.assignments ?? [])
      setAnnouncements(ann.data?.announcements ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const FILE_ICONS = { pdf: 'picture_as_pdf', slides: 'slideshow', video: 'videocam', link: 'link' }

  return (
    <AppLayout role="student">
      {loading || !course ? (
        <LoadingSkeleton type="card" count={2} />
      ) : (
        <>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
            <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#03224d]">{course.title}</span>
          </nav>

          {/* Course header */}
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 mb-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[12px] font-bold text-[#086b53] uppercase tracking-wider">{course.code}</span>
                <StatusBadge status={course.status} />
              </div>
              <h2 className="text-[24px] font-semibold text-[#03224d] mb-1">{course.title}</h2>
              <p className="text-[14px] text-[#44474f]">{course.lecturerName ?? 'Lecturer TBA'} • {course.semester}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto no-scrollbar border-b border-[#c4c6d0] mb-6">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-[14px] font-bold border-b-2 shrink-0 transition-colors ${tab === t ? 'border-[#03224d] text-[#03224d]' : 'border-transparent text-[#44474f] hover:text-[#03224d]'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'Materials' && (
            <div className="space-y-3">
              {materials.length === 0 && <p className="text-[14px] text-[#44474f] text-center py-12">No materials uploaded yet.</p>}
              {materials.map(m => (
                <a
                  key={m._id}
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 p-4 bg-white border border-[#c4c6d0] rounded-lg hover:border-[#03224d] transition-all group"
                >
                  <span className="material-symbols-outlined text-[#086b53] text-3xl shrink-0">{FILE_ICONS[m.type] ?? 'attach_file'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#1b1c1c] truncate">{m.title}</p>
                    <p className="text-[12px] text-[#44474f] uppercase">{m.type}</p>
                  </div>
                  <span className="material-symbols-outlined text-[#44474f] group-hover:text-[#03224d] shrink-0">download</span>
                </a>
              ))}
            </div>
          )}

          {tab === 'Assignments' && (
            <div className="space-y-3">
              {assignments.length === 0 && <p className="text-[14px] text-[#44474f] text-center py-12">No assignments yet.</p>}
              {assignments.map(a => (
                <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#c4c6d0] rounded-lg">
                  <div>
                    <p className="text-[14px] font-bold text-[#1b1c1c]">{a.title}</p>
                    <p className="text-[12px] text-[#44474f]">Due: {new Date(a.dueDate).toLocaleDateString()} • Max score: {a.maxScore}</p>
                  </div>
                  <Link
                    to={`/courses/${id}/assignments/${a._id}/submit`}
                    className="bg-[#03224d] text-white px-4 py-2 rounded text-[12px] font-bold hover:opacity-90 transition-opacity text-center shrink-0"
                  >
                    Submit
                  </Link>
                </div>
              ))}
            </div>
          )}

          {tab === 'Announcements' && (
            <div className="space-y-4">
              {announcements.length === 0 && <p className="text-[14px] text-[#44474f] text-center py-12">No announcements for this course.</p>}
              {announcements.map(a => (
                <div key={a._id} className="p-4 bg-white border border-[#c4c6d0] rounded-lg">
                  <div className="flex justify-between mb-2">
                    <p className="text-[14px] font-bold text-[#1b1c1c]">{a.postedByName}</p>
                    <span className="text-[12px] text-[#44474f]">{new Date(a.postedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[14px] text-[#44474f]">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  )
}
