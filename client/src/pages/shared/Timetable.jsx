import { useState, useEffect, Fragment } from 'react'
import { useUser } from '../../hooks/useUser'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Show Mon-Sat (indices 1-6)
const WORK_DAYS = [1, 2, 3, 4, 5, 6]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am - 8pm

const SLOT_COLORS = [
  'bg-[#d8e2ff] border-[#7c9bd6] text-[#001a41]',
  'bg-[#a0f3d4] border-[#4caf50] text-[#002117]',
  'bg-[#ffdcbb] border-[#ff9800] text-[#2b1700]',
  'bg-[#e8def8] border-[#9c7fc7] text-[#21005d]',
  'bg-[#ffe8b5] border-[#ffc107] text-[#5a3b00]',
  'bg-[#ffdad6] border-[#e57373] text-[#410002]',
]

function timeToHour(t) {
  const [h, m] = (t ?? '08:00').split(':').map(Number)
  return h + m / 60
}

export default function Timetable() {
  const { role, dbUser } = useUser()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ courseId: '', dayOfWeek: '1', startTime: '08:00', endTime: '10:00', venue: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/timetable/my')
      setSlots(data.slots ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    if (['lecturer', 'admin', 'dept_head'].includes(role)) {
      api.get('/courses').then(r => setCourses(r.data?.courses ?? r.data ?? [])).catch(() => {})
    }
  }, [role])

  async function handleAdd() {
    setSaving(true)
    try {
      await api.post('/timetable', { ...form, dayOfWeek: Number(form.dayOfWeek) })
      showToast('Class slot added')
      setShowForm(false)
      load()
    } catch (e) { showToast(e.response?.data?.error ?? 'Failed to add slot', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try { await api.delete(`/timetable/${id}`); showToast('Slot removed'); load() }
    catch { showToast('Delete failed', 'error') }
  }

  // Group slots by courseId for consistent colour
  const courseColorMap = {}
  slots.forEach((s, i) => {
    const cid = s.courseId?._id ?? s.courseId
    if (!courseColorMap[cid]) courseColorMap[cid] = SLOT_COLORS[Object.keys(courseColorMap).length % SLOT_COLORS.length]
  })

  const slotsForDay = (day) => slots.filter(s => s.dayOfWeek === day)

  return (
    <AppLayout role={role}>
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-[13px] font-bold shadow-lg ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#086b53]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1b1c1c]">Weekly Timetable</h1>
          <p className="text-[13px] text-[#747780]">{role === 'student' ? 'Your class schedule for this semester' : 'Manage class schedules'}</p>
        </div>
        {['lecturer', 'admin', 'dept_head'].includes(role) && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#03224d] text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-[#1f3864] transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span> Add Slot
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-[#747780]">Loading schedule…</div>
      ) : slots.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#c4c6d0]">
          <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-3">event_note</span>
          <p className="text-[14px] font-bold text-[#44474f]">No classes scheduled</p>
          {['lecturer', 'admin'].includes(role) && <p className="text-[12px] text-[#9e9e9e] mt-1">Use the "Add Slot" button to build the timetable</p>}
        </div>
      ) : (
        <>
          {/* Weekly grid */}
          <div className="bg-white rounded-2xl border border-[#c4c6d0] overflow-x-auto">
            <div className="grid" style={{ gridTemplateColumns: `70px repeat(${WORK_DAYS.length}, 1fr)`, minWidth: '600px' }}>
              {/* Header row */}
              <div className="border-b border-r border-[#c4c6d0] py-3 px-2 bg-[#f6f3f2]" />
              {WORK_DAYS.map(d => (
                <div key={d} className="border-b border-r border-[#c4c6d0] py-3 px-2 text-center bg-[#f6f3f2]">
                  <p className="text-[11px] font-black text-[#44474f] uppercase">{DAY_SHORT[d]}</p>
                  <p className="text-[10px] text-[#9e9e9e]">{DAYS[d]}</p>
                </div>
              ))}

              {/* Hour rows */}
              {HOURS.map(h => (
                <Fragment key={`h-${h}`}>
                  <div className="border-b border-r border-[#c4c6d0] py-2 px-2 text-right">
                    <span className="text-[10px] font-bold text-[#9e9e9e]">{h.toString().padStart(2, '0')}:00</span>
                  </div>
                  {WORK_DAYS.map(d => {
                    const daySlots = slotsForDay(d).filter(s => {
                      const start = Math.floor(timeToHour(s.startTime))
                      return start === h
                    })
                    return (
                      <div key={`${h}-${d}`} className="border-b border-r border-[#c4c6d0] p-1 min-h-[50px] relative">
                        {daySlots.map(s => {
                          const cid = s.courseId?._id ?? s.courseId
                          const colorClass = courseColorMap[cid] ?? SLOT_COLORS[0]
                          const startH = timeToHour(s.startTime)
                          const endH = timeToHour(s.endTime)
                          const duration = endH - startH
                          return (
                            <div key={s._id} className={`rounded-lg border p-1.5 text-left ${colorClass} group relative`}
                              style={{ minHeight: `${Math.max(40, duration * 48)}px` }}>
                              <p className="text-[10px] font-black leading-tight truncate">{s.courseId?.code ?? 'Course'}</p>
                              <p className="text-[9px] leading-tight truncate opacity-80">{s.courseId?.title ?? ''}</p>
                              <p className="text-[9px] opacity-70">{s.startTime}–{s.endTime}</p>
                              {s.venue && <p className="text-[9px] opacity-60 truncate">📍{s.venue}</p>}
                              {['lecturer', 'admin', 'dept_head'].includes(role) && (
                                <button onClick={() => handleDelete(s._id)}
                                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white/60 rounded">
                                  <span className="material-symbols-outlined text-[12px] text-[#ba1a1a]">close</span>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          {/* List view */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORK_DAYS.map(d => {
              const daySlots = slotsForDay(d)
              if (daySlots.length === 0) return null
              return (
                <div key={d} className="bg-white rounded-2xl border border-[#c4c6d0] p-4">
                  <h3 className="text-[12px] font-black text-[#1b1c1c] mb-2">{DAYS[d]}</h3>
                  <div className="space-y-2">
                    {daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => {
                      const cid = s.courseId?._id ?? s.courseId
                      const colorClass = courseColorMap[cid] ?? SLOT_COLORS[0]
                      return (
                        <div key={s._id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${colorClass}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black truncate">{s.courseId?.code ?? 'Course'}</p>
                            <p className="text-[10px] opacity-75">{s.startTime}–{s.endTime}{s.venue ? ` · ${s.venue}` : ''}</p>
                          </div>
                          {['lecturer', 'admin', 'dept_head'].includes(role) && (
                            <button onClick={() => handleDelete(s._id)} className="p-1 hover:opacity-70 transition-opacity shrink-0">
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Add slot modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#c4c6d0] flex items-center justify-between">
              <h2 className="font-black text-[16px] text-[#1b1c1c]">Add Class Slot</h2>
              <button onClick={() => setShowForm(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#44474f] mb-1">Course</label>
                <select value={form.courseId} onChange={e => setForm(v => ({ ...v, courseId: e.target.value }))}
                  className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]">
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#44474f] mb-1">Day</label>
                <select value={form.dayOfWeek} onChange={e => setForm(v => ({ ...v, dayOfWeek: e.target.value }))}
                  className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]">
                  {WORK_DAYS.map(d => <option key={d} value={d}>{DAYS[d]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(v => ({ ...v, startTime: e.target.value }))}
                    className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(v => ({ ...v, endTime: e.target.value }))}
                    className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#44474f] mb-1">Venue (optional)</label>
                <input type="text" value={form.venue} placeholder="e.g. Lecture Hall B, Room 201"
                  onChange={e => setForm(v => ({ ...v, venue: e.target.value }))}
                  className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
              </div>
            </div>
            <div className="p-5 border-t border-[#c4c6d0] flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[13px] font-bold text-[#44474f] hover:bg-[#f6f3f2] rounded-xl transition-colors">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !form.courseId}
                className="px-5 py-2 bg-[#03224d] text-white rounded-xl text-[13px] font-bold hover:bg-[#1f3864] transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  )
}
