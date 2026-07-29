import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'

const ROLE_BADGES = {
  student: { label: 'Student', class: 'bg-[#d8e2ff] text-[#001a41]' },
  lecturer: { label: 'Lecturer', class: 'bg-[#a0f3d4] text-[#002117]' },
  dept_head: { label: 'Dept Head', class: 'bg-[#ffdcbb] text-[#2b1700]' },
  admin: { label: 'Admin', class: 'bg-[#03224d] text-white' },
}

export default function UserMenuDropdown({ user, role, onClose }) {
  const ref = useRef(null)
  const navigate = useNavigate()
  const { openUserProfile, signOut } = useClerk()

  const displayName = user?.fullName || user?.firstName || 'User'
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || ''
  const avatarUrl = user?.imageUrl

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleOpenProfile = () => {
    navigate('/profile')
    onClose()
  }

  const handleOpenAccountSettings = () => {
    onClose()
    openUserProfile()
  }

  const handleSignOut = () => {
    onClose()
    signOut()
  }

  return (
    <div
      ref={ref}
      className="fixed top-16 right-3 left-3 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-72 max-w-sm sm:max-w-none ml-auto bg-white border border-[#c4c6d0] rounded-xl sm:rounded-2xl shadow-2xl z-50 overflow-hidden font-sans"
      style={{ boxShadow: '0 12px 32px -8px rgba(3,34,77,0.18)' }}
    >
      {/* Header Profile Section */}
      <div className="p-4 bg-[#fbf9f8] border-b border-[#c4c6d0] flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-[#1f3864] p-0.5 overflow-hidden shrink-0">
          {avatarUrl ? (
            <img className="w-full h-full object-cover rounded-full" src={avatarUrl} alt={displayName} />
          ) : (
            <div className="w-full h-full rounded-full bg-[#1f3864] flex items-center justify-center text-white text-[16px] font-bold">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#1b1c1c] truncate">{displayName}</p>
          {email && <p className="text-[12px] text-[#44474f] truncate">{email}</p>}
          {role && (
            <span
              className={`mt-1 text-[9px] font-bold px-2 py-0.5 rounded tracking-wide uppercase inline-block ${
                ROLE_BADGES[role]?.class ?? 'bg-[#e4e2e1] text-[#44474f]'
              }`}
            >
              {ROLE_BADGES[role]?.label ?? role}
            </span>
          )}
        </div>
      </div>

      {/* Menu Actions */}
      <div className="p-2 space-y-1">
        <button
          onClick={handleOpenProfile}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-[#1b1c1c] hover:bg-[#f6f3f2] hover:text-[#03224d] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] text-[#03224d]">person</span>
          <span>View Academic Profile</span>
        </button>

        <button
          onClick={handleOpenAccountSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-[#1b1c1c] hover:bg-[#f6f3f2] hover:text-[#03224d] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] text-[#03224d]">manage_accounts</span>
          <span>Account Settings (Clerk)</span>
        </button>

        <div className="h-px bg-[#c4c6d0]/50 my-1" />

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/50 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
