import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

export default function StudentAssignments() {
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'submitted' | 'graded'

  useEffect(() => {
    api.get('/assignments')
      .then(r => setAssignments(r.data?.assignments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function getStatus(a) {
    if (a.submission) {
      if (a.submission.score !== null && a.submission.score !== undefined) return 'graded'
      return 'submitted'
    }
    if (new Date(a.dueDate) < new Date()) return 'overdue'
    return 'pending'
  }

  const filtered = assignments.filter(a => {
    const s = getStatus(a)
    if (filter === 'pending') return s === 'pending' || s === 'overdue'
    if (filter === 'submitted') return s === 'submitted'
    if (filter === 'graded') return s === 'graded'
    return true
  })

  return (
    <AppLayout role="student">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Assignments</h2>
          <p className="text-[14px] text-[#44474f]">View and submit coursework across all your enrolled courses.</p>
        </div>
        <div className="flex overflow-x-auto no-scrollbar gap-1 bg-[#eae8e7] p-1 rounded-lg shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'graded', label: 'Graded' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-1.5 rounded text-[12px] font-bold transition-all ${filter === tab.id ? 'bg-[#03224d] text-white shadow-sm' : 'text-[#44474f] hover:text-[#03224d]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#c4c6d0] rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">assignment_turned_in</span>
          <h3 className="text-[18px] font-medium text-[#03224d] mb-1">No assignments found</h3>
          <p className="text-[14px] text-[#44474f]">There are no assignments matching your current filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => {
            const status = getStatus(a)
            const isDueSoon = status === 'pending' && (new Date(a.dueDate) - new Date()) < (3 * 86400000)

            return (
              <div key={a._id} className="bg-white border border-[#c4c6d0] rounded-xl p-6 hover:border-[#03224d] transition-all card-hover">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-bold text-[#086b53] bg-[#a0f3d4]/30 px-2 py-0.5 rounded">{a.courseCode ?? 'COURSE'}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                        status === 'graded' ? 'bg-[#a0f3d4] text-[#002117]' :
                        status === 'submitted' ? 'bg-[#d8e2ff] text-[#001a41]' :
                        status === 'overdue' ? 'bg-[#ffdad6] text-[#93000a]' :
                        'bg-[#ffdcbb] text-[#2b1700]'
                      }`}>
                        {status}
                      </span>
                      {isDueSoon && <span className="text-[11px] font-bold text-[#ba1a1a] flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span> Due Soon</span>}
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#03224d]">{a.title}</h3>
                    <p className="text-[14px] text-[#44474f] line-clamp-2">{a.instructions || 'No detailed instructions provided.'}</p>
                    <div className="flex items-center gap-4 text-[12px] text-[#747780] pt-2">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">event</span>
                        Due: {new Date(a.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">grade</span>
                        Max Score: {a.maxScore} pts
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    {status === 'graded' && (
                      <div className="text-right">
                        <p className="text-[12px] text-[#44474f]">Grade</p>
                        <p className="text-[20px] font-bold text-[#086b53]">{a.submission.score} / {a.maxScore}</p>
                      </div>
                    )}
                    {status === 'submitted' && (
                      <span className="text-[12px] text-[#086b53] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Submitted
                      </span>
                    )}
                    {(status === 'pending' || status === 'overdue') && (
                      <button
                        onClick={() => navigate(`/courses/${a.courseId?._id || a.courseId}/assignments/${a._id}/submit`)}
                        className="bg-[#03224d] text-white px-5 py-2.5 rounded text-[14px] font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">upload_file</span>
                        Submit Assignment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppLayout>
  )
}
