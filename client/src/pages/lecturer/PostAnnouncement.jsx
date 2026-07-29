import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function PostAnnouncement() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ courseId: '', message: '' })
  const [posting, setPosting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/courses?owned=true').then(r => setCourses(r.data?.courses ?? [])).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setPosting(true); setError('')
    try {
      await api.post('/announcements', { courseId: form.courseId || null, message: form.message })
      setDone(true)
    } catch (err) { setError(err.message) }
    setPosting(false)
  }

  return (
    <AppLayout role="lecturer">
      <div className="max-w-2xl">
        <h2 className="text-[32px] font-semibold text-[#03224d] mb-2">Post Announcement</h2>
        <p className="text-[14px] text-[#44474f] mb-6">Notify students in one or all of your courses.</p>

        {done ? (
          <div className="bg-[#a0f3d4] border border-[#086b53] rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-[48px] text-[#086b53] block mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
            <h3 className="text-[20px] font-semibold text-[#086b53] mb-4">Announcement Posted!</h3>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setDone(false); setForm({ courseId: '', message: '' }) }} className="border border-[#086b53] text-[#086b53] px-5 py-2 rounded text-[12px] font-bold hover:bg-[#086b53]/10">
                Post Another
              </button>
              <button onClick={() => navigate('/dashboard')} className="bg-[#03224d] text-white px-5 py-2 rounded text-[12px] font-bold hover:opacity-90">
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-5">
            {/* Target course */}
            <div>
              <label htmlFor="ann-course" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Target Course</label>
              <select
                id="ann-course"
                value={form.courseId}
                onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              >
                <option value="">University-wide (all students)</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.code}: {c.title}</option>)}
              </select>
              <p className="text-[12px] text-[#44474f] mt-1">Leave blank to post a university-wide announcement.</p>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="ann-message" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Message</label>
              <textarea
                id="ann-message"
                rows={6}
                placeholder="Type your announcement here..."
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                required
                minLength={10}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-all resize-none"
              />
              <p className="text-[12px] text-[#44474f] mt-1">{form.message.length} characters</p>
            </div>

            {error && <p className="text-[14px] text-[#ba1a1a]">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={posting} className="bg-[#03224d] text-white px-6 py-3 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {posting ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Posting…</> : <><span className="material-symbols-outlined text-[18px]">campaign</span> Post Announcement</>}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded]">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
