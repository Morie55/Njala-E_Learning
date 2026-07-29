import { useState } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function LecturerSettings() {
  const { user } = useClerkUser()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: 'Senior Lecturer',
    officeLocation: 'Faculty Building, Room 204',
    officeHours: 'Mon & Wed 10:00 AM - 12:00 PM',
    notifySubmissions: true,
    notifyAnnouncements: true,
    defaultMaxScore: 100,
  })

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    // Simulate save / API call
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AppLayout role="lecturer">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">Lecturer Settings & Preferences</h2>
        <p className="text-[14px] text-[#44474f]">Manage your teaching profile, office hours, and notification preferences.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Profile & Office Information */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <h3 className="text-[18px] font-medium text-[#03224d] border-b border-[#c4c6d0] pb-3">Teaching Profile</h3>
          
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Full Name</label>
            <input type="text" disabled value={user?.fullName || 'Lecturer Account'} className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] bg-[#f6f3f2] text-[#747780] cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Email</label>
            <input type="email" disabled value={user?.primaryEmailAddress?.emailAddress || 'kmorie18c@njala.edu.sl'} className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] bg-[#f6f3f2] text-[#747780] cursor-not-allowed" />
          </div>

          <div>
            <label htmlFor="title" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Academic Title / Position</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="officeLoc" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Office Location</label>
              <input
                id="officeLoc"
                type="text"
                value={form.officeLocation}
                onChange={e => setForm(p => ({ ...p, officeLocation: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
            <div>
              <label htmlFor="officeHrs" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Office Hours</label>
              <input
                id="officeHrs"
                type="text"
                value={form.officeHours}
                onChange={e => setForm(p => ({ ...p, officeHours: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Course Defaults */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <h3 className="text-[18px] font-medium text-[#03224d] border-b border-[#c4c6d0] pb-3">Course & Notification Preferences</h3>

          <div>
            <label htmlFor="defaultMaxScore" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Default Max Assignment Score</label>
            <input
              id="defaultMaxScore"
              type="number"
              value={form.defaultMaxScore}
              onChange={e => setForm(p => ({ ...p, defaultMaxScore: Number(e.target.value) }))}
              className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.notifySubmissions}
                onChange={e => setForm(p => ({ ...p, notifySubmissions: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#086b53] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-[14px] font-medium text-[#1b1c1c]">Email me when a student submits an assignment</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.notifyAnnouncements}
                onChange={e => setForm(p => ({ ...p, notifyAnnouncements: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#086b53] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-[14px] font-medium text-[#1b1c1c]">Send notification confirmation when posting announcements</span>
          </label>
        </div>

        {saved && (
          <div className="p-4 bg-[#a0f3d4] border border-[#086b53] rounded-lg text-[14px] text-[#086b53] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Lecturer preferences saved successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-[#03224d] text-white px-6 py-3 rounded text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? 'Saving Preferences…' : 'Save Preferences'}
        </button>
      </form>
    </AppLayout>
  )
}
