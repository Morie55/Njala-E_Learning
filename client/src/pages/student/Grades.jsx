import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { calculateGrade } from '../../utils/grading'

function ScoreChip({ score, maxScore }) {
  const g = calculateGrade(score, maxScore)
  if (score === null || score === undefined) {
    return <span className="text-[12px] text-[#44474f] italic px-2.5 py-1 rounded bg-[#f0eded] border border-[#c4c6d0]">Pending</span>
  }
  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 text-[12px] font-bold px-3 py-1 rounded-full border ${g.badgeColor}`}>
        <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
        Grade {g.letterGrade} ({g.percentage}%)
      </span>
      <span className="text-[11px] text-[#44474f] font-medium pl-1">
        {score}/{maxScore} pts • {g.classification} ({g.gradePoint} GP)
      </span>
    </div>
  )
}

export default function Grades() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [courses, setCourses] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/submissions/me'),
      api.get('/courses?enrolled=true'),
    ]).then(([s, c]) => {
      setSubmissions(s.data?.submissions ?? [])
      setCourses(c.data?.courses ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = selectedCourse
    ? submissions.filter(s => s.courseId === selectedCourse)
    : submissions

  const graded = submissions.filter(s => s.score !== null && s.score !== undefined)
  const totalPercentage = graded.reduce((sum, s) => {
    const g = calculateGrade(s.score, s.maxScore)
    return sum + g.percentage
  }, 0)
  const avgScore = graded.length ? Math.round((totalPercentage / graded.length) * 10) / 10 : null

  // Calculate Cumulative GPA (CGPA) on 4.0 scale
  const totalGP = graded.reduce((sum, s) => {
    const g = calculateGrade(s.score, s.maxScore)
    return sum + g.gradePoint
  }, 0)
  const cgpa = graded.length ? (totalGP / graded.length).toFixed(2) : '0.00'

  function handleExportTranscript() {
    if (!filtered || filtered.length === 0) return
    const headers = ['Assignment', 'Course Code', 'Course Title', 'Submitted Date', 'Score', 'Max Score', 'Percentage', 'Letter Grade', 'Grade Point', 'Classification', 'Feedback']
    const rows = filtered.map(s => {
      const g = calculateGrade(s.score, s.maxScore)
      return [
        `"${s.assignmentTitle || ''}"`,
        `"${s.courseCode || ''}"`,
        `"${s.courseTitle || ''}"`,
        `"${new Date(s.submittedAt).toLocaleDateString()}"`,
        s.score !== null && s.score !== undefined ? s.score : '',
        s.maxScore || '',
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
    link.setAttribute('download', `Academic_Transcript_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <AppLayout role="student">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Academic Performance</h2>
          <p className="text-[14px] text-[#44474f]">
            {selectedCourse ? courses.find(c => c._id === selectedCourse)?.title : 'All Courses'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportTranscript}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-[#03224d] text-[#03224d] rounded-lg text-[12px] font-bold hover:bg-[#03224d] hover:text-white transition-all disabled:opacity-50 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export Transcript
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* GPA card */}
        <div className="col-span-12 lg:col-span-4 bg-white border border-[#c4c6d0] p-6 rounded-xl relative overflow-hidden shadow-sm">
          <div className="relative z-10">
            <p className="text-[12px] font-bold text-[#44474f] uppercase tracking-widest mb-3">Cumulative GPA (4.0 Scale)</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[52px] font-bold text-[#03224d] leading-none">{cgpa}</span>
              <span className="text-[16px] text-[#44474f] font-semibold">/ 4.0</span>
            </div>
            {avgScore !== null && (
              <div className="flex items-center gap-2 text-[#086b53] font-semibold text-[13px]">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>Avg: {avgScore}% across {graded.length} graded task{graded.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[120px] text-[#03224d] opacity-10" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
        </div>

        {/* Stat cards */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-3 gap-6">
          {[
            { icon: 'check_circle', color: 'text-[#086b53]', label: 'Graded', value: graded.length },
            { icon: 'pending', color: 'text-[#dd9235]', label: 'Pending', value: submissions.length - graded.length },
            { icon: 'school', color: 'text-[#03224d]', label: 'Enrolled Courses', value: courses.length },
          ].map(s => (
            <div key={s.label} className="bg-white border border-[#c4c6d0] p-5 rounded-xl flex flex-col justify-between shadow-sm">
              <span className={`material-symbols-outlined ${s.color} mb-2`}>{s.icon}</span>
              <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{s.label}</p>
              <p className="text-[26px] font-bold text-[#1b1c1c]">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#c4c6d0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#c4c6d0] flex justify-between items-center bg-[#f6f3f2]">
          <select
            className="bg-white border border-[#c4c6d0] rounded-md text-[14px] py-1.5 pl-3 pr-8 focus:ring-[#03224d] focus:border-[#03224d] font-medium"
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(c => <option key={c._id} value={c._id}>{c.code}: {c.title}</option>)}
          </select>
        </div>

        {loading ? (
          <LoadingSkeleton type="table" count={5} />
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-[14px] text-[#44474f]">No submissions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#eae8e7]">
                <tr>
                  {['Assignment', 'Course', 'Submitted', 'Score & Grade', 'Feedback'].map(h => (
                    <th key={h} className="px-6 py-3 text-[12px] font-bold text-[#44474f] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c6d0]">
                {filtered.map(s => (
                  <tr key={s._id} className="hover:bg-[#f6f3f2] transition-colors">
                    <td className="px-6 py-4 text-[14px] font-bold text-[#1b1c1c]">{s.assignmentTitle}</td>
                    <td className="px-6 py-4 text-[14px] text-[#44474f] font-medium">{s.courseCode}</td>
                    <td className="px-6 py-4 text-[13px] text-[#44474f]">{new Date(s.submittedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4"><ScoreChip score={s.score} maxScore={s.maxScore} /></td>
                    <td className="px-6 py-4 text-[13px] text-[#44474f] max-w-xs truncate">{s.feedback || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

