import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { useUser } from '../../hooks/useUser'
import njalaLogo from '../../assets/Njala University.jpg'

export default function AwaitingApproval() {
  const { dbUser, refetchUser } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null)

  async function handleRefreshStatus() {
    setChecking(true)
    setStatusMsg(null)
    try {
      const updatedUser = await refetchUser()
      const status = updatedUser?.status ? String(updatedUser.status).toUpperCase() : ''
      if (status === 'APPROVED' || status === 'ACTIVE') {
        setStatusMsg({ type: 'success', text: 'Your account has been approved! Redirecting to dashboard…' })
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 1000)
      } else if (status === 'REJECTED') {
        navigate('/account-rejected', { replace: true })
      } else {
        setStatusMsg({ type: 'info', text: 'Your account is still pending administrator review. Please check back later.' })
      }
    } catch (_) {
      setStatusMsg({ type: 'error', text: 'Failed to refresh account status. Please try again.' })
    } finally {
      setChecking(false)
    }
  }

  const requestedRoleLabel = dbUser?.requestedRole
    ? dbUser.requestedRole.replace('_', ' ').toUpperCase()
    : 'STUDENT'

  return (
    <main className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c] flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Navbar */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between py-2 border-b border-[#c4c6d0]/50 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl p-0.5 bg-white border border-[#c4c6d0] shadow-xs flex items-center justify-center shrink-0">
            <img src={njalaLogo} alt="Njala University Logo" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none text-[#03224d]">NELMS</h1>
            <p className="text-[10px] text-[#086b53] font-bold uppercase tracking-wider mt-0.5">Njala University</p>
          </div>
        </div>

        <button
          onClick={() => signOut(() => navigate('/sign-in'))}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#44474f] hover:text-[#03224d] px-3 py-1.5 rounded-lg border border-[#c4c6d0] hover:bg-white transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Sign Out
        </button>
      </header>

      {/* Main Container */}
      <section className="max-w-xl w-full mx-auto bg-white border border-[#c4c6d0] rounded-2xl p-6 sm:p-8 md:p-10 shadow-sm text-center my-auto">
        {/* Animated Badge & Success Icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#086b53]/10 border border-[#086b53]/20 flex items-center justify-center text-[#086b53] shadow-inner">
            <span className="material-symbols-outlined text-[42px]">verified_user</span>
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#dd9235] text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-xs">
            <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-[#03224d] mb-2">Thanks for Signing Up!</h2>
        <p className="text-sm sm:text-base text-[#44474f] max-w-md mx-auto leading-relaxed mb-6">
          Your account has been created successfully and is currently awaiting administrator approval.
        </p>

        {/* Info Card */}
        <div className="bg-[#f6f3f2] border border-[#c4c6d0]/60 rounded-xl p-4 text-left mb-6 space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between border-b border-[#c4c6d0]/40 pb-2">
            <span className="text-[#44474f] font-medium">Email Address</span>
            <span className="font-bold text-[#03224d] truncate max-w-[200px]">{dbUser?.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-[#c4c6d0]/40 py-2">
            <span className="text-[#44474f] font-medium">Requested Intended Role</span>
            <span className="font-bold text-[#086b53] bg-[#086b53]/10 px-2.5 py-0.5 rounded-full border border-[#086b53]/20">
              {requestedRoleLabel}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#44474f] font-medium">Account Status</span>
            <span className="font-bold text-[#dd9235] bg-[#dd9235]/10 px-2.5 py-0.5 rounded-full border border-[#dd9235]/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#dd9235] animate-ping" />
              Awaiting Approval
            </span>
          </div>
        </div>

        <div className="bg-[#03224d]/5 border border-[#03224d]/15 rounded-xl p-4 text-xs text-[#03224d] mb-6 text-left flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-[#03224d] shrink-0 mt-0.5">info</span>
          <p className="leading-relaxed">
            An administrator will review your account registration and assign system permissions based on your requested role. Please check back later.
          </p>
        </div>

        {statusMsg && (
          <div
            className={`mb-6 p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border ${
              statusMsg.type === 'success'
                ? 'bg-[#a0f3d4]/30 border-[#086b53] text-[#003829]'
                : statusMsg.type === 'error'
                ? 'bg-[#ffdad6] border-[#ba1a1a] text-[#93000a]'
                : 'bg-[#e2e7f7] border-[#03224d]/40 text-[#03224d]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {statusMsg.type === 'success' ? 'check_circle' : statusMsg.type === 'error' ? 'error' : 'info'}
            </span>
            {statusMsg.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleRefreshStatus}
            disabled={checking}
            className="w-full sm:w-auto bg-[#086b53] hover:bg-[#00513e] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {checking ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Checking Status…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Refresh Status
              </>
            )}
          </button>

          <button
            onClick={() => signOut(() => navigate('/sign-in'))}
            className="w-full sm:w-auto border border-[#c4c6d0] text-[#1b1c1c] hover:bg-[#f6f3f2] px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto text-center py-4 text-xs text-[#44474f]">
        Njala University E-Learning Management System (NELMS) &bull; Account Verification Gate
      </footer>
    </main>
  )
}
