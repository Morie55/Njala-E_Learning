import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const GRADE_COLORS = {
  A: 'bg-[#a0f3d4] text-[#00513e]',
  B: 'bg-[#d8e2ff] text-[#001a73]',
  C: 'bg-[#ffe8b5] text-[#5a3b00]',
  D: 'bg-[#ffdad6] text-[#93000a]',
  E: 'bg-[#ffdad6] text-[#93000a]',
  F: 'bg-[#ffdad6] text-[#93000a]',
}

export default function CourseReport() {
  const { id: courseId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/admin/report/course/${courseId}`)
      .then(r => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [courseId])

  function handleExportCSV() {
    if (!report) return
    const lines = [
      ['Field', 'Value'],
      ['Course', report.course?.title],
      ['Code', report.course?.code],
      ['Lecturer', report.course?.lecturerId?.fullName],
      ['Enrolled Students', report.enrollmentCount],
      ['Total Assignments', report.assignmentCount],
      ['Total Submissions', report.submissionCount],
      ['Graded', report.gradedCount],
      ['Pending Grading', report.pendingGradingCount],
      ['Average Score', report.avgScore !== null ? `${report.avgScore}%` : 'N/A'],
      ['Submission Rate', `${report.submissionRate}%`],
      ['Late Submissions', report.lateSubmissions],
    ].map(row => row.join(',')).join('\n')
    const link = document.createElement('a')
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(lines)
    link.download = `Course_Report_${report.course?.code ?? courseId}.csv`
    link.click()
  }

  if (loading) return (
    <AppLayout>
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">Course Report</h2>
      </div>
      <LoadingSkeleton type="stat" count={4} />
    </AppLayout>
  )

  if (!report) return (
    <AppLayout>
      <p className="text-[#ba1a1a] text-center py-20">Failed to load report. Check your access.</p>
    </AppLayout>
  )

  return (
    <AppLayout>
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">Course Report</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">{report.course?.title}</h2>
          <p className="text-[14px] text-[#44474f]">
            {report.course?.code} • {report.course?.semester} • Taught by {report.course?.lecturerId?.fullName}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#c4c6d0] text-[#03224d] font-bold text-[12px] hover:bg-[#f0eded] rounded-lg shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Enrolled Students', value: report.enrollmentCount, icon: 'group', color: 'text-[#03224d]', bg: 'bg-[#d8e2ff]/30' },
          { label: 'Submission Rate', value: `${report.submissionRate}%`, icon: 'assignment_turned_in', color: 'text-[#086b53]', bg: 'bg-[#a0f3d4]/30' },
          { label: 'Average Score', value: report.avgScore !== null ? `${report.avgScore}%` : '—', icon: 'analytics', color: 'text-[#dd9235]', bg: 'bg-[#ffe8b5]/30' },
          { label: 'Pending Grading', value: report.pendingGradingCount, icon: 'pending_actions', color: report.pendingGradingCount > 0 ? 'text-[#ba1a1a]' : 'text-[#086b53]', bg: report.pendingGradingCount > 0 ? 'bg-[#ffdad6]/30' : 'bg-[#a0f3d4]/30' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white border border-[#c4c6d0] rounded-xl p-5 shadow-sm ${kpi.bg}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider">{kpi.label}</p>
              <span className={`material-symbols-outlined text-[20px] ${kpi.color}`}>{kpi.icon}</span>
            </div>
            <p className={`text-[28px] font-extrabold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Submission Summary */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-sm">
          <h3 className="text-[16px] font-semibold text-[#03224d] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">assignment</span>
            Submission Summary
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Total Assignments', value: report.assignmentCount, color: 'text-[#03224d]' },
              { label: 'Total Submissions Received', value: report.submissionCount, color: 'text-[#44474f]' },
              { label: 'Graded Submissions', value: report.gradedCount, color: 'text-[#086b53]' },
              { label: 'Pending Grading', value: report.pendingGradingCount, color: report.pendingGradingCount > 0 ? 'text-[#ba1a1a]' : 'text-[#086b53]' },
              { label: 'Late Submissions', value: report.lateSubmissions, color: report.lateSubmissions > 0 ? 'text-[#dd9235]' : 'text-[#44474f]' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#c4c6d0]/40 last:border-0">
                <span className="text-[13px] text-[#44474f]">{item.label}</span>
                <span className={`text-[15px] font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-sm">
          <h3 className="text-[16px] font-semibold text-[#03224d] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">grade</span>
            Grade Distribution (Njala 5-Point Scale)
          </h3>
          {report.gradedCount === 0 ? (
            <p className="text-[13px] text-[#44474f] text-center py-8">No graded submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(report.gradeDist).map(([grade, count]) => {
                const pct = report.gradedCount > 0 ? Math.round((count / report.gradedCount) * 100) : 0
                return (
                  <div key={grade} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${GRADE_COLORS[grade] ?? 'bg-[#f0eded] text-[#44474f]'}`}>
                      {grade}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-[#44474f]">Grade {grade}</span>
                        <span className="font-bold text-[#03224d]">{count} ({pct}%)</span>
                      </div>
                      <div className="bg-[#f0eded] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-[#03224d] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
