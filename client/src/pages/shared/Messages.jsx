import { useState, useEffect, useRef } from 'react'
import { useUser } from '../../hooks/useUser'
import AppLayout from '../../components/layout/AppLayout'
import api from '../../lib/api'

export default function Messages() {
  const { dbUser, role } = useUser()
  const [conversations, setConversations] = useState([])
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [toast, setToast] = useState(null)

  const messagesEndRef = useRef(null)
  const pollTimerRef = useRef(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load conversations & contacts on mount
  useEffect(() => {
    async function init() {
      try {
        const [cRes, cntRes] = await Promise.all([
          api.get('/messages/conversations'),
          api.get('/messages/contacts'),
        ])
        const convs = cRes.data?.conversations ?? []
        setConversations(convs)
        setContacts(cntRes.data?.contacts ?? [])

        // Default open first conversation if available
        if (convs.length > 0 && convs[0].counterpart) {
          setActiveContact(convs[0].counterpart)
        }
      } catch (err) {
        showToast('Failed to load messaging data', 'error')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Fetch thread when activeContact changes
  const loadThread = async (contactId, silent = false) => {
    if (!silent) setThreadLoading(true)
    try {
      const { data } = await api.get(`/messages/thread/${contactId}`)
      setMessages(data.messages ?? [])
      // Update unread count in conversation list locally
      setConversations(prev =>
        prev.map(c => c.counterpart?._id === contactId ? { ...c, unreadCount: 0 } : c)
      )
    } catch (err) {
      if (!silent) showToast('Failed to load messages', 'error')
    } finally {
      if (!silent) setThreadLoading(false)
    }
  }

  useEffect(() => {
    if (!activeContact?._id) return
    loadThread(activeContact._id)

    // Poll for new messages in current thread every 5s
    pollTimerRef.current = setInterval(() => {
      loadThread(activeContact._id, true)
    }, 5000)

    return () => clearInterval(pollTimerRef.current)
  }, [activeContact?._id])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e?.preventDefault()
    if (!inputText.trim() || !activeContact?._id || sending) return

    const textToSend = inputText.trim()
    setInputText('')
    setSending(true)

    try {
      const { data } = await api.post('/messages', {
        recipientId: activeContact._id,
        content: textToSend,
      })

      setMessages(prev => [...prev, data.message])

      // Update conversations list locally
      setConversations(prev => {
        const existingIdx = prev.findIndex(c => c.counterpart?._id === activeContact._id)
        const updatedItem = {
          counterpart: activeContact,
          lastMessage: data.message,
          unreadCount: 0,
        }
        if (existingIdx >= 0) {
          const list = [...prev]
          list.splice(existingIdx, 1)
          return [updatedItem, ...list]
        }
        return [updatedItem, ...prev]
      })
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Failed to send message', 'error')
      setInputText(textToSend)
    } finally {
      setSending(false)
    }
  }

  function startNewConversation(contact) {
    setActiveContact(contact)
    setShowContactPicker(false)
  }

  if (loading) {
    return (
      <AppLayout role={role}>
        <div className="p-8 text-center text-[#747780]">Loading messages…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout role={role}>
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-[13px] font-bold shadow-lg ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#03224d]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Main Container Layout */}
      <div className="bg-white rounded-2xl border border-[#c4c6d0] shadow-sm min-h-[600px] flex flex-col md:flex-row overflow-hidden">

        {/* Sidebar: Conversation List */}
        <div className="w-full md:w-80 border-r border-[#c4c6d0] flex flex-col bg-[#fbf9f8]">
          <div className="p-4 border-b border-[#c4c6d0] flex items-center justify-between">
            <h2 className="text-[16px] font-black text-[#1b1c1c]">Messages</h2>
            <button
              onClick={() => setShowContactPicker(true)}
              className="p-1.5 bg-[#03224d] text-white rounded-xl hover:bg-[#1f3864] transition-colors"
              title="New Message"
            >
              <span className="material-symbols-outlined text-[18px]">edit_square</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#c4c6d0]/30">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-[#747780] text-[12px]">
                <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">chat_bubble_outline</span>
                No conversations yet. Start a message with a instructor or student.
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = activeContact?._id === conv.counterpart?._id
                return (
                  <button
                    key={conv.counterpart?._id}
                    onClick={() => setActiveContact(conv.counterpart)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-[#d8e2ff]/50 border-l-4 border-[#03224d]' : 'hover:bg-[#f6f3f2]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#03224d] text-white font-bold flex items-center justify-center text-[14px] shrink-0">
                      {conv.counterpart?.fullName?.[0]?.toUpperCase() ?? '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-bold text-[#1b1c1c] truncate">{conv.counterpart?.fullName}</p>
                        {conv.lastMessage?.createdAt && (
                          <span className="text-[10px] text-[#9e9e9e]">
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#747780] truncate mt-0.5">
                        {conv.lastMessage?.content ?? 'No messages yet'}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-[#ba1a1a] text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Area: Active Message Thread */}
        <div className="flex-1 flex flex-col min-h-[500px] bg-white">
          {activeContact ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[#c4c6d0] flex items-center justify-between bg-[#f6f3f2]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#03224d] text-white font-bold flex items-center justify-center text-[13px]">
                    {activeContact.fullName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#1b1c1c]">{activeContact.fullName}</h3>
                    <p className="text-[11px] text-[#747780] capitalize">{activeContact.role} · {activeContact.email}</p>
                  </div>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#fbf9f8]">
                {threadLoading ? (
                  <div className="text-center py-10 text-[#747780] text-[13px]">Loading thread…</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-[#9e9e9e] text-[12px]">
                    This is the start of your message history with {activeContact.fullName}. Send a message below!
                  </div>
                ) : (
                  messages.map(m => {
                    const isMine = m.senderId === dbUser._id || m.senderId?._id === dbUser._id
                    return (
                      <div key={m._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] shadow-2xs ${
                            isMine
                              ? 'bg-[#03224d] text-white rounded-br-none'
                              : 'bg-white border border-[#c4c6d0] text-[#1b1c1c] rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        </div>
                        <span className="text-[10px] text-[#9e9e9e] mt-1 px-1">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && (m.isRead ? ' · Read' : ' · Sent')}
                        </span>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSend} className="p-3 border-t border-[#c4c6d0] bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`Message ${activeContact.fullName}…`}
                  className="flex-1 border border-[#c4c6d0] rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="px-4 py-2.5 bg-[#03224d] text-white rounded-xl font-bold text-[13px] hover:bg-[#1f3864] transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1"
                >
                  <span>Send</span>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#747780]">
              <span className="material-symbols-outlined text-5xl text-[#c4c6d0] mb-3">alternate_email</span>
              <p className="text-[15px] font-bold text-[#1b1c1c]">Select a conversation</p>
              <p className="text-[12px] mt-1">Choose a contact on the left or start a new message.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Message Contact Picker Modal */}
      {showContactPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowContactPicker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#c4c6d0] flex items-center justify-between">
              <h3 className="font-bold text-[15px] text-[#1b1c1c]">Select Contact</h3>
              <button onClick={() => setShowContactPicker(false)}><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#c4c6d0]/30">
              {contacts.length === 0 ? (
                <p className="p-4 text-center text-[#747780] text-[12px]">No contacts available.</p>
              ) : (
                contacts.map(c => (
                  <button
                    key={c._id}
                    onClick={() => startNewConversation(c)}
                    className="w-full text-left p-3 hover:bg-[#f6f3f2] rounded-xl flex items-center gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#03224d] text-white font-bold flex items-center justify-center text-[12px]">
                      {c.fullName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#1b1c1c]">{c.fullName}</p>
                      <p className="text-[11px] text-[#747780] capitalize">{c.role} {c.context ? `· ${c.context}` : ''}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  )
}
