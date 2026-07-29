import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function AssignmentSubmission() {
  const { courseId, id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState(null)
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/courses/${courseId}/assignments`).then(r => {
      const found = (r.data?.assignments ?? []).find(a => a._id === id)
      setAssignment(found ?? null)
    }).catch(() => {})
  }, [courseId, id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) { setError('Please select a file before submitting.'); return }
    setSubmitting(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/assignments/${id}/submissions`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
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

      <div className="max-w-2xl">
        <h2 className="text-[32px] font-semibold text-[#03224d] mb-2">{assignment?.title ?? 'Submit Assignment'}</h2>
        {assignment && (
          <p className="text-[14px] text-[#44474f] mb-2">
            Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • Max score: {assignment.maxScore}
          </p>
        )}

        {assignment?.instructions && (
          <div className="bg-[#f6f3f2] border border-[#c4c6d0] rounded-lg p-5 mb-6">
            <h3 className="text-[14px] font-bold text-[#03224d] mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              Instructions
            </h3>
            <p className="text-[14px] text-[#44474f] whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        {submitted ? (
          <div className="bg-[#a0f3d4] border border-[#086b53] rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-[48px] text-[#086b53] block mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <h3 className="text-[20px] font-semibold text-[#086b53] mb-2">Submission Received!</h3>
            <p className="text-[14px] text-[#00513e] mb-6">Your assignment has been submitted successfully.</p>
            <button onClick={() => navigate(`/courses/${courseId}`)} className="bg-[#03224d] text-white px-6 py-2.5 rounded text-[12px] font-bold hover:opacity-90">
              Back to Course
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-5">
            {/* File upload */}
            <div>
              <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-2">Upload Your Submission</label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-[#086b53] bg-[#f6f3f2]' : 'border-[#c4c6d0] hover:border-[#03224d]'}`}
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
                      <input type="file" className="hidden" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.pptx,.zip" />
                    </label>
                    <p className="text-[12px] text-[#44474f] mt-1">PDF, Word, PPT, ZIP — max 50 MB</p>
                  </>
                )}
              </div>
              {file && (
                <button type="button" onClick={() => setFile(null)} className="mt-2 text-[12px] text-[#ba1a1a] hover:underline">Remove file</button>
              )}
            </div>

            {error && <p className="text-[14px] text-[#ba1a1a] font-medium">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#03224d] text-white px-6 py-3 rounded text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Submitting…</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">send</span> Submit Assignment</>
                )}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded] transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
