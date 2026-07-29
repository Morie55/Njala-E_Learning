import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAnalytics() {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/analytics')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to load analytics.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const kpis = data?.kpis
    ? [
        {
          label: 'Average Completion Rate',
          value: `${data.kpis.avgCompletionRate}%`,
          subtext: 'across active course enrollments',
          icon: 'trending_up',
          color: 'text-[#086b53]',
          bgColor: 'bg-[#086b53]/10',
        },
        {
          label: 'Enrolled Students',
          value: `${data.kpis.totalStudents}`,
          subtext: `${data.kpis.totalLecturers} Lecturers | ${data.kpis.totalDeptHeads} Dept Heads`,
          icon: 'people',
          color: 'text-[#03224d]',
          bgColor: 'bg-[#03224d]/10',
        },
        {
          label: 'Graded Submissions',
          value: `${data.kpis.gradedSubmissionsCount}`,
          subtext: 'total evaluated assignments',
          icon: 'grade',
          color: 'text-[#dd9235]',
          bgColor: 'bg-[#dd9235]/10',
        },
        {
          label: 'Average Grade Score',
          value: `${data.kpis.avgScore}%`,
          subtext: 'overall academic performance',
          icon: 'assessment',
          color: 'text-[#ba1a1a]',
          bgColor: 'bg-[#ba1a1a]/10',
        },
      ]
    : []

  const maxGradeCount = Math.max(1, ...(data?.gradeDistribution?.map((g) => g.count) ?? [1]))
  const totalUsersCount = Math.max(1, ...(data?.roles?.map((r) => r.count) ?? [1]))

  return (
    <AppLayout role="admin">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-[32px] font-semibold text-[#03224d]">Analytics</h2>
          <p className="text-[13px] sm:text-[14px] text-[#44474f]">Platform-wide academic performance & user metrics.</p>
        </div>
        <button
          onClick={loadAnalytics}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 border border-[#c4c6d0] rounded-lg text-[13px] font-semibold text-[#03224d] hover:bg-[#f0eded] transition-colors cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Refresh Metrics
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#ffdad6] border border-[#ba1a1a] text-[#ba1a1a] rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span className="text-[14px] font-medium">{error}</span>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton type="cards" count={4} />
      ) : (
        <>
          {/* KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {kpis.map((s) => (
              <div key={s.label} className="bg-white border border-[#c4c6d0] rounded-xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className={`w-10 h-10 ${s.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                    <span className={`material-symbols-outlined ${s.color} text-[24px]`}>{s.icon}</span>
                  </div>
                  <p className="text-[12px] font-bold text-[#44474f] uppercase tracking-wide mb-1">{s.label}</p>
                  <p className="text-[28px] font-bold text-[#1b1c1c]">{s.value}</p>
                </div>
                <p className="text-[12px] text-[#747780] mt-3 pt-3 border-t border-[#f0eded] font-medium">{s.subtext}</p>
              </div>
            ))}
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Grade Distribution */}
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-bold text-[#03224d]">Grade Distribution</h3>
                <span className="text-[12px] font-bold text-[#747780] bg-[#f0eded] px-2.5 py-1 rounded-full">
                  {data?.kpis?.gradedSubmissionsCount ?? 0} Graded
                </span>
              </div>
              <div className="space-y-4">
                {data?.gradeDistribution?.map((g) => {
                  const pct = Math.round((g.count / maxGradeCount) * 100)
                  return (
                    <div key={g.name}>
                      <div className="flex justify-between text-[13px] font-semibold text-[#1b1c1c] mb-1">
                        <span>{g.name}</span>
                        <span className="text-[#44474f] font-mono">{g.count} submissions</span>
                      </div>
                      <div className="w-full h-3 bg-[#f0eded] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, g.count > 0 ? 6 : 0)}%`, backgroundColor: g.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* User Roles Breakdown */}
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-bold text-[#03224d]">User Role Breakdown</h3>
                <span className="text-[12px] font-bold text-[#747780] bg-[#f0eded] px-2.5 py-1 rounded-full">
                  {(data?.roles?.reduce((a, r) => a + r.count, 0)) ?? 0} Total Users
                </span>
              </div>
              <div className="space-y-4">
                {data?.roles?.map((r) => {
                  const total = data.roles.reduce((acc, curr) => acc + curr.count, 0) || 1
                  const pct = Math.round((r.count / total) * 100)
                  return (
                    <div key={r.name}>
                      <div className="flex justify-between text-[13px] font-semibold text-[#1b1c1c] mb-1">
                        <span>{r.name}</span>
                        <span className="text-[#44474f] font-mono">
                          {r.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-[#f0eded] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, r.count > 0 ? 5 : 0)}%`, backgroundColor: r.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* School Academic Breakdown */}
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 shadow-xs">
            <h3 className="text-[18px] font-bold text-[#03224d] mb-4">School Academic Distribution</h3>
            {data?.schools?.length === 0 ? (
              <p className="text-[14px] text-[#747780] py-4">No school distribution data recorded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data?.schools?.map((s) => (
                  <div key={s._id} className="p-4 border border-[#c4c6d0] rounded-lg bg-[#fbf9f8]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[15px] font-bold text-[#03224d] truncate">{s.name}</h4>
                      <span className="text-[11px] font-mono uppercase bg-[#03224d]/10 text-[#03224d] px-2 py-0.5 rounded font-bold">
                        {s.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[13px] text-[#44474f] font-medium">
                      <span>{s.courseCount} Courses</span>
                      <span>•</span>
                      <span>{s.userCount} Users</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  )
}
