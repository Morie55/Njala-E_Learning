import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function ActivateAccount() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleActivate(e) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.post('/users/me/activate', { newPassword })
      // Activation complete -> redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.response?.data?.error ?? err.message ?? 'Activation failed.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8] flex items-center justify-center p-4">
      <div className="bg-white border border-[#c4c6d0] rounded-xl p-8 max-w-md w-full shadow-xl">
        <div className="w-14 h-14 bg-[#a0f3d4]/50 rounded-full flex items-center justify-center mx-auto mb-4 text-[#086b53]">
          <span className="material-symbols-outlined text-3xl">key</span>
        </div>

        <h2 className="text-[24px] font-bold text-[#03224d] text-center mb-1">
          Activate Your NELMS Account
        </h2>
        <p className="text-[14px] text-[#44474f] text-center mb-6">
          Welcome to Njala E-Learning Portal! You logged in with a temporary PIN. Please set a new permanent password to activate your account.
        </p>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
              New Permanent Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters..."
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password..."
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#ba1a1a] font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#03224d] text-white py-3 rounded-lg text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Activating Account…</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">check_circle</span> Set Password & Activate</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
