import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import PWAInstallBanner from '../ui/PWAInstallBanner'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import { useUser } from '../../hooks/useUser'

export default function AppLayout({ role: propRole, children, onSearch }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role: contextRole, dbUser, isLoaded } = useUser()
  const role = propRole || contextRole || dbUser?.role || 'student'

  const showSkeleton = !isLoaded && !propRole && !contextRole

  return (
    <div className="min-h-screen bg-[#fbf9f8]">
      <PWAInstallBanner />
      <Sidebar role={role} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <TopBar onMobileToggle={() => setMobileOpen(o => !o)} onSearch={onSearch} />
      <main className="lg:ml-[280px] pt-16 min-h-screen transition-all">
        <div className="max-w-[1280px] mx-auto p-4 sm:p-6 lg:p-8">
          {showSkeleton ? (
            <div className="max-w-5xl mx-auto py-6">
              <LoadingSkeleton type="card" count={3} />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  )
}
