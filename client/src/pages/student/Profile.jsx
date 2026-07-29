import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useUser } from '../../hooks/useUser'
import AppLayout from '../../components/layout/AppLayout'

export default function Profile() {
  const { user } = useClerkUser()
  const { dbUser } = useUser()

  const name = user?.fullName ?? 'Student'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const joined = dbUser?.createdAt ? new Date(dbUser.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  return (
    <AppLayout role="student">
      <h2 className="text-[32px] font-semibold text-[#03224d] mb-6">My Profile</h2>

      <div className="grid grid-cols-12 gap-6">
        {/* Profile card */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full border-4 border-[#1f3864] overflow-hidden mb-4">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1f3864] flex items-center justify-center text-white text-3xl font-bold">
                  {name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="text-[20px] font-semibold text-[#03224d] mb-1">{name}</h3>
            <p className="text-[12px] font-bold text-[#086b53] uppercase tracking-wider">
              {dbUser?.role?.replace('_', ' ') ?? 'Student'}
            </p>
            <div className="mt-4 pt-4 border-t border-[#c4c6d0] text-left space-y-3">
              <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span className="truncate">{email}</span>
              </div>
              <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                <span>Joined {joined}</span>
              </div>
              {dbUser?.departmentId && (
                <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                  <span className="material-symbols-outlined text-[18px]">business</span>
                  <span>Department enrolled</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info panels */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6">
            <h3 className="text-[20px] font-semibold text-[#03224d] mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', value: name },
                { label: 'Email Address', value: email },
                { label: 'Role', value: dbUser?.role?.replace('_', ' ') ?? '—' },
                { label: 'Member Since', value: joined },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 bg-[#f6f3f2] rounded-lg">
                  <p className="text-[12px] font-bold text-[#44474f] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-[14px] text-[#1b1c1c] font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1f3864] text-white rounded-xl p-6">
            <h3 className="text-[18px] font-medium mb-2">Need to update your profile?</h3>
            <p className="text-[14px] opacity-80 mb-4">Your profile is managed through your university Clerk account. Contact IT to update your details.</p>
            <a href="mailto:keitamorie@gmail.com" className="inline-block bg-white text-[#03224d] px-4 py-2 rounded text-[12px] font-bold hover:bg-white/90 transition-colors">
              Contact IT Support
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
