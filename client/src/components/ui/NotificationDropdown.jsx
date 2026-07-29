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
      className="absolute -right-12 sm:right-0 top-full mt-2 w-[300px] xs:w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-white border border-[#c4c6d0] rounded-xl sm:rounded-2xl shadow-xl z-50 overflow-hidden font-sans"
      style={{ boxShadow: '0 12px 32px -8px rgba(3,34,77,0.15)' }}
    >
      <div className="px-3.5 sm:px-4 py-3 border-b border-[#c4c6d0] flex items-center justify-between bg-[#fbf9f8]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-[14px] font-bold text-[#03224d]">Notifications</h3>
          {notifications.filter((n) => !n.read).length > 0 && (
            <span className="text-[10px] bg-[#ba1a1a] text-white px-1.5 py-0.5 rounded-full font-bold">
              {notifications.filter((n) => !n.read).length} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="text-[11px] sm:text-[12px] text-[#086b53] hover:underline font-semibold cursor-pointer"
          >
            Mark all read
          </button>
          <button
            onClick={onClose}
            className="sm:hidden p-1 text-[#44474f] hover:bg-[#eae8e7] rounded-full"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      <div className="divide-y divide-[#c4c6d0]/60 max-h-[65vh] sm:max-h-96 overflow-y-auto no-scrollbar">
        {loading ? (
          <p className="text-center text-xs sm:text-[13px] text-[#44474f] py-8">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center px-4">
            <span className="material-symbols-outlined text-3xl text-[#c4c6d0] block mb-1">notifications_off</span>
            <p className="text-xs sm:text-[13px] text-[#44474f]">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => markRead(n._id, n.link)}
              className={`p-3.5 sm:p-4 hover:bg-[#f6f3f2] transition-colors cursor-pointer flex gap-3 items-start ${
                !n.read ? 'bg-[#03224d]/5' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#03224d]">
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
                  <p className="text-xs sm:text-[13px] font-bold text-[#1b1c1c] truncate">{n.title}</p>
                  <span className="text-[10px] sm:text-[11px] text-[#747780] shrink-0 ml-2">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-[#44474f] line-clamp-2 leading-snug">{n.message}</p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-[#086b53] mt-1.5 shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
