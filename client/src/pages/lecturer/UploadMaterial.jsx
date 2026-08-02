import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB

export default function UploadMaterial() {
  const { id: paramCourseId } = useParams()
  const navigate = useNavigate()

  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState(paramCourseId ?? '')
  const [form, setForm] = useState({ title: '', type: 'pdf' })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Load lecturer's own courses for the selector
  useEffect(() => {
    api.get('/courses?owned=true')
      .then((r) => {
        const list = r.data?.courses ?? r.data ?? []
        setCourses(list)
        // If no courseId from URL, pre-select the first course
        if (!paramCourseId && list.length > 0) {
          setCourseId(list[0]._id)
        }
      })
      .catch(() => {})
  }, [paramCourseId])

  const selectedCourse = courses.find((c) => c._id === courseId) ?? null

  function handleFileSelect(selectedFile) {
    if (!selectedFile) return
    setError('')
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1)
      setError(
        `File size (${sizeMB} MB) exceeds the 15 MB limit for direct upload. For video lectures or large files, please select the "External Link" option to paste a YouTube, Vimeo, or Google Drive link.`
      )
      setFile(null)
      return
    }
    setFile(selectedFile)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!courseId) {
      setError('Please select a course.')
      return
    }
    if (!file && form.type !== 'link') {
      setError('Please select a file.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('courseId', courseId)
      fd.append('title', form.title)
      fd.append('type', form.type)
      if (file) fd.append('file', file)
      if (form.url) fd.append('url', form.url)
      await api.post('/materials', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDone(true)
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Upload failed.'
      setError(msg)
    }
    setUploading(false)
  }

  return (
    <AppLayout role="lecturer">
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">
          My Courses
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">
          {selectedCourse ? selectedCourse.title : 'Upload Material'}
        </span>
      </nav>

      <div className="max-w-2xl">
        <h2 className="text-[32px] font-semibold text-[#03224d] mb-6">Upload Course Material</h2>

        {done ? (
          <div className="bg-[#a0f3d4] border border-[#086b53] rounded-xl p-8 text-center">
            <span
              className="material-symbols-outlined text-[48px] text-[#086b53] block mb-3"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <h3 className="text-[20px] font-semibold text-[#086b53] mb-1">Material Uploaded!</h3>
            {selectedCourse && (
              <p className="text-[13px] text-[#086b53]/80 mb-4">
                Added to <span className="font-bold">{selectedCourse.title}</span>
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setDone(false)
                  setFile(null)
                  setForm({ title: '', type: 'pdf' })
                  setError('')
                }}
                className="border border-[#086b53] text-[#086b53] px-5 py-2 rounded text-[12px] font-bold hover:bg-[#086b53]/10 cursor-pointer"
              >
                Upload Another
              </button>
              <button
                onClick={() => navigate(`/courses/${courseId}/students`)}
                className="bg-[#03224d] text-white px-5 py-2 rounded text-[12px] font-bold hover:opacity-90 cursor-pointer"
              >
                Back to Course
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-5">

            {/* ── Course selector ── */}
            <div>
              <label htmlFor="mat-course" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Course
              </label>
              {courses.length === 0 ? (
                <div className="flex items-center gap-2 border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] text-[#747780]">
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Loading your courses…
                </div>
              ) : (
                <select
                  id="mat-course"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                  className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-all"
                >
                  <option value="" disabled>— Select a course —</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.code ? `${c.code} · ` : ''}{c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ── Title ── */}
            <div>
              <label htmlFor="mat-title" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Title
              </label>
              <input
                id="mat-title"
                type="text"
                placeholder="e.g. Lecture 1 Video / Slides"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-all"
              />
            </div>

            {/* ── Type ── */}
            <div>
              <label htmlFor="mat-type" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                id="mat-type"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, url: '' }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              >
                <option value="pdf">PDF</option>
                <option value="slides">Slides (PPTX)</option>
                <option value="video">Video (MP4 / WEBM)</option>
                <option value="link">External Link (YouTube / Vimeo / Drive)</option>
              </select>
            </div>

            {/* Video guidance box */}
            {form.type === 'video' && (
              <div className="bg-[#f0eded] border border-[#c4c6d0] rounded-lg p-3 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#03224d] shrink-0">info</span>
                <p className="text-[12px] text-[#44474f] leading-relaxed">
                  <strong className="text-[#03224d]">Direct Upload Limit: 15 MB.</strong> Direct video uploads
                  are restricted to conserve server memory and mobile bandwidth. Please select{' '}
                  <span className="font-bold text-[#03224d]">External Link</span> to paste a YouTube, Vimeo,
                  or Google Drive link for video lectures.
                </p>
              </div>
            )}

            {/* ── Link URL or File upload ── */}
            {form.type === 'link' ? (
              <div>
                <label htmlFor="mat-url" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  URL
                </label>
                <input
                  id="mat-url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                  value={form.url ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
                  required
                  className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">File</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    file ? 'border-[#086b53] bg-[#f6f3f2]' : 'border-[#c4c6d0] hover:border-[#03224d]'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0])
                  }}
                >
                  <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">upload_file</span>
                  {file ? (
                    <div>
                      <p className="text-[14px] font-bold text-[#086b53]">{file.name}</p>
                      <p className="text-[12px] text-[#44474f]">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[14px] text-[#44474f] mb-2">Drag and drop or</p>
                      <label className="cursor-pointer text-[#03224d] font-bold text-[14px] hover:underline">
                        Browse files
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files[0]) handleFileSelect(e.target.files[0])
                          }}
                          accept=".pdf,.pptx,.docx,.zip"
                        />
                      </label>
                      <p className="text-[12px] text-[#44474f] mt-1">Maximum 15 MB per file (PDF, PPTX, DOCX, ZIP)</p>
                    </>
                  )}
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="mt-2 text-[12px] text-[#ba1a1a] hover:underline cursor-pointer"
                  >
                    Remove selected file
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-[#ffdad6] border border-[#ba1a1a] rounded-lg text-[#ba1a1a] text-[13px] font-medium leading-relaxed">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={uploading || !courseId}
                className="bg-[#03224d] text-white px-6 py-3 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Uploading…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    Upload Material
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
