import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import api from '../../lib/api'

const TABS = ['Materials', 'Assignments', 'Announcements']
const FILE_ICONS = {
  pdf: 'picture_as_pdf',
  slides: 'slideshow',
  video: 'videocam',
  audio: 'audio_file',
  image: 'image',
  link: 'link',
}

/** Formats URLs to ensure protocol is present */
function getFormattedUrl(rawUrl) {
  if (!rawUrl) return ''
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

/** Maps a material's known type to a sensible default file extension */
const TYPE_EXTENSIONS = { pdf: 'pdf', slides: 'pptx', video: 'mp4' }

/** Extracts a usable extension from a URL path, ignoring query strings */
function extensionFromUrl(url) {
  const path = url.split('?')[0].split('#')[0]
  const match = path.match(/\.([a-zA-Z0-9]{2,5})$/)
  return match ? match[1].toLowerCase() : ''
}

/** Builds a safe download filename that always keeps a real file extension */
function buildDownloadFilename(title, rawUrl, materialType) {
  const base = (title || 'Material_Download').replace(/[^a-zA-Z0-9._ -]/g, '_').trim() || 'Material_Download'
  const existingExt = extensionFromUrl(rawUrl) || TYPE_EXTENSIONS[materialType] || ''
  const alreadyHasExt = existingExt && base.toLowerCase().endsWith(`.${existingExt}`)
  return alreadyHasExt || !existingExt ? base : `${base}.${existingExt}`
}

/** Robust File Download helper — always downloads via a same-origin Blob URL so
 * the browser's `download` attribute is honored reliably. Relying on an <a download>
 * pointed directly at a cross-origin URL (e.g. Cloudinary) is not dependable: several
 * browsers ignore the `download` attribute for cross-origin hrefs and just navigate
 * to the file instead, regardless of Cloudinary's fl_attachment flag. */
async function triggerDownload(rawUrl, title = 'Material_Download', materialType = '') {
  const url = getFormattedUrl(rawUrl)
  if (!url) return
  const filename = buildDownloadFilename(title, url, materialType)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed (${res.status})`)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
  } catch (err) {
    console.error('Download failed, opening the file directly instead:', err)
    // Last resort: open the plain, untransformed URL. Do NOT append Cloudinary's
    // fl_attachment flag here — accounts created since mid-2024 have "Strict
    // Transformations" enabled by default, which rejects any unsigned, on-the-fly
    // transformation (fl_attachment included) with an HTTP 401. The plain delivery
    // URL has no transformation applied, so it's always allowed.
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/** Resolves native viewer mode and embed URLs for various file types */
function resolveViewerConfig(material) {
  if (!material || !material.fileUrl) return null
  const rawUrl = getFormattedUrl(material.fileUrl)
  const lowerUrl = rawUrl.toLowerCase()
  const type = (material.type || '').toLowerCase()

  // YouTube Embed
  const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return { mode: 'iframe', url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` }
  }

  // Vimeo Embed
  const vimeoMatch = rawUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/[^\/]*\/videos\/|album\/\d+\/video\/|video\/|)(\d+)/)
  if (vimeoMatch && vimeoMatch[1]) {
    return { mode: 'iframe', url: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` }
  }

  // Google Drive View -> Preview Embed
  if (lowerUrl.includes('drive.google.com') && lowerUrl.includes('/file/d/')) {
    const drivePreviewUrl = rawUrl.replace(/\/view(\?.*)?$/, '/preview')
    return { mode: 'iframe', url: drivePreviewUrl }
  }

  // Direct Images
  if (type === 'image' || lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/)) {
    return { mode: 'image', url: rawUrl }
  }

  // Direct Videos
  if (type === 'video' || lowerUrl.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/)) {
    return { mode: 'video', url: rawUrl }
  }

  // Direct Audio
  if (type === 'audio' || lowerUrl.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/)) {
    return { mode: 'audio', url: rawUrl }
  }

  // PDF — route through Google Docs Viewer so the browser never has to embed the
  // Cloudinary URL directly. Cloudinary sends X-Frame-Options headers that block
  // cross-origin <object>/<iframe> embeds; Google fetches and re-serves the file
  // in a way that can always be safely iframed.
  if (type === 'pdf' || lowerUrl.match(/\.pdf(\?.*)?$/)) {
    return { mode: 'google_doc', url: `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true` }
  }

  // Slides / Office documents -> Google Docs Viewer.
  // Cloudinary serves non-image/video files as "raw" resources, and raw uploads
  // often come back with NO file extension in the URL at all — so this must not
  // depend solely on the URL matching .doc/.docx/.ppt/.pptx/.xls/.xlsx. Trust the
  // material's own `type` (set at upload time) first.
  if (type === 'slides' || lowerUrl.match(/\.(doc|docx|ppt|pptx|xls|xlsx)(\?.*)?$/)) {
    // Microsoft Office Online Viewer is used instead of Google Docs Viewer because
    // Google's crawler-based approach is blocked by Cloudinary's CDN, causing
    // "No preview available". Microsoft's viewer fetches the file directly from the
    // browser, so it reliably reaches Cloudinary raw-upload URLs.
    const hasOfficeExt = /\.(doc|docx|ppt|pptx|xls|xlsx)$/.test(rawUrl.split('?')[0])
    const viewableUrl = hasOfficeExt ? rawUrl : `${rawUrl}.pptx`
    return { mode: 'google_doc', url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewableUrl)}` }
  }

  // General Web Link / Webpage
  return { mode: 'link', url: rawUrl }
}

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
        await api.delete(`/materials/progress/${materialId}/complete`)
        setCompletedMaterialIds(prev => {
          const next = new Set(prev)
          next.delete(materialId)
          return next
        })
        showToast('Material unmarked')
      } else {
        await api.post(`/materials/progress/${materialId}/complete`)
        setCompletedMaterialIds(prev => new Set([...prev, materialId]))
        showToast('Material marked as complete! 🎉', 'success')
      }
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Failed to update progress', 'error')
    }
  }

  const totalMaterials = materials.length
  const completedCount = completedMaterialIds.size
  const progressPct = totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0

  return (
    <AppLayout>
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
                const formattedUrl = getFormattedUrl(m.fileUrl)

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
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                          isCompleted
                            ? 'bg-[#a0f3d4] text-[#00513e] hover:bg-[#85e4c2]'
                            : 'border border-[#c4c6d0] text-[#44474f] hover:bg-[#f6f3f2]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{isCompleted ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>{isCompleted ? 'Done' : 'Mark Complete'}</span>
                      </button>

                      {/* In-app viewer modal trigger */}
                      {formattedUrl && (
                        <button
                          onClick={() => setActiveViewerMaterial(m)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#03224d] text-white rounded-lg text-[12px] font-bold hover:bg-[#1f3864] transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>View In-App</span>
                        </button>
                      )}

                      {/* Force Download button */}
                      {formattedUrl && (
                        <button
                          onClick={() => triggerDownload(formattedUrl, m.title, m.type)}
                          className="p-1.5 text-[#44474f] hover:bg-[#f6f3f2] rounded-lg transition-colors cursor-pointer"
                          title="Download Original File"
                        >
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </button>
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
      {activeViewerMaterial && (() => {
        const config = resolveViewerConfig(activeViewerMaterial)
        const formattedUrl = getFormattedUrl(activeViewerMaterial.fileUrl)

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4" onClick={() => setActiveViewerMaterial(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-[#c4c6d0]" onClick={e => e.stopPropagation()}>
              {/* Modal Top Header */}
              <div className="p-4 border-b border-[#c4c6d0] flex items-center justify-between bg-[#f6f3f2] shrink-0">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span className="material-symbols-outlined text-[#03224d] text-2xl shrink-0">
                    {FILE_ICONS[activeViewerMaterial.type] ?? 'description'}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[15px] text-[#1b1c1c] truncate">{activeViewerMaterial.title}</h3>
                    <p className="text-[11px] text-[#747780] uppercase tracking-wider">{activeViewerMaterial.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {formattedUrl && (
                    <button
                      onClick={() => triggerDownload(formattedUrl, activeViewerMaterial.title, activeViewerMaterial.type)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#03224d] text-white rounded-lg text-[12px] font-bold hover:bg-[#1f3864] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span className="hidden sm:inline">Download File</span>
                    </button>
                  )}
                  {formattedUrl && (
                    <a
                      href={formattedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-[#44474f] hover:bg-[#e8e3df] rounded-lg transition-colors"
                      title="Open in new tab"
                    >
                      <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                    </a>
                  )}
                  <button onClick={() => setActiveViewerMaterial(null)} className="p-1.5 text-[#44474f] hover:bg-[#e8e3df] rounded-lg transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Modal Body / Media Canvas */}
              <div className="flex-1 bg-[#1e1e1e] relative flex items-center justify-center overflow-hidden p-2">
                {!config ? (
                  <div className="text-white text-center p-6">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-[#ffdad6]">error</span>
                    <p className="font-bold">No file URL attached</p>
                  </div>
                ) : config.mode === 'image' ? (
                  <img src={config.url} alt={activeViewerMaterial.title} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                ) : config.mode === 'video' ? (
                  <video src={config.url} controls className="max-w-full max-h-full rounded-lg shadow-lg" autoPlay />
                ) : config.mode === 'audio' ? (
                  <div className="bg-[#2d2d2d] p-8 rounded-2xl border border-white/10 text-center space-y-4 max-w-md w-full">
                    <span className="material-symbols-outlined text-5xl text-[#a0f3d4] block">graphic_eq</span>
                    <p className="text-white font-bold text-[16px]">{activeViewerMaterial.title}</p>
                    <audio src={config.url} controls className="w-full" autoPlay />
                  </div>
                ) : config.mode === 'iframe' || config.mode === 'google_doc' ? (
                  <iframe
                    src={config.url}
                    className="w-full h-full border-0 bg-white rounded-lg"
                    title={activeViewerMaterial.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="bg-[#2d2d2d] p-8 rounded-2xl border border-white/10 text-center space-y-4 max-w-md w-full">
                    <span className="material-symbols-outlined text-5xl text-[#d8e2ff] block">link</span>
                    <p className="text-white font-bold text-[16px]">{activeViewerMaterial.title}</p>
                    <p className="text-[13px] text-white/70 truncate">{config.url}</p>
                    <div className="flex justify-center gap-3 pt-2">
                      <a
                        href={config.url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#03224d] text-white px-5 py-2.5 rounded-xl font-bold text-[13px] hover:bg-[#1f3864]"
                      >
                        Open External Link
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </AppLayout>
  )
}
