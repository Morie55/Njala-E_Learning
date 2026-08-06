import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused']
const STATUS_STYLES = {
  present: 'bg-[#a0f3d4] text-[#00513e] border-[#086b53]',
  absent:  'bg-[#ffdad6] text-[#93000a] border-[#ba1a1a]',
  late:    'bg-[#ffe8b5] text-[#5a3b00] border-[#dd9235]',
  excused: 'bg-[#d8e2ff] text-[#001a73] border-[#1a4fd8]',
}

export default function AttendanceTracker() {
  const { courseId } = useParams()
  const [sessions, setSessions] = useState([])
  const [summary, setSummary] = useState([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sessions')
  const [creating, setCreating] = useState(false)
  const [newTopic, setNewTopic] = useState('')
  const [editingSession, setEditingSession] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [courseId])

  async function loadData() {
    setLoading(true)
    try {
      const [sRes, sumRes] = await Promise.all([
        api.get(`/attendance/course/${courseId}`),
        api.get(`/attendance/course/${courseId}/summary`),
      ])
      setSessions(sRes.data?.sessions ?? [])
      setSummary(sumRes.data?.summary ?? [])
      setTotalSessions(sumRes.data?.totalSessions ?? 0)
    } catch (e) {}
    setLoading(false)
  }

  async function handleCreateSession() {
    setSaving(true)
    try {
      const res = await api.post('/attendance', { courseId, topic: newTopic })
      setEditingSession({ ...res.data, isNew: true })
      setCreating(false)
      setNewTopic('')
      await loadData()
      setSuccess('Session created. Mark attendance below.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {}
    setSaving(false)
  }

  async function handleSaveSession() {
    if (!editingSession) return
    setSaving(true)
    try {
      await api.patch(`/attendance/${editingSession._id}`, { records: editingSession.records, topic: editingSession.topic })
      setEditingSession(null)
      await loadData()
      setSuccess('Attendance saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {}
    setSaving(false)
  }

  function toggleStatus(studentId, currentStatus) {
    const next = STATUS_OPTIONS[(STATUS_OPTIONS.indexOf(currentStatus) + 1) % STATUS_OPTIONS.length]
    setEditingSession(s => ({
      ...s,
      records: s.records.map(r => r.studentId === studentId || r.studentId?._id === studentId
        ? { ...r, status: next } : r)
    }))
  }

  function handleExportCSV() {
    const headers = ['Student Name', 'Present', 'Absent', 'Late', 'Excused', 'Attendance Rate (%)']
    const rows = summary.map(s => [
      `"${s.student?.fullName ?? ''}"`,
      s.present, s.absent, s.late, s.excused,
      s.attendanceRate
    ].join(','))
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const link = document.createElement('a')
    link.href = encodeURI(csv)
    link.download = `Attendance_Report.csv`
    link.click()
  }

  return (
    <AppLayout>
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">Attendance Tracker</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Attendance Tracker</h2>
          <p className="text-[14px] text-[#44474f]">{totalSessions} session{totalSessions !== 1 ? 's' : ''} recorded</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'summary' && summary.length > 0 && (
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2 border border-[#c4c6d0] text-[#03224d] font-bold text-[12px] hover:bg-[#f0eded] rounded-lg">
              <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
            </button>
          )}
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-[#03224d] text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>New Session
          </button>
        </div>
      </div>

      {/* New Session Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-[18px] font-bold text-[#03224d] mb-4">New Attendance Session</h3>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Session Topic (optional)</label>
            <input
              type="text"
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              placeholder="e.g. Introduction to Arrays"
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-[13px] font-bold text-[#44474f] hover:bg-[#f0eded] rounded-lg">Cancel</button>
              <button
                onClick={handleCreateSession}
                disabled={saving}
                className="px-4 py-2 bg-[#03224d] text-white text-[13px] font-bold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : null}
                Create & Mark Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-[#a0f3d4] border border-[#086b53] rounded-lg text-[13px] text-[#086b53] font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>{success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#c4c6d0]">
        {['sessions', 'summary'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[13px] font-bold capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-[#03224d] text-[#03224d]' : 'border-transparent text-[#44474f] hover:text-[#03224d]'}`}
          >
            {tab === 'sessions' ? 'Sessions' : 'Student Summary'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton type="table" count={5} /> : (
        <>
          {/* Sessions List */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="bg-white border border-[#c4c6d0] rounded-xl p-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">event_available</span>
                  <p className="text-[14px] text-[#44474f]">No attendance sessions yet. Create your first session above.</p>
                </div>
              ) : sessions.map(session => (
                <div key={session._id} className="bg-white border border-[#c4c6d0] rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-[#03224d] text-[15px]">
                        {session.topic || 'Untitled Session'}
                      </p>
                      <p className="text-[12px] text-[#44474f]">
                        {new Date(session.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        {' '}• {session.records?.length ?? 0} students
                      </p>
                      {/* Mini status summary */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {STATUS_OPTIONS.map(s => {
                          const count = session.records?.filter(r => r.status === s).length ?? 0
                          return count > 0 ? (
                            <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[s]}`}>
                              {count} {s}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingSession(session)}
                      className="shrink-0 px-3 py-1.5 border border-[#03224d] text-[#03224d] text-[12px] font-bold rounded-lg hover:bg-[#03224d]/5 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Student Summary */}
          {activeTab === 'summary' && (
            <div className="bg-white border border-[#c4c6d0] rounded-xl overflow-hidden shadow-sm">
              {summary.length === 0 ? (
                <div className="p-12 text-center text-[#44474f]">
                  <p className="text-[14px]">No attendance data yet. Create sessions first.</p>
                </div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#f6f3f2] border-b border-[#c4c6d0] text-[11px] font-bold text-[#44474f] uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Student</th>
                      <th className="text-center px-3 py-3">Present</th>
                      <th className="text-center px-3 py-3">Late</th>
                      <th className="text-center px-3 py-3">Excused</th>
                      <th className="text-center px-3 py-3">Absent</th>
                      <th className="text-left px-4 py-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4c6d0]/40">
                    {summary.map(s => (
                      <tr key={s.student?._id} className="hover:bg-[#fbf9f8]">
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#03224d]">{s.student?.fullName}</p>
                          <p className="text-[11px] text-[#747780]">{s.student?.idNumber}</p>
                        </td>
                        <td className="text-center px-3 py-3 font-bold text-[#086b53]">{s.present}</td>
                        <td className="text-center px-3 py-3 font-bold text-[#dd9235]">{s.late}</td>
                        <td className="text-center px-3 py-3 font-bold text-[#1a4fd8]">{s.excused}</td>
                        <td className="text-center px-3 py-3 font-bold text-[#ba1a1a]">{s.absent}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#f0eded] rounded-full h-2 max-w-[80px]">
                              <div
                                className={`h-2 rounded-full transition-all ${s.attendanceRate >= 75 ? 'bg-[#086b53]' : 'bg-[#ba1a1a]'}`}
                                style={{ width: `${s.attendanceRate}%` }}
                              />
                            </div>
                            <span className={`text-[12px] font-bold ${s.belowThreshold ? 'text-[#ba1a1a]' : 'text-[#086b53]'}`}>
                              {s.attendanceRate}%
                            </span>
                            {s.belowThreshold && (
                              <span className="material-symbols-outlined text-[#ba1a1a] text-[14px]" title="Below 75% threshold">warning</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl my-4">
            <div className="p-5 bg-[#03224d] text-white rounded-t-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[15px]">{editingSession.topic || 'Mark Attendance'}</h3>
                <p className="text-[12px] opacity-75">{new Date(editingSession.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
              </div>
              <button onClick={() => setEditingSession(null)} className="p-1 hover:bg-white/10 rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 text-[12px] text-[#44474f] bg-[#f6f3f2] border-b border-[#c4c6d0]">
              <strong>Tip:</strong> Click the status chip to cycle through: Present → Absent → Late → Excused
            </div>

            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {editingSession.records?.map((record, idx) => {
                const sid = record.studentId?._id ?? record.studentId
                const name = record.studentId?.fullName ?? `Student ${idx + 1}`
                return (
                  <div key={sid ?? idx} className="flex items-center justify-between p-3 bg-[#fbf9f8] rounded-lg border border-[#c4c6d0]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1f3864] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                        {name[0]?.toUpperCase()}
                      </div>
                      <span className="text-[13px] font-medium text-[#1b1c1c]">{name}</span>
                    </div>
                    <button
                      onClick={() => toggleStatus(sid, record.status)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${STATUS_STYLES[record.status]}`}
                    >
                      {record.status}
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="p-4 border-t border-[#c4c6d0] flex justify-end gap-2">
              <button onClick={() => setEditingSession(null)} className="px-4 py-2 text-[13px] font-bold text-[#44474f] hover:bg-[#f0eded] rounded-lg">Cancel</button>
              <button
                onClick={handleSaveSession}
                disabled={saving}
                className="px-5 py-2 bg-[#086b53] text-white text-[13px] font-bold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : <span className="material-symbols-outlined text-[16px]">save</span>}
                Save Attendance
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
