import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { useUser } from '../../hooks/useUser'

const CATEGORIES = [
  { id: 'general', label: 'General Announcement', icon: 'campaign', color: 'bg-[#d8e2ff] text-[#001a41]' },
  { id: 'timetable', label: 'Timetable / Exam Schedule', icon: 'calendar_month', color: 'bg-[#ffdcbb] text-[#543100]' },
  { id: 'lecture_notes', label: 'Lecture Notes / Materials', icon: 'description', color: 'bg-[#a0f3d4] text-[#00513e]' },
  { id: 'exam_schedule', label: 'Assessment / Exam Notice', icon: 'event', color: 'bg-[#d8e2ff] text-[#1f3864]' },
  { id: 'urgent', label: 'Urgent Platform Alert', icon: 'warning', color: 'bg-[#ffdad6] text-[#93000a]' },
]

export default function PostAnnouncement() {
  const navigate = useNavigate()
  const { role } = useUser()

  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const [form, setForm] = useState({
    scope: 'global', // 'global' | 'department' | 'course'
    courseId: '',
    departmentId: '',
    category: 'timetable',
    targetRole: 'student',
    title: '',
    message: '',
    fileUrl: '',
  })

  const [posting, setPosting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  /* Load scope data & recent broadcast history */
  const loadData = () => {
    const courseEndpoint = role === 'admin' ? '/courses' : '/courses?owned=true'
    Promise.all([
      api.get(courseEndpoint).catch(() => ({ data: { courses: [] } })),
      api.get('/departments').catch(() => ({ data: { departments: [] } })),
      api.get('/announcements').catch(() => ({ data: { announcements: [] } })),
    ])
      .then(([cRes, dRes, aRes]) => {
        setCourses(cRes.data?.courses ?? [])
        setDepartments(dRes.data?.departments ?? [])
        setAnnouncements(aRes.data?.announcements ?? [])
      })
      .finally(() => setLoadingHistory(false))
  }

  useEffect(() => {
    loadData()
  }, [role])

  async function handleSubmit(e) {
    e.preventDefault()
    setPosting(true)
    setError('')

    try {
      const payload = {
        title: form.title || 'Platform Announcement',
        message: form.message,
        category: form.category,
        fileUrl: form.fileUrl,
        targetRole: form.targetRole,
        courseId: form.scope === 'course' ? form.courseId : null,
        departmentId: form.scope === 'department' ? form.departmentId : null,
      }

      await api.post('/announcements', payload)
      setDone(true)
      loadData()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to dispatch broadcast announcement.')
    } finally {
      setPosting(false)
    }
  }

  async function handleDeleteBroadcast(id) {
    if (!window.confirm('Delete this broadcast announcement?')) return
    try {
      await api.delete(`/announcements/${id}`)
      loadData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete announcement.')
    }
  }

  const getCategoryBadge = (cat) => {
    const item = CATEGORIES.find(c => c.id === cat) || CATEGORIES[0]
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${item.color}`}>
        <span className="material-symbols-outlined text-[13px]">{item.icon}</span>
        {item.label}
      </span>
    )
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[#086b53] mb-1">
            <span className="material-symbols-outlined text-[28px]">campaign</span>
            <h2 className="text-[28px] sm:text-[32px] font-semibold text-[#03224d]">Direct Broadcast Communication Console</h2>
          </div>
          <p className="text-[14px] text-[#44474f]">
            Directly broadcast timetables, lecture notes, and assessment notices to all students simultaneously — eliminating WhatsApp and class rep delays.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broadcast Composer */}
        <div className="lg:col-span-7">
          {done ? (
            <div className="bg-[#eefaf6] border border-[#86efcc] rounded-2xl p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-[56px] text-[#086b53] block mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              <h3 className="text-[22px] font-bold text-[#086b53] mb-2">Broadcast Dispatched Successfully!</h3>
              <p className="text-[13px] text-[#44474f] mb-6">
                Your announcement and attached resources have been delivered directly to all target students via in-app notification and email.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setDone(false)
                    setForm({ scope: 'global', courseId: '', departmentId: '', category: 'timetable', targetRole: 'student', title: '', message: '', fileUrl: '' })
                  }}
                  className="bg-[#086b53] text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:opacity-90 transition-opacity"
                >
                  Send Another Broadcast
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="border border-[#03224d] text-[#03224d] px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#03224d] hover:text-white transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-[#c4c6d0] rounded-2xl p-6 space-y-5 shadow-sm">
              <h3 className="font-bold text-[18px] text-[#03224d] flex items-center gap-2 border-b border-[#c4c6d0] pb-3">
                <span className="material-symbols-outlined text-[#086b53]">send</span>
                Compose New Announcement Broadcast
              </h3>

              {/* Broadcast Category */}
              <div>
                <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-2">
                  1. Broadcast Category / Material Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, category: cat.id }))}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        form.category === cat.id
                          ? 'border-[#03224d] bg-[#03224d] text-white shadow-sm'
                          : 'border-[#c4c6d0] bg-[#fbf9f8] text-[#44474f] hover:border-[#03224d]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                      <span className="text-[12px] font-bold">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Broadcasting Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                    2. Distribution Scope *
                  </label>
                  <select
                    value={form.scope}
                    onChange={e => setForm(p => ({ ...p, scope: e.target.value }))}
                    className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[14px] bg-white font-semibold text-[#03224d] focus:outline-none focus:border-[#03224d]"
                  >
                    <option value="global">University-Wide (All Students & Staff)</option>
                    <option value="department">Specific Department Scope</option>
                    <option value="course">Specific Enrolled Course Scope</option>
                  </select>
                </div>

                {/* Sub-scope target pickers */}
                {form.scope === 'department' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                      Target Department *
                    </label>
                    <select
                      value={form.departmentId}
                      onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                      required
                      className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[14px] bg-white font-semibold text-[#03224d] focus:outline-none focus:border-[#03224d]"
                    >
                      <option value="">— Select Department —</option>
                      {departments.map(d => (
                        <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.scope === 'course' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                      Target Course *
                    </label>
                    <select
                      value={form.courseId}
                      onChange={e => setForm(p => ({ ...p, courseId: e.target.value }))}
                      required
                      className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[14px] bg-white font-semibold text-[#03224d] focus:outline-none focus:border-[#03224d]"
                    >
                      <option value="">— Select Course —</option>
                      {courses.map(c => (
                        <option key={c._id} value={c._id}>{c.code}: {c.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.scope === 'global' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                      Target Role Audience
                    </label>
                    <select
                      value={form.targetRole}
                      onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))}
                      className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#03224d]"
                    >
                      <option value="student">All Students Only</option>
                      <option value="all">Everyone (Students, Lecturers, Dept Heads)</option>
                      <option value="lecturer">Lecturers Only</option>
                      <option value="dept_head">Department Heads Only</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Title / Subject */}
              <div>
                <label htmlFor="b-title" className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  3. Announcement Subject / Title *
                </label>
                <input
                  id="b-title"
                  type="text"
                  placeholder="e.g. Official 2025/2026 Semester 1 Final Exam Timetable Released"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  required
                  className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] font-bold text-[#03224d]"
                />
              </div>

              {/* Message Content */}
              <div>
                <label htmlFor="b-msg" className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  4. Message Body *
                </label>
                <textarea
                  id="b-msg"
                  rows={5}
                  placeholder="Provide full details for the broadcast announcement..."
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  required
                  minLength={10}
                  className="w-full border border-[#c4c6d0] rounded-xl p-3.5 text-[14px] focus:outline-none focus:border-[#03224d] bg-[#fbf9f8]"
                />
              </div>

              {/* Attachment / Document URL */}
              <div>
                <label htmlFor="b-file" className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                  5. Resource Attachment URL (Timetable PDF, Lecture Notes link, etc.)
                </label>
                <input
                  id="b-file"
                  type="url"
                  placeholder="https://.../timetable_sem1.pdf or drive link"
                  value={form.fileUrl}
                  onChange={e => setForm(p => ({ ...p, fileUrl: e.target.value }))}
                  className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[13px] font-mono focus:outline-none focus:border-[#03224d] bg-[#fbf9f8]"
                />
              </div>

              {error && (
                <p className="text-[13px] text-[#ba1a1a] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </p>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="submit"
                  disabled={posting}
                  className="bg-[#03224d] text-white px-7 py-3 rounded-xl text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {posting ? (
                    <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Dispatching Broadcast…</>
                  ) : (
                    <><span className="material-symbols-outlined text-[18px]">campaign</span> Broadcast to All Target Students</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Recent Broadcast History */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-[16px] text-[#03224d] flex items-center gap-2 border-b border-[#c4c6d0] pb-3">
              <span className="material-symbols-outlined text-[#086b53]">history</span>
              Recent Broadcast History ({announcements.length})
            </h3>

            {loadingHistory ? (
              <LoadingSkeleton type="card" count={3} />
            ) : announcements.length === 0 ? (
              <p className="text-[13px] text-[#44474f] text-center py-8">No broadcast announcements sent yet.</p>
            ) : (
              <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                {announcements.map((a) => (
                  <div key={a._id} className="border border-[#c4c6d0] rounded-xl p-4 bg-[#fbf9f8] space-y-2 hover:border-[#03224d] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {getCategoryBadge(a.category)}
                        <h4 className="font-bold text-[14px] text-[#03224d] mt-1.5">{a.title}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteBroadcast(a._id)}
                        className="text-[#ba1a1a] hover:bg-[#ffdad6] p-1 rounded-lg transition-colors cursor-pointer"
                        title="Delete broadcast"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>

                    <p className="text-[12px] text-[#44474f] line-clamp-2">{a.message}</p>

                    {a.fileUrl && (
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#086b53] hover:underline pt-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">attachment</span>
                        View Attached File / Material
                      </a>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#747780] pt-2 border-t border-[#c4c6d0]/40">
                      <span>By {a.postedByName || 'Admin'}</span>
                      <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
