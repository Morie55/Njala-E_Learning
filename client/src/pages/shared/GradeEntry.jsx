import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { calculateGrade } from '../../utils/grading'
import { useUser } from '../../hooks/useUser'

export default function GradeEntry() {
  const { role } = useUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const courseIdParam = searchParams.get('courseId') || ''
  const assignmentIdParam = searchParams.get('assignmentId') || ''

  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(courseIdParam)
  const [selectedAssignment, setSelectedAssignment] = useState(assignmentIdParam)
  const [submissions, setSubmissions] = useState([])
  const [assignmentDetails, setAssignmentDetails] = useState(null)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)

  /* Grade form state */
  const [scores, setScores] = useState({})
  const [feedbacks, setFeedbacks] = useState({})
  const [saving, setSaving] = useState({})
  const [savedSuccess, setSavedSuccess] = useState({})
  const [batchSaving, setBatchSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'graded'

  // File preview modal state
  const [previewModal, setPreviewModal] = useState(null)

  /* Load courses on mount */
  useEffect(() => {
    const endpoint = role === 'admin' ? '/courses' : '/courses?owned=true'
    api.get(endpoint)
      .then(res => {
        setCourses(res.data?.courses ?? [])
      })
      .catch(() => {})
      .finally(() => setLoadingCourses(false))
  }, [role])

  /* Load assignments when course is selected */
  useEffect(() => {
    if (!selectedCourse) {
      setAssignments([])
      setSelectedAssignment('')
      setSubmissions([])
      setAssignmentDetails(null)
      return
    }

    setLoadingAssignments(true)
    api.get(`/courses/${selectedCourse}/assignments`)
      .then(res => {
        const list = res.data?.assignments ?? []
        setAssignments(list)
        if (list.length > 0 && !selectedAssignment) {
          setSelectedAssignment(list[0]._id)
        }
      })
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssignments(false))
  }, [selectedCourse])

  /* Load submissions when assignment is selected */
  useEffect(() => {
    if (!selectedAssignment) {
      setSubmissions([])
      setAssignmentDetails(null)
      return
    }

    setLoadingSubmissions(true)
    api.get(`/assignments/${selectedAssignment}/submissions`)
      .then(res => {
        const subs = res.data?.submissions ?? []
        const asg = res.data?.assignment ?? null
        setSubmissions(subs)
        setAssignmentDetails(asg)

        // Initialize local inputs
        const initScores = {}
        const initFeedbacks = {}
        subs.forEach(s => {
          initScores[s._id] = s.score ?? ''
          initFeedbacks[s._id] = s.feedback ?? ''
        })
        setScores(initScores)
        setFeedbacks(initFeedbacks)
      })
      .catch(err => {
        setError(err.response?.data?.error ?? 'Failed to load assignment submissions.')
      })
      .finally(() => setLoadingSubmissions(false))
  }, [selectedAssignment])

  /* Handle course selector change */
  const handleCourseChange = (cId) => {
    setSelectedCourse(cId)
    setSelectedAssignment('')
    setSearchParams(cId ? { courseId: cId } : {})
  }

  /* Handle assignment selector change */
  const handleAssignmentChange = (aId) => {
    setSelectedAssignment(aId)
    setSearchParams(selectedCourse ? { courseId: selectedCourse, assignmentId: aId } : {})
  }

  /* Save single grade */
  async function handleSaveGrade(subId) {
    setSaving(prev => ({ ...prev, [subId]: true }))
    setSavedSuccess(prev => ({ ...prev, [subId]: false }))
    setError('')

    try {
      const scoreVal = Number(scores[subId])
      const feedbackVal = feedbacks[subId] ?? ''

      const res = await api.patch(`/submissions/${subId}/grade`, {
        score: scoreVal,
        feedback: feedbackVal,
      })

      setSubmissions(prev => prev.map(s => s._id === subId ? { ...s, score: res.data.score, finalScore: res.data.finalScore, feedback: res.data.feedback } : s))
      setSavedSuccess(prev => ({ ...prev, [subId]: true }))
      setTimeout(() => setSavedSuccess(prev => ({ ...prev, [subId]: false })), 3000)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to save grade for submission.')
    } finally {
      setSaving(prev => ({ ...prev, [subId]: false }))
    }
  }

  /* Save all modified grades in batch */
  async function handleSaveAllGrades() {
    setBatchSaving(true)
    setError('')
    try {
      const promises = submissions.map(s => {
        const currentScore = scores[s._id]
        if (currentScore !== '' && currentScore !== null && currentScore !== undefined) {
          return api.patch(`/submissions/${s._id}/grade`, {
            score: Number(currentScore),
            feedback: feedbacks[s._id] ?? '',
          })
        }
        return Promise.resolve(null)
      })

      await Promise.all(promises)

      // Refresh list
      const res = await api.get(`/assignments/${selectedAssignment}/submissions`)
      setSubmissions(res.data?.submissions ?? [])
      alert('All entered grades saved successfully!')
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to save batch grades.')
    } finally {
      setBatchSaving(false)
    }
  }

  /* Export CSV Gradebook */
  function handleExportCSV() {
    if (!submissions.length || !assignmentDetails) return
    const headers = ['Student Name', 'Student ID', 'Email', 'Submitted At', 'Is Late', 'Days Late', 'Score', 'Max Score', 'Percentage', 'Letter Grade', 'Grade Point', 'Classification', 'Feedback']
    const rows = submissions.map(s => {
      const g = calculateGrade(s.score, assignmentDetails.maxScore)
      return [
        `"${s.studentName || ''}"`,
        `"${s.studentId?.idNumber || ''}"`,
        `"${s.studentEmail || ''}"`,
        `"${new Date(s.submittedAt).toLocaleString()}"`,
        s.isLate ? 'Yes' : 'No',
        s.daysLate || 0,
        s.score !== null && s.score !== undefined ? s.score : '',
        assignmentDetails.maxScore || '',
        s.score !== null && s.score !== undefined ? `${g.percentage}%` : '',
        g.letterGrade,
        g.gradePoint,
        g.classification,
        `"${(s.feedback || '').replace(/"/g, '""')}"`
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Gradebook_${(assignmentDetails.title || 'Assignment').replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtered submissions list
  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = !search ||
      s.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentEmail?.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId?.idNumber?.toLowerCase().includes(search.toLowerCase())

    const isGraded = s.score !== null && s.score !== undefined
    if (filterStatus === 'graded') return matchesSearch && isGraded
    if (filterStatus === 'pending') return matchesSearch && !isGraded
    return matchesSearch
  })

  // Quick stats
  const totalCount = submissions.length
  const gradedCount = submissions.filter(s => s.score !== null && s.score !== undefined).length
  const pendingCount = totalCount - gradedCount
  const maxScore = assignmentDetails?.maxScore || 100
  const gradedScores = submissions.filter(s => s.score !== null).map(s => (s.score / maxScore) * 100)
  const avgPct = gradedScores.length ? Math.round(gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length) : null
  const passCount = submissions.filter(s => s.score !== null && (s.score / maxScore) >= 0.4).length
  const passRate = gradedCount > 0 ? Math.round((passCount / gradedCount) * 100) : null

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[#086b53] mb-1">
            <span className="material-symbols-outlined text-[26px]">edit_square</span>
            <h2 className="text-[28px] sm:text-[32px] font-semibold text-[#03224d]">Dedicated Grade Entry Console</h2>
          </div>
          <p className="text-[14px] text-[#44474f]">
            Centralized portal for entering marks, calculating Sierra Leone 5.0 GPA points, and updating course gradebooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAllGrades}
            disabled={batchSaving || !submissions.length}
            className="px-5 py-2.5 bg-[#086b53] text-white font-bold text-[13px] rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${batchSaving ? 'animate-spin' : ''}`}>
              {batchSaving ? 'progress_activity' : 'save_as'}
            </span>
            {batchSaving ? 'Saving All…' : 'Save All Grades'}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!submissions.length}
            className="px-4 py-2.5 border border-[#03224d] text-[#03224d] font-bold text-[13px] rounded-xl hover:bg-[#03224d] hover:text-white transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Selector & Filter Strip */}
      <div className="bg-white border border-[#c4c6d0] rounded-2xl p-5 mb-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Course Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
              1. Select Course Target *
            </label>
            <select
              value={selectedCourse}
              onChange={e => handleCourseChange(e.target.value)}
              disabled={loadingCourses}
              className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[14px] bg-white font-semibold text-[#03224d] focus:outline-none focus:border-[#03224d]"
            >
              <option value="">— Select Course —</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>
                  {c.code}: {c.title} ({c.departmentName || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
              2. Select Assignment / Assessment Task *
            </label>
            <select
              value={selectedAssignment}
              onChange={e => handleAssignmentChange(e.target.value)}
              disabled={!selectedCourse || loadingAssignments}
              className="w-full border border-[#c4c6d0] rounded-xl px-3.5 py-2.5 text-[14px] bg-white font-semibold text-[#03224d] focus:outline-none focus:border-[#03224d] disabled:opacity-50"
            >
              <option value="">— Select Assignment —</option>
              {assignments.map(a => (
                <option key={a._id} value={a._id}>
                  {a.title} (Max score: {a.maxScore} pts)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Status Filter */}
        {selectedAssignment && (
          <div className="pt-3 border-t border-[#c4c6d0]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#44474f] text-[18px]">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student name, email, ID..."
                className="w-full pl-9 pr-3 py-2 border border-[#c4c6d0] rounded-xl text-[13px] focus:outline-none focus:border-[#03224d] bg-[#fbf9f8]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {[
                { id: 'all', label: `All (${totalCount})` },
                { id: 'pending', label: `Pending (${pendingCount})` },
                { id: 'graded', label: `Graded (${gradedCount})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                    filterStatus === f.id ? 'bg-[#03224d] text-white' : 'bg-[#f0eded] text-[#44474f] hover:bg-[#e4e2e1]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#ffdad6] border border-[#ba1a1a] text-[#ba1a1a] rounded-xl text-[13px] flex items-center gap-2 font-medium">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats summary */}
      {selectedAssignment && assignmentDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Submissions', val: totalCount, color: 'text-[#03224d]', bg: 'bg-[#d8e2ff]/30' },
            { label: 'Graded', val: gradedCount, color: 'text-[#086b53]', bg: 'bg-[#a0f3d4]/30' },
            { label: 'Pending', val: pendingCount, color: 'text-[#dd9235]', bg: 'bg-[#ffdcbb]/30' },
            { label: 'Class Average', val: avgPct !== null ? `${avgPct}%` : '—', color: 'text-[#03224d]', bg: 'bg-[#d8e2ff]/30' },
            { label: 'Pass Rate (>=40%)', val: passRate !== null ? `${passRate}%` : '—', color: 'text-[#086b53]', bg: 'bg-[#a0f3d4]/30' },
          ].map((k, i) => (
            <div key={i} className={`p-4 rounded-xl border border-[#c4c6d0] ${k.bg}`}>
              <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">{k.label}</p>
              <p className={`text-[22px] font-extrabold ${k.color}`}>{k.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Submissions Grade Entry Table */}
      {!selectedCourse ? (
        <div className="bg-white border border-[#c4c6d0] rounded-2xl p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-[#c4c6d0] block mb-3">edit_note</span>
          <h3 className="text-[18px] font-bold text-[#03224d] mb-1">Select a Course to Begin Grade Entry</h3>
          <p className="text-[13px] text-[#44474f]">Choose a course and assessment task from the dropdowns above to start evaluating submissions.</p>
        </div>
      ) : loadingSubmissions ? (
        <LoadingSkeleton type="table" count={5} />
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white border border-[#c4c6d0] rounded-2xl p-12 text-center shadow-sm">
          <span className="material-symbols-outlined text-[40px] text-[#c4c6d0] block mb-2">assignment_turned_in</span>
          <p className="text-[14px] text-[#44474f] font-medium">No submissions found matching your search and filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((s) => {
            const currentScore = scores[s._id]
            const max = assignmentDetails?.maxScore || 100
            const previewGrade = currentScore !== '' && currentScore !== null && currentScore !== undefined
              ? calculateGrade(currentScore, max)
              : null

            return (
              <div key={s._id} className="bg-white border border-[#c4c6d0] rounded-2xl p-5 shadow-sm hover:border-[#747780] transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Student Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#03224d] text-white font-bold text-[14px] flex items-center justify-center shrink-0">
                      {s.studentName?.[0]?.toUpperCase() ?? 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-[15px] text-[#03224d] truncate">{s.studentName}</p>
                        {s.isLate && (
                          <span className="bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            Submitted {s.daysLate || 1} day(s) late
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#44474f]">{s.studentEmail} {s.studentId?.idNumber ? `• ID: ${s.studentId.idNumber}` : ''}</p>
                      <p className="text-[11px] text-[#747780] mt-0.5">
                        Submitted: {new Date(s.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {/* File preview button */}
                      {s.fileUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewModal({ url: s.fileUrl, studentName: s.studentName })}
                            className="px-2.5 py-1 bg-[#f0eded] text-[#03224d] rounded-md text-[11px] font-bold hover:bg-[#e4e2e1] flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">visibility</span>Preview File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Grade Input Box */}
                  <div className="bg-[#fbf9f8] border border-[#c4c6d0] rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    <div>
                      <label className="block text-[10px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                        Score (Max {max})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={scores[s._id] ?? ''}
                        onChange={e => setScores(p => ({ ...p, [s._id]: e.target.value }))}
                        placeholder="--"
                        className="w-24 border border-[#c4c6d0] rounded-lg px-3 py-2 text-[14px] font-bold text-[#03224d] bg-white focus:outline-none focus:border-[#03224d]"
                      />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                        Feedback
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Good analytical effort..."
                        value={feedbacks[s._id] ?? ''}
                        onChange={e => setFeedbacks(p => ({ ...p, [s._id]: e.target.value }))}
                        className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-4 sm:pt-0">
                      {/* Grade Badge Preview */}
                      {previewGrade && (
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${previewGrade.badgeColor} shrink-0`}>
                          Grade {previewGrade.letterGrade} ({previewGrade.percentage}%)
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSaveGrade(s._id)}
                        disabled={saving[s._id] || scores[s._id] === ''}
                        className="bg-[#086b53] text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 shadow-sm shrink-0"
                      >
                        {saving[s._id] ? (
                          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[16px]">save</span>
                        )}
                        {s.score !== null ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>

                {savedSuccess[s._id] && (
                  <p className="text-[12px] text-[#086b53] font-bold mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    Grade saved and notification sent to student!
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* File Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-[#03224d] text-white flex items-center justify-between">
              <h3 className="font-bold text-[15px]">Submission File — {previewModal.studentName}</h3>
              <button onClick={() => setPreviewModal(null)} className="p-1 hover:bg-white/20 rounded-full text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 p-3 bg-[#f0eded] overflow-auto flex justify-center items-center">
              <iframe src={previewModal.url} title="Solution Preview" className="w-full h-[75vh] border-0 rounded bg-white" />
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
