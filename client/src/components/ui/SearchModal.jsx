import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const TYPE_ICON = {
  course:       'school',
  assignment:   'assignment',
  quiz:         'quiz',
  material:     'description',
  announcement: 'campaign',
  user:         'person',
}
const TYPE_COLOR = {
  course:       'text-[#03224d] bg-[#d8e2ff]',
  assignment:   'text-[#086b53] bg-[#a0f3d4]',
  quiz:         'text-[#9c27b0] bg-[#f3e5f5]',
  material:     'text-[#5a3b00] bg-[#ffe8b5]',
  announcement: 'text-[#1a4fd8] bg-[#e0eaff]',
  user:         'text-[#44474f] bg-[#f0eded]',
}

export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef()
  const navigate = useNavigate()
  const debounceRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') setSelected(s => Math.min(s + 1, results.length - 1))
      if (e.key === 'ArrowUp') setSelected(s => Math.max(s - 1, 0))
      if (e.key === 'Enter' && results[selected]) navigate(results[selected].url), onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [results, selected, onClose, navigate])

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`)
      setResults(data.results ?? [])
      setSelected(0)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 250)
  }

  function handleResultClick(url) {
    navigate(url)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[600px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#c4c6d0]">
          <span className="material-symbols-outlined text-[22px] text-[#44474f]">
            {loading ? 'progress_activity' : 'search'}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Search courses, assignments, materials…"
            className="flex-1 text-[15px] text-[#1b1c1c] placeholder-[#9e9e9e] outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
              className="text-[#9e9e9e] hover:text-[#44474f]">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
          <kbd className="hidden sm:block text-[10px] font-bold text-[#9e9e9e] bg-[#f0eded] px-1.5 py-0.5 rounded border border-[#c4c6d0]">ESC</kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-[420px] overflow-y-auto divide-y divide-[#c4c6d0]/30">
            {results.map((r, i) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  onClick={() => handleResultClick(r.url)}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors ${i === selected ? 'bg-[#f0f3ff]' : 'hover:bg-[#fbf9f8]'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[r.type] ?? 'bg-[#f0eded] text-[#44474f]'}`}>
                    <span className="material-symbols-outlined text-[16px]">{TYPE_ICON[r.type] ?? 'search'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] text-[#1b1c1c] truncate">{r.title}</p>
                    {r.subtitle && <p className="text-[11px] text-[#747780] truncate">{r.subtitle}</p>}
                  </div>
                  {r.meta && <span className="text-[10px] text-[#9e9e9e] shrink-0">{r.meta}</span>}
                  <span className="material-symbols-outlined text-[16px] text-[#c4c6d0]">arrow_forward</span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.length >= 2 && !loading ? (
          <div className="px-4 py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-[#c4c6d0] block mb-2">search_off</span>
            <p className="text-[13px] text-[#747780]">No results for "<strong>{query}</strong>"</p>
          </div>
        ) : (
          <div className="px-4 py-6">
            <p className="text-[11px] font-bold text-[#9e9e9e] uppercase tracking-wider mb-3">Quick navigation</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'My Courses', icon: 'school', url: '/courses' },
                { label: 'Assignments', icon: 'assignment', url: '/assignments' },
                { label: 'Grades', icon: 'grade', url: '/grades' },
                { label: 'Discussions', icon: 'forum', url: '/courses' },
                { label: 'Payments', icon: 'payments', url: '/payments' },
              ].map(s => (
                <button key={s.label} onClick={() => handleResultClick(s.url)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3f2] hover:bg-[#e8e3df] rounded-lg text-[12px] font-bold text-[#44474f] transition-colors">
                  <span className="material-symbols-outlined text-[14px]">{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#c4c6d0] bg-[#f6f3f2] flex items-center gap-4 text-[10px] text-[#9e9e9e]">
          <span><kbd className="bg-white border border-[#c4c6d0] px-1 rounded text-[9px]">↑↓</kbd> navigate</span>
          <span><kbd className="bg-white border border-[#c4c6d0] px-1 rounded text-[9px]">↵</kbd> open</span>
          <span><kbd className="bg-white border border-[#c4c6d0] px-1 rounded text-[9px]">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
