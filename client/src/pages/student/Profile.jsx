import { useEffect, useState } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useUser } from '../../hooks/useUser'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const DEFAULT_SUBJECTS = [
  { subject: 'English Language', grade: 'C5' },
  { subject: 'Mathematics', grade: 'B3' },
  { subject: 'Biology', grade: 'C6' },
  { subject: 'Chemistry', grade: 'B2' },
  { subject: 'Physics', grade: 'C4' },
  { subject: 'Agricultural Science', grade: 'A1' },
]

export default function Profile() {
  const { user } = useClerkUser()
  const { dbUser } = useUser()
  const [enrollments, setEnrollments] = useState([])
  const [gpa, setGpa] = useState(null)
  const [wassce, setWassce] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modal State
  const [showWassceModal, setShowWassceModal] = useState(false)
  const [wassceForm, setWassceForm] = useState({
    indexNumber: '1040108922',
    examYear: 2024,
    examCenter: 'Albert Academy, Freetown',
    subjects: DEFAULT_SUBJECTS,
  })
  const [savingWassce, setSavingWassce] = useState(false)

  const name = user?.fullName ?? dbUser?.fullName ?? 'Student'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const joined = dbUser?.createdAt
    ? new Date(dbUser.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  const isStudent = dbUser?.role === 'student'

  useEffect(() => {
    if (!dbUser) return
    Promise.all([
      isStudent
        ? api.get('/courses?enrolled=true').catch(() => ({ data: { courses: [] } }))
        : Promise.resolve({ data: { courses: [] } }),
      isStudent
        ? api.get('/submissions/gpa').catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
      isStudent
        ? api.get('/wassce/me').catch(() => ({ data: { qualification: null } }))
        : Promise.resolve({ data: { qualification: null } }),
    ]).then(([cRes, gRes, wRes]) => {
      setEnrollments(cRes.data?.courses ?? [])
      setGpa(gRes.data)
      setWassce(wRes.data?.qualification ?? null)
      if (wRes.data?.qualification) {
        setWassceForm({
          indexNumber: wRes.data.qualification.indexNumber,
          examYear: wRes.data.qualification.examYear,
          examCenter: wRes.data.qualification.examCenter,
          subjects: wRes.data.qualification.subjects,
        })
      }
    }).finally(() => setLoading(false))
  }, [dbUser?.role])

  async function handleSaveWassce(e) {
    e.preventDefault()
    setSavingWassce(true)
    try {
      const res = await api.post('/wassce/save', wassceForm)
      setWassce(res.data.qualification)
      setShowWassceModal(false)
    } catch (err) {
      alert(err.response?.data?.error ?? 'Failed to save WASSCE results')
    } finally {
      setSavingWassce(false)
    }
  }

  const completedCount = enrollments.filter(c => c.status === 'completed' || (c.progress && c.progress >= 100)).length

  const gpaClass = (g) => {
    if (g >= 4.5) return 'text-[#086b53] bg-[#a0f3d4]'
    if (g >= 3.5) return 'text-[#001a73] bg-[#d8e2ff]'
    if (g >= 2.5) return 'text-[#5a3b00] bg-[#ffe8b5]'
    return 'text-[#93000a] bg-[#ffdad6]'
  }

  const gradeBadgeClass = (grade) => {
    if (['A1', 'B2', 'B3', 'C4', 'C5', 'C6'].includes(grade)) return 'bg-[#a0f3d4] text-[#00513e]'
    if (['D7', 'E8'].includes(grade)) return 'bg-[#ffe8b5] text-[#5a3b00]'
    return 'bg-[#ffdad6] text-[#93000a]'
  }

  return (
    <AppLayout role={dbUser?.role ?? 'student'}>
      <h2 className="text-[32px] font-semibold text-[#03224d] mb-6">My Profile</h2>

      <div className="grid grid-cols-12 gap-6">
        {/* Profile Card */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full border-4 border-[#1f3864] overflow-hidden mb-4 shadow-sm">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1f3864] flex items-center justify-center text-white text-3xl font-bold">
                  {name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="text-[20px] font-semibold text-[#03224d] mb-1">{name}</h3>
            <p className="text-[12px] font-bold text-[#086b53] uppercase tracking-wider mb-4">
              {dbUser?.role?.replace('_', ' ') ?? 'Student'}
            </p>

            {/* GPA Badge */}
            {gpa && gpa.cumulativeGpa > 0 && (
              <div className={`mx-auto w-fit px-4 py-2 rounded-xl text-[12px] font-bold mb-4 ${gpaClass(gpa.cumulativeGpa)}`}>
                <span className="text-[20px] font-extrabold block">{gpa.cumulativeGpa.toFixed(2)}</span>
                <span className="block">Cumulative GPA</span>
                <span className="block text-[10px] opacity-80 mt-0.5">{gpa.cumulativeClass}</span>
              </div>
            )}

            <div className="pt-4 border-t border-[#c4c6d0] text-left space-y-3">
              <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                <span className="material-symbols-outlined text-[18px] text-[#03224d]">mail</span>
                <span className="truncate">{email}</span>
              </div>
              {dbUser?.idNumber && (
                <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                  <span className="material-symbols-outlined text-[18px] text-[#03224d]">badge</span>
                  <span className="font-mono font-bold">{dbUser.idNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                <span className="material-symbols-outlined text-[18px] text-[#03224d]">calendar_today</span>
                <span>Joined {joined}</span>
              </div>
              {dbUser?.schoolId?.name && (
                <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                  <span className="material-symbols-outlined text-[18px] text-[#03224d]">account_balance</span>
                  <span>{dbUser.schoolId.name}</span>
                </div>
              )}
              {dbUser?.departmentId?.name && (
                <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                  <span className="material-symbols-outlined text-[18px] text-[#03224d]">business</span>
                  <span>{dbUser.departmentId.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact IT Support Direct Email Link */}
          <div className="bg-[#1f3864] text-white rounded-xl p-6">
            <h3 className="text-[16px] font-semibold mb-2">Need to update your profile?</h3>
            <p className="text-[13px] opacity-80 mb-4">Contact IT support to update your name, ID number, or department assignment.</p>
            <a
              href="mailto:support@njala.edu.sl?subject=NELMS%20Profile%20Update%20Request"
              className="inline-flex items-center gap-2 bg-white text-[#03224d] px-4 py-2 rounded-lg text-[12px] font-bold hover:bg-white/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">mail</span>
              support@njala.edu.sl
            </a>
          </div>
        </div>

        {/* Info Panels */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Account Info */}
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6">
            <h3 className="text-[18px] font-semibold text-[#03224d] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">person</span>
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', value: name },
                { label: 'Email Address', value: email },
                { label: 'Matric Number', value: dbUser?.idNumber || 'Not assigned' },
                { label: 'Role', value: dbUser?.role?.replace('_', ' ') ?? '—' },
                { label: 'Account Status', value: dbUser?.status ?? '—' },
                { label: 'Member Since', value: joined },
                { label: 'School', value: dbUser?.schoolId?.name ?? 'Not assigned' },
                { label: 'Department', value: dbUser?.departmentId?.name ?? 'Not assigned' },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 bg-[#f6f3f2] rounded-lg">
                  <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-[14px] text-[#1b1c1c] font-medium truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* WASSCE Entry Qualification Result Slip Card — students only */}
          {isStudent && (
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-[18px] font-semibold text-[#03224d] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-[#086b53]">workspace_premium</span>
                  WASSCE Entry Qualification
                </h3>
                <p className="text-[12px] text-[#44474f]">WAEC Senior School Certificate Examination Entry Record</p>
              </div>
              <button
                onClick={() => setShowWassceModal(true)}
                className="bg-[#03224d] text-white px-4 py-2 rounded-xl text-[12px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                {wassce ? 'Edit WASSCE Results' : 'Add WASSCE Results'}
              </button>
            </div>

            {!wassce ? (
              <div className="bg-[#f6f3f2] border border-dashed border-[#c4c6d0] rounded-xl p-6 text-center text-[#747780]">
                <span className="material-symbols-outlined text-4xl block mb-2 text-[#c4c6d0]">description</span>
                <p className="text-[14px] font-bold text-[#1b1c1c]">No WASSCE Record Entered</p>
                <p className="text-[12px] mt-1 mb-4">Click below to record your WAEC WASSCE examination results.</p>
                <button
                  onClick={() => setShowWassceModal(true)}
                  className="bg-[#086b53] text-white px-4 py-2 rounded-xl text-[12px] font-bold hover:opacity-90"
                >
                  Enter WASSCE Grades
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status Bar */}
                <div className="bg-[#f6f3f2] border border-[#c4c6d0]/60 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider">WAEC Index Number</p>
                    <p className="text-[16px] font-mono font-bold text-[#03224d]">{wassce.indexNumber} ({wassce.examYear})</p>
                    <p className="text-[12px] text-[#747780]">{wassce.examCenter}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider">Total Credits</p>
                      <p className="text-[20px] font-extrabold text-[#086b53]">{wassce.totalCredits} Credits</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      wassce.isDegreeEligible
                        ? 'bg-[#a0f3d4] text-[#00513e] border border-[#086b53]/40'
                        : 'bg-[#ffe8b5] text-[#5a3b00] border border-[#c8961a]/40'
                    }`}>
                      {wassce.isDegreeEligible ? '✓ Degree Entry Eligible' : '⚠️ Diploma / Certificate Entry'}
                    </span>
                  </div>
                </div>

                {/* Subject Table */}
                <div className="border border-[#c4c6d0] rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#03224d] text-white text-[12px] font-bold uppercase tracking-wider">
                        <th className="p-3">Subject</th>
                        <th className="p-3 text-center">Grade</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c4c6d0]/60 text-[13px]">
                      {wassce.subjects?.map((s, idx) => (
                        <tr key={idx} className="hover:bg-[#f6f3f2]">
                          <td className="p-3 font-medium text-[#1b1c1c]">{s.subject}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[12px] ${gradeBadgeClass(s.grade)}`}>
                              {s.grade}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold">
                            {s.isCredit ? (
                              <span className="text-[#086b53]">Credit ✓</span>
                            ) : (
                              <span className="text-[#ba1a1a]">Pass / Fail</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Enrolled Courses & Progress Bars */}
          {isStudent && (
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-semibold text-[#03224d] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">school</span>
                  Enrolled Courses
                </h3>
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#44474f]">
                  <span className="bg-[#d8e2ff] text-[#001a41] px-2.5 py-0.5 rounded-full">{enrollments.length} Enrolled</span>
                  <span className="bg-[#a0f3d4] text-[#00513e] px-2.5 py-0.5 rounded-full">{completedCount} Completed</span>
                </div>
              </div>

              {loading ? (
                <LoadingSkeleton type="card" count={3} />
              ) : enrollments.length === 0 ? (
                <p className="text-[14px] text-[#44474f] text-center py-6">No courses enrolled yet.</p>
              ) : (
                <div className="space-y-4">
                  {enrollments.map(c => {
                    const prog = Math.min(100, Math.max(0, c.progress ?? 0))
                    return (
                      <div key={c._id} className="p-4 bg-[#f6f3f2] rounded-xl border border-[#c4c6d0]/40 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#03224d] flex items-center justify-center text-white shrink-0">
                              <span className="material-symbols-outlined text-[18px]">menu_book</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#03224d] text-[14px] truncate">{c.title}</p>
                              <p className="text-[11px] text-[#44474f]">{c.code} • {c.semester}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${prog >= 100 ? 'bg-[#a0f3d4] text-[#00513e]' : 'bg-[#d8e2ff] text-[#001a41]'}`}>
                            {prog >= 100 ? 'Completed' : `${prog}% Progress`}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-[#c4c6d0]/30 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${prog >= 100 ? 'bg-[#086b53]' : 'bg-[#03224d]'}`}
                            style={{ width: `${prog}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* WASSCE Results Editor Modal */}
      {showWassceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowWassceModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-[#03224d] text-white flex items-center justify-between">
              <h3 className="font-bold text-[15px]">Record WASSCE Entry Qualification</h3>
              <button onClick={() => setShowWassceModal(false)} className="p-1 hover:bg-white/20 rounded-full text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveWassce} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Index Number</label>
                  <input
                    type="text"
                    required
                    value={wassceForm.indexNumber}
                    onChange={e => setWassceForm(p => ({ ...p, indexNumber: e.target.value }))}
                    className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] font-mono focus:outline-none focus:border-[#03224d]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Exam Year</label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={2030}
                    value={wassceForm.examYear}
                    onChange={e => setWassceForm(p => ({ ...p, examYear: Number(e.target.value) }))}
                    className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Exam Center / School Name</label>
                <input
                  type="text"
                  placeholder="e.g. Albert Academy, Freetown"
                  value={wassceForm.examCenter}
                  onChange={e => setWassceForm(p => ({ ...p, examCenter: e.target.value }))}
                  className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-2">Subject Grades (WASSCE Scale A1 – F9)</label>
                <div className="space-y-2">
                  {wassceForm.subjects.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Subject name"
                        value={sub.subject}
                        onChange={e => {
                          const val = e.target.value
                          setWassceForm(p => {
                            const updated = [...p.subjects]
                            updated[idx].subject = val
                            return { ...p, subjects: updated }
                          })
                        }}
                        className="flex-1 border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#03224d]"
                      />
                      <select
                        value={sub.grade}
                        onChange={e => {
                          const val = e.target.value
                          setWassceForm(p => {
                            const updated = [...p.subjects]
                            updated[idx].grade = val
                            return { ...p, subjects: updated }
                          })
                        }}
                        className="border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] font-bold focus:outline-none focus:border-[#03224d]"
                      >
                        {['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#c4c6d0] flex justify-end gap-3">
                <button type="button" onClick={() => setShowWassceModal(false)} className="px-4 py-2 border border-[#c4c6d0] rounded-xl text-[12px] font-bold text-[#44474f]">
                  Cancel
                </button>
                <button type="submit" disabled={savingWassce} className="bg-[#03224d] text-white px-5 py-2 rounded-xl text-[12px] font-bold hover:opacity-90 disabled:opacity-50">
                  {savingWassce ? 'Saving…' : 'Save WASSCE Qualification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
