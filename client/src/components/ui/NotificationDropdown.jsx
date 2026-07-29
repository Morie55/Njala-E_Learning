import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function NotificationDropdown({ onClose, onUpdateCount }) {
  const ref = useRef(null)
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data?.notifications ?? [])
      onUpdateCount?.(res.data?.unreadCount ?? 0)
    } catch {
      // Fallback to empty notifications list
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const markRead = async (id, link) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      )
      fetchNotifications()
      if (link) navigate(link)
      onClose()
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      onUpdateCount?.(0)
    } catch (err) {
      console.error(err)
    }
  }

  function timeAgo(date) {
    if (!date) return ''
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#c4c6d0] rounded-xl shadow-lg z-50 overflow-hidden"
      style={{ boxShadow: '0 8px 24px -8px rgba(3,34,77,0.12)' }}
    >
      <div className="px-4 py-3 border-b border-[#c4c6d0] flex items-center justify-between bg-[#fbf9f8]">
        <h3 className="text-[14px] font-bold text-[#03224d]">Notifications</h3>
        <button
          onClick={markAllRead}
          className="text-[12px] text-[#086b53] hover:underline font-semibold cursor-pointer"
        >
          Mark all read
        </button>
      </div>

      <div className="divide-y divide-[#c4c6d0] max-h-80 overflow-y-auto no-scrollbar">
        {loading ? (
          <p className="text-center text-[13px] text-[#44474f] py-8">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-[13px] text-[#44474f] py-8">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => markRead(n._id, n.link)}
              className={`px-4 py-3 hover:bg-[#f6f3f2] transition-colors cursor-pointer flex gap-3 items-start ${
                !n.read ? 'bg-[#f0f4ff]' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[#03224d]">
                  {n.type === 'grade'
                    ? 'grade'
                    : n.type === 'announcement'
                    ? 'campaign'
                    : n.type === 'assignment_due'
                    ? 'schedule'
                    : 'notifications'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                  <p className="text-[13px] font-bold text-[#1b1c1c] truncate">{n.title}</p>
                  <span className="text-[11px] text-[#44474f] shrink-0 ml-2">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="text-[12px] text-[#44474f] line-clamp-2">{n.message}</p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-[#086b53] mt-1 shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
