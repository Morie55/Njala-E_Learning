import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const DEFAULT_SETTINGS = {
  universityName: 'Njala University',
  academicYear: '2025/2026',
  uploadLimitMb: 50,
  allowSelfEnrollment: true,
  requireDeptHeadApproval: false,
  passingGradePercent: 40,
  attendanceThreshold: 75,
  itSupportEmail: 'kmorie18c@njala.edu.sl',
}

export default function SystemSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/settings')
      .then(r => setSettings({ ...DEFAULT_SETTINGS, ...r.data?.settings }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await api.patch('/admin/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function update(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  if (loading) return (
    <AppLayout role="admin">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">System Settings</h2>
        <p className="text-[14px] text-[#44474f]">Platform configuration and policies.</p>
      </div>
      <LoadingSkeleton type="card" count={4} />
    </AppLayout>
  )

  return (
    <AppLayout role="admin">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">System Settings</h2>
        <p className="text-[14px] text-[#44474f]">Platform configuration. All changes are persisted to the database immediately.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">

        {/* General */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#03224d]">school</span>
            <h3 className="text-[18px] font-semibold text-[#03224d]">General</h3>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">University Name</label>
            <input
              type="text"
              value={settings.universityName}
              onChange={e => update('universityName', e.target.value)}
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Current Academic Year</label>
            <input
              type="text"
              value={settings.academicYear}
              onChange={e => update('academicYear', e.target.value)}
              placeholder="e.g. 2025/2026"
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">IT Support Email</label>
            <input
              type="email"
              value={settings.itSupportEmail}
              onChange={e => update('itSupportEmail', e.target.value)}
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors"
            />
          </div>
        </div>

        {/* Upload & Submissions */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#03224d]">upload_file</span>
            <h3 className="text-[18px] font-semibold text-[#03224d]">Upload &amp; Submissions</h3>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
              Max File Upload Size (MB)
            </label>
            <input
              type="number"
              min="5"
              max="500"
              value={settings.uploadLimitMb}
              onChange={e => update('uploadLimitMb', Number(e.target.value))}
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors"
            />
          </div>
        </div>

        {/* Academic Policy */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#03224d]">policy</span>
            <h3 className="text-[18px] font-semibold text-[#03224d]">Academic Policy</h3>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
              Passing Grade Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.passingGradePercent}
              onChange={e => update('passingGradePercent', Number(e.target.value))}
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors"
            />
            <p className="text-[11px] text-[#747780] mt-1">Njala University default: 40%</p>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">
              Minimum Attendance Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.attendanceThreshold}
              onChange={e => update('attendanceThreshold', Number(e.target.value))}
              className="w-full border border-[#c4c6d0] rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors"
            />
            <p className="text-[11px] text-[#747780] mt-1">Students below this threshold receive an attendance warning.</p>
          </div>
        </div>

        {/* Enrollment Policy */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#03224d]">how_to_reg</span>
            <h3 className="text-[18px] font-semibold text-[#03224d]">Enrollment Policy</h3>
          </div>

          {[
            { key: 'allowSelfEnrollment', label: 'Allow students to self-enroll in courses', sub: 'When off, students require manual admin enrollment.' },
            { key: 'requireDeptHeadApproval', label: 'Require department head approval to activate new courses', sub: 'When on, lecturers cannot activate courses without approval.' },
          ].map(({ key, label, sub }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!settings[key]}
                  onChange={e => update(key, e.target.checked)}
                />
                <div className="w-11 h-6 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#03224d] transition-colors" />
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1b1c1c] group-hover:text-[#03224d] transition-colors">{label}</p>
                <p className="text-[12px] text-[#747780] mt-0.5">{sub}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Status Messages */}
        {saved && (
          <div className="p-4 bg-[#a0f3d4] border border-[#086b53] rounded-xl text-[14px] text-[#086b53] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            Settings saved successfully and synced to the database.
          </div>
        )}
        {error && (
          <div className="p-4 bg-[#ffdad6] border border-[#ba1a1a] rounded-xl text-[14px] text-[#ba1a1a] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-[#03224d] text-white px-6 py-3 rounded-lg text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 shadow-sm"
        >
          {saving ? (
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">save</span>
          )}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </AppLayout>
  )
}
