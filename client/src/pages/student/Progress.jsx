import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { calculateGrade } from '../../utils/grading'

/* ── Tiny SVG bar chart ──────────────────────────────────────────────── */
function BarChart({ data, height = 120 }) {
  if (!data.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(20, Math.floor(300 / data.length) - 6)
  const totalW = data.length * (barW + 6)

  const gradeColor = (v) => {
    if (v >= 70) return '#086b53'
    if (v >= 55) return '#1a4fd8'
    if (v >= 40) return '#dd9235'
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
      {/* Baseline */}
      <line x1={0} y1={height} x2={totalW} y2={height} stroke="#c4c6d0" strokeWidth="1" />
    </svg>
  )
}

/* ── Sparkline (mini trend line) ─────────────────────────────────────── */
function Sparkline({ values, color = '#086b53' }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const W = 80, H = 28
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(' ')
  const trend = values[values.length - 1] - values[0]
  return (
    <div className="flex items-center gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-7">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={`text-[11px] font-bold ${trend >= 0 ? 'text-[#086b53]' : 'text-[#ba1a1a]'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(0)}%
      </span>
    </div>
  )
}

/* ── GPA gauge (arc) ─────────────────────────────────────────────────── */
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

  const color = gpa >= 4.5 ? '#086b53' : gpa >= 3.5 ? '#1a4fd8' : gpa >= 2.5 ? '#dd9235' : '#ba1a1a'

  return (
    <svg viewBox="0 0 128 90" className="w-36 h-24 mx-auto">
      <path d={trackPath} fill="none" stroke="#e0e0e0" strokeWidth="10" strokeLinecap="round" />
      {valuePath && <path d={valuePath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="bold" fill={color}>{gpa.toFixed(2)}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#747780">out of {max}.0</text>
    </svg>
  )
}

export default function StudentProgress() {
  const [submissions, setSubmissions] = useState([])
  const [gpa, setGpa] = useState(null)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/submissions/me'),
      api.get('/submissions/gpa').catch(() => ({ data: null })),
      api.get('/courses?enrolled=true').catch(() => ({ data: { courses: [] } })),
    ]).then(([sRes, gRes, cRes]) => {
      setSubmissions(sRes.data?.submissions ?? [])
      setGpa(gRes.data)
      setCourses(cRes.data?.courses ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Per-course performance
  const coursePerf = courses.map(c => {
    const subs = submissions.filter(s => s.courseId === c._id && s.score !== null)
    if (subs.length === 0) return null
    const scores = subs.map(s => Math.round((s.score / s.maxScore) * 100))
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const g = calculateGrade(avg, 100)
    return {
      course: c,
      subs,
      scores,
      avg,
      letterGrade: g.letterGrade,
      gradePoint: g.gradePoint,
      trend: scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0,
    }
  }).filter(Boolean)

  // Timeline: all graded subs sorted by date
  const timeline = [...submissions]
    .filter(s => s.score !== null)
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
    .map(s => ({
      label: s.assignmentTitle?.slice(0, 10) ?? 'Task',
      value: Math.round((s.score / s.maxScore) * 100),
      courseCode: s.courseCode,
      date: s.submittedAt,
    }))

  const graded = submissions.filter(s => s.score !== null)
  const pending = submissions.filter(s => s.score === null)
  const avgPct = graded.length
    ? Math.round(graded.reduce((a, s) => a + (s.score / s.maxScore) * 100, 0) / graded.length)
    : null

  const classColor = (cls) => {
    if (cls?.includes('First')) return 'text-[#086b53]'
    if (cls?.includes('Upper')) return 'text-[#1a4fd8]'
    if (cls?.includes('Lower')) return 'text-[#dd9235]'
    return 'text-[#ba1a1a]'
  }

  return (
    <AppLayout role="student">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">My Progress</h2>
        <p className="text-[14px] text-[#44474f]">Visual overview of your academic performance across all courses.</p>
      </div>

      {loading ? <LoadingSkeleton type="stat" count={6} /> : (
        <div className="space-y-6">

          {/* Top KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Graded Tasks', value: graded.length, icon: 'check_circle', color: 'text-[#086b53]', bg: 'bg-[#a0f3d4]/20' },
              { label: 'Pending', value: pending.length, icon: 'pending', color: 'text-[#dd9235]', bg: 'bg-[#ffe8b5]/20' },
              { label: 'Avg Score', value: avgPct !== null ? `${avgPct}%` : '—', icon: 'analytics', color: 'text-[#03224d]', bg: 'bg-[#d8e2ff]/20' },
              { label: 'Courses', value: courses.length, icon: 'school', color: 'text-[#1a4fd8]', bg: 'bg-[#d8e2ff]/20' },
            ].map(k => (
              <div key={k.label} className={`bg-white border border-[#c4c6d0] rounded-2xl p-5 shadow-sm ${k.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{k.label}</p>
                  <span className={`material-symbols-outlined text-[20px] ${k.color}`}>{k.icon}</span>
                </div>
                <p className={`text-[28px] font-extrabold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* GPA Gauge */}
            {gpa && gpa.cumulativeGpa > 0 && (
              <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm text-center">
                <h3 className="text-[14px] font-bold text-[#03224d] mb-1">Cumulative GPA</h3>
                <p className="text-[12px] text-[#747780] mb-4">Njala 5.0 Point Scale</p>
                <GpaGauge gpa={gpa.cumulativeGpa} />
                <p className={`text-[13px] font-bold mt-2 ${classColor(gpa.cumulativeClass)}`}>{gpa.cumulativeClass}</p>
                <p className="text-[11px] text-[#747780] mt-1">{gpa.totalCreditHours} credit hours completed</p>
              </div>
            )}

            {/* Grade Timeline */}
            <div className={`bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm ${gpa?.cumulativeGpa > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
              <h3 className="text-[14px] font-bold text-[#03224d] mb-1">Score Timeline</h3>
              <p className="text-[12px] text-[#747780] mb-4">All graded tasks in chronological order</p>
              {timeline.length === 0 ? (
                <div className="text-center py-10 text-[#44474f] text-[13px]">No graded tasks yet.</div>
              ) : (
                <BarChart data={timeline} height={100} />
              )}
            </div>
          </div>

          {/* Per-course breakdown */}
          <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm">
            <h3 className="text-[16px] font-bold text-[#03224d] mb-4">Course Breakdown</h3>
            {coursePerf.length === 0 ? (
              <p className="text-[13px] text-[#44474f] text-center py-8">Complete some graded assignments to see your breakdown here.</p>
            ) : (
              <div className="space-y-5">
                {coursePerf.map(cp => (
                  <div key={cp.course._id} className="border border-[#f0eded] rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="font-bold text-[#03224d] text-[14px]">{cp.course.title}</p>
                        <p className="text-[12px] text-[#747780]">{cp.course.code} • {cp.subs.length} graded task{cp.subs.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Sparkline values={cp.scores} color={cp.trend >= 0 ? '#086b53' : '#ba1a1a'} />
                        <div className="text-right">
                          <p className="text-[22px] font-extrabold text-[#03224d]">{cp.avg}%</p>
                          <p className="text-[11px] font-bold text-[#44474f]">Grade {cp.letterGrade} • {cp.gradePoint.toFixed(1)} GP</p>
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="bg-[#f0eded] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${cp.avg >= 70 ? 'bg-[#086b53]' : cp.avg >= 55 ? 'bg-[#1a4fd8]' : cp.avg >= 40 ? 'bg-[#dd9235]' : 'bg-[#ba1a1a]'}`}
                        style={{ width: `${cp.avg}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GPA semester table */}
          {gpa?.semesters?.length > 0 && (
            <div className="bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm">
              <h3 className="text-[16px] font-bold text-[#03224d] mb-4">Semester GPA Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider border-b border-[#c4c6d0]">
                      <th className="text-left pb-2">Semester</th>
                      <th className="text-center pb-2">Courses</th>
                      <th className="text-center pb-2">Credit Hours</th>
                      <th className="text-right pb-2">GPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eded]">
                    {gpa.semesters.map(sem => (
                      <tr key={sem.semester} className="hover:bg-[#fbf9f8]">
                        <td className="py-2.5 font-medium text-[#1b1c1c]">{sem.semester}</td>
                        <td className="text-center py-2.5 text-[#44474f]">{sem.courses.length}</td>
                        <td className="text-center py-2.5 text-[#44474f]">{sem.totalCreditHours}</td>
                        <td className="text-right py-2.5">
                          <span className={`font-extrabold text-[15px] ${classColor(sem.gpa >= 4.5 ? 'First' : sem.gpa >= 3.5 ? 'Upper' : sem.gpa >= 2.5 ? 'Lower' : 'Fail')}`}>
                            {sem.gpa.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#c4c6d0] bg-[#f6f3f2] font-bold">
                      <td className="py-2.5 pl-1 text-[#03224d]">Cumulative</td>
                      <td className="text-center py-2.5 text-[#44474f]">{gpa.courseGrades.length}</td>
                      <td className="text-center py-2.5 text-[#44474f]">{gpa.totalCreditHours}</td>
                      <td className={`text-right py-2.5 text-[16px] ${classColor(gpa.cumulativeClass)}`}>{gpa.cumulativeGpa.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
