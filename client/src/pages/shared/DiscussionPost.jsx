import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
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
  const d = new Date(date)
  return <span>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
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

function Avatar({ name }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#1f3864] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export default function DiscussionPost() {
  const { courseId, postId } = useParams()
  const { dbUser } = useUser()
  const role = dbUser?.role ?? 'student'
  const myId = dbUser?._id?.toString()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const replyRef = useRef(null)

  useEffect(() => { loadPost() }, [postId])

  async function loadPost() {
    setLoading(true)
    try {
      const { data } = await api.get(`/discussions/${postId}`)
      setPost(data)
    } catch (e) {}
    finally { setLoading(false) }
  }

  async function handleLikePost() {
    const { data } = await api.patch(`/discussions/${postId}/like`)
    setPost(p => ({ ...p, ...data }))
  }

  async function handleLikeReply(replyId, isLiked) {
    const { data } = await api.patch(`/discussions/${postId}/replies/${replyId}/like`)
    setPost(p => ({
      ...p,
      replies: p.replies.map(r => r._id === replyId ? { ...r, ...data } : r)
    }))
  }

  async function handleReply(e) {
    e.preventDefault()
    if (!replyBody.trim()) return
    setSubmitting(true)
    try {
      const { data: newReply } = await api.post(`/discussions/${postId}/replies`, { body: replyBody })
      setPost(p => ({ ...p, replies: [...(p.replies ?? []), { ...newReply, authorId: { fullName: dbUser?.fullName, role } }] }))
      setReplyBody('')
    } catch (e) {}
    finally { setSubmitting(false) }
  }

  async function handleDeleteReply(replyId) {
    if (!window.confirm('Delete this reply?')) return
    await api.delete(`/discussions/${postId}/replies/${replyId}`)
    setPost(p => ({ ...p, replies: p.replies.filter(r => r._id !== replyId) }))
  }

  async function handleDeletePost() {
    if (!window.confirm('Delete this post and all replies?')) return
    await api.delete(`/discussions/${postId}`)
    window.history.back()
  }

  async function toggleClose() {
    await api.patch(`/discussions/${postId}`, { closed: !post.closed })
    setPost(p => ({ ...p, closed: !p.closed }))
  }

  async function togglePin() {
    await api.patch(`/discussions/${postId}`, { pinned: !post.pinned })
    setPost(p => ({ ...p, pinned: !p.pinned }))
  }

  const isMod = ['lecturer', 'dept_head', 'admin'].includes(role)
  const isAuthor = post?.authorId?._id?.toString() === myId || post?.authorId?.toString() === myId

  if (loading) return (
    <AppLayout role={role}>
      <LoadingSkeleton type="card" count={3} />
    </AppLayout>
  )
  if (!post) return (
    <AppLayout role={role}>
      <div className="text-center py-20 text-[#ba1a1a]">Post not found or you don't have access.</div>
    </AppLayout>
  )

  return (
    <AppLayout role={role}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[12px] font-bold text-[#44474f] mb-6 flex-wrap">
        <Link to="/courses" className="hover:text-[#03224d]">My Courses</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link to={`/courses/${courseId}/discussions`} className="hover:text-[#03224d]">Discussion Board</Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-[#03224d] truncate max-w-[200px]">{post.title}</span>
      </nav>

      {/* Original Post */}
      <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm mb-6">
        {/* Post Header */}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-2">
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
              <h2 className="text-[20px] sm:text-[24px] font-bold text-[#03224d] leading-snug">{post.title}</h2>
            </div>

            {/* Mod / Author Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {isMod && (
                <>
                  <button onClick={togglePin} title={post.pinned ? 'Unpin' : 'Pin'} className="p-1.5 text-[#44474f] hover:text-[#03224d] hover:bg-[#f0eded] rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-[18px]">push_pin</span>
                  </button>
                  <button onClick={toggleClose} title={post.closed ? 'Reopen' : 'Close'} className="p-1.5 text-[#44474f] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{post.closed ? 'lock_open' : 'lock'}</span>
                  </button>
                </>
              )}
              {(isAuthor || isMod) && (
                <button onClick={handleDeletePost} className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-xl transition-colors">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>
          </div>

          {/* Author meta */}
          <div className="flex items-center gap-2.5 mb-5">
            <Avatar name={post.authorId?.fullName} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#03224d]">{post.authorId?.fullName}</span>
                <RoleChip role={post.authorId?.role} />
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#747780] mt-0.5">
                <TimeAgo date={post.createdAt} />
                <span>·</span>
                <span>{post.views} views</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="text-[14px] text-[#1b1c1c] leading-7 whitespace-pre-wrap border-t border-[#f0eded] pt-4">
            {post.body}
          </div>

          {/* Like post */}
          <div className="mt-5 pt-4 border-t border-[#f0eded] flex items-center gap-3">
            <button
              onClick={handleLikePost}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${post.isLiked ? 'bg-[#03224d] text-white' : 'bg-[#f0eded] text-[#44474f] hover:bg-[#eae8e7]'}`}
            >
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: post.isLiked ? "'FILL' 1" : "'FILL' 0" }}>thumb_up</span>
              {post.likeCount} {post.likeCount === 1 ? 'Like' : 'Likes'}
            </button>
            <span className="text-[12px] text-[#747780]">{post.replies?.length ?? 0} {post.replies?.length === 1 ? 'reply' : 'replies'}</span>
          </div>
        </div>
      </div>

      {/* Replies */}
      {post.replies?.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-[12px] font-bold text-[#44474f] uppercase tracking-wider px-1">{post.replies.length} {post.replies.length === 1 ? 'Reply' : 'Replies'}</p>
          {post.replies.map(reply => {
            const replyAuthorId = reply.authorId?._id?.toString() ?? reply.authorId?.toString()
            const canDelete = replyAuthorId === myId || isMod
            return (
              <div key={reply._id} className="bg-white border border-[#c4c6d0] rounded-xl p-4 sm:p-5 flex gap-3 shadow-sm">
                <Avatar name={reply.authorId?.fullName} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[13px] font-bold text-[#03224d]">{reply.authorId?.fullName ?? 'User'}</span>
                      <RoleChip role={reply.authorId?.role} />
                      <span className="text-[11px] text-[#747780]"><TimeAgo date={reply.createdAt} /></span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleLikeReply(reply._id, reply.isLiked)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${reply.isLiked ? 'bg-[#03224d] text-white' : 'text-[#44474f] hover:bg-[#f0eded]'}`}
                      >
                        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: reply.isLiked ? "'FILL' 1" : "'FILL' 0" }}>thumb_up</span>
                        {reply.likeCount}
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDeleteReply(reply._id)} className="p-1 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-lg transition-colors">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#1b1c1c] leading-6 whitespace-pre-wrap">{reply.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Reply Box */}
      {!post.closed || isMod ? (
        <div className="bg-white border border-[#c4c6d0] rounded-2xl p-5 shadow-sm">
          <h4 className="text-[13px] font-bold text-[#03224d] mb-3">Add a Reply</h4>
          <form onSubmit={handleReply} className="space-y-3">
            <textarea
              ref={replyRef}
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              maxLength={5000}
              required
              className="w-full border border-[#c4c6d0] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:border-[#03224d] transition-colors resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#747780]">{replyBody.length}/5,000</span>
              <button
                type="submit"
                disabled={submitting || !replyBody.trim()}
                className="flex items-center gap-1.5 bg-[#086b53] text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {submitting ? <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> : <span className="material-symbols-outlined text-[16px]">send</span>}
                Post Reply
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-[#ffdad6]/20 border border-[#ba1a1a]/30 rounded-2xl p-5 text-center text-[14px] text-[#ba1a1a] font-medium flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[20px]">lock</span>
          This discussion is closed. New replies are not accepted.
        </div>
      )}
    </AppLayout>
  )
}
