import { useState } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import AppLayout from '../../components/layout/AppLayout'

export default function DeptHeadSettings() {
  const { user } = useClerkUser()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    departmentTitle: 'Department of Computer Science & Information Technology',
    officeLocation: 'Science Block, Room 301',
    consultationHours: 'Tue & Thu 11:00 AM - 01:00 PM',
    requireCourseApproval: true,
    autoArchiveSemester: true,
    notifyCourseSubmissions: true,
    allowDirectAssignments: true,
  })

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <AppLayout role="dept_head">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">Department Head Settings</h2>
        <p className="text-[14px] text-[#44474f]">Configure departmental oversight policies, approval workflows, and office preferences.</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        {/* Department & Head Profile */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <h3 className="text-[18px] font-medium text-[#03224d] border-b border-[#c4c6d0] pb-3">Department Head Profile</h3>

          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Full Name</label>
            <input type="text" disabled value={user?.fullName || 'Department Head Account'} className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] bg-[#f6f3f2] text-[#747780] cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Official Email</label>
            <input type="email" disabled value={user?.primaryEmailAddress?.emailAddress || 'keitaazlan@gmail.com'} className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] bg-[#f6f3f2] text-[#747780] cursor-not-allowed" />
          </div>

          <div>
            <label htmlFor="deptTitle" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Department Name</label>
            <input
              id="deptTitle"
              type="text"
              value={form.departmentTitle}
              onChange={e => setForm(p => ({ ...p, departmentTitle: e.target.value }))}
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
              <label htmlFor="consultHrs" className="block text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Consultation Hours</label>
              <input
                id="consultHrs"
                type="text"
                value={form.consultationHours}
                onChange={e => setForm(p => ({ ...p, consultationHours: e.target.value }))}
                className="w-full border border-[#c4c6d0] rounded-md px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>
          </div>
        </div>

        {/* Oversight & Approval Governance */}
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 space-y-4">
          <h3 className="text-[18px] font-medium text-[#03224d] border-b border-[#c4c6d0] pb-3">Departmental Governance & Workflow Policies</h3>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.requireCourseApproval}
                onChange={e => setForm(p => ({ ...p, requireCourseApproval: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#086b53] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#1b1c1c]">Require Department Head review before publishing new courses</p>
              <p className="text-[12px] text-[#747780]">Courses remain in draft status until approved in Oversight.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.notifyCourseSubmissions}
                onChange={e => setForm(p => ({ ...p, notifyCourseSubmissions: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#086b53] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#1b1c1c]">Email alerts for new course approval requests</p>
              <p className="text-[12px] text-[#747780]">Receive instant notification when a lecturer submits a course for review.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.allowDirectAssignments}
                onChange={e => setForm(p => ({ ...p, allowDirectAssignments: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#c4c6d0] rounded-full peer peer-checked:bg-[#086b53] transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#1b1c1c]">Allow lecturers to post assignments without prior department approval</p>
              <p className="text-[12px] text-[#747780]">Grants faculty direct publishing rights for assignments & materials.</p>
            </div>
          </label>
        </div>

        {saved && (
          <div className="p-4 bg-[#a0f3d4] border border-[#086b53] rounded-lg text-[14px] text-[#086b53] font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Department Head settings saved successfully.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-[#03224d] text-white px-6 py-3 rounded text-[14px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? 'Saving Department Settings…' : 'Save Department Settings'}
        </button>
      </form>
    </AppLayout>
  )
}
