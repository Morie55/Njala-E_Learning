import { useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'

export default function SystemSettings() {
  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AppLayout role="admin">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">System Settings</h2>
        <p className="text-[14px] text-[#44474f]">Platform configuration and policies.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* General */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <h3 className="text-[18px] font-medium text-[#03224d] mb-2">General</h3>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">University Name</label>
            <input type="text" defaultValue="Njala University" className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Academic Year</label>
            <input type="text" defaultValue="2025/2026" className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Default Upload Limit (MB)</label>
            <input type="number" defaultValue="50" min="5" max="500" className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]" />
          </div>
        </div>

        {/* Enrollment Policy */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <h3 className="text-[18px] font-medium text-[#03224d] mb-2">Enrollment Policy</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#03224d] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-[14px] font-medium text-[#1b1c1c]">Allow self-enrollment</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-10 h-5 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#03224d] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-[14px] font-medium text-[#1b1c1c]">Require department head approval for course activation</span>
          </label>
        </div>

        {saved && (
          <div className="p-4 bg-[#a0f3d4] border border-[#086b53] rounded-lg text-[14px] text-[#086b53] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Settings saved successfully.
          </div>
        )}

        <button type="submit" className="bg-[#03224d] text-white px-6 py-3 rounded text-[14px] font-bold hover:opacity-90 transition-opacity">
          Save Settings
        </button>
      </form>
    </AppLayout>
  )
}
