import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice', icon: 'radio_button_checked' },
  { value: 'truefalse', label: 'True / False', icon: 'toggle_on' },
  { value: 'short_answer', label: 'Short Answer', icon: 'short_text' },
  { value: 'essay', label: 'Essay', icon: 'article' },
]

function emptyQuestion() {
  return { type: 'mcq', text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], correctAnswer: '', points: 1, explanation: '' }
}

export default function CreateQuiz() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ courseId: '', title: '', description: '', duration: '', maxAttempts: 1, passMark: 50, questionOrder: 'sequential', startAt: '', endAt: '', showAnswers: true })
  const [questions, setQuestions] = useState([emptyQuestion()])
  const [step, setStep] = useState(1) // 1=details, 2=questions
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data?.courses ?? r.data ?? [])).catch(() => {})
  }, [])

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function addQuestion() { setQuestions(q => [...q, emptyQuestion()]) }
  function removeQuestion(i) { setQuestions(q => q.filter((_, j) => j !== i)) }
  function setQ(i, k, v) { setQuestions(q => q.map((item, j) => j === i ? { ...item, [k]: v } : item)) }
  function setOpt(qi, oi, k, v) {
    setQuestions(q => q.map((item, j) => {
      if (j !== qi) return item
      const opts = item.options.map((o, k2) => k2 === oi ? { ...o, [k]: v } : o)
      return { ...item, options: opts }
    }))
  }
  function setCorrectMCQ(qi, oi) {
    setQuestions(q => q.map((item, j) => {
      if (j !== qi) return item
      return { ...item, options: item.options.map((o, k) => ({ ...o, isCorrect: k === oi })) }
    }))
  }
  function addOption(qi) { setQuestions(q => q.map((item, j) => j === qi ? { ...item, options: [...item.options, { text: '', isCorrect: false }] } : item)) }
  function removeOption(qi, oi) { setQuestions(q => q.map((item, j) => j === qi ? { ...item, options: item.options.filter((_, k) => k !== oi) } : item)) }

  async function handleSave(status = 'draft') {
    if (!form.courseId || !form.title) { showToast('Course and title required', 'error'); return }
    if (questions.some(q => !q.text.trim())) { showToast('All questions must have text', 'error'); return }
    setSaving(true)
    try {
      await api.post('/quizzes', { ...form, status, duration: form.duration ? Number(form.duration) : null, questions })
      showToast(status === 'published' ? 'Quiz published!' : 'Quiz saved as draft')
      setTimeout(() => navigate(-1), 1200)
    } catch (e) { showToast(e.response?.data?.error ?? 'Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const totalPoints = questions.reduce((s, q) => s + (Number(q.points) || 0), 0)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-[13px] font-bold shadow-lg ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#086b53]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#f6f3f2] rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div>
          <h1 className="text-[20px] font-black text-[#1b1c1c]">Create Quiz</h1>
          <p className="text-[12px] text-[#747780]">{totalPoints} total points · {questions.length} question{questions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex border-b border-[#c4c6d0]">
        {[{ n: 1, label: 'Quiz Settings' }, { n: 2, label: 'Questions' }].map(s => (
          <button key={s.n} onClick={() => setStep(s.n)}
            className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-colors ${step === s.n ? 'border-[#03224d] text-[#03224d]' : 'border-transparent text-[#747780] hover:text-[#1b1c1c]'}`}>
            {s.n}. {s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#c4c6d0] p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[#44474f] mb-1">Course *</label>
            <select value={form.courseId} onChange={e => setF('courseId', e.target.value)}
              className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]">
              <option value="">Select course…</option>
              {courses.map(c => <option key={c._id} value={c._id}>{c.code} — {c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#44474f] mb-1">Quiz Title *</label>
            <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Midterm Quiz — Week 5"
              className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#44474f] mb-1">Description</label>
            <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={3} placeholder="Instructions for students…"
              className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c] resize-none" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#44474f] mb-1">Duration (min)</label>
              <input type="number" value={form.duration} onChange={e => setF('duration', e.target.value)} placeholder="Unlimited"
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#44474f] mb-1">Max Attempts</label>
              <input type="number" min={1} value={form.maxAttempts} onChange={e => setF('maxAttempts', Number(e.target.value))}
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#44474f] mb-1">Pass Mark (%)</label>
              <input type="number" min={0} max={100} value={form.passMark} onChange={e => setF('passMark', Number(e.target.value))}
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#44474f] mb-1">Question Order</label>
              <select value={form.questionOrder} onChange={e => setF('questionOrder', e.target.value)}
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]">
                <option value="sequential">Sequential</option>
                <option value="random">Randomised</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#44474f] mb-1">Opens At</label>
              <input type="datetime-local" value={form.startAt} onChange={e => setF('startAt', e.target.value)}
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#44474f] mb-1">Closes At</label>
              <input type="datetime-local" value={form.endAt} onChange={e => setF('endAt', e.target.value)}
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.showAnswers} onChange={e => setF('showAnswers', e.target.checked)} className="w-4 h-4 accent-[#03224d]" />
            <span className="text-[13px] text-[#44474f]">Show correct answers to students after submission</span>
          </label>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="bg-[#03224d] text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-[#1f3864] transition-colors">
              Next: Add Questions →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white rounded-2xl border border-[#c4c6d0] p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-black text-[#9e9e9e] uppercase">Q{qi + 1}</span>
                <div className="flex items-center gap-2 flex-1">
                  {QUESTION_TYPES.map(t => (
                    <button key={t.value} onClick={() => setQ(qi, 'type', t.value)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${q.type === t.value ? 'bg-[#03224d] text-white' : 'bg-[#f6f3f2] text-[#44474f] hover:bg-[#e8e3df]'}`}>
                      <span className="material-symbols-outlined text-[12px]">{t.icon}</span>
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" min={1} value={q.points} onChange={e => setQ(qi, 'points', Number(e.target.value))}
                    className="w-14 border border-[#c4c6d0] rounded-lg px-2 py-1 text-[12px] text-center focus:outline-none" title="Points" />
                  <span className="text-[10px] text-[#9e9e9e]">pts</span>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qi)} className="p-1 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>

              <textarea value={q.text} onChange={e => setQ(qi, 'text', e.target.value)} rows={2}
                placeholder="Enter question text…"
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c] resize-none" />

              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${qi}`} checked={opt.isCorrect} onChange={() => setCorrectMCQ(qi, oi)}
                        className="w-4 h-4 accent-[#03224d] shrink-0" title="Mark as correct" />
                      <input value={opt.text} onChange={e => setOpt(qi, oi, 'text', e.target.value)} placeholder={`Option ${oi + 1}`}
                        className="flex-1 border border-[#c4c6d0] rounded-xl px-3 py-1.5 text-[12px] focus:outline-none text-[#1b1c1c]" />
                      {q.options.length > 2 && (
                        <button onClick={() => removeOption(qi, oi)} className="p-1 text-[#9e9e9e] hover:text-[#ba1a1a]">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <button onClick={() => addOption(qi)} className="text-[11px] text-[#03224d] font-bold hover:underline">+ Add option</button>
                  )}
                  <p className="text-[10px] text-[#9e9e9e]">Select the radio button next to the correct answer</p>
                </div>
              )}

              {q.type === 'truefalse' && (
                <div className="flex gap-3">
                  {['true', 'false'].map(val => (
                    <button key={val} onClick={() => setQ(qi, 'correctAnswer', val)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-bold border transition-colors capitalize ${q.correctAnswer === val ? 'bg-[#03224d] text-white border-[#03224d]' : 'border-[#c4c6d0] text-[#44474f] hover:bg-[#f6f3f2]'}`}>
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'short_answer' && (
                <div>
                  <label className="block text-[10px] font-bold text-[#9e9e9e] mb-1">Expected Answer (for auto-grading)</label>
                  <input value={q.correctAnswer ?? ''} onChange={e => setQ(qi, 'correctAnswer', e.target.value)} placeholder="Exact expected answer (case-insensitive)"
                    className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2 text-[13px] focus:outline-none text-[#1b1c1c]" />
                </div>
              )}

              {q.type === 'essay' && (
                <p className="text-[11px] text-[#9e9e9e] bg-[#f6f3f2] rounded-lg px-3 py-2">Essay questions require manual grading by the lecturer.</p>
              )}
            </div>
          ))}

          <button onClick={addQuestion} className="w-full border-2 border-dashed border-[#c4c6d0] rounded-2xl py-4 text-[13px] font-bold text-[#747780] hover:border-[#03224d] hover:text-[#03224d] transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">add_circle</span> Add Question
          </button>

          <div className="flex justify-between items-center pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-[13px] font-bold text-[#44474f] hover:bg-[#f6f3f2] rounded-xl transition-colors">← Back</button>
            <div className="flex gap-3">
              <button onClick={() => handleSave('draft')} disabled={saving}
                className="px-4 py-2 border border-[#c4c6d0] rounded-xl text-[13px] font-bold text-[#44474f] hover:bg-[#f6f3f2] transition-colors disabled:opacity-50">
                Save Draft
              </button>
              <button onClick={() => handleSave('published')} disabled={saving}
                className="px-5 py-2 bg-[#03224d] text-white rounded-xl text-[13px] font-bold hover:bg-[#1f3864] transition-colors disabled:opacity-50">
                {saving ? 'Publishing…' : '🚀 Publish Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
