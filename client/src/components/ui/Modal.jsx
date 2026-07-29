import { useEffect } from 'react'

export default function Modal({ title, children, onClose, size = 'md' }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3, 34, 77, 0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}
        style={{ boxShadow: '0 12px 40px -8px rgba(3, 34, 77, 0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c4c6d0]">
          <h2 id="modal-title" className="text-[20px] font-semibold leading-7 text-[#03224d]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#44474f] hover:bg-[#f0eded] rounded-full transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
