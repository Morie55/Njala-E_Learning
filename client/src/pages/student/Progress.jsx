import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { calculateGrade } from '../../utils/grading'
import { useUser } from '../../hooks/useUser'

/* ── Bar Chart Component ─────────────────────────────────────────────── */
function BarChart({ data, height = 120 }) {
  if (!data || !data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(20, Math.floor(300 / data.length) - 6)
  const totalW = data.length * (barW + 6)

  const gradeColor = (v) => {
    if (v >= 70) return '#086b53'
    if (v >= 60) return '#03224d'
    if (v >= 50) return '#1f3864'
    if (v >= 45) return '#dd9235'
    if (v >= 40) return '#747780'
    return '#ba1a1a'
  }

  return (
    <svg viewBox={`0 0 ${totalW} ${height + 30}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const bh = Math.max(4, (d.value / max) * height)
        const x = i * (barW + 6)
        const y = height - bh
        const color = gradeColor(d.value)
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx={4} fill={color} opacity="0.85" />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fill="#44474f" fontWeight="bold">
              {d.value}%
            </text>
            <text x={x + barW / 2} y={height + 18} textAnchor="middle" fontSize="8" fill="#747780">
              {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
            </text>
          </g>
        )
      })}
      <line x1={0} y1={height} x2={totalW} y2={height} stroke="#c4c6d0" strokeWidth="1" />
    </svg>
  )
}

/* ── GPA Arc Gauge ───────────────────────────────────────────────────── */
function GpaGauge({ gpa, max = 5 }) {
  const pct = Math.min(gpa / max, 1)
  const R = 52, cx = 64, cy = 64
  const startAngle = -Math.PI * 0.8
  const endAngle = Math.PI * 0.8
  const totalArc = endAngle - startAngle
  const angle = startAngle + totalArc * pct

  const polarX = (r, a) => cx + r * Math.cos(a)
  const polarY = (r, a) => cy + r * Math.sin(a)

  const trackPath = `M ${polarX(R, startAngle)} ${polarY(R, startAngle)} A ${R} ${R} 0 1 1 ${polarX(R, endAngle)} ${polarY(R, endAngle)}`
  const valuePath = pct > 0
    ? `M ${polarX(R, startAngle)} ${polarY(R, startAngle)} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 1 ${polarX(R, angle)} ${polarY(R, angle)}`
    : ''

  const color = gpa >= 4.5 ? '#086b53' : gpa >= 3.5 ? '#03224d' : gpa >= 2.5 ? '#dd9235' : '#ba1a1a'

  return (
    <svg viewBox="0 0 128 90" className="w-36 h-24 mx-auto">
      <path d={trackPath} fill="none" stroke="#e0e0e0" strokeWidth="10" strokeLinecap="round" />
      {valuePath && <path d={valuePath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="bold" fill={color}>{gpa.toFixed(2)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#747780">out of {max}.0 Scale</text>
    </svg>
  )
}

export default function StudentProgress() {
  const { role } = useUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedStudentId = searchParams.get('studentId') || ''

  const [students, setStudents] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [gpaData, setGpaData] = useState(null)
  const [courses, setCourses] = useState([])
  const [transcriptData, setTranscriptData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const isStaff = ['admin', 'dept_head', 'lecturer'].includes(role)

  /* Fetch student list for staff selector */
  useEffect(() => {
    if (isStaff) {
      api.get('/users?role=student')
        .then(res => setStudents(res.data?.users ?? []))
        .catch(() => {})
    }
  }, [isStaff])

  /* Fetch individual student progress report data */
  useEffect(() => {
    setLoading(true)
    const studentQuery = selectedStudentId ? `?studentId=${selectedStudentId}` : ''
    const courseQuery = selectedStudentId ? '/courses' : '/courses?enrolled=true'

    Promise.all([
      api.get(`/submissions/me${studentQuery}`),
      api.get(`/submissions/gpa${studentQuery}`).catch(() => ({ data: null })),
      api.get(courseQuery).catch(() => ({ data: { courses: [] } })),
      api.get(`/submissions/transcript${studentQuery}`).catch(() => ({ data: null })),
    ])
      .then(([sRes, gRes, cRes, tRes]) => {
        setSubmissions(sRes.data?.submissions ?? [])
        setGpaData(gRes.data)
        setCourses(cRes.data?.courses ?? [])
        setTranscriptData(tRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedStudentId])

  /* Export CSV Progress Report */
  async function handleExportReport() {
    setExporting(true)
    try {
      const studentQuery = selectedStudentId ? `&studentId=${selectedStudentId}` : ''
      const res = await api.get(`/submissions/transcript?format=csv${studentQuery}`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const name = (transcriptData?.student?.fullName || 'Student').replace(/[^a-zA-Z0-9]/g, '_')
      link.setAttribute('download', `Njala_Progress_Report_${name}_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      alert('Failed to generate export.')
    } finally {
      setExporting(false)
    }
  }

  const graded = submissions.filter(s => s.score !== null && s.score !== undefined)
  const pending = submissions.filter(s => s.score === null || s.score === undefined)
  const avgPct = graded.length
    ? Math.round(graded.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / graded.length)
    : null

  const cgpa = gpaData?.cumulativeGpa ?? transcriptData?.summary?.cgpa ?? 0
  const academicStanding = gpaData?.cumulativeClass ?? transcriptData?.summary?.academicStanding ?? 'Good Standing'

  const classColor = (cls) => {
    if (cls?.includes('First')) return 'text-[#086b53]'
    if (cls?.includes('Upper')) return 'text-[#03224d]'
    if (cls?.includes('Lower')) return 'text-[#1f3864]'
    if (cls?.includes('Third')) return 'text-[#dd9235]'
    return 'text-[#ba1a1a]'
  }

  // Timeline data
  const timeline = [...graded]
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
    .map(s => ({
      label: s.assignmentTitle?.slice(0, 10) ?? 'Task',
      value: Math.round((s.score / s.maxScore) * 100),
      courseCode: s.courseCode,
      date: s.submittedAt,
    }))

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-[#086b53] mb-1">
            <span className="material-symbols-outlined text-[26px]">bar_chart</span>
            <h2 className="text-[28px] sm:text-[32px] font-semibold text-[#03224d]">Individual Academic Progress Report</h2>
          </div>
          <p className="text-[14px] text-[#44474f]">
            Comprehensive semester-by-semester breakdown of grades, GPA metrics, and course completions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportReport}
            disabled={exporting || !graded.length}
            className="px-5 py-2.5 bg-[#03224d] text-white font-bold text-[13px] rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${exporting ? 'animate-spin' : ''}`}>
              {exporting ? 'progress_activity' : 'download'}
            </span>
            {exporting ? 'Exporting…' : 'Export Full Report (CSV)'}
          </button>
        </div>
      </div>

      {/* Staff Student Selector Strip */}
      {isStaff && (
        <div className="bg-white border border-[#c4c6d0] rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#03224d]">
            <span className="material-symbols-outlined text-[20px]">person_search</span>
            <span className="text-[13px] font-bold uppercase tracking-wider">Select Student Target:</span>
          </div>

          <select
            value={selectedStudentId}
            onChange={e => setSearchParams(e.target.value ? { studentId: e.target.value } : {})}
            className="w-full sm:w-80 border border-[#c4c6d0] rounded-xl px-3.5 py-2 text-[14px] font-bold text-[#03224d] bg-white focus:outline-none focus:border-[#03224d]"
          >
            <option value="">— Current User Profile —</option>
            {students.map(s => (
              <option key={s._id} value={s._id}>
                {s.fullName} ({s.idNumber || s.email})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Student Banner when viewing profile */}
      {transcriptData?.student && (
        <div className="bg-white border border-[#c4c6d0] rounded-2xl p-5 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#03224d] text-white font-bold text-[18px] flex items-center justify-center">
              {transcriptData.student.fullName?.[0]?.toUpperCase() ?? 'S'}
            </div>
            <div>
              <h3 className="font-bold text-[18px] text-[#03224d]">{transcriptData.student.fullName}</h3>
              <p className="text-[12px] text-[#44474f]">
                Matric / ID: <strong className="text-[#03224d]">{transcriptData.student.idNumber || 'N/A'}</strong> • Email: {transcriptData.student.email}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#d8e2ff] text-[#001a41] px-3 py-1 rounded-full">
              {transcriptData.student.departmentName || 'Njala University'}
            </span>
          </div>
        </div>
      )}

      {loading ? <LoadingSkeleton type="stat" count={4} /> : (
        <div className="space-y-6">

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Graded Tasks', value: graded.length, icon: 'check_circle', color: 'text-[#086b53]', bg: 'bg-[#a0f3d4]/20' },
              { label: 'Pending Evaluation', value: pending.length, icon: 'pending', color: 'text-[#dd9235]', bg: 'bg-[#ffdcbb]/20' },
              { label: 'Average Score', value: avgPct !== null ? `${avgPct}%` : '—', icon: 'analytics', color: 'text-[#03224d]', bg: 'bg-[#d8e2ff]/20' },
              { label: 'Enrolled Courses', value: courses.length, icon: 'school', color: 'text-[#1f3864]', bg: 'bg-[#d8e2ff]/20' },
            ].map((k, i) => (
              <div key={i} className={`bg-white border border-[#c4c6d0] rounded-2xl p-5 shadow-sm ${k.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{k.label}</p>
                  <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
                </div>
                <p className={`text-[28px] font-extrabold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Cumulative GPA & Score Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm text-center">
              <h3 className="text-[14px] font-bold text-[#03224d] mb-1">Cumulative GPA (CGPA)</h3>
              <p className="text-[12px] text-[#747780] mb-4">Sierra Leone 5.0 Point Scale</p>
              <GpaGauge gpa={cgpa} />
              <p className={`text-[14px] font-bold mt-2 ${classColor(academicStanding)}`}>{academicStanding}</p>
              <p className="text-[11px] text-[#747780] mt-1">{gpaData?.totalCreditHours ?? 0} credit hours earned</p>
            </div>

            <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm lg:col-span-2">
              <h3 className="text-[14px] font-bold text-[#03224d] mb-1">Assessment Performance Timeline</h3>
              <p className="text-[12px] text-[#747780] mb-4">Chronological evaluation trend across submitted tasks</p>
              {timeline.length === 0 ? (
                <div className="text-center py-10 text-[#44474f] text-[13px]">No graded tasks recorded yet.</div>
              ) : (
                <BarChart data={timeline} height={100} />
              )}
            </div>
          </div>

          {/* DEDICATED SEMESTER-BY-SEMESTER GRADES SECTION */}
          <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#c4c6d0] pb-4">
              <div>
                <h3 className="text-[20px] font-bold text-[#03224d] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#086b53]">receipt_long</span>
                  Semester Grade Reports
                </h3>
                <p className="text-[13px] text-[#44474f]">Complete breakdown of course grades and Quality Points by Academic Semester.</p>
              </div>
            </div>

            {gpaData?.semesters && gpaData.semesters.length > 0 ? (
              gpaData.semesters.map((sem, sIdx) => (
                <div key={sIdx} className="border border-[#c4c6d0] rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="px-5 py-3.5 bg-[#f6f3f2] border-b border-[#c4c6d0] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#03224d]">calendar_month</span>
                      <h4 className="font-bold text-[16px] text-[#03224d]">{sem.semester}</h4>
                      <span className="text-[12px] font-semibold text-[#44474f] bg-[#eae8e7] px-2.5 py-0.5 rounded-full">
                        {sem.courses.length} Course(s)
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-[#086b53] bg-[#a0f3d4]/40 px-3 py-1 rounded-md border border-[#086b53]/30">
                      Semester GPA: {sem.gpa.toFixed(2)} / 5.0
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#eae8e7]">
                        <tr>
                          {['Course Code', 'Course Title', 'Credit Hours', 'Score %', 'Letter Grade', 'Grade Point', 'Quality Points'].map(h => (
                            <th key={h} className="px-5 py-3 text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c4c6d0]">
                        {sem.courses.map((c, cIdx) => (
                          <tr key={cIdx} className="hover:bg-[#f6f3f2] transition-colors">
                            <td className="px-5 py-3.5 text-[13px] font-mono font-bold text-[#03224d]">{c.course?.code || '—'}</td>
                            <td className="px-5 py-3.5 text-[13px] font-medium text-[#1b1c1c]">{c.course?.title || 'Course'}</td>
                            <td className="px-5 py-3.5 text-[13px] text-[#44474f] font-mono">{c.creditHours} hrs</td>
                            <td className="px-5 py-3.5 text-[13px] font-bold text-[#03224d]">{c.percentage}%</td>
                            <td className="px-5 py-3.5">
                              <span className={`text-[12px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                c.letterGrade === 'A' ? 'bg-[#a0f3d4] text-[#00513e]' :
                                c.letterGrade === 'B' ? 'bg-[#d8e2ff] text-[#001a41]' :
                                c.letterGrade === 'C' ? 'bg-[#d8e2ff] text-[#1f3864]' :
                                c.letterGrade === 'D' ? 'bg-[#ffdcbb] text-[#543100]' :
                                c.letterGrade === 'E' ? 'bg-[#f0eded] text-[#44474f]' :
                                'bg-[#ffdad6] text-[#93000a]'
                              }`}>
                                Grade {c.letterGrade}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-[13px] font-mono font-bold text-[#44474f]">{c.gradePoint.toFixed(1)} GP</td>
                            <td className="px-5 py-3.5 text-[13px] font-mono font-bold text-[#086b53]">{c.qualityPoints.toFixed(1)} QP</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : transcriptData?.records && transcriptData.records.length > 0 ? (
              <div className="overflow-x-auto border border-[#c4c6d0] rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#eae8e7]">
                    <tr>
                      {['Course', 'Assignment', 'Date', 'Score', 'Percentage', 'Letter Grade', 'Grade Point'].map(h => (
                        <th key={h} className="px-5 py-3 text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4c6d0]">
                    {transcriptData.records.map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#f6f3f2]">
                        <td className="px-5 py-3.5 text-[13px] font-bold text-[#03224d]">{r.courseCode}</td>
                        <td className="px-5 py-3.5 text-[13px] text-[#1b1c1c]">{r.assignmentTitle}</td>
                        <td className="px-5 py-3.5 text-[12px] text-[#44474f]">{new Date(r.submittedAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5 text-[13px] font-bold">{r.score} / {r.maxScore}</td>
                        <td className="px-5 py-3.5 text-[13px] font-bold text-[#086b53]">{r.percentage}%</td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-bold bg-[#a0f3d4] text-[#00513e] px-2.5 py-0.5 rounded-full">Grade {r.letterGrade}</span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] font-mono font-bold text-[#44474f]">{r.gradePoint} GP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-10 text-[14px] text-[#44474f]">No semester grade records available yet.</p>
            )}
          </div>

        </div>
      )}
    </AppLayout>
  )
}
