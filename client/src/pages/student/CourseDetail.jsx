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
  const [completedMaterialIds, setCompletedMaterialIds] = useState(new Set())
  const [assignments, setAssignments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [tab, setTab] = useState('Materials')
  const [loading, setLoading] = useState(true)

  // Viewer Modal State
  const [activeViewerMaterial, setActiveViewerMaterial] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/courses/${id}/materials`),
      api.get(`/courses/${id}/assignments`),
      api.get(`/announcements?courseId=${id}`),
      api.get(`/materials/progress/${id}`).catch(() => ({ data: { completed: [] } })),
    ]).then(([c, m, a, ann, p]) => {
      setCourse(c.data)
      setMaterials(m.data?.materials ?? [])
      setAssignments(a.data?.assignments ?? [])
      setAnnouncements(ann.data?.announcements ?? [])
      const completedSet = new Set((p.data?.completed ?? []).map(item => item.materialId))
      setCompletedMaterialIds(completedSet)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function toggleComplete(materialId) {
    const isDone = completedMaterialIds.has(materialId)
    try {
      if (isDone) {
        await api.delete(`/materials/${materialId}/complete`)
        setCompletedMaterialIds(prev => {
          const next = new Set(prev)
          next.delete(materialId)
          return next
        })
        showToast('Material unmarked')
      } else {
        await api.post(`/materials/${materialId}/complete`)
        setCompletedMaterialIds(prev => new Set([...prev, materialId]))
        showToast('Material marked as complete! 🎉', 'success')
      }
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Failed to update progress', 'error')
    }
  }

  const FILE_ICONS = { pdf: 'picture_as_pdf', slides: 'slideshow', video: 'videocam', link: 'link' }

  const totalMaterials = materials.length
  const completedCount = completedMaterialIds.size
  const progressPct = totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0

  return (
    <AppLayout role="student">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-[13px] font-bold shadow-lg ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#086b53]'}`}>
          {toast.msg}
        </div>
      )}

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
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-bold text-[#086b53] uppercase tracking-wider">{course.code}</span>
                <StatusBadge status={course.status} />
              </div>
              <h2 className="text-[24px] font-semibold text-[#03224d]">{course.title}</h2>
              <p className="text-[14px] text-[#44474f]">{course.lecturerName ?? 'Lecturer TBA'} • {course.semester}</p>

              {/* Material Completion Progress Bar */}
              {totalMaterials > 0 && (
                <div className="pt-2 max-w-md">
                  <div className="flex justify-between items-center text-[12px] font-bold text-[#03224d] mb-1">
                    <span>Course Progress</span>
                    <span>{completedCount} of {totalMaterials} completed ({progressPct}%)</span>
                  </div>
                  <div className="w-full bg-[#f6f3f2] h-2 rounded-full overflow-hidden border border-[#c4c6d0]/40">
                    <div
                      className="h-full bg-[#086b53] transition-all duration-500 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-start shrink-0">
              <Link
                to={`/courses/${id}/discussions`}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#c4c6d0] rounded-lg text-[12px] font-bold text-[#03224d] hover:bg-[#f0eded] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">forum</span> Discussions
              </Link>
              <Link
                to={`/courses/${id}/certificate`}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#c8961a] rounded-lg text-[12px] font-bold text-[#7a5a00] hover:bg-[#fff8e1] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">workspace_premium</span> Certificate
              </Link>
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

          {/* Tab content: Materials */}
          {tab === 'Materials' && (
            <div className="space-y-3">
              {materials.length === 0 && <p className="text-[14px] text-[#44474f] text-center py-12">No materials uploaded yet.</p>}
              {materials.map(m => {
                const isCompleted = completedMaterialIds.has(m._id)
                return (
                  <div
                    key={m._id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-[#c4c6d0] rounded-xl hover:border-[#03224d] transition-all group"
                  >
                    <span className="material-symbols-outlined text-[#086b53] text-3xl shrink-0">{FILE_ICONS[m.type] ?? 'attach_file'}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-bold text-[#1b1c1c] truncate">{m.title}</p>
                        {isCompleted && (
                          <span className="bg-[#a0f3d4] text-[#00513e] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            Completed ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#44474f] uppercase">{m.type}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#c4c6d0]/40">
                      {/* Mark as complete toggle */}
                      <button
                        onClick={() => toggleComplete(m._id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
                          isCompleted
                            ? 'bg-[#a0f3d4] text-[#00513e] hover:bg-[#85e4c2]'
                            : 'border border-[#c4c6d0] text-[#44474f] hover:bg-[#f6f3f2]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{isCompleted ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>{isCompleted ? 'Done' : 'Mark Complete'}</span>
                      </button>

                      {/* In-app viewer modal trigger */}
                      {m.fileUrl && (
                        <button
                          onClick={() => setActiveViewerMaterial(m)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#03224d] text-white rounded-lg text-[12px] font-bold hover:bg-[#1f3864] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>View In-App</span>
                        </button>
                      )}

                      {/* Download link */}
                      {m.fileUrl && (
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-[#44474f] hover:bg-[#f6f3f2] rounded-lg transition-colors"
                          title="Download Original File"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
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

      {/* In-App Material Viewer Modal */}
      {activeViewerMaterial && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setActiveViewerMaterial(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#c4c6d0] flex items-center justify-between bg-[#f6f3f2]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#03224d]">{FILE_ICONS[activeViewerMaterial.type] ?? 'description'}</span>
                <h3 className="font-bold text-[15px] text-[#1b1c1c] truncate">{activeViewerMaterial.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeViewerMaterial.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-[#03224d] text-white rounded-lg text-[12px] font-bold hover:bg-[#1f3864]"
                >
                  Download File
                </a>
                <button onClick={() => setActiveViewerMaterial(null)} className="p-1 hover:bg-[#e8e3df] rounded-lg">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#282828] relative flex items-center justify-center overflow-hidden">
              {activeViewerMaterial.type === 'video' || activeViewerMaterial.fileUrl?.match(/\.(mp4|webm|mov)$/i) ? (
                <video src={activeViewerMaterial.fileUrl} controls className="max-w-full max-h-full rounded-lg" autoPlay />
              ) : (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(activeViewerMaterial.fileUrl)}&embedded=true`}
                  className="w-full h-full border-0"
                  title={activeViewerMaterial.title}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
