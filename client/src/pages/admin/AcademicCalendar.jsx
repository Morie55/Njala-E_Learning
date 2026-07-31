import { useState, useEffect } from 'react'
import api from '../../lib/api'

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : ''

const EMPTY = {
  name: '', academicYear: '', semester: '', startDate: '', endDate: '',
  enrollmentOpen: '', enrollmentClose: '', examStart: '', examEnd: '',
}

export default function AcademicCalendar() {
  const [periods, setPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    try { const { data } = await api.get('/academic-periods'); setPeriods(data.periods) }
    catch { /* silent */ } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(p) {
    setEditing(p._id)
    setForm({ name: p.name, academicYear: p.academicYear, semester: p.semester, startDate: fmtInput(p.startDate), endDate: fmtInput(p.endDate), enrollmentOpen: fmtInput(p.enrollmentOpen), enrollmentClose: fmtInput(p.enrollmentClose), examStart: fmtInput(p.examStart), examEnd: fmtInput(p.examEnd) })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) { await api.patch(`/academic-periods/${editing}`, form) }
      else { await api.post('/academic-periods', form) }
      showToast(editing ? 'Period updated' : 'Period created')
      setShowForm(false)
      load()
    } catch (e) { showToast(e.response?.data?.error ?? 'Save failed', 'error') }
    finally { setSaving(false) }
  }

  async function handleActivate(id) {
    setActivating(id)
    try { await api.patch(`/academic-periods/${id}/activate`); showToast('Period activated'); load() }
    catch { showToast('Activate failed', 'error') } finally { setActivating(null) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this academic period?')) return
    try { await api.delete(`/academic-periods/${id}`); showToast('Deleted'); load() }
    catch { showToast('Delete failed', 'error') }
  }

  const now = new Date()

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-[13px] font-bold ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#086b53]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1b1c1c]">Academic Calendar</h1>
          <p className="text-[13px] text-[#747780]">Manage semester periods and enrollment windows</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#03224d] text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-[#1f3864] transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span> New Period
        </button>
      </div>

      {/* Active period banner */}
      {(() => { const active = periods.find(p => p.isActive); return active ? (
        <div className="bg-gradient-to-r from-[#03224d] to-[#1f3864] rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#a0f3d4] text-[#002117] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                <span className="text-white/70 text-[12px]">{active.academicYear}</span>
              </div>
              <h2 className="text-[18px] font-black mb-1">{active.name}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Start', val: fmt(active.startDate), icon: 'calendar_today' },
                { label: 'Enrollment Open', val: fmt(active.enrollmentOpen), icon: 'how_to_reg' },
                { label: 'Enrollment Close', val: fmt(active.enrollmentClose), icon: 'event_busy' },
                { label: 'End', val: fmt(active.endDate), icon: 'event' },
              ].map(i => (
                <div key={i.label} className="text-center">
                  <span className="material-symbols-outlined text-[16px] text-white/60 block">{i.icon}</span>
                  <p className="text-[10px] text-white/60">{i.label}</p>
                  <p className="text-[12px] font-bold">{i.val}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Countdown */}
          {active.endDate && (() => {
            const daysLeft = Math.max(0, Math.ceil((new Date(active.endDate) - now) / (1000 * 60 * 60 * 24)))
            const total = Math.ceil((new Date(active.endDate) - new Date(active.startDate)) / (1000 * 60 * 60 * 24))
            const elapsed = total - daysLeft
            const pct = Math.min(100, Math.round((elapsed / total) * 100))
            return (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-white/70 mb-1">
                  <span>Semester progress</span><span>{daysLeft} days remaining</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full"><div className="h-2 bg-[#a0f3d4] rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
              </div>
            )
          })()}
        </div>
      ) : null })()}

      {/* Periods list */}
      {loading ? (
        <div className="text-center py-12 text-[#747780]">Loading…</div>
      ) : periods.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#c4c6d0]">
          <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-3">calendar_month</span>
          <p className="text-[14px] font-bold text-[#44474f]">No academic periods yet</p>
          <p className="text-[12px] text-[#9e9e9e]">Create your first period to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map(p => (
            <div key={p._id} className={`bg-white rounded-2xl border p-5 ${p.isActive ? 'border-[#03224d]' : 'border-[#c4c6d0]'}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {p.isActive && <span className="bg-[#d8e2ff] text-[#001a41] text-[10px] font-black px-2 py-0.5 rounded-full">ACTIVE</span>}
                  <div>
                    <h3 className="font-black text-[14px] text-[#1b1c1c]">{p.name}</h3>
                    <p className="text-[11px] text-[#747780]">{p.academicYear} — {p.semester}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!p.isActive && (
                    <button onClick={() => handleActivate(p._id)} disabled={activating === p._id}
                      className="text-[11px] font-bold px-3 py-1.5 bg-[#d8e2ff] text-[#001a41] rounded-lg hover:bg-[#03224d] hover:text-white transition-colors disabled:opacity-50">
                      {activating === p._id ? '…' : 'Activate'}
                    </button>
                  )}
                  <button onClick={() => openEdit(p)} className="p-1.5 text-[#747780] hover:bg-[#f6f3f2] rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(p._id)} className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
                {[
                  { label: 'Start', val: fmt(p.startDate) },
                  { label: 'End', val: fmt(p.endDate) },
                  { label: 'Enroll Open', val: fmt(p.enrollmentOpen) },
                  { label: 'Enroll Close', val: fmt(p.enrollmentClose) },
                ].map(i => (
                  <div key={i.label} className="bg-[#f6f3f2] rounded-xl px-3 py-2">
                    <p className="text-[10px] text-[#9e9e9e]">{i.label}</p>
                    <p className="text-[12px] font-bold text-[#1b1c1c]">{i.val}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#c4c6d0] flex items-center justify-between">
              <h2 className="font-black text-[16px] text-[#1b1c1c]">{editing ? 'Edit Period' : 'New Academic Period'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-[#f6f3f2] rounded-lg"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Period Name', key: 'name', placeholder: '2025/2026 – First Semester', type: 'text' },
                { label: 'Academic Year', key: 'academicYear', placeholder: '2025/2026', type: 'text' },
                { label: 'Semester', key: 'semester', placeholder: 'First Semester', type: 'text' },
                { label: 'Start Date', key: 'startDate', type: 'date' },
                { label: 'End Date', key: 'endDate', type: 'date' },
                { label: 'Enrollment Opens', key: 'enrollmentOpen', type: 'date' },
                { label: 'Enrollment Closes', key: 'enrollmentClose', type: 'date' },
                { label: 'Exam Start (optional)', key: 'examStart', type: 'date' },
                { label: 'Exam End (optional)', key: 'examEnd', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]" />
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-[#c4c6d0] flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[13px] font-bold text-[#44474f] hover:bg-[#f6f3f2] rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-[#03224d] text-white rounded-xl text-[13px] font-bold hover:bg-[#1f3864] transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Period'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
