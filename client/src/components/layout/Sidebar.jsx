import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import clsx from 'clsx'
import njalaLogo from '../../assets/Njala University.jpg'
import Modal from '../ui/Modal'

const NAV = {
  student: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'school', label: 'My Courses', path: '/courses' },
    { icon: 'assignment', label: 'Assignments', path: '/assignments' },
    { icon: 'grade', label: 'Grades', path: '/grades' },
    { icon: 'person', label: 'Profile', path: '/profile' },
  ],
  lecturer: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'menu_book', label: 'My Courses', path: '/courses' },
    { icon: 'campaign', label: 'Announcements', path: '/announcements/new' },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ],
  dept_head: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'manage_search', label: 'Course Oversight', path: '/oversight' },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ],
  admin: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'group', label: 'Users', path: '/users' },
    { icon: 'account_balance', label: 'Schools', path: '/schools' },
    { icon: 'business', label: 'Departments', path: '/departments' },
    { icon: 'bar_chart', label: 'Analytics', path: '/analytics' },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ],
}

export default function Sidebar({ role, mobileOpen, onClose }) {
  const location = useLocation()
  const { signOut } = useClerk()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const items = NAV[role] ?? []

  const handleConfirmLogout = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
    } catch (err) {
      console.error('Logout error:', err)
      setIsSigningOut(false)
    }
  }

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-[#03224d]/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen w-[280px] bg-[#fbf9f8] border-r border-[#c4c6d0] flex flex-col py-6 z-50 transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'
        )}
      >
        {/* Header (Logo + Mobile Close Button) */}
        <div className="px-6 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden bg-[#03224d] shrink-0 rounded-lg shadow-xs">
              <img src={njalaLogo} alt="Njala University Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold leading-7 text-[#03224d]">NELMS</h1>
              <p className="text-[12px] leading-4 text-[#44474f]">Academic Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-full text-[#44474f] hover:bg-[#eae8e7] transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {items.map(({ icon, label, path }) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path + '/'))
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-6 py-3 transition-all duration-200 text-[14px] leading-[22px] font-medium',
                  active
                    ? 'sidebar-item-active font-bold text-[#03224d]'
                    : 'text-[#44474f] hover:bg-[#f0eded] hover:text-[#03224d] border-l-4 border-transparent'
                )}
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {icon}
                </span>
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto px-6 space-y-1.5 pt-4 border-t border-[#c4c6d0]/50">
          <a
            href="mailto:support@njala.edu.sl"
            className="flex items-center gap-3 px-3 py-2.5 -mx-3 text-[#44474f] hover:text-[#03224d] hover:bg-[#f0eded] rounded-lg transition-all text-[14px] font-medium group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">help</span>
            <span>Help Center</span>
          </a>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 px-3 py-2.5 -mx-3 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-lg transition-all text-[14px] font-semibold w-full cursor-pointer group active:scale-98"
          >
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Interactive Logout Confirmation Modal */}
      {showLogoutModal && (
        <Modal title="Confirm Sign Out" onClose={() => !isSigningOut && setShowLogoutModal(false)} size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-[#ffdad6]/40 rounded-lg text-[#93000a]">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <p className="text-[13px] leading-tight font-medium">
                You will be signed out of your current session on this device.
              </p>
            </div>

            <p className="text-[14px] text-[#44474f]">
              Are you sure you want to end your session? Any unsaved form progress will be lost.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#c4c6d0]/50">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-[14px] font-semibold text-[#44474f] hover:bg-[#f0eded] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-[14px] font-semibold text-white bg-[#ba1a1a] hover:bg-[#93000a] rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSigningOut ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
