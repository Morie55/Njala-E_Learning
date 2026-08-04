import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function PostAnnouncement() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ courseId: '', title: '', message: '', targetRole: 'all' })
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
      await api.post('/announcements', {
        courseId: form.courseId || null,
        title: form.title || 'Platform Announcement',
        message: form.message,
        targetRole: form.courseId ? 'all' : form.targetRole,
      })
      setDone(true)
    } catch (err) { setError(err.response?.data?.error || err.message) }
    setPosting(false)
  }

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h2 className="text-[32px] font-semibold text-[#03224d] mb-2">Post Broadcast Announcement</h2>
        <p className="text-[14px] text-[#44474f] mb-6">Notify students and staff in one course or across the platform via in-app notification and email.</p>

        {done ? (
          <div className="bg-[#a0f3d4] border border-[#086b53] rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-[48px] text-[#086b53] block mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
            <h3 className="text-[20px] font-semibold text-[#086b53] mb-4">Announcement Broadcasted!</h3>
            <p className="text-[13px] text-[#086b53] mb-6">Notifications and email updates have been queued for all targeted recipients.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setDone(false); setForm({ courseId: '', title: '', message: '', targetRole: 'all' }) }} className="border border-[#086b53] text-[#086b53] px-5 py-2 rounded text-[12px] font-bold hover:bg-[#086b53]/10">
                Post Another
              </button>
              <button onClick={() => navigate('/dashboard')} className="bg-[#03224d] text-white px-5 py-2 rounded text-[12px] font-bold hover:opacity-90">
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-5 shadow-xs">
            {/* Target course */}
            <div>
              <label htmlFor="ann-course" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Target Scope</label>
              <select
                id="ann-course"
                value={form.courseId}
                onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] font-semibold text-[#03224d]"
              >
                <option value="">University-wide / Platform Broadcast</option>
                {courses.map(c => <option key={c._id} value={c._id}>Course: {c.code} - {c.title}</option>)}
              </select>
            </div>

            {/* Target Role selection (for platform-wide broadcast) */}
            {!form.courseId && (
              <div>
                <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Target Audience</label>
                <select
                  value={form.targetRole}
                  onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))}
                  className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
                >
                  <option value="all">Everyone (All Students & Staff)</option>
                  <option value="student">Students Only</option>
                  <option value="lecturer">Lecturers Only</option>
                  <option value="dept_head">Department Heads Only</option>
                </select>
                <p className="text-[12px] text-[#44474f] mt-1">Broadcast emails will be delivered directly to all users matching this role.</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="ann-title" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Announcement Subject / Title</label>
              <input
                id="ann-title"
                type="text"
                placeholder="e.g. End of Semester Exam Schedule Announcement"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="ann-message" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Message Content *</label>
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

            {error && <p className="text-[14px] text-[#ba1a1a] font-semibold">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={posting} className="bg-[#03224d] text-white px-6 py-3 rounded-lg text-[14px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-xs">
                {posting ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Broadcasting Email & Notice…</> : <><span className="material-symbols-outlined text-[18px]">campaign</span> Broadcast Announcement</>}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border border-[#c4c6d0] text-[#44474f] rounded-lg text-[14px] font-bold hover:bg-[#f0eded]">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  )
}
