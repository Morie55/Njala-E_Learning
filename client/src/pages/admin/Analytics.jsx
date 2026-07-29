import AppLayout from '../../components/layout/AppLayout'

export default function Analytics() {
  const stats = [
    { label: 'Average Completion Rate', value: '72%', trend: '+8%', icon: 'trending_up', color: 'text-[#086b53]' },
    { label: 'Active Student Sessions', value: '234', trend: '+12', icon: 'people', color: 'text-[#03224d]' },
    { label: 'Assignments Graded This Week', value: '1,402', trend: '+204', icon: 'grade', color: 'text-[#dd9235]' },
    { label: 'Average Grade Score', value: '68.4%', trend: '-1.2%', icon: 'assessment', color: 'text-[#ba1a1a]' },
  ]

  return (
    <AppLayout role="admin">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">Analytics</h2>
        <p className="text-[14px] text-[#44474f]">Platform-wide academic performance metrics.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-[#c4c6d0] rounded-xl p-5">
            <span className={`material-symbols-outlined ${s.color} text-[28px] block mb-2`}>{s.icon}</span>
            <p className="text-[12px] font-bold text-[#44474f] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-[28px] font-bold text-[#1b1c1c]">{s.value}</p>
            <p className={`text-[12px] font-bold mt-1 ${s.trend.startsWith('+') ? 'text-[#086b53]' : 'text-[#ba1a1a]'}`}>
              {s.trend} vs last week
            </p>
          </div>
        ))}
      </div>

      {/* Placeholder chart areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['Enrollment Trends', 'Grade Distribution'].map(t => (
          <div key={t} className="bg-white border border-[#c4c6d0] rounded-xl p-6">
            <h3 className="text-[18px] font-medium text-[#03224d] mb-4">{t}</h3>
            <div className="h-48 bg-[#f6f3f2] rounded-lg flex items-center justify-center">
              <p className="text-[14px] text-[#c4c6d0] font-medium">Chart visualization coming soon</p>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
