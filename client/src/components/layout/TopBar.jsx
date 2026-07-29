import { useEffect, useState } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useUser } from '../../hooks/useUser'
import NotificationDropdown from '../ui/NotificationDropdown'
import AppsDropdown from '../ui/AppsDropdown'
import UserMenuDropdown from '../ui/UserMenuDropdown'
import api from '../../lib/api'

const ROLE_BADGES = {
  student: { label: 'Student', class: 'bg-[#d8e2ff] text-[#001a41]' },
  lecturer: { label: 'Lecturer', class: 'bg-[#a0f3d4] text-[#002117]' },
  dept_head: { label: 'Dept Head', class: 'bg-[#ffdcbb] text-[#2b1700]' },
  admin: { label: 'Admin', class: 'bg-[#03224d] text-white' },
}

export default function TopBar({ onMobileToggle, onSearch }) {
  const { user } = useClerkUser()
  const { role } = useUser()
  const [notifOpen, setNotifOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    api.get('/notifications')
      .then((r) => setUnreadCount(r.data?.unreadCount ?? 0))
      .catch(() => {})
  }, [])

  const displayName = user?.fullName || user?.firstName || 'User'
  const avatarUrl = user?.imageUrl

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[280px] h-16 bg-[#fbf9f8] border-b border-[#c4c6d0] flex justify-between items-center px-4 sm:px-6 z-40 transition-all">
      {/* Left: Mobile hamburger menu toggle + Search */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onMobileToggle}
          className="lg:hidden p-2 text-[#03224d] hover:bg-[#eae8e7] rounded-lg transition-colors shrink-0 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div className="relative w-full max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-xl">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#44474f] text-[20px]">search</span>
          <input
            className="w-full bg-[#f6f3f2] border border-[#c4c6d0] rounded-lg py-2 pl-9 pr-3 text-[13px] sm:text-[14px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 transition-all placeholder:text-[12px] sm:placeholder:text-[14px]"
            placeholder="Search catalog, materials..."
            type="text"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            id="notif-btn"
            className="p-2 text-[#44474f] hover:bg-[#e4e2e1] rounded-full transition-all cursor-pointer active:scale-95 relative"
            onClick={() => {
              setNotifOpen((o) => !o)
              setAppsOpen(false)
              setUserMenuOpen(false)
            }}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationDropdown
              onClose={() => setNotifOpen(false)}
              onUpdateCount={(count) => setUnreadCount(count)}
            />
          )}
        </div>

        {/* Apps launcher */}
        <div className="relative">
          <button
            id="apps-btn"
            onClick={() => {
              setAppsOpen((o) => !o)
              setNotifOpen(false)
              setUserMenuOpen(false)
            }}
            className="hidden sm:block p-2 text-[#44474f] hover:bg-[#e4e2e1] rounded-full transition-all cursor-pointer active:scale-95"
            aria-label="Apps"
          >
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">apps</span>
          </button>
          {appsOpen && <AppsDropdown onClose={() => setAppsOpen(false)} />}
        </div>

        <div className="h-6 sm:h-8 w-px bg-[#c4c6d0] mx-1 sm:mx-2" />

        {/* User avatar & interactive profile menu */}
        <div className="relative">
          <button
            onClick={() => {
              setUserMenuOpen((o) => !o)
              setNotifOpen(false)
              setAppsOpen(false)
            }}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group p-1 rounded-xl hover:bg-[#eae8e7] transition-all text-left"
            aria-label="User profile menu"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[13px] sm:text-[14px] font-bold leading-none mb-1 truncate max-w-[120px] lg:max-w-[180px] text-[#03224d]">
                {displayName}
              </p>
              {role && (
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase inline-block ${
                    ROLE_BADGES[role]?.class ?? 'bg-[#e4e2e1] text-[#44474f]'
                  }`}
                >
                  {ROLE_BADGES[role]?.label ?? role}
                </span>
              )}
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#1f3864] p-0.5 overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-xs">
              {avatarUrl ? (
                <img className="w-full h-full object-cover rounded-full" src={avatarUrl} alt={displayName} />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1f3864] flex items-center justify-center text-white text-[12px] sm:text-[14px] font-bold">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </button>

          {userMenuOpen && (
            <UserMenuDropdown
              user={user}
              role={role}
              onClose={() => setUserMenuOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  )
}
