import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import { useUser } from '../../hooks/useUser'
import api from '../../lib/api'

export default function DepartmentReport() {
  const { departmentId } = useParams()
  const { dbUser } = useUser()
  const role = dbUser?.role ?? 'admin'

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [selectedDept, setSelectedDept] = useState(departmentId ?? '')

  // Load department list for selector
  useEffect(() => {
    api.get('/departments').then(r => {
      setDepartments(r.data?.departments ?? [])
      if (!selectedDept && r.data?.departments?.length > 0) {
        setSelectedDept(r.data.departments[0]._id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDept) return
    setLoading(true)
    setReport(null)
    api.get(`/admin/report/department/${selectedDept}`)
      .then(r => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedDept])

  function handleExport() {
    if (!report) return
    const lines = [
      ['Department', report.department?.name],
      ['School', report.school?.name],
      ['Total Students', report.totalStudents],
      ['Total Lecturers', report.totalLecturers],
      ['Total Courses', report.totalCourses],
      ['Active Courses', report.activeCourses],
      ['Total Submissions', report.totalSubmissions],
      ['Graded Submissions', report.gradedSubmissions],
      ['Average Score (%)', report.avgScore ?? 'N/A'],
    ].map(r => r.join(',')).join('\n')

    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURI(lines)
    a.download = `Dept_Report_${report.department?.code ?? selectedDept}.csv`
    a.click()
  }

  const isMod = ['admin', 'dept_head'].includes(role)

  return (
    <AppLayout role={role}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[24px] sm:text-[32px] font-semibold text-[#03224d]">Department Report</h2>
          <p className="text-[13px] sm:text-[14px] text-[#44474f]">Aggregate performance statistics for each department.</p>
        </div>
        <div className="flex flex-col xs:flex-row sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="w-full sm:w-64 border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#03224d] bg-white truncate"
          >
            <option value="">Select department…</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
            ))}
          </select>
          {report && (
            <button
              onClick={handleExport}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 border border-[#c4c6d0] text-[#03224d] font-bold text-[12px] hover:bg-[#f0eded] rounded-lg shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>CSV
            </button>
          )}
        </div>
      </div>

      {loading && selectedDept && <LoadingSkeleton type="stat" count={4} />}

      {!selectedDept && !loading && (
        <div className="bg-white border border-[#c4c6d0] rounded-2xl p-8 sm:p-14 text-center">
          <span className="material-symbols-outlined text-4xl sm:text-5xl text-[#c4c6d0] block mb-3">business</span>
          <p className="text-[13px] sm:text-[14px] text-[#44474f]">Select a department above to view its report.</p>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-[#03224d] text-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] sm:text-[12px] opacity-70 uppercase tracking-wider">Department</p>
              <h3 className="text-[18px] sm:text-[22px] font-bold">{report.department?.name}</h3>
              <p className="text-[12px] sm:text-[13px] opacity-75">{report.department?.code} · {report.school?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-[18px] sm:text-[22px] font-extrabold">{report.totalStudents}</p>
                <p className="text-[10px] opacity-75 uppercase tracking-wider">Students</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-[18px] sm:text-[22px] font-extrabold">{report.totalLecturers}</p>
                <p className="text-[10px] opacity-75 uppercase tracking-wider">Lecturers</p>
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: 'Total Courses', value: report.totalCourses, icon: 'menu_book', color: 'text-[#03224d]', bg: 'bg-[#d8e2ff]/20' },
              { label: 'Active Courses', value: report.activeCourses, icon: 'play_circle', color: 'text-[#086b53]', bg: 'bg-[#a0f3d4]/20' },
              { label: 'Total Submissions', value: report.totalSubmissions, icon: 'assignment_turned_in', color: 'text-[#dd9235]', bg: 'bg-[#ffe8b5]/20' },
              { label: 'Avg Score', value: report.avgScore !== null ? `${report.avgScore}%` : '—', icon: 'analytics', color: report.avgScore >= 50 ? 'text-[#086b53]' : 'text-[#ba1a1a]', bg: 'bg-[#f6f3f2]' },
            ].map(k => (
              <div key={k.label} className={`bg-white border border-[#c4c6d0] rounded-2xl p-4 sm:p-5 shadow-sm ${k.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider leading-tight">{k.label}</p>
                  <span className={`material-symbols-outlined text-[20px] ${k.color} shrink-0`}>{k.icon}</span>
                </div>
                <p className={`text-[24px] sm:text-[28px] font-extrabold ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Courses table */}
          {report.courses?.length > 0 && (
            <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#c4c6d0] bg-[#f6f3f2]">
                <h3 className="text-[14px] sm:text-[15px] font-bold text-[#03224d]">Courses in this Department</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider border-b border-[#c4c6d0]/50">
                      <th className="text-left px-4 sm:px-5 py-3">Course</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Lecturer</th>
                      <th className="text-center px-4 py-3">Students</th>
                      <th className="text-center px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c4c6d0]/30">
                    {report.courses.map(c => (
                      <tr key={c._id} className="hover:bg-[#fbf9f8]">
                        <td className="px-4 sm:px-5 py-3">
                          <p className="font-bold text-[#03224d] text-[13px] sm:text-[14px]">{c.title}</p>
                          <p className="text-[11px] text-[#747780]">{c.code}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-[#44474f] text-[13px]">{c.lecturerId?.fullName ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-bold text-[#03224d] text-[13px]">{c.enrollmentCount ?? 0}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-[#a0f3d4] text-[#00513e]' : c.status === 'archived' ? 'bg-[#f0eded] text-[#747780]' : 'bg-[#ffe8b5] text-[#5a3b00]'}`}>
                            {c.status}
                          </span>
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
    </AppLayout>
  )
}
