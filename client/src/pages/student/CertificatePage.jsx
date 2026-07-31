import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../lib/api'

const NJALA_BLUE   = '#03224d'
const NJALA_GREEN  = '#086b53'
const NJALA_GOLD   = '#c8961a'

export default function CertificatePage() {
  const { id: courseId } = useParams()
  const certRef = useRef()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/courses/${courseId}`),
      api.get('/submissions/me'),
      api.get('/submissions/transcript'),
    ]).then(([cRes, sRes, tRes]) => {
      const course = cRes.data?.course ?? cRes.data
      const submissions = sRes.data?.submissions ?? []
      const student = tRes.data?.student

      // Check if student has at least one graded submission in this course
      const courseSubmissions = submissions.filter(
        s => s.courseId?.toString() === courseId && s.score !== null
      )

      if (courseSubmissions.length === 0) {
        setError('Certificate is only available after completing and passing graded work in this course.')
        return
      }

      // Calculate average score for this course
      const totalPct = courseSubmissions.reduce(
        (sum, s) => sum + (s.score / s.maxScore) * 100, 0
      )
      const avgPct = Math.round(totalPct / courseSubmissions.length)

      if (avgPct < 40) {
        setError('A passing grade (≥ 40%) is required to generate a certificate.')
        return
      }

      setData({
        course,
        student,
        avgPct,
        issueDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        certNo: `NJALA-${courseId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      })
    }).catch(() => setError('Failed to load certificate data.')).finally(() => setLoading(false))
  }, [courseId])

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f3f2]">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-[#c4c6d0] animate-pulse block mb-3">workspace_premium</span>
          <p className="text-[14px] text-[#44474f]">Generating your certificate…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f3f2] p-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#c4c6d0] text-center max-w-md">
          <span className="material-symbols-outlined text-5xl text-[#ba1a1a] block mb-4">cancel</span>
          <h2 className="text-[18px] font-bold text-[#03224d] mb-2">Certificate Unavailable</h2>
          <p className="text-[14px] text-[#44474f] mb-6">{error}</p>
          <Link to="/courses" className="inline-flex items-center gap-2 px-4 py-2 bg-[#03224d] text-white rounded-xl text-[13px] font-bold">
            ← Back to Courses
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { course, student, avgPct, issueDate, certNo } = data
  const grade = avgPct >= 70 ? 'Distinction' : avgPct >= 55 ? 'Merit' : 'Pass'
  const gradeColor = avgPct >= 70 ? NJALA_GREEN : avgPct >= 55 ? NJALA_BLUE : '#44474f'

  return (
    <>
      {/* Print action bar (hidden when printing) */}
      <div className="no-print bg-[#03224d] text-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/courses" className="text-white/70 hover:text-white text-[13px] flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back
          </Link>
          <span className="text-white/40">|</span>
          <span className="text-[13px] opacity-75">Certificate of Completion</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-white text-[#03224d] px-4 py-2 rounded-lg font-bold text-[13px] hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          Download / Print
        </button>
      </div>

      {/* Certificate body */}
      <div className="bg-[#f6f3f2] min-h-screen py-8 px-4 flex justify-center items-start">
        <div
          ref={certRef}
          id="certificate"
          className="bg-white w-full max-w-[850px] aspect-[1.414/1] relative overflow-hidden shadow-2xl rounded-sm"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {/* Outer border */}
          <div
            className="absolute inset-3 pointer-events-none"
            style={{ border: `3px solid ${NJALA_GOLD}` }}
          />
          <div
            className="absolute inset-[18px] pointer-events-none"
            style={{ border: `1px solid ${NJALA_GOLD}40` }}
          />

          {/* Corner ornaments */}
          {[['top-4 left-4', ''], ['top-4 right-4', 'scale-x-[-1]'], ['bottom-4 left-4', 'scale-y-[-1]'], ['bottom-4 right-4', 'scale-[-1]']].map(([pos, transform]) => (
            <svg key={pos} className={`absolute ${pos} w-10 h-10 opacity-40`} style={{ transform }} viewBox="0 0 40 40" fill="none">
              <path d="M4 4 L20 4 L20 8 L8 8 L8 20 L4 20 Z" fill={NJALA_GOLD} />
              <circle cx="4" cy="4" r="2" fill={NJALA_GOLD} />
            </svg>
          ))}

          {/* Header band */}
          <div
            className="absolute top-0 left-0 right-0 h-[6px]"
            style={{ background: `linear-gradient(90deg, ${NJALA_BLUE}, ${NJALA_GREEN}, ${NJALA_GOLD})` }}
          />

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-12 text-center z-10">
            {/* University seal area */}
            <div className="mb-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-2"
                style={{ background: NJALA_BLUE, boxShadow: `0 0 0 3px ${NJALA_GOLD}` }}
              >
                <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', fontFamily: 'serif' }}>N</span>
              </div>
              <p style={{ color: NJALA_GOLD, fontSize: '11px', fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' }}>
                Njala University
              </p>
              <p style={{ color: '#747780', fontSize: '9px', fontFamily: 'sans-serif', letterSpacing: '2px' }}>
                Sierra Leone · Est. 1964
              </p>
            </div>

            {/* Title */}
            <div className="mb-5">
              <p style={{ color: '#747780', fontFamily: 'sans-serif', fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '4px' }}>
                This is to certify that
              </p>
              <h1 style={{ color: NJALA_BLUE, fontSize: '32px', fontWeight: 'bold', margin: '4px 0', letterSpacing: '1px' }}>
                {student?.fullName ?? 'Student Name'}
              </h1>
              {student?.idNumber && (
                <p style={{ color: '#747780', fontFamily: 'sans-serif', fontSize: '10px', letterSpacing: '2px' }}>
                  Matriculation No. {student.idNumber}
                </p>
              )}
            </div>

            {/* Body */}
            <p style={{ color: '#44474f', fontFamily: 'sans-serif', fontSize: '11px', lineHeight: '1.8', maxWidth: '560px', marginBottom: '12px' }}>
              has successfully completed the course
            </p>

            <div
              className="px-8 py-4 mb-4 rounded"
              style={{ borderTop: `2px solid ${NJALA_GOLD}`, borderBottom: `2px solid ${NJALA_GOLD}` }}
            >
              <h2 style={{ color: NJALA_BLUE, fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>
                {course?.title ?? 'Course Title'}
              </h2>
              {course?.code && (
                <p style={{ color: '#747780', fontFamily: 'sans-serif', fontSize: '10px', letterSpacing: '2px' }}>
                  Course Code: {course.code}
                </p>
              )}
            </div>

            {/* Grade */}
            <div className="mb-6">
              <p style={{ color: '#747780', fontFamily: 'sans-serif', fontSize: '10px', letterSpacing: '2px', marginBottom: '4px' }}>
                with the grade of
              </p>
              <span style={{ color: gradeColor, fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px' }}>
                {grade} · {avgPct}%
              </span>
            </div>

            {/* Footer row */}
            <div className="flex items-end justify-between w-full mt-2 px-4">
              <div className="text-center">
                <div style={{ borderTop: `1px solid #c4c6d0`, width: '140px', marginBottom: '4px' }} />
                <p style={{ fontFamily: 'sans-serif', fontSize: '9px', color: '#747780', letterSpacing: '1px' }}>VICE CHANCELLOR</p>
                <p style={{ fontFamily: 'sans-serif', fontSize: '9px', color: NJALA_BLUE, fontWeight: 'bold' }}>Njala University</p>
              </div>

              <div className="text-center">
                <p style={{ color: NJALA_GOLD, fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 'bold', letterSpacing: '2px' }}>
                  {issueDate}
                </p>
                <p style={{ color: '#9e9e9e', fontFamily: 'sans-serif', fontSize: '8px', marginTop: '2px' }}>
                  Cert. No: {certNo}
                </p>
                <p style={{ color: '#9e9e9e', fontFamily: 'sans-serif', fontSize: '8px' }}>
                  Verify at: elearning.njala.edu.sl
                </p>
              </div>

              <div className="text-center">
                <div style={{ borderTop: `1px solid #c4c6d0`, width: '140px', marginBottom: '4px' }} />
                <p style={{ fontFamily: 'sans-serif', fontSize: '9px', color: '#747780', letterSpacing: '1px' }}>REGISTRAR</p>
                <p style={{ fontFamily: 'sans-serif', fontSize: '9px', color: NJALA_BLUE, fontWeight: 'bold' }}>Njala University</p>
              </div>
            </div>
          </div>

          {/* Bottom band */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[6px]"
            style={{ background: `linear-gradient(90deg, ${NJALA_GOLD}, ${NJALA_GREEN}, ${NJALA_BLUE})` }}
          />
        </div>
      </div>

      {/* Print-specific CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; }
          #certificate {
            width: 297mm !important;
            max-width: none !important;
            aspect-ratio: auto !important;
            height: 210mm !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>
    </>
  )
}
