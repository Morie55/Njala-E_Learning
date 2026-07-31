import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { calculateGrade } from '../../utils/grading'

export default function GradeSubmissions() {
  const { id: assignmentId } = useParams()
  const [submissions, setSubmissions] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [savedSuccess, setSavedSuccess] = useState({})
  const [feedback, setFeedback] = useState({})
  const [scores, setScores] = useState({})
  const [gradeError, setGradeError] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [previewModal, setPreviewModal] = useState(null)
  const [plagiarismModal, setPlagiarismModal] = useState(null)
  const [scanningPlagiarism, setScanningPlagiarism] = useState({})
  const [batchScanning, setBatchScanning] = useState(false)
  const [page, setPage] = useState(1)

  const fetchSubmissions = () => {
    api.get(`/assignments/${assignmentId}/submissions`)
      .then(r => {
        setSubmissions(r.data?.submissions ?? [])
        setAssignment(r.data?.assignment ?? null)
        const init = {}; const finit = {}
        r.data?.submissions?.forEach(s => { init[s._id] = s.score ?? ''; finit[s._id] = s.feedback ?? '' })
        setScores(init); setFeedback(finit)
      }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSubmissions()
  }, [assignmentId])

  async function handleScanPlagiarism(subId) {
    setScanningPlagiarism(p => ({ ...p, [subId]: true }))
    try {
      const res = await api.post(`/submissions/${subId}/check-plagiarism`)
      setSubmissions(prev => prev.map(s => s._id === subId ? {
        ...s,
        plagiarismScore: res.data.plagiarismScore,
        plagiarismStatus: res.data.plagiarismStatus,
        plagiarismMatches: res.data.matches,
      } : s))
    } catch (err) {
      alert(err.response?.data?.error ?? 'Plagiarism scan failed')
    } finally {
      setScanningPlagiarism(p => ({ ...p, [subId]: false }))
    }
  }

  async function handleBatchPlagiarism() {
    setBatchScanning(true)
    try {
      await api.post(`/assignments/${assignmentId}/check-all-plagiarism`)
      fetchSubmissions()
    } catch (err) {
      alert(err.response?.data?.error ?? 'Batch plagiarism scan failed')
    } finally {
      setBatchScanning(false)
    }
  }

  async function handleGrade(id) {
    setSaving(p => ({ ...p, [id]: true }))
    setGradeError(p => ({ ...p, [id]: '' }))
    setSavedSuccess(p => ({ ...p, [id]: false }))
    try {
      await api.patch(`/submissions/${id}/grade`, { score: Number(scores[id]), feedback: feedback[id] })
      setSubmissions(prev => prev.map(s => s._id === id ? { ...s, score: Number(scores[id]), feedback: feedback[id] } : s))
      setSavedSuccess(p => ({ ...p, [id]: true }))
      setTimeout(() => setSavedSuccess(p => ({ ...p, [id]: false })), 3000)
    } catch (err) {
      const msg = err.response?.data?.error ?? err.message ?? 'Failed to save grade.'
      setGradeError(p => ({ ...p, [id]: msg }))
    }
    setSaving(p => ({ ...p, [id]: false }))
  }

  function handleExportCSV() {
    if (!submissions || submissions.length === 0) return
    const headers = ['Student Name', 'Email', 'Submitted At', 'Is Late', 'Days Late', 'Score', 'Max Score', 'Percentage', 'Letter Grade', 'Grade Point', 'Classification', 'Feedback']
    const rows = submissions.map(s => {
      const g = calculateGrade(s.score, assignment?.maxScore)
      return [
        `"${s.studentName || ''}"`,
        `"${s.studentEmail || ''}"`,
        `"${new Date(s.submittedAt).toLocaleString()}"`,
        s.isLate ? 'Yes' : 'No',
        s.daysLate || 0,
        s.score !== null && s.score !== undefined ? s.score : '',
        assignment?.maxScore || '',
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
    link.setAttribute('download', `Grades_${(assignment?.title || 'Assignment').replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function getFileIcon(url) {
    if (!url) return 'attach_file'
    const ext = url.split('.').pop().split('?')[0].toLowerCase()
    if (['pdf'].includes(ext)) return 'picture_as_pdf'
    if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'description'
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image'
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'folder_zip'
    if (['ppt', 'pptx'].includes(ext)) return 'slideshow'
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'table_chart'
    return 'attach_file'
  }

  function getFileName(url) {
    if (!url) return 'Submitted Solution'
    try {
      const parts = url.split('/')
      const last = parts[parts.length - 1].split('?')[0]
      return decodeURIComponent(last) || 'Submitted Solution'
    } catch {
      return 'Submitted Solution'
    }
  }

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    const isGraded = s.score !== null && s.score !== undefined
    if (filterStatus === 'graded') return matchesSearch && isGraded
    if (filterStatus === 'pending') return matchesSearch && !isGraded
    return matchesSearch
  })

  const gradedCount = submissions.filter(s => s.score !== null && s.score !== undefined).length
  const pendingCount = submissions.length - gradedCount

  return (
    <AppLayout role="lecturer">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">Grade Submissions — {assignment?.title ?? '…'}</span>
      </nav>

      {/* Header & Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d] mb-1">Grade Submissions</h2>
          <p className="text-[14px] text-[#44474f]">
            {assignment?.title} • Max score: <span className="font-bold text-[#03224d]">{assignment?.maxScore}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleBatchPlagiarism}
            disabled={batchScanning || submissions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#03224d] text-white font-bold text-[12px] hover:opacity-90 transition-all rounded-lg disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">{batchScanning ? 'progress_activity' : 'find_in_page'}</span>
            {batchScanning ? 'Scanning All...' : 'Scan All Plagiarism'}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 border border-[#c4c6d0] text-[#03224d] font-bold text-[12px] hover:bg-[#f0eded] transition-all rounded-lg disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
          <span className="inline-flex items-center gap-1.5 bg-[#a0f3d4] text-[#00513e] px-3 py-2 rounded-lg text-[12px] font-bold">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            {gradedCount} Graded
          </span>
          <span className="inline-flex items-center gap-1.5 bg-[#ffdad6] text-[#93000a] px-3 py-2 rounded-lg text-[12px] font-bold">
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            {pendingCount} Pending
          </span>
        </div>
      </div>


      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#c4c6d0] rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center bg-[#f6f3f2] rounded-lg px-3 py-2 border border-[#c4c6d0] w-full sm:w-80 focus-within:border-[#03224d] transition-all">
          <span className="material-symbols-outlined text-[#44474f] mr-2 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1b1c1c] placeholder-[#747780]"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-[#747780] hover:text-[#1b1c1c]">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-colors ${filterStatus === 'all' ? 'bg-[#03224d] text-white' : 'bg-[#f0eded] text-[#44474f] hover:bg-[#e4e2e1]'}`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-colors ${filterStatus === 'pending' ? 'bg-[#03224d] text-white' : 'bg-[#f0eded] text-[#44474f] hover:bg-[#e4e2e1]'}`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('graded')}
            className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-colors ${filterStatus === 'graded' ? 'bg-[#03224d] text-white' : 'bg-[#f0eded] text-[#44474f] hover:bg-[#e4e2e1]'}`}
          >
            Graded ({gradedCount})
          </button>
        </div>
      </div>

      {loading ? <LoadingSkeleton type="table" count={5} /> : (
        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">assignment_turned_in</span>
              <p className="text-[14px] text-[#44474f] font-medium">
                {submissions.length === 0 ? 'No submissions yet for this assignment.' : 'No submissions match your search or filter.'}
              </p>
            </div>
          ) : filteredSubmissions.slice((page - 1) * 10, page * 10).map(s => (
            <div key={s._id} className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-sm transition-all hover:border-[#747780]">
              <div className="flex items-start gap-4">
                {/* Student avatar */}
                <div className="w-11 h-11 rounded-full bg-[#1f3864] flex items-center justify-center text-white font-bold text-[16px] shrink-0 shadow-sm">
                  {s.studentName?.[0]?.toUpperCase() ?? 'S'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] font-bold text-[#03224d]">{s.studentName}</p>
                          {s.isLate && (
                            <span className="bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              Submitted {s.daysLate || 1} {s.daysLate === 1 ? 'day' : 'days'} late
                            </span>
                          )}

                          {/* Plagiarism Similarity Badge */}
                          {s.plagiarismScore !== null && s.plagiarismScore !== undefined && (
                            <button
                              type="button"
                              onClick={() => setPlagiarismModal({ sub: s })}
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 ${
                                s.plagiarismScore >= 25
                                  ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30'
                                  : 'bg-[#a0f3d4] text-[#00513e] border border-[#086b53]/30'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[12px]">{s.plagiarismScore >= 25 ? 'warning' : 'verified'}</span>
                              Similarity: {s.plagiarismScore}% {s.plagiarismScore >= 25 ? '(FLAGGED)' : ''}
                            </button>
                          )}
                        </div>
                        {s.studentEmail && (
                          <p className="text-[12px] text-[#44474f]">{s.studentEmail}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleScanPlagiarism(s._id)}
                          disabled={scanningPlagiarism[s._id]}
                          className="px-3 py-1 bg-[#f0eded] text-[#03224d] rounded border border-[#c4c6d0] text-[11px] font-bold hover:bg-[#e4e2e1] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {scanningPlagiarism[s._id] ? 'progress_activity' : 'search_check'}
                          </span>
                          {scanningPlagiarism[s._id] ? 'Scanning...' : 'Scan Plagiarism'}
                        </button>
                        <p className="text-[12px] text-[#44474f]">
                          Submitted: {new Date(s.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                  {/* Online Text Submission Content */}
                  {s.textContent && (
                    <div className="mb-4 bg-[#f0f3ff] border border-[#7c9bd6]/40 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2 text-[#03224d]">
                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                        <h4 className="font-bold text-[13px] uppercase tracking-wider">Online Text Response</h4>
                      </div>
                      <div className="text-[13px] text-[#1b1c1c] whitespace-pre-wrap leading-relaxed font-mono bg-white p-3.5 rounded-lg border border-[#c4c6d0]/40">
                        {s.textContent}
                      </div>
                    </div>
                  )}

                  {/* Submission Attachment Box */}
                  {s.fileUrl ? (
                    <div className="mb-4 bg-[#f6f3f2] border border-[#c4c6d0] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#a0f3d4]/40 flex items-center justify-center text-[#086b53] shrink-0">
                          <span className="material-symbols-outlined text-[22px]">
                            {getFileIcon(s.fileUrl)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#03224d] truncate">
                            {getFileName(s.fileUrl)}
                          </p>
                          <p className="text-[11px] text-[#44474f]">
                            Student Submitted Solution File
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewModal({ url: s.fileUrl, studentName: s.studentName })}
                          className="px-3 py-1.5 bg-[#03224d] text-white rounded text-[12px] font-bold hover:opacity-90 transition-opacity flex items-center gap-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Preview
                        </button>
                        <a
                          href={s.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 border border-[#086b53] text-[#086b53] rounded text-[12px] font-bold hover:bg-[#a0f3d4]/30 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                          View / Download
                        </a>
                      </div>
                    </div>
                  ) : !s.textContent ? (
                    <div className="mb-4 p-3 bg-[#f6f3f2] border border-dashed border-[#c4c6d0] rounded-lg flex items-center gap-2 text-[#747780] text-[12px]">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      <span>No file solution or text content attached with this submission.</span>
                    </div>
                  ) : null}

                  {/* Grading Inputs Form */}
                  <div className="bg-[#fbf9f8] border border-[#c4c6d0] rounded-lg p-4">
                    <div className="flex flex-wrap gap-4 items-end mb-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                          Score (Max: {assignment?.maxScore})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={assignment?.maxScore}
                          value={scores[s._id] ?? ''}
                          onChange={e => setScores(p => ({ ...p, [s._id]: e.target.value }))}
                          placeholder="--"
                          className="w-28 border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] font-bold text-[#03224d] focus:outline-none focus:border-[#03224d] bg-white"
                        />
                      </div>
                      <div className="flex-1 min-w-[220px]">
                        <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
                          Feedback (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Excellent presentation, good work..."
                          value={feedback[s._id] ?? ''}
                          onChange={e => setFeedback(p => ({ ...p, [s._id]: e.target.value }))}
                          className="w-full border border-[#c4c6d0] rounded-md px-3 py-2 text-[14px] focus:outline-none focus:border-[#03224d] bg-white"
                        />
                      </div>
                      <button
                        onClick={() => handleGrade(s._id)}
                        disabled={saving[s._id] || scores[s._id] === ''}
                        className="bg-[#086b53] text-white px-5 py-2 rounded-md text-[12px] font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        {saving[s._id] ? (
                          <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[16px]">save</span>
                        )}
                        {s.score !== null && s.score !== undefined ? 'Update Grade' : 'Save Grade'}
                      </button>
                    </div>

                    {/* Sierra Leone Letter Grade badge preview */}
                    {scores[s._id] !== '' && scores[s._id] !== null && scores[s._id] !== undefined && (
                      <div className="pt-2 border-t border-[#c4c6d0]/40 flex items-center gap-2">
                        {(() => {
                          const g = calculateGrade(scores[s._id], assignment?.maxScore)
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold border ${g.badgeColor}`}>
                              <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                              Grade {g.letterGrade} ({g.percentage}%) • {g.classification} ({g.gradePoint} GP)
                            </span>
                          )
                        })()}
                      </div>
                    )}

                    {/* Grade status & notifications */}
                    {savedSuccess[s._id] && (
                      <p className="text-[12px] text-[#086b53] font-bold mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Grade saved and notification sent to student!
                      </p>
                    )}
                    {gradeError[s._id] && (
                      <p className="text-[12px] text-[#ba1a1a] font-medium mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        {gradeError[s._id]}
                      </p>
                    )}
                    {s.score !== null && s.score !== undefined && !savedSuccess[s._id] && (
                      <p className="text-[12px] text-[#086b53] mt-2 font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        Graded: {s.score} / {assignment?.maxScore}
                      </p>
                    )}
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {filteredSubmissions.length > 10 && (
        <div className="mt-6 flex items-center justify-between bg-white border border-[#c4c6d0] rounded-xl px-4 py-3 shadow-xs">
          <p className="text-[12px] text-[#44474f]">
            Showing <span className="font-bold text-[#03224d]">{(page - 1) * 10 + 1}</span>–<span className="font-bold text-[#03224d]">{Math.min(page * 10, filteredSubmissions.length)}</span> of <span className="font-bold text-[#03224d]">{filteredSubmissions.length}</span> submissions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-[#c4c6d0] rounded text-[12px] font-bold text-[#03224d] hover:bg-[#f0eded] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-[12px] font-bold text-[#03224d] px-2">Page {page} of {Math.ceil(filteredSubmissions.length / 10)}</span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(filteredSubmissions.length / 10), p + 1))}
              disabled={page >= Math.ceil(filteredSubmissions.length / 10)}
              className="px-3 py-1.5 border border-[#c4c6d0] rounded text-[12px] font-bold text-[#03224d] hover:bg-[#f0eded] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-[#03224d] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">visibility</span>
                <h3 className="font-bold text-[15px] truncate">
                  Submission Solution — {previewModal.studentName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-[12px] font-semibold flex items-center gap-1 text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  Open in New Tab
                </a>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 p-3 bg-[#f0eded] overflow-auto flex justify-center items-center">
              {previewModal.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                <img
                  src={previewModal.url}
                  alt="Submission preview"
                  className="max-w-full max-h-[75vh] object-contain rounded shadow"
                />
              ) : (
                <iframe
                  src={previewModal.url}
                  title="Submission Solution Document"
                  className="w-full h-[75vh] border-0 rounded bg-white shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plagiarism Similarity Report Modal */}
      {plagiarismModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setPlagiarismModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-[#03224d] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#a0f3d4]">search_check</span>
                <h3 className="font-bold text-[15px]">
                  Plagiarism Report — {plagiarismModal.sub?.studentName}
                </h3>
              </div>
              <button onClick={() => setPlagiarismModal(null)} className="p-1 hover:bg-white/20 rounded-full text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Score Header */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                (plagiarismModal.sub?.plagiarismScore ?? 0) >= 25
                  ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#93000a]'
                  : 'bg-[#a0f3d4]/30 border-[#086b53] text-[#00513e]'
              }`}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider">Similarity Score</p>
                  <p className="text-[28px] font-extrabold">{plagiarismModal.sub?.plagiarismScore ?? 0}%</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-[12px] font-extrabold uppercase ${
                    (plagiarismModal.sub?.plagiarismScore ?? 0) >= 25 ? 'bg-[#ba1a1a] text-white' : 'bg-[#086b53] text-white'
                  }`}>
                    {(plagiarismModal.sub?.plagiarismScore ?? 0) >= 25 ? '⚠️ Flagged for Review' : '✓ Normal'}
                  </span>
                </div>
              </div>

              {/* Matched Sources List */}
              <div>
                <h4 className="font-bold text-[14px] text-[#03224d] mb-3">Matched Peer Submissions ({plagiarismModal.sub?.plagiarismMatches?.length ?? 0})</h4>

                {(!plagiarismModal.sub?.plagiarismMatches || plagiarismModal.sub.plagiarismMatches.length === 0) ? (
                  <p className="text-[13px] text-[#747780] py-4 text-center bg-[#f6f3f2] rounded-xl">
                    No matching text overlaps detected with other submissions.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {plagiarismModal.sub.plagiarismMatches.map((m, idx) => (
                      <div key={idx} className="p-4 bg-[#f6f3f2] border border-[#c4c6d0] rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-[13px] text-[#1b1c1c] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-[#03224d]">person</span>
                            Matched with: {m.matchedStudentName}
                          </p>
                          <span className="text-[12px] font-extrabold text-[#ba1a1a] bg-[#ffdad6] px-2.5 py-0.5 rounded-full">
                            {m.similarityPct}% Overlap
                          </span>
                        </div>
                        {m.matchedSnippet && (
                          <div className="p-3 bg-white border border-[#c4c6d0]/40 rounded-lg text-[12px] text-[#44474f] font-mono whitespace-pre-wrap">
                            {m.matchedSnippet}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#c4c6d0] bg-[#f6f3f2] flex justify-end">
              <button
                onClick={() => setPlagiarismModal(null)}
                className="bg-[#03224d] text-white px-5 py-2 rounded-xl text-[12px] font-bold hover:opacity-90"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

