import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import PWAInstallBanner from '../ui/PWAInstallBanner'
import { useUser } from '../../hooks/useUser'

export default function AppLayout({ role: propRole, children, onSearch }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role: contextRole } = useUser()
  const role = propRole || contextRole

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PWAInstallBanner />
      <Sidebar role={role} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <TopBar onMobileToggle={() => setMobileOpen(o => !o)} onSearch={onSearch} />
      <main className="lg:ml-[280px] pt-16 min-h-screen transition-all">
        <div className="max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
