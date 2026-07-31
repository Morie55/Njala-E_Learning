import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import { useUser } from '../../hooks/useUser'
import api from '../../lib/api'

function TimeAgo({ date }) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return <span>just now</span>
  if (mins < 60) return <span>{mins}m ago</span>
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return <span>{hrs}h ago</span>
  return <span>{Math.floor(hrs / 24)}d ago</span>
}

function RoleChip({ role }) {
  const styles = {
    lecturer: 'bg-[#d8e2ff] text-[#001a73]',
    admin: 'bg-[#ffdad6] text-[#93000a]',
    dept_head: 'bg-[#ffe8b5] text-[#5a3b00]',
    student: 'bg-[#f0eded] text-[#44474f]',
  }
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles[role] ?? styles.student}`}>
      {role?.replace('_', ' ')}
    </span>
  )
}

export default function DiscussionBoard() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { dbUser } = useUser()
  const role = dbUser?.role ?? 'student'
  const myId = dbUser?._id

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadPosts() }, [courseId])

  async function loadPosts() {
    setLoading(true)
    try {
      const { data } = await api.get(`/discussions/course/${courseId}`)
      setPosts(data.posts ?? [])
    } catch (e) {
      setError('Failed to load discussions.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setSubmitting(true)
    try {
      await api.post(`/discussions/course/${courseId}`, form)
      setForm({ title: '', body: '' })
      setShowNew(false)
      await loadPosts()
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to post. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLike(postId, isLiked) {
    await api.patch(`/discussions/${postId}/like`)
    setPosts(ps => ps.map(p => p._id === postId
      ? { ...p, likeCount: isLiked ? p.likeCount - 1 : p.likeCount + 1, isLiked: !isLiked }
      : p
    ))
  }

  async function handleDelete(postId) {
    if (!window.confirm('Delete this post?')) return
    await api.delete(`/discussions/${postId}`)
    setPosts(ps => ps.filter(p => p._id !== postId))
  }

  async function handlePin(post) {
    await api.patch(`/discussions/${post._id}`, { pinned: !post.pinned })
    setPosts(ps => ps.map(p => p._id === post._id ? { ...p, pinned: !post.pinned } : p))
  }

  async function handleClose(post) {
    await api.patch(`/discussions/${post._id}`, { closed: !post.closed })
    setPosts(ps => ps.map(p => p._id === post._id ? { ...p, closed: !post.closed } : p))
  }

  const isMod = ['lecturer', 'dept_head', 'admin'].includes(role)

  return (
    <AppLayout role={role}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d]">Discussion Board</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Discussion Board</h2>
          <p className="text-[14px] text-[#44474f]">{posts.length} thread{posts.length !== 1 ? 's' : ''} · ask questions, share ideas</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-[#03224d] text-white px-4 py-2.5 rounded-xl text-[13px] font-bold hover:opacity-90 transition-opacity shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">edit_note</span>
          New Post
        </button>
      </div>

      {/* New Post Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-5 border-b border-[#c4c6d0] flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-[#03224d]">Start a Discussion</h3>
              <button onClick={() => setShowNew(false)} className="p-1.5 hover:bg-[#f0eded] rounded-full text-[#44474f]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Question about Assignment 2..."
                  maxLength={200}
                  required
                  className="w-full border border-[#c4c6d0] rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1">Body *</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Share your question or idea in detail..."
                  rows={5}
                  maxLength={10000}
                  required
                  className="w-full border border-[#c4c6d0] rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors resize-none"
                />
                <p className="text-[11px] text-[#747780] mt-1 text-right">{form.body.length}/10,000</p>
              </div>
              {error && <p className="text-[13px] text-[#ba1a1a]">{error}</p>}
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 text-[13px] font-bold text-[#44474f] hover:bg-[#f0eded] rounded-xl transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#03224d] text-white text-[13px] font-bold rounded-xl hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submitting ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : null}
                  Post Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <LoadingSkeleton type="card" count={4} />
      ) : posts.length === 0 ? (
        <div className="bg-white border border-[#c4c6d0] rounded-2xl p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-3">forum</span>
          <p className="text-[15px] font-medium text-[#44474f]">No discussions yet</p>
          <p className="text-[13px] text-[#747780] mt-1">Be the first to start a conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div
              key={post._id}
              className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group ${post.pinned ? 'border-[#03224d]/40 bg-[#03224d]/[0.02]' : 'border-[#c4c6d0]'}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {post.pinned && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#03224d] bg-[#d8e2ff] px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[12px]">push_pin</span>Pinned
                      </span>
                    )}
                    {post.closed && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-[12px]">lock</span>Closed
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/courses/${courseId}/discussions/${post._id}`)}
                    className="text-left w-full"
                  >
                    <h3 className="text-[15px] font-bold text-[#03224d] group-hover:underline underline-offset-2 truncate">{post.title}</h3>
                  </button>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-[#44474f]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#1f3864] text-white flex items-center justify-center text-[9px] font-bold">
                        {post.authorId?.fullName?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{post.authorId?.fullName}</span>
                      <RoleChip role={post.authorId?.role} />
                    </div>
                    <span>·</span>
                    <TimeAgo date={post.createdAt} />
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">forum</span>
                      {post.replyCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      {post.views}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleLike(post._id, post.isLiked)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[12px] font-bold transition-all ${post.isLiked ? 'bg-[#03224d] text-white' : 'text-[#44474f] hover:bg-[#f0eded]'}`}
                  >
                    <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: post.isLiked ? "'FILL' 1" : "'FILL' 0" }}>thumb_up</span>
                    {post.likeCount}
                  </button>

                  {/* Mod Controls */}
                  {isMod && (
                    <>
                      <button onClick={() => handlePin(post)} title={post.pinned ? 'Unpin' : 'Pin'} className="p-1.5 text-[#44474f] hover:text-[#03224d] hover:bg-[#f0eded] rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-[16px]">push_pin</span>
                      </button>
                      <button onClick={() => handleClose(post)} title={post.closed ? 'Reopen' : 'Close'} className="p-1.5 text-[#44474f] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-[16px]">{post.closed ? 'lock_open' : 'lock'}</span>
                      </button>
                    </>
                  )}

                  {(post.authorId?._id === myId || isMod) && (
                    <button onClick={() => handleDelete(post._id)} title="Delete" className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-xl transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  )
}
