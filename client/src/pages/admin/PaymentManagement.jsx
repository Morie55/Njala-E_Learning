import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'
import { useUser } from '../../hooks/useUser'

const STATUS_STYLES = {
  completed: 'bg-[#a0f3d4] text-[#00513e]',
  pending:   'bg-[#ffe8b5] text-[#5a3b00]',
  failed:    'bg-[#ffdad6] text-[#93000a]',
  cancelled: 'bg-[#f0eded] text-[#44474f]',
}

function formatSLE(amount) {
  return `SLE ${Number(amount).toLocaleString('en-SL')}`
}

export default function PaymentManagement() {
  const { role } = useUser()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => { loadPayments() }, [page, statusFilter, typeFilter])

  async function loadPayments() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const { data } = await api.get(`/payments?${params}`)
      setPayments(data.payments ?? [])
      setTotal(data.total ?? 0)
      setPages(data.pages ?? 1)
    } catch (e) {}
    finally { setLoading(false) }
  }

  // Revenue summary from current page
  const completedRevenue = (payments || [])
    .filter(p => p && p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  function handleExportCSV() {
    const lines = [
      ['Date', 'Student', 'Matric', 'Fee Type', 'Description', 'Amount (SLE)', 'Status', 'Reference'],
      ...payments.map(p => [
        new Date(p.createdAt).toLocaleString('en-GB'),
        p.studentId?.fullName ?? '—',
        p.studentId?.idNumber ?? '—',
        p.type,
        p.description,
        p.amount,
        p.status,
        p.reference ?? '',
      ])
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURI(lines)
    a.download = `Payments_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <AppLayout role={role}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[32px] font-semibold text-[#03224d]">Payment Ledger</h2>
          <p className="text-[14px] text-[#44474f]">{total.toLocaleString()} total payment{total !== 1 ? 's' : ''} recorded.</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2 border border-[#c4c6d0] rounded-lg text-[13px] font-bold text-[#03224d] hover:bg-[#f0eded]">
          <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Payments', value: total, icon: 'receipt_long', color: 'text-[#03224d]' },
          { label: 'Completed', value: (payments || []).filter(p => p && p.status === 'completed').length, icon: 'check_circle', color: 'text-[#086b53]' },
          { label: 'Pending', value: (payments || []).filter(p => p && p.status === 'pending').length, icon: 'pending', color: 'text-[#dd9235]' },
          { label: 'Revenue (SLE)', value: formatSLE(completedRevenue), icon: 'payments', color: 'text-[#086b53]' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[#c4c6d0] rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#44474f] uppercase tracking-wider leading-tight">{k.label}</p>
              <span className={`material-symbols-outlined text-[18px] ${k.color}`}>{k.icon}</span>
            </div>
            <p className={`text-[20px] font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d]"
        >
          <option value="">All Statuses</option>
          {['completed','pending','failed','cancelled'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#03224d]"
        >
          <option value="">All Fee Types</option>
          {['registration','tuition','resit','library','hostel','other'].map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#c4c6d0] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-4"><LoadingSkeleton type="table" count={6} /></div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-3">receipt_long</span>
            <p className="text-[14px] text-[#44474f]">No payments found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] font-bold text-[#44474f] uppercase tracking-wider border-b border-[#c4c6d0] bg-[#f6f3f2]">
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Fee Type</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c4c6d0]/30">
                  {payments.map(p => (
                    <tr key={p._id} className="hover:bg-[#fbf9f8] transition-colors">
                      <td className="px-5 py-3 text-[#44474f] whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#03224d]">{p.studentId?.fullName ?? '—'}</p>
                        <p className="text-[11px] text-[#747780]">{p.studentId?.idNumber}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-[11px] font-bold bg-[#d8e2ff] text-[#001a73] px-2 py-0.5 rounded-full capitalize">{p.type}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#03224d] whitespace-nowrap">{formatSLE(p.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_STYLES[p.status] ?? STATUS_STYLES.pending}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-[#747780] font-mono text-[11px]">{p.reference || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-5 py-3 border-t border-[#c4c6d0] flex items-center justify-between">
                <p className="text-[12px] text-[#747780]">Page {page} of {pages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-[#c4c6d0] rounded-lg text-[12px] font-bold disabled:opacity-40 hover:bg-[#f0eded] transition-colors"
                  >← Prev</button>
                  <button
                    onClick={() => setPage(p => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="px-3 py-1.5 border border-[#c4c6d0] rounded-lg text-[12px] font-bold disabled:opacity-40 hover:bg-[#f0eded] transition-colors"
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
