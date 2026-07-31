import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const STATUS_STYLES = {
  present: 'bg-[#a0f3d4] text-[#00513e]',
  absent:  'bg-[#ffdad6] text-[#93000a]',
  late:    'bg-[#ffe8b5] text-[#5a3b00]',
  excused: 'bg-[#d8e2ff] text-[#001a73]',
}

export default function StudentAttendance() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/attendance/my')
      .then(r => setAttendance(r.data?.attendance ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const warningCourses = attendance.filter(a => a.belowThreshold)

  return (
    <AppLayout role="student">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">My Attendance</h2>
        <p className="text-[14px] text-[#44474f]">Attendance record across all enrolled courses. Minimum required: 75%.</p>
      </div>

      {/* Warning Banner */}
      {warningCourses.length > 0 && (
        <div className="mb-6 p-4 bg-[#ffdad6] border border-[#ba1a1a] rounded-xl flex items-start gap-3">
          <span className="material-symbols-outlined text-[#ba1a1a] text-[24px] shrink-0">warning</span>
          <div>
            <p className="font-bold text-[#93000a] text-[14px]">Attendance Warning</p>
            <p className="text-[13px] text-[#93000a] mt-0.5">
              You are below the 75% attendance threshold in{' '}
              <strong>{warningCourses.map(c => c.course?.title).join(', ')}</strong>.
              Contact your lecturer if you have valid reasons for absence.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : attendance.length === 0 ? (
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-3">event_available</span>
          <p className="text-[15px] font-medium text-[#44474f]">No attendance records yet</p>
          <p className="text-[13px] text-[#747780] mt-1">Your lecturer hasn't recorded any sessions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attendance.map(a => (
            <div
              key={a.course?._id}
              className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${a.belowThreshold ? 'border-[#ba1a1a]/40' : 'border-[#c4c6d0]'}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-[#03224d] text-[16px]">{a.course?.title}</h3>
                  <p className="text-[12px] text-[#44474f]">{a.course?.code} • {a.total} session{a.total !== 1 ? 's' : ''} recorded</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-[24px] font-extrabold ${a.belowThreshold ? 'text-[#ba1a1a]' : 'text-[#086b53]'}`}>
                      {a.attendanceRate}%
                    </p>
                    {a.belowThreshold && (
                      <p className="text-[10px] font-bold text-[#ba1a1a] uppercase tracking-wide">Below threshold</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="w-full bg-[#f0eded] rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${a.attendanceRate >= 75 ? 'bg-[#086b53]' : 'bg-[#ba1a1a]'}`}
                    style={{ width: `${a.attendanceRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#747780] mt-1">
                  <span>0%</span>
                  <span className={`font-bold ${a.attendanceRate >= 75 ? 'text-[#086b53]' : 'text-[#ba1a1a]'}`}>
                    {a.attendanceRate}% attended
                  </span>
                  <span>75% min</span>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Present', count: a.present, status: 'present' },
                  { label: 'Late', count: a.late, status: 'late' },
                  { label: 'Excused', count: a.excused, status: 'excused' },
                  { label: 'Absent', count: a.absent, status: 'absent' },
                ].map(({ label, count, status }) => (
                  <div key={status} className={`text-center p-2.5 rounded-lg ${STATUS_STYLES[status]}`}>
                    <p className="text-[20px] font-extrabold">{count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
