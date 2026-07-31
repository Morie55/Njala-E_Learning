import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const STATUS_STYLES = {
  completed: 'bg-[#a0f3d4] text-[#00513e]',
  pending:   'bg-[#ffe8b5] text-[#5a3b00]',
  failed:    'bg-[#ffdad6] text-[#93000a]',
  cancelled: 'bg-[#f0eded] text-[#44474f]',
}

const FEE_ICONS = {
  registration: 'how_to_reg',
  tuition:      'school',
  resit:        'replay',
  library:      'local_library',
  hostel:       'home',
  other:        'receipt',
}

function formatSLE(amount) {
  return `SLE ${Number(amount).toLocaleString('en-SL')}`
}

export default function StudentPayments() {
  const [searchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [feeSchedule, setFeeSchedule] = useState([])
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState(false)
  const [selectedFee, setSelectedFee] = useState('')
  const [semester, setSemester] = useState('')
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear() + '/' + (new Date().getFullYear() + 1))
  const [error, setError] = useState('')

  const statusFromUrl = searchParams.get('status')

  useEffect(() => {
    Promise.all([
      api.get('/payments/my'),
      api.get('/payments/fee-schedule'),
    ]).then(([p, f]) => {
      setPayments(p.data?.payments ?? [])
      setFeeSchedule(f.data?.fees ?? [])
      if (f.data?.fees?.length > 0) setSelectedFee(f.data.fees[0].type)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handlePay() {
    if (!selectedFee) return
    setInitiating(true)
    setError('')
    try {
      const { data } = await api.post('/payments/initiate', {
        type: selectedFee,
        semester,
        academicYear,
      })
      // Redirect to Monime checkout
      window.location.href = data.checkoutUrl
    } catch (e) {
      setError(e.response?.data?.error ?? 'Failed to initiate payment. Try again.')
      setInitiating(false)
    }
  }

  const selected = feeSchedule.find(f => f.type === selectedFee)

  return (
    <AppLayout role="student">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">Fee Payments</h2>
        <p className="text-[14px] text-[#44474f]">Pay your university fees securely via Monime mobile money (Orange Money, Afrimoney).</p>
      </div>

      {/* Payment status banner from redirect */}
      {statusFromUrl === 'success' && (
        <div className="mb-6 p-4 bg-[#a0f3d4]/30 border border-[#086b53] rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[#086b53] text-[24px]">check_circle</span>
          <div>
            <p className="font-bold text-[#086b53]">Payment Successful!</p>
            <p className="text-[13px] text-[#086b53]/80">Your payment has been received. A receipt has been sent to your email.</p>
          </div>
        </div>
      )}
      {statusFromUrl === 'cancelled' && (
        <div className="mb-6 p-4 bg-[#ffdad6]/30 border border-[#ba1a1a] rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ba1a1a] text-[24px]">cancel</span>
          <p className="font-bold text-[#ba1a1a] text-[14px]">Payment was cancelled. You can try again below.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Make Payment Card */}
        <div className="lg:col-span-1 bg-white border border-[#c4c6d0] rounded-2xl p-6 shadow-sm h-fit">
          <h3 className="text-[16px] font-bold text-[#03224d] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">payments</span>
            Make a Payment
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1.5">Fee Type *</label>
              <select
                value={selectedFee}
                onChange={e => setSelectedFee(e.target.value)}
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] bg-white"
              >
                {feeSchedule.map(f => (
                  <option key={f.type} value={f.type}>{f.label} — {formatSLE(f.amount)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1.5">Academic Year</label>
              <input
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="e.g. 2025/2026"
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#44474f] uppercase tracking-wider mb-1.5">Semester (optional)</label>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                className="w-full border border-[#c4c6d0] rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-[#03224d] bg-white"
              >
                <option value="">— Select —</option>
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
                <option value="Full Year">Full Year</option>
              </select>
            </div>

            {/* Amount preview */}
            {selected && (
              <div className="bg-[#03224d] text-white rounded-xl p-4 text-center">
                <p className="text-[11px] opacity-70 uppercase tracking-wider mb-1">Amount Due</p>
                <p className="text-[28px] font-extrabold">{formatSLE(selected.amount)}</p>
                <p className="text-[11px] opacity-60 mt-1">Sierra Leonean Leone (SLE)</p>
              </div>
            )}

            {error && <p className="text-[13px] text-[#ba1a1a] font-medium">{error}</p>}

            <button
              onClick={handlePay}
              disabled={initiating || !selectedFee}
              className="w-full bg-[#03224d] text-white py-3 rounded-xl font-bold text-[14px] hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity"
            >
              {initiating
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Redirecting…</>
                : <><span className="material-symbols-outlined text-[18px]">phone_iphone</span> Pay with Monime</>
              }
            </button>
            <p className="text-[11px] text-[#747780] text-center mt-1">Supports Orange Money & Afrimoney · Secured by Monime (PCI DSS Level 1)</p>
          </div>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#c4c6d0] bg-[#f6f3f2]">
            <h3 className="text-[15px] font-bold text-[#03224d]">Payment History</h3>
          </div>
          {loading ? (
            <div className="p-4"><LoadingSkeleton type="table" count={4} /></div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-3">receipt_long</span>
              <p className="text-[14px] text-[#44474f]">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#c4c6d0]/40">
              {payments.map(p => (
                <div key={p._id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#fbf9f8] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#d8e2ff] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px] text-[#03224d]">{FEE_ICONS[p.type] ?? 'receipt'}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#03224d] text-[14px]">{p.description}</p>
                      <p className="text-[11px] text-[#747780]">
                        {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {p.reference && ` · Ref: ${p.reference}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-[15px] text-[#03224d]">{formatSLE(p.amount)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[p.status] ?? STATUS_STYLES.pending}`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
