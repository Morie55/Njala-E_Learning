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
    { icon: 'chat', label: 'Messages', path: '/messages' },
    { icon: 'assignment', label: 'Assignments', path: '/assignments' },
    { icon: 'grade', label: 'Grades', path: '/grades' },
    { icon: 'calendar_month', label: 'Timetable', path: '/timetable' },
    { icon: 'event_available', label: 'Attendance', path: '/attendance' },
    { icon: 'bar_chart', label: 'My Progress', path: '/progress' },
    { icon: 'payments', label: 'Fee Payments', path: '/payments' },
    { icon: 'workspace_premium', label: 'Alumni Portal', path: '/alumni/dashboard' },
    { icon: 'person', label: 'Profile', path: '/profile' },
  ],
  lecturer: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'menu_book', label: 'My Courses', path: '/courses' },
    { icon: 'chat', label: 'Messages', path: '/messages' },
    { icon: 'calendar_month', label: 'Timetable', path: '/timetable' },
    { icon: 'quiz', label: 'Create Quiz', path: '/quizzes/create' },
    { icon: 'campaign', label: 'Announcements', path: '/announcements/new' },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ],
  dept_head: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'manage_search', label: 'Course Oversight', path: '/oversight' },
    { icon: 'summarize', label: 'Dept Report', path: '/dept-report' },
    { icon: 'date_range', label: 'Academic Calendar', path: '/academic-calendar' },
    { icon: 'chat', label: 'Messages', path: '/messages' },
    { icon: 'calendar_month', label: 'Timetable', path: '/timetable' },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ],
  admin: [
    { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { icon: 'group', label: 'Users', path: '/users' },
    { icon: 'account_balance', label: 'Schools', path: '/schools' },
    { icon: 'business', label: 'Departments', path: '/departments' },
    { icon: 'date_range', label: 'Academic Calendar', path: '/academic-calendar' },
    { icon: 'calendar_month', label: 'Timetable', path: '/timetable' },
    { icon: 'chat', label: 'Messages', path: '/messages' },
    { icon: 'bar_chart', label: 'Analytics', path: '/analytics' },
    { icon: 'summarize', label: 'Dept Report', path: '/dept-report' },
    { icon: 'payments', label: 'Payments', path: '/payments' },
    { icon: 'manage_search', label: 'Audit Logs', path: '/audit-logs' },
    { icon: 'settings', label: 'Settings', path: '/settings' },
  ],
  alumni: [
    { icon: 'dashboard', label: 'Alumni Portal', path: '/alumni/dashboard' },
    { icon: 'school', label: 'Past Courses', path: '/courses' },
    { icon: 'grade', label: 'Grades Record', path: '/grades' },
  ],
}

const ROLE_LABELS = {
  student: 'Student Portal',
  lecturer: 'Lecturer Portal',
  dept_head: 'Dept Head Portal',
  admin: 'Admin Console',
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
      <div
        className={clsx(
          'fixed inset-0 bg-[#03224d]/60 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-full max-h-screen w-[280px] sm:w-[290px] max-w-[85vw] bg-[#fbf9f8] border-r border-[#c4c6d0] flex flex-col py-5 sm:py-6 z-50 transition-transform duration-300 ease-in-out overflow-y-auto no-scrollbar',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'
        )}
      >
        {/* Header (Logo + Mobile Close Button) */}
        <div className="px-5 sm:px-6 mb-6 sm:mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden bg-[#03224d] shrink-0 p-0.5">
              <img src={njalaLogo} alt="Njala University Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg sm:text-[20px] font-bold leading-tight text-[#03224d]">NELMS</h1>
              <p className="text-[11px] sm:text-[12px] font-medium text-[#086b53]">{ROLE_LABELS[role] ?? 'Academic Portal'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-full text-[#44474f] hover:bg-[#eae8e7] hover:text-[#03224d] transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1.5 px-3 sm:px-4">
          {items.map(({ icon, label, path }) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path + '/'))
            return (
              <Link
                key={path}
                to={path}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3.5 px-3.5 py-2.5 sm:py-3 rounded-xl transition-all duration-200 text-sm font-semibold select-none',
                  active
                    ? 'bg-[#03224d] text-white shadow-xs'
                    : 'text-[#44474f] hover:bg-[#f0eded] hover:text-[#03224d]'
                )}
              >
                <span
                  className="material-symbols-outlined text-[20px] sm:text-[22px]"
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
        <div className="mt-auto px-4 sm:px-5 space-y-1 pt-4 border-t border-[#c4c6d0]/60">
          <a
            href="mailto:support@njala.edu.sl"
            className="flex items-center gap-3 px-3 py-2.5 text-[#44474f] hover:text-[#03224d] hover:bg-[#f0eded] rounded-xl transition-all text-xs sm:text-sm font-semibold group"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">help</span>
            <span>Help & Support</span>
          </a>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-3 px-3 py-2.5 text-[#ba1a1a] hover:bg-[#ffdad6]/60 rounded-xl transition-all text-xs sm:text-sm font-bold w-full cursor-pointer group active:scale-98"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:translate-x-0.5 transition-transform">logout</span>
            <span>Sign Out</span>
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-[#c4c6d0]/50">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setShowLogoutModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-[14px] font-semibold text-[#44474f] hover:bg-[#f0eded] rounded-lg transition-colors cursor-pointer disabled:opacity-50 text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleConfirmLogout}
                className="w-full sm:w-auto px-4 py-2 text-[14px] font-semibold text-white bg-[#ba1a1a] hover:bg-[#93000a] rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
