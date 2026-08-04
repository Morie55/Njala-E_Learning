import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { useUser } from '../../hooks/useUser'
import njalaLogo from '../../assets/Njala University.jpg'

export default function AccountRejected() {
  const { dbUser } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()

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

      {/* Rejection Card */}
      <section className="max-w-xl w-full mx-auto bg-white border border-[#ba1a1a]/30 rounded-2xl p-6 sm:p-8 md:p-10 shadow-sm text-center my-auto">
        <div className="w-20 h-20 rounded-full bg-[#ffdad6] border border-[#ba1a1a]/20 flex items-center justify-center text-[#ba1a1a] mx-auto mb-6 shadow-inner">
          <span className="material-symbols-outlined text-[42px]">cancel</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-[#ba1a1a] mb-2">Account Request Rejected</h2>
        <p className="text-sm text-[#44474f] max-w-md mx-auto leading-relaxed mb-6">
          Your account request has been reviewed by an administrator and was not approved.
        </p>

        {dbUser?.rejectionReason && (
          <div className="bg-[#ffdad6]/40 border border-[#ba1a1a]/30 rounded-xl p-4 text-left mb-6 text-xs sm:text-sm">
            <span className="font-bold text-[#93000a] block mb-1 uppercase tracking-wider text-[11px]">Rejection Reason:</span>
            <p className="text-[#1b1c1c] leading-relaxed">{dbUser.rejectionReason}</p>
          </div>
        )}

        <div className="bg-[#f6f3f2] rounded-xl p-4 text-xs text-[#44474f] mb-6 text-left">
          <p>
            If you believe this decision was made in error or if you need further clarification regarding your registration eligibility, please contact Njala University IT Support or your department administrator.
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => signOut(() => navigate('/sign-in'))}
            className="bg-[#03224d] hover:bg-[#1f3864] text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Return to Login Page
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto text-center py-4 text-xs text-[#44474f]">
        Njala University E-Learning Management System (NELMS)
      </footer>
    </main>
  )
}
