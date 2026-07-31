import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function AssignmentSubmission() {
  const { courseId, id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [submissionType, setSubmissionType] = useState('file') // 'file' | 'text'
  const [file, setFile] = useState(null)
  const [textContent, setTextContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/assignments`).then(r => {
      const found = (r.data?.assignments ?? []).find(a => a._id === id)
      setAssignment(found ?? null)
      if (found?.submissionType) {
        setSubmissionType(found.submissionType === 'text' ? 'text' : 'file')
      }
    }).catch(() => {})
  }, [id])

  // Formatting helper for online rich text editor
  function insertFormat(tagOpen, tagClose = '') {
    const textarea = document.getElementById('rich-text-editor')
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const sel = textContent.substring(start, end)
    const replacement = `${tagOpen}${sel}${tagClose}`
    const updated = textContent.substring(0, start) + replacement + textContent.substring(end)
    setTextContent(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submissionType === 'file' && !file) {
      setError('Please select a file before submitting.')
      return
    }
    if (submissionType === 'text' && !textContent.trim()) {
      setError('Please type your response in the text editor before submitting.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      if (file) form.append('file', file)
      if (textContent.trim()) form.append('textContent', textContent.trim())

      await api.post(`/assignments/${id}/submissions`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppLayout role="student">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link to={`/courses/${courseId}`} className="hover:text-[#03224d]">Course</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">Submit Assignment</span>
      </nav>

      <div className="max-w-3xl">
        <h2 className="text-[32px] font-semibold text-[#03224d] mb-2">{assignment?.title ?? 'Submit Assignment'}</h2>
        {assignment && (
          <p className="text-[14px] text-[#44474f] mb-2">
            Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • Max score: {assignment.maxScore} pts
          </p>
        )}

        {assignment?.instructions && (
          <div className="bg-[#f6f3f2] border border-[#c4c6d0] rounded-xl p-5 mb-6">
            <h3 className="text-[14px] font-bold text-[#03224d] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              Instructions
            </h3>
            <p className="text-[14px] text-[#44474f] whitespace-pre-wrap leading-relaxed">{assignment.instructions}</p>
          </div>
        )}

        {submitted ? (
          <div className="bg-[#a0f3d4] border border-[#086b53] rounded-2xl p-8 text-center shadow-xs">
            <span className="material-symbols-outlined text-[48px] text-[#086b53] block mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <h3 className="text-[20px] font-semibold text-[#086b53] mb-2">Submission Received!</h3>
            <p className="text-[14px] text-[#00513e] mb-6">Your assignment response has been submitted successfully.</p>
            <button onClick={() => navigate(`/courses/${courseId}`)} className="bg-[#03224d] text-white px-6 py-2.5 rounded-xl text-[12px] font-bold hover:opacity-90">
              Back to Course
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#c4c6d0] rounded-2xl p-6 space-y-5 shadow-xs">
            {/* Mode Tabs */}
            <div className="flex border-b border-[#c4c6d0] gap-4">
              <button
                type="button"
                onClick={() => setSubmissionType('file')}
                className={`pb-3 text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  submissionType === 'file' ? 'border-[#03224d] text-[#03224d]' : 'border-transparent text-[#747780] hover:text-[#1b1c1c]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span>File Upload</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionType('text')}
                className={`pb-3 text-[13px] font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  submissionType === 'text' ? 'border-[#03224d] text-[#03224d]' : 'border-transparent text-[#747780] hover:text-[#1b1c1c]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                <span>Online Text / Essay</span>
              </button>
            </div>

            {/* TAB 1: File Upload */}
            {submissionType === 'file' && (
              <div>
                <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-2">Attach Submission File</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-[#086b53] bg-[#f6f3f2]' : 'border-[#c4c6d0] hover:border-[#03224d]'}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
                >
                  <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">cloud_upload</span>
                  {file ? (
                    <p className="text-[14px] font-bold text-[#086b53]">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-[14px] text-[#44474f] mb-2">Drag and drop your file here, or</p>
                      <label className="cursor-pointer text-[#03224d] font-bold text-[14px] hover:underline">
                        Browse files
                        <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.pptx,.zip,.txt" />
                      </label>
                      <p className="text-[12px] text-[#44474f] mt-1">PDF, Word, PPT, ZIP — max 50 MB</p>
                    </>
                  )}
                </div>
                {file && (
                  <button type="button" onClick={() => setFile(null)} className="mt-2 text-[12px] text-[#ba1a1a] hover:underline">Remove file</button>
                )}
              </div>
            )}

            {/* TAB 2: Online Rich Text Submission */}
            {submissionType === 'text' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider">Online Rich-Text Editor</label>

                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1 p-2 bg-[#f6f3f2] border border-[#c4c6d0] rounded-t-xl overflow-x-auto">
                  <button type="button" onClick={() => insertFormat('**', '**')} className="p-1.5 hover:bg-[#e8e3df] rounded text-[12px] font-bold" title="Bold">B</button>
                  <button type="button" onClick={() => insertFormat('*', '*')} className="p-1.5 hover:bg-[#e8e3df] rounded text-[12px] italic" title="Italic">I</button>
                  <span className="h-4 w-px bg-[#c4c6d0] mx-1" />
                  <button type="button" onClick={() => insertFormat('# ')} className="p-1.5 hover:bg-[#e8e3df] rounded text-[12px] font-bold" title="Heading 1">H1</button>
                  <button type="button" onClick={() => insertFormat('## ')} className="p-1.5 hover:bg-[#e8e3df] rounded text-[12px] font-bold" title="Heading 2">H2</button>
                  <span className="h-4 w-px bg-[#c4c6d0] mx-1" />
                  <button type="button" onClick={() => insertFormat('- ')} className="p-1.5 hover:bg-[#e8e3df] rounded text-[12px]" title="Bullet List">• List</button>
                  <button type="button" onClick={() => insertFormat('> ')} className="p-1.5 hover:bg-[#e8e3df] rounded text-[12px]" title="Quote">" Quote</button>
                  <button type="button" onClick={() => insertFormat('```\n', '\n```')} className="p-1.5 hover:bg-[#e8e3df] rounded text-[12px] font-mono" title="Code Block">&lt;&gt;</button>
                </div>

                <textarea
                  id="rich-text-editor"
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  rows={10}
                  placeholder="Write your assignment text or essay response here. Use formatting buttons above for markdown styling…"
                  className="w-full border border-[#c4c6d0] rounded-b-xl p-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c] resize-y font-mono leading-relaxed"
                />
                <p className="text-[11px] text-[#747780] text-right">{textContent.length} characters</p>
              </div>
            )}

            {error && <p className="text-[14px] text-[#ba1a1a] font-medium">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#03224d] text-white px-6 py-3 rounded-xl text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Submitting…</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">send</span> Submit Response</>
                )}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border border-[#c4c6d0] text-[#44474f] rounded-xl text-[14px] font-bold hover:bg-[#f0eded] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
