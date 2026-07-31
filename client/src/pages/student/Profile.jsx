import { useEffect, useState } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useUser } from '../../hooks/useUser'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function Profile() {
  const { user } = useClerkUser()
  const { dbUser } = useUser()
  const [enrollments, setEnrollments] = useState([])
  const [gpa, setGpa] = useState(null)
  const [loading, setLoading] = useState(true)

  const name = user?.fullName ?? dbUser?.fullName ?? 'Student'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const joined = dbUser?.createdAt
    ? new Date(dbUser.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  useEffect(() => {
    Promise.all([
      api.get('/courses?enrolled=true').catch(() => ({ data: { courses: [] } })),
      dbUser?.role === 'student'
        ? api.get('/submissions/gpa').catch(() => ({ data: null }))
        : Promise.resolve({ data: null }),
    ]).then(([cRes, gRes]) => {
      setEnrollments(cRes.data?.courses ?? [])
      setGpa(gRes.data)
    }).finally(() => setLoading(false))
  }, [dbUser?.role])

  const gpaClass = (g) => {
    if (g >= 4.5) return 'text-[#086b53] bg-[#a0f3d4]'
    if (g >= 3.5) return 'text-[#001a73] bg-[#d8e2ff]'
    if (g >= 2.5) return 'text-[#5a3b00] bg-[#ffe8b5]'
    return 'text-[#93000a] bg-[#ffdad6]'
  }

  return (
    <AppLayout role={dbUser?.role ?? 'student'}>
      <h2 className="text-[32px] font-semibold text-[#03224d] mb-6">My Profile</h2>

      <div className="grid grid-cols-12 gap-6">
        {/* Profile Card */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full border-4 border-[#1f3864] overflow-hidden mb-4 shadow-sm">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1f3864] flex items-center justify-center text-white text-3xl font-bold">
                  {name[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="text-[20px] font-semibold text-[#03224d] mb-1">{name}</h3>
            <p className="text-[12px] font-bold text-[#086b53] uppercase tracking-wider mb-4">
              {dbUser?.role?.replace('_', ' ') ?? 'Student'}
            </p>

            {/* GPA Badge */}
            {gpa && gpa.cumulativeGpa > 0 && (
              <div className={`mx-auto w-fit px-4 py-2 rounded-xl text-[12px] font-bold mb-4 ${gpaClass(gpa.cumulativeGpa)}`}>
                <span className="text-[20px] font-extrabold block">{gpa.cumulativeGpa.toFixed(2)}</span>
                <span className="block">Cumulative GPA</span>
                <span className="block text-[10px] opacity-80 mt-0.5">{gpa.cumulativeClass}</span>
              </div>
            )}

            <div className="pt-4 border-t border-[#c4c6d0] text-left space-y-3">
              <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                <span className="material-symbols-outlined text-[18px] text-[#03224d]">mail</span>
                <span className="truncate">{email}</span>
              </div>
              {dbUser?.idNumber && (
                <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                  <span className="material-symbols-outlined text-[18px] text-[#03224d]">badge</span>
                  <span className="font-mono font-bold">{dbUser.idNumber}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                <span className="material-symbols-outlined text-[18px] text-[#03224d]">calendar_today</span>
                <span>Joined {joined}</span>
              </div>
              {dbUser?.schoolId?.name && (
                <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                  <span className="material-symbols-outlined text-[18px] text-[#03224d]">account_balance</span>
                  <span>{dbUser.schoolId.name}</span>
                </div>
              )}
              {dbUser?.departmentId?.name && (
                <div className="flex items-center gap-3 text-[14px] text-[#44474f]">
                  <span className="material-symbols-outlined text-[18px] text-[#03224d]">business</span>
                  <span>{dbUser.departmentId.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact IT */}
          <div className="bg-[#1f3864] text-white rounded-xl p-6">
            <h3 className="text-[16px] font-semibold mb-2">Need to update your profile?</h3>
            <p className="text-[13px] opacity-80 mb-4">Contact IT support to update your name, ID number, or department assignment.</p>
            <a
              href="mailto:kmorie18c@njala.edu.sl"
              className="inline-flex items-center gap-2 bg-white text-[#03224d] px-4 py-2 rounded-lg text-[12px] font-bold hover:bg-white/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">mail</span>
              Contact IT Support
            </a>
          </div>
        </div>

        {/* Info Panels */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Account Info */}
          <div className="bg-white border border-[#c4c6d0] rounded-xl p-6">
            <h3 className="text-[18px] font-semibold text-[#03224d] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">person</span>
              Account Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', value: name },
                { label: 'Email Address', value: email },
                { label: 'Matric Number', value: dbUser?.idNumber || 'Not assigned' },
                { label: 'Role', value: dbUser?.role?.replace('_', ' ') ?? '—' },
                { label: 'Account Status', value: dbUser?.status ?? '—' },
                { label: 'Member Since', value: joined },
                { label: 'School', value: dbUser?.schoolId?.name ?? 'Not assigned' },
                { label: 'Department', value: dbUser?.departmentId?.name ?? 'Not assigned' },
              ].map(({ label, value }) => (
                <div key={label} className="p-4 bg-[#f6f3f2] rounded-lg">
                  <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-[14px] text-[#1b1c1c] font-medium truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* GPA by Semester */}
          {gpa && gpa.semesters?.length > 0 && (
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-6">
              <h3 className="text-[18px] font-semibold text-[#03224d] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">grade</span>
                Academic Performance
              </h3>
              <div className="space-y-4">
                {gpa.semesters.map(sem => (
                  <div key={sem.semester} className="border border-[#c4c6d0] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-[#03224d] text-[14px]">{sem.semester}</p>
                      <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${gpaClass(sem.gpa)}`}>
                        GPA: {sem.gpa.toFixed(2)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sem.courses.map(cg => (
                        <div key={cg.course._id} className="flex items-center justify-between text-[13px]">
                          <span className="text-[#44474f] truncate mr-4">{cg.course.title}</span>
                          <span className="font-bold text-[#03224d] shrink-0">{cg.letterGrade} ({cg.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="bg-[#03224d] text-white rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] opacity-75 uppercase tracking-wider">Cumulative GPA</p>
                    <p className="text-[24px] font-extrabold">{gpa.cumulativeGpa.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-bold">{gpa.cumulativeClass}</p>
                    <p className="text-[11px] opacity-75">{gpa.totalCreditHours} Credit Hours</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enrolled Courses */}
          {dbUser?.role === 'student' && (
            <div className="bg-white border border-[#c4c6d0] rounded-xl p-6">
              <h3 className="text-[18px] font-semibold text-[#03224d] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">school</span>
                Enrolled Courses
                <span className="ml-auto text-[13px] font-normal text-[#44474f]">{enrollments.length} course{enrollments.length !== 1 ? 's' : ''}</span>
              </h3>
              {loading ? (
                <LoadingSkeleton type="card" count={3} />
              ) : enrollments.length === 0 ? (
                <p className="text-[14px] text-[#44474f] text-center py-6">No courses enrolled yet.</p>
              ) : (
                <div className="space-y-3">
                  {enrollments.map(c => (
                    <div key={c._id} className="flex items-center gap-4 p-3 bg-[#f6f3f2] rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-[#03224d] flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#03224d] text-[14px] truncate">{c.title}</p>
                        <p className="text-[12px] text-[#44474f]">{c.code} • {c.semester}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-[#a0f3d4] text-[#00513e]' : 'bg-[#f0eded] text-[#44474f]'}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
