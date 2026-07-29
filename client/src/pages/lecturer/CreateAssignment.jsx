import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function CreateAssignment() {
  const { id: courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [form, setForm] = useState({ title: '', instructions: '', dueDate: '', maxScore: 100 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/courses/${courseId}`).then(r => setCourse(r.data)).catch(() => {})
  }, [courseId])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await api.post(`/courses/${courseId}/assignments`, form)
      navigate(`/courses/${courseId}/students`)
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  const today = new Date().toISOString().slice(0, 16)

  return (
    <AppLayout role="lecturer">
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">{course?.title ?? 'Course'} — Create Assignment</span>
      </nav>

      <div className="max-w-2xl">
        <h2 className="text-[32px] font-semibold text-[#03224d] mb-2">Create Assignment</h2>
        <p className="text-[14px] text-[#44474f] mb-6">{course?.code} • {course?.semester}</p>

        <form onSubmit={handleSubmit} className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Assignment Title</label>
            <input
              id="title"
              type="text"
              placeholder="e.g. Midterm Essay"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              required
              className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-all"
            />
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Instructions</label>
            <textarea
              id="instructions"
              rows={5}
              placeholder="Describe what students need to do..."
              value={form.instructions}
              onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))}
              className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-all resize-none"
            />
          </div>

          {/* Due date + Max score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dueDate" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Due Date & Time</label>
              <input
                id="dueDate"
                type="datetime-local"
                min={today}
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                required
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
            <div>
              <label htmlFor="maxScore" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Maximum Score</label>
              <input
                id="maxScore"
                type="number"
                min={1}
                max={1000}
                value={form.maxScore}
                onChange={e => setForm(p => ({ ...p, maxScore: Number(e.target.value) }))}
                required
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
          </div>

          {error && <p className="text-[14px] text-[#ba1a1a]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-[#03224d] text-white px-6 py-3 rounded text-[14px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
              {saving ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Creating…</> : <><span className="material-symbols-outlined text-[18px]">add</span> Create Assignment</>}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border border-[#c4c6d0] text-[#44474f] rounded text-[14px] font-bold hover:bg-[#f0eded]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
