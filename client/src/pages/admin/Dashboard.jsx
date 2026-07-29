import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const tiles = stats ? [
    { label: 'Total Users', value: stats.totalUsers, icon: 'group', color: 'bg-[#03224d] text-white', sub: `${stats.students} students, ${stats.lecturers} lecturers` },
    { label: 'Active Courses', value: stats.activeCourses, icon: 'menu_book', color: 'bg-[#086b53] text-white', sub: `${stats.totalCourses} total courses` },
    { label: 'Schools', value: stats.totalSchools, icon: 'account_balance', color: 'bg-[#1f3864] text-white', sub: 'Academic Schools' },
    { label: 'Departments', value: stats.totalDepartments, icon: 'business', color: 'bg-[#543100] text-white', sub: 'Sub-unit departments' },
  ] : []

  return (
    <AppLayout role="admin">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">Admin Dashboard</h2>
        <p className="text-[14px] text-[#44474f]">Platform-wide overview of NELMS.</p>
      </div>

      {/* Stats tiles */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8"><LoadingSkeleton type="card" count={4} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
          {tiles.map(t => (
            <div key={t.label} className={`${t.color} rounded-xl p-6 relative overflow-hidden`}>
              <span className="material-symbols-outlined text-[32px] mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
              <p className="text-[12px] font-bold uppercase tracking-wider opacity-70 mb-1">{t.label}</p>
              <p className="text-[40px] font-bold leading-none mb-1">{t.value ?? 0}</p>
              <p className="text-[12px] opacity-70">{t.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Manage Users', desc: 'View, search, and update user roles.', icon: 'manage_accounts', to: '/users' },
          { title: 'Schools', desc: 'Manage Njala academic Schools.', icon: 'account_balance', to: '/schools' },
          { title: 'Departments', desc: 'Manage academic sub-departments.', icon: 'business', to: '/departments' },
          { title: 'Analytics', desc: 'Academic excellence reports.', icon: 'bar_chart', to: '/analytics' },
        ].map(l => (
          <Link key={l.to} to={l.to} className="bg-white border border-[#c4c6d0] rounded-xl p-6 flex items-start gap-4 hover:border-[#03224d] card-hover group">
            <div className="w-12 h-12 bg-[#f0eded] flex items-center justify-center rounded-lg group-hover:bg-[#03224d] transition-colors">
              <span className="material-symbols-outlined text-[#03224d] group-hover:text-white transition-colors">{l.icon}</span>
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#03224d] mb-1">{l.title}</h3>
              <p className="text-[14px] text-[#44474f]">{l.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  )
}
