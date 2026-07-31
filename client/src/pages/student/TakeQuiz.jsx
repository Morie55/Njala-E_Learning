import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'

export default function TakeQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [tabSwitches, setTabSwitches] = useState(0)
  const [toast, setToast] = useState(null)

  const timerRef = useRef(null)

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Load quiz details and start/resume attempt
  useEffect(() => {
    async function init() {
      try {
        const { data: qData } = await api.get(`/quizzes/${id}`)
        setQuiz(qData.quiz)
        setQuestions(qData.questions ?? [])

        const { data: aData } = await api.post(`/quizzes/${id}/attempt/start`)
        setAttempt(aData.attempt)
        if (aData.attempt?.answers) {
          setAnswers(aData.attempt.answers)
        }

        // Calculate timer if duration exists
        if (qData.quiz.duration && aData.attempt?.startedAt) {
          const startMs = new Date(aData.attempt.startedAt).getTime()
          const durationMs = qData.quiz.duration * 60 * 1000
          const elapsedMs = Date.now() - startMs
          const remainingSec = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000))
          setTimeLeft(remainingSec)
        }
      } catch (err) {
        showToast(err.response?.data?.error ?? 'Failed to load quiz', 'error')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null || result) return
    if (timeLeft <= 0) {
      handleSubmit(true)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleSubmit(true)
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [timeLeft, result])

  // Tab switch anti-cheat detection
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && !result) {
        setTabSwitches(s => {
          const next = s + 1
          showToast(`Warning: Tab switch detected (${next})! Your instructor has been notified.`, 'error')
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [result])

  function handleSelectAnswer(qId, val) {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  async function handleSubmit(auto = false) {
    if (submitting || result) return
    setSubmitting(true)

    if (auto) {
      showToast('Time expired! Auto-submitting quiz…', 'error')
    }

    try {
      const { data } = await api.post(`/quizzes/${id}/attempt/submit`, {
        attemptId: attempt._id,
        answers,
      })
      setResult(data)
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Failed to submit quiz', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-[#747780]">Preparing quiz environment…</div>
  }

  if (!quiz || !attempt) {
    return (
      <div className="p-8 text-center">
        <p className="text-[14px] text-[#ba1a1a] font-bold">Quiz unavailable or access restricted.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-[#03224d] text-white text-[12px] font-bold rounded-xl">
          Return to Course
        </button>
      </div>
    )
  }

  // Render Post-Submission Results View
  if (result) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        <div className={`rounded-2xl p-6 text-center text-white shadow-xl ${result.passed ? 'bg-gradient-to-br from-[#086b53] to-[#043e30]' : 'bg-gradient-to-br from-[#ba1a1a] to-[#730000]'}`}>
          <span className="material-symbols-outlined text-6xl mb-2">
            {result.passed ? 'workspace_premium' : 'cancel'}
          </span>
          <h1 className="text-[24px] font-black">{result.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}</h1>
          <p className="text-[14px] opacity-90 mt-1">
            Score: <strong className="text-[20px]">{result.score}</strong> / {attempt.maxScore} ({result.pct}%)
          </p>
          <p className="text-[12px] opacity-75 mt-0.5">
            Pass mark required: {quiz.passMark}%
          </p>
          {result.needsManualGrading && (
            <div className="mt-3 bg-white/20 px-3 py-1.5 rounded-lg inline-block text-[11px] font-bold">
              ℹ️ Short Answer / Essay questions pending lecturer review
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button onClick={() => navigate(-1)} className="px-6 py-2.5 bg-[#03224d] text-white rounded-xl text-[13px] font-bold hover:bg-[#1f3864]">
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentQIndex]
  const isLast = currentQIndex === questions.length - 1
  const answeredCount = Object.keys(answers).length

  const fmtTime = (secs) => {
    if (secs === null) return 'Unlimited'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-white text-[13px] font-bold shadow-lg ${toast.type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#03224d]'}`}>
          {toast.msg}
        </div>
      )}

      {/* Quiz Top Status Bar */}
      <div className="bg-white rounded-2xl border border-[#c4c6d0] p-4 flex items-center justify-between flex-wrap gap-4 sticky top-16 z-30 shadow-xs">
        <div>
          <h1 className="text-[16px] font-black text-[#1b1c1c]">{quiz.title}</h1>
          <p className="text-[11px] text-[#747780]">
            Question {currentQIndex + 1} of {questions.length} · {answeredCount} answered
          </p>
        </div>

        <div className="flex items-center gap-4">
          {tabSwitches > 0 && (
            <span className="text-[11px] font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-1 rounded-lg">
              ⚠️ {tabSwitches} tab switch{tabSwitches > 1 ? 'es' : ''}
            </span>
          )}

          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[13px] ${timeLeft < 180 ? 'bg-[#ffdad6] text-[#ba1a1a] animate-pulse' : 'bg-[#f0f3ff] text-[#03224d]'}`}>
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span>{fmtTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Question Card */}
      {currentQ && (
        <div className="bg-white rounded-2xl border border-[#c4c6d0] p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-black text-[#03224d] uppercase bg-[#d8e2ff] px-2.5 py-0.5 rounded-full">
              Question {currentQIndex + 1} ({currentQ.points} pt{currentQ.points !== 1 ? 's' : ''})
            </span>
            <span className="text-[11px] font-bold text-[#747780] uppercase">{currentQ.type.replace('_', ' ')}</span>
          </div>

          <h2 className="text-[16px] font-bold text-[#1b1c1c] leading-relaxed">{currentQ.text}</h2>

          {/* MCQ Options */}
          {currentQ.type === 'mcq' && (
            <div className="space-y-2.5 pt-2">
              {currentQ.options?.map((opt) => {
                const selected = answers[currentQ._id] === opt._id
                return (
                  <button
                    key={opt._id}
                    onClick={() => handleSelectAnswer(currentQ._id, opt._id)}
                    className={`w-full text-left p-3.5 rounded-xl border text-[13px] font-medium flex items-center gap-3 transition-all ${
                      selected ? 'bg-[#03224d] text-white border-[#03224d] shadow-sm' : 'bg-[#f6f3f2] text-[#1b1c1c] border-[#c4c6d0] hover:bg-[#e8e3df]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${selected ? 'border-white bg-white text-[#03224d]' : 'border-[#747780]'}`}>
                      {selected && '✓'}
                    </div>
                    <span>{opt.text}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* True / False */}
          {currentQ.type === 'truefalse' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {['true', 'false'].map(val => {
                const selected = answers[currentQ._id] === val
                return (
                  <button
                    key={val}
                    onClick={() => handleSelectAnswer(currentQ._id, val)}
                    className={`py-4 rounded-xl border text-[14px] font-bold capitalize transition-all ${
                      selected ? 'bg-[#03224d] text-white border-[#03224d]' : 'bg-[#f6f3f2] text-[#1b1c1c] border-[#c4c6d0] hover:bg-[#e8e3df]'
                    }`}
                  >
                    {val}
                  </button>
                )
              })}
            </div>
          )}

          {/* Short Answer */}
          {currentQ.type === 'short_answer' && (
            <div className="pt-2">
              <input
                type="text"
                value={answers[currentQ._id] ?? ''}
                onChange={e => handleSelectAnswer(currentQ._id, e.target.value)}
                placeholder="Type your short answer here…"
                className="w-full border border-[#c4c6d0] rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c]"
              />
            </div>
          )}

          {/* Essay */}
          {currentQ.type === 'essay' && (
            <div className="pt-2">
              <textarea
                value={answers[currentQ._id] ?? ''}
                onChange={e => handleSelectAnswer(currentQ._id, e.target.value)}
                rows={5}
                placeholder="Write your essay answer here…"
                className="w-full border border-[#c4c6d0] rounded-xl p-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#03224d]/20 text-[#1b1c1c] resize-y"
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
          disabled={currentQIndex === 0}
          className="px-4 py-2 border border-[#c4c6d0] rounded-xl text-[13px] font-bold text-[#44474f] hover:bg-[#f6f3f2] disabled:opacity-30"
        >
          ← Previous
        </button>

        <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-xs px-2 py-1">
          {questions.map((q, idx) => (
            <button
              key={q._id}
              onClick={() => setCurrentQIndex(idx)}
              className={`w-7 h-7 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                idx === currentQIndex
                  ? 'bg-[#03224d] text-white ring-2 ring-[#03224d]/30'
                  : answers[q._id]
                  ? 'bg-[#a0f3d4] text-[#002117]'
                  : 'bg-[#f6f3f2] text-[#747780]'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {isLast ? (
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-5 py-2 bg-[#086b53] text-white rounded-xl text-[13px] font-bold hover:bg-[#06523f] disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Finish & Submit'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentQIndex(i => Math.min(questions.length - 1, i + 1))}
            className="px-5 py-2 bg-[#03224d] text-white rounded-xl text-[13px] font-bold hover:bg-[#1f3864]"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
