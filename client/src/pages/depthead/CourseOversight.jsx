import { useEffect, useState } from 'react'
import { useUser } from '../../hooks/useUser'
import AppLayout from '../../components/layout/AppLayout'
import DataTable from '../../components/ui/DataTable'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function CourseOversight() {
  const { role: userRole } = useUser()
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'workload' | 'announcements' | 'enrollment'

  // Data states
  const [pendingCourses, setPendingCourses] = useState([])
  const [allCourses, setAllCourses] = useState([])
  const [workload, setWorkload] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals & Action states
  const [rejectingCourseId, setRejectingCourseId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [toast, setToast] = useState(null)

  // Form states: Announcements
  const [ancTitle, setAncTitle] = useState('')
  const [ancMessage, setAncMessage] = useState('')
  const [ancSending, setAncSending] = useState(false)

  // Form states: Enrollment
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [enrollAction, setEnrollAction] = useState('enroll')
  const [enrollSubmitting, setEnrollSubmitting] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadData() {
    setLoading(true)
    try {
      const [pRes, cRes, wRes, uRes] = await Promise.all([
        api.get('/departments/oversight/pending-courses'),
        api.get('/courses?dept=true'),
        api.get('/departments/oversight/workload'),
        api.get('/users?role=student'),
      ])
      setPendingCourses(pRes.data?.courses ?? [])
      setAllCourses(cRes.data?.courses ?? [])
      setWorkload(wRes.data?.workload ?? [])
      setStudents(uRes.data?.users ?? uRes.data ?? [])
    } catch (err) {
      setActionError('Failed to load department oversight data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Action: Approve Course
  async function handleApprove(id) {
    setActionError('')
    try {
      await api.patch(`/departments/oversight/courses/${id}/approval`, { approvalStatus: 'approved' })
      showToast('Course approved and activated!')
      loadData()
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to approve course.')
    }
  }

  // Action: Reject Course
  async function handleRejectSubmit() {
    if (!rejectingCourseId) return
    setActionError('')
    try {
      await api.patch(`/departments/oversight/courses/${rejectingCourseId}/approval`, {
        approvalStatus: 'rejected',
        rejectionReason,
      })
      showToast('Course request rejected.')
      setRejectingCourseId(null)
      setRejectionReason('')
      loadData()
    } catch (err) {
      setActionError(err.response?.data?.error ?? 'Failed to reject course.')
    }
  }

  // Action: Send Dept Announcement
  async function handleSendAnnouncement(e) {
    e.preventDefault()
    if (!ancMessage.trim() || ancSending) return
    setAncSending(true)
    try {
      const { data } = await api.post('/departments/oversight/announcements', {
        title: ancTitle || 'Department Announcement',
        message: ancMessage.trim(),
      })
      showToast(`Announcement published! Notified ${data.notifiedCount} department members.`)
      setAncTitle('')
      setAncMessage('')
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Failed to publish announcement', 'error')
    } finally {
      setAncSending(false)
    }
  }

  // Action: Manage Enrollment
  async function handleEnrollSubmit(e) {
    e.preventDefault()
    if (!selectedStudentId || !selectedCourseId || enrollSubmitting) return
    setEnrollSubmitting(true)
    try {
      const { data } = await api.post('/departments/oversight/enroll', {
        studentId: selectedStudentId,
        courseId: selectedCourseId,
        action: enrollAction,
      })
      showToast(data.message ?? 'Enrollment action completed.')
      loadData()
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Enrollment action failed', 'error')
    } finally {
      setEnrollSubmitting(false)
    }
  }

  return (
    <AppLayout role={userRole ?? 'dept_head'}>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-[13px] font-bold shadow-lg ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#086b53]'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Department Console</h2>
          <p className="text-[14px] text-[#44474f]">Approve courses, track lecturer workload, issue department announcements &amp; manage enrollments.</p>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-[#ffdad6] border border-[#ba1a1a] rounded-xl">
          <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">error</span>
          <p className="text-[13px] text-[#ba1a1a] font-medium">{actionError}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#c4c6d0] mb-6 overflow-x-auto">
        {[
          { key: 'pending', label: 'Course Approvals', badge: pendingCourses.length, icon: 'fact_check' },
          { key: 'workload', label: 'Lecturer Workload', icon: 'badge' },
          { key: 'announcements', label: 'Dept Announcements', icon: 'campaign' },
          { key: 'enrollment', label: 'Manage Enrollments', icon: 'how_to_reg' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-[13px] font-bold border-b-2 transition-colors shrink-0 ${
              activeTab === t.key ? 'border-[#03224d] text-[#03224d]' : 'border-transparent text-[#747780] hover:text-[#1b1c1c]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
            <span>{t.label}</span>
            {t.badge > 0 && (
              <span className="bg-[#ba1a1a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton type="table" count={6} />
      ) : (
        <>
          {/* TAB 1: Course Approvals */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#c4c6d0] bg-[#f6f3f2]">
                  <h3 className="font-black text-[14px] text-[#1b1c1c]">Pending Course Approvals</h3>
                  <p className="text-[11px] text-[#747780]">Courses submitted by lecturers requiring curriculum review.</p>
                </div>

                {pendingCourses.length === 0 ? (
                  <div className="p-12 text-center text-[#747780]">
                    <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">task_alt</span>
                    <p className="text-[14px] font-bold text-[#1b1c1c]">No pending course approvals</p>
                    <p className="text-[12px] text-[#9e9e9e] mt-0.5">All course requests in your department have been processed.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#c4c6d0]/40">
                    {pendingCourses.map(c => (
                      <div key={c._id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black bg-[#d8e2ff] text-[#001a41] px-2 py-0.5 rounded">{c.code}</span>
                            <h4 className="font-bold text-[14px] text-[#1b1c1c]">{c.title}</h4>
                          </div>
                          <p className="text-[12px] text-[#747780] mt-1">
                            Lecturer: <strong>{c.lecturerId?.fullName}</strong> ({c.lecturerId?.email}) · {c.creditHours} Credits
                          </p>
                          {c.description && <p className="text-[11px] text-[#9e9e9e] mt-0.5 line-clamp-1">{c.description}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(c._id)}
                            className="px-4 py-2 bg-[#086b53] text-white rounded-xl text-[12px] font-bold hover:bg-[#054837] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectingCourseId(c._id); setRejectionReason('') }}
                            className="px-4 py-2 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-[12px] font-bold hover:bg-[#ba1a1a] hover:text-white transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Department Courses List */}
              <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-xs mt-6">
                <div className="p-4 border-b border-[#c4c6d0] bg-[#f6f3f2]">
                  <h3 className="font-black text-[14px] text-[#1b1c1c]">All Department Courses ({allCourses.length})</h3>
                </div>
                <DataTable
                  columns={[
                    { key: 'code', label: 'Code' },
                    { key: 'title', label: 'Course Title' },
                    { key: 'lecturerName', label: 'Lecturer', render: v => v ?? '—' },
                    { key: 'semester', label: 'Semester' },
                    { key: 'enrollmentCount', label: 'Students', render: v => v ?? 0 },
                    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
                  ]}
                  rows={allCourses}
                  emptyMessage="No courses in your department yet."
                />
              </div>
            </div>
          )}

          {/* TAB 2: Lecturer Workload */}
          {activeTab === 'workload' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workload.length === 0 ? (
                <div className="col-span-full p-12 bg-white rounded-2xl border border-[#c4c6d0] text-center text-[#747780]">
                  No lecturers assigned to this department yet.
                </div>
              ) : (
                workload.map(w => (
                  <div key={w.lecturer._id} className="bg-white border border-[#c4c6d0] rounded-2xl p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#c4c6d0]/40 pb-3">
                      <div>
                        <h3 className="font-black text-[16px] text-[#1b1c1c]">{w.lecturer.fullName}</h3>
                        <p className="text-[12px] text-[#747780]">{w.lecturer.email}</p>
                      </div>
                      <span className="bg-[#d8e2ff] text-[#001a41] text-[11px] font-bold px-3 py-1 rounded-full">
                        {w.courseCount} Course{w.courseCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-[#f6f3f2] p-3 rounded-xl">
                        <span className="text-[10px] text-[#9e9e9e] font-bold uppercase block">Enrolled Students</span>
                        <span className="text-[18px] font-black text-[#03224d]">{w.enrolledStudents}</span>
                      </div>
                      <div className="bg-[#f6f3f2] p-3 rounded-xl">
                        <span className="text-[10px] text-[#9e9e9e] font-bold uppercase block">Total Assignments</span>
                        <span className="text-[18px] font-black text-[#086b53]">{w.totalAssignments}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#44474f] mb-2 uppercase">Assigned Courses:</p>
                      {w.courses.length === 0 ? (
                        <p className="text-[11px] text-[#9e9e9e]">No assigned courses</p>
                      ) : (
                        <div className="space-y-1.5">
                          {w.courses.map(c => (
                            <div key={c._id} className="flex items-center justify-between text-[12px] bg-[#fbf9f8] p-2 rounded-lg border border-[#c4c6d0]/30">
                              <span className="font-bold text-[#1b1c1c]">{c.code} — {c.title}</span>
                              <StatusBadge status={c.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Department Announcements */}
          {activeTab === 'announcements' && (
            <div className="max-w-2xl bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-black text-[16px] text-[#1b1c1c]">Publish Department-Wide Announcement</h3>
                <p className="text-[12px] text-[#747780]">Dispatches an announcement notification to all students and staff in your department.</p>
              </div>

              <form onSubmit={handleSendAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">Announcement Title</label>
                  <input
                    type="text"
                    value={ancTitle}
                    onChange={e => setAncTitle(e.target.value)}
                    placeholder="e.g. End of Semester Department Meeting / Project Guidelines"
                    className="w-full border border-[#c4c6d0] rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">Message Content *</label>
                  <textarea
                    value={ancMessage}
                    onChange={e => setAncMessage(e.target.value)}
                    rows={5}
                    placeholder="Type official department notice here…"
                    className="w-full border border-[#c4c6d0] rounded-xl p-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c] resize-y"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!ancMessage.trim() || ancSending}
                    className="px-6 py-2.5 bg-[#03224d] text-white rounded-xl font-bold text-[13px] hover:bg-[#1f3864] transition-colors disabled:opacity-40"
                  >
                    {ancSending ? 'Publishing…' : '📢 Broadcast Announcement'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Manage Enrollments */}
          {activeTab === 'enrollment' && (
            <div className="max-w-2xl bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-black text-[16px] text-[#1b1c1c]">Override Student Course Enrollment</h3>
                <p className="text-[12px] text-[#747780]">Department Head authority to forcibly enroll or remove a student from any course in your department.</p>
              </div>

              <form onSubmit={handleEnrollSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">Select Student *</label>
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]"
                  >
                    <option value="">Choose student…</option>
                    {students.map(s => (
                      <option key={s._id} value={s._id}>{s.fullName} ({s.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">Select Department Course *</label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]"
                  >
                    <option value="">Choose course…</option>
                    {allCourses.map(c => (
                      <option key={c._id} value={c._id}>{c.code} — {c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#44474f] mb-1">Action</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-[13px] font-bold text-[#1b1c1c]">
                      <input
                        type="radio"
                        name="enrollAction"
                        value="enroll"
                        checked={enrollAction === 'enroll'}
                        onChange={e => setEnrollAction(e.target.value)}
                        className="accent-[#03224d]"
                      />
                      Force Enroll Student
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[13px] font-bold text-[#ba1a1a]">
                      <input
                        type="radio"
                        name="enrollAction"
                        value="drop"
                        checked={enrollAction === 'drop'}
                        onChange={e => setEnrollAction(e.target.value)}
                        className="accent-[#ba1a1a]"
                      />
                      Remove / Drop Student
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!selectedStudentId || !selectedCourseId || enrollSubmitting}
                    className="px-6 py-2.5 bg-[#03224d] text-white rounded-xl font-bold text-[13px] hover:bg-[#1f3864] transition-colors disabled:opacity-40"
                  >
                    {enrollSubmitting ? 'Processing…' : 'Execute Enrollment Action'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Rejection Reason Modal */}
      {rejectingCourseId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setRejectingCourseId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-[16px] text-[#ba1a1a]">Reject Course Request</h3>
            <p className="text-[12px] text-[#747780]">Provide feedback to the lecturer explaining why this course request was rejected.</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="e.g. Incomplete syllabus / Duplicate course code"
              className="w-full border border-[#c4c6d0] rounded-xl p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]/20 text-[#1b1c1c]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setRejectingCourseId(null)} className="px-4 py-2 text-[13px] font-bold text-[#44474f] hover:bg-[#f6f3f2] rounded-xl">Cancel</button>
              <button onClick={handleRejectSubmit} className="px-5 py-2 bg-[#ba1a1a] text-white rounded-xl text-[13px] font-bold hover:bg-[#8c0000]">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
