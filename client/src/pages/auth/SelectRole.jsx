import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { useUser } from '../../hooks/useUser'
import api from '../../lib/api'
import njalaLogo from '../../assets/Njala University.jpg'

const ROLES = [
  {
    id: 'student',
    title: 'Student',
    icon: 'school',
    badge: 'Learner',
    color: 'from-[#086b53]/10 to-[#086b53]/5 border-[#086b53]/30 text-[#086b53]',
    description: 'Access enrolled courses, submit assignments, track attendance, take quizzes, and view academic grades.',
  },
  {
    id: 'lecturer',
    title: 'Lecturer',
    icon: 'record_voice_over',
    badge: 'Faculty',
    color: 'from-[#03224d]/10 to-[#03224d]/5 border-[#03224d]/30 text-[#03224d]',
    description: 'Manage course content, publish materials, create assignments, grade student work, and track attendance.',
  },
  {
    id: 'dept_head',
    title: 'Department Head',
    icon: 'account_balance',
    badge: 'Leadership',
    color: 'from-[#dd9235]/10 to-[#dd9235]/5 border-[#dd9235]/30 text-[#dd9235]',
    description: 'Oversee departmental courses, lecturers, student performance, and generate academic reports.',
  },
]

export default function SelectRole() {
  const { dbUser, refetchUser } = useUser()
  const [selectedRole, setSelectedRole] = useState(dbUser?.requestedRole || 'student')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { signOut } = useClerk()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedRole) {
      setError('Please select a system role to proceed.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.patch('/users/me/select-role', { role: selectedRole })
      await refetchUser()
      navigate('/pending-approval', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit role request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf9f8] text-[#1b1c1c] flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Navbar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 border-b border-[#c4c6d0]/50 mb-6">
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

      {/* Main Content */}
      <section className="max-w-3xl w-full mx-auto bg-white border border-[#c4c6d0] rounded-2xl p-6 sm:p-8 md:p-10 shadow-sm my-auto">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#086b53]/10 text-[#086b53] text-[12px] font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-[#086b53] animate-pulse" />
            Role Selection
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#03224d]">Select Your System Role</h2>
          <p className="text-sm text-[#44474f] mt-2 leading-relaxed">
            Welcome, <span className="font-semibold text-[#1b1c1c]">{dbUser?.fullName || dbUser?.email || 'User'}</span>! Please select the role you require within Njala University E-Learning Platform.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] text-xs sm:text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.id
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`relative p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#03224d] bg-gradient-to-br ' + role.color + ' shadow-md scale-[1.01]'
                      : 'border-[#c4c6d0]/70 bg-white hover:border-[#03224d]/50 hover:bg-[#f6f3f2]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-[#03224d] text-white shadow-xs' : 'bg-[#f6f3f2] text-[#03224d]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[22px]">{role.icon}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-[#c4c6d0]/50 text-[#44474f]">
                          {role.badge}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'border-[#03224d] bg-[#03224d]' : 'border-[#c4c6d0]'
                          }`}
                        >
                          {isSelected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                        </div>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-[#03224d]">{role.title}</h3>
                    <p className="text-xs text-[#44474f] mt-1.5 leading-relaxed">{role.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#c4c6d0]/50">
            <p className="text-xs text-[#44474f] text-center sm:text-left">
              An administrator will verify your credentials and assign permissions based on your requested role.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-[#03224d] hover:bg-[#1f3864] text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Request…
                </>
              ) : (
                <>
                  Submit Role Request
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-4 text-xs text-[#44474f]">
        Njala University E-Learning Management System (NELMS) &bull; Official Registration System
      </footer>
    </main>
  )
}
