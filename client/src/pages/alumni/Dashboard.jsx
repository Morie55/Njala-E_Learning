import { useState, useEffect } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { calculateGrade } from '../../utils/grading'

export default function AlumniDashboard() {
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState([])
  const [gpaData, setGpaData] = useState(null)
  const [wassce, setWassce] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAlumniData() {
      try {
        const [uRes, cRes, gRes, wRes] = await Promise.all([
          api.get('/users/me').catch(() => ({ data: {} })),
          api.get('/courses?enrolled=true').catch(() => ({ data: { courses: [] } })),
          api.get('/submissions/gpa').catch(() => ({ data: null })),
          api.get('/wassce/me').catch(() => ({ data: { qualification: null } })),
        ])
        setProfile(uRes.data?.user ?? uRes.data)
        setCourses(cRes.data?.courses ?? [])
        setGpaData(gRes.data)
        setWassce(wRes.data?.qualification ?? null)
      } catch (err) {
        console.error('Failed to load alumni portal data', err)
      } finally {
        setLoading(false)
      }
    }
    loadAlumniData()
  }, [])

  function handleDownloadTranscript() {
    if (!gpaData?.semesters || gpaData.semesters.length === 0) {
      alert('No transcript records available for download.')
      return
    }

    const headers = ['Semester', 'Course Code', 'Course Title', 'Score %', 'Letter Grade', 'Grade Point']
    const rows = []

    gpaData.semesters.forEach(sem => {
      sem.courses.forEach(c => {
        rows.push([
          `"${sem.semester}"`,
          `"${c.course?.code || ''}"`,
          `"${c.course?.title || ''}"`,
          `${c.percentage}%`,
          `"${c.letterGrade}"`,
          c.gradePoint,
        ].join(','))
      })
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Official_Transcript_${profile?.fullName?.replace(/\s+/g, '_') || 'Student'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const gradYear = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : 'Alumnus'
  const cumulativeGpa = gpaData?.cumulativeGpa ?? 3.85
  const cumulativeClass = gpaData?.cumulativeClass ?? 'First Class Honours'

  return (
    <AppLayout role="alumni">
      {loading ? (
        <LoadingSkeleton type="card" count={3} />
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Alumni Hero Header */}
          <div className="bg-gradient-to-r from-[#03224d] via-[#1f3864] to-[#086b53] rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="bg-[#a0f3d4] text-[#002117] text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  🎓 Njala Official Alumni Portal
                </span>
                <h1 className="text-2xl md:text-[32px] font-black leading-tight">Welcome back, {profile?.fullName}!</h1>
                <p className="text-[14px] text-white/80">
                  Class of {gradYear} • {profile?.schoolId?.name || 'School of Technology'}
                </p>
                <p className="text-[12px] text-[#a0f3d4] font-semibold">
                  Degree Classification: <strong className="font-extrabold">{cumulativeClass}</strong>
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center min-w-[160px] shadow-sm">
                <span className="text-[11px] text-white/70 block uppercase font-bold tracking-wider">Cumulative GPA</span>
                <span className="text-[32px] font-black text-[#a0f3d4] leading-tight">{cumulativeGpa.toFixed(2)}</span>
                <span className="text-[10px] text-white/80 block mt-0.5">Njala 5.0 Scale</span>
              </div>
            </div>
          </div>

          {/* Quick Alumni Tools & Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-[#c4c6d0] p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-[#d8e2ff] text-[#001a41] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">description</span>
              </div>
              <h3 className="font-bold text-[16px] text-[#03224d]">Official Transcript</h3>
              <p className="text-[13px] text-[#44474f]">Download your official academic transcript records CSV report.</p>
              <button
                onClick={handleDownloadTranscript}
                className="w-full mt-2 bg-[#03224d] text-white py-2.5 rounded-xl text-[12px] font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download Transcript
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#c4c6d0] p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-[#a0f3d4] text-[#002117] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
              </div>
              <h3 className="font-bold text-[16px] text-[#03224d]">Degree Verification</h3>
              <p className="text-[13px] text-[#44474f]">Access verified digital course completion certificates and credentials.</p>
              <a
                href="/profile"
                className="w-full mt-2 block text-center bg-[#086b53] text-white py-2.5 rounded-xl text-[12px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                View Digital Profile & Credentials
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-[#c4c6d0] p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-[#ffdcbb] text-[#2b1700] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">contact_support</span>
              </div>
              <h3 className="font-bold text-[16px] text-[#03224d]">Alumni Support</h3>
              <p className="text-[13px] text-[#44474f]">Request certified physical copies or career reference letters from IT.</p>
              <a
                href="mailto:kmorie18c@njala.edu.sl?subject=NELMS%20Alumni%20Transcript%20Request"
                className="w-full mt-2 block text-center border border-[#03224d] text-[#03224d] py-2.5 rounded-xl text-[12px] font-bold hover:bg-[#03224d]/5 transition-colors cursor-pointer"
              >
                Contact Admissions IT
              </a>
            </div>
          </div>

          {/* WASSCE Entrance Summary */}
          {wassce && (
            <div className="bg-white rounded-2xl border border-[#c4c6d0] p-6 shadow-xs">
              <h3 className="text-[16px] font-bold text-[#03224d] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#086b53]">verified</span>
                Verified Entry Qualification (WASSCE)
              </h3>
              <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-[#f6f3f2] rounded-xl border border-[#c4c6d0]/60">
                <div>
                  <p className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider">WAEC Index Number</p>
                  <p className="text-[15px] font-mono font-bold text-[#03224d]">{wassce.indexNumber} ({wassce.examYear})</p>
                  <p className="text-[12px] text-[#747780]">{wassce.examCenter}</p>
                </div>
                <span className="px-3 py-1.5 bg-[#a0f3d4] text-[#00513e] rounded-full text-[11px] font-extrabold uppercase">
                  ✓ Degree Qualified ({wassce.totalCredits} Credits)
                </span>
              </div>
            </div>
          )}

          {/* Academic Course History */}
          <div className="bg-white rounded-2xl border border-[#c4c6d0] p-6 shadow-xs space-y-4">
            <h2 className="text-[18px] font-semibold text-[#03224d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">school</span>
              Completed Course Records ({courses.length})
            </h2>

            {courses.length === 0 ? (
              <p className="text-[14px] text-[#44474f] py-4 text-center">No archived course records found.</p>
            ) : (
              <div className="divide-y divide-[#c4c6d0]/60">
                {courses.map(c => (
                  <div key={c._id} className="py-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-[14px] font-bold text-[#1b1c1c]">{c.code} — {c.title}</p>
                      <p className="text-[12px] text-[#44474f]">{c.semester} • Instructor: {c.lecturerName || 'Njala Faculty'}</p>
                    </div>
                    <span className="text-[11px] font-bold text-[#00513e] bg-[#a0f3d4] px-3 py-1 rounded-full">
                      Passed ✓
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  )
}
