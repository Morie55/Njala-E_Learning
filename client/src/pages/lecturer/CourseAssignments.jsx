import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'

export default function CourseAssignments() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/courses/${id}/assignments`),
    ]).then(([c, a]) => {
      setCourse(c.data)
      setAssignments(a.data?.assignments ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  return (
    <AppLayout role="lecturer">
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">{course?.title ?? 'Course'} — Assignments</span>
      </nav>

      <div className="flex gap-2 mb-6 border-b border-[#c4c6d0]">
        <Link to={`/courses/${id}/students`} className="px-4 py-2 text-[14px] font-bold text-[#44474f] hover:text-[#03224d]">Students</Link>
        <span className="px-4 py-2 text-[14px] font-bold text-[#03224d] border-b-2 border-[#03224d]">Assignments</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Assignments</h2>
          <p className="text-[14px] text-[#44474f]">{course?.code} — grade student submissions per assignment</p>
        </div>
        <Link
          to={`/courses/${id}/assignments/new`}
          className="px-4 py-2 bg-[#03224d] text-white text-[14px] font-bold rounded flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Assignment
        </Link>
      </div>

      {loading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : assignments.length === 0 ? (
        <EmptyState
          icon="assignment"
          title="No assignments yet"
          description="Create your first assignment to start collecting submissions."
        />
      ) : (
        <div className="bg-white border border-[#c4c6d0] rounded-lg divide-y divide-[#c4c6d0]">
          {assignments.map(a => (
            <div key={a._id} className="p-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-[#1b1c1c] truncate">{a.title}</p>
                <p className="text-[12px] text-[#44474f] mt-1">
                  Due {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'} • Max score {a.maxScore}
                  {typeof a.submissionCount === 'number' && <> • {a.submissionCount} submission{a.submissionCount !== 1 ? 's' : ''}</>}
                  {typeof a.ungradedCount === 'number' && a.ungradedCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-[#fac775] text-[#412402] rounded-sm font-bold">{a.ungradedCount} to grade</span>
                  )}
                </p>
              </div>
              <Link
                to={`/assignments/${a._id}/submissions`}
                className="px-4 py-2 bg-[#086b53] text-white text-[14px] font-bold rounded shrink-0 hover:opacity-90"
              >
                Grade Submissions
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
