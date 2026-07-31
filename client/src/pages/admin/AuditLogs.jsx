import { useEffect, useState } from 'react'
import AppLayout from '../../components/layout/AppLayout'
import LoadingSkeleton from '../../components/ui/LoadingSkeleton'
import api from '../../lib/api'

const ACTION_LABELS = {
  GRADE_SUBMISSION: { icon: 'grade', color: 'bg-[#a0f3d4] text-[#00513e]' },
  BULK_IMPORT: { icon: 'upload', color: 'bg-[#d8e2ff] text-[#001a73]' },
  DELETE_USER: { icon: 'person_remove', color: 'bg-[#ffdad6] text-[#93000a]' },
  SUSPEND_USER: { icon: 'lock', color: 'bg-[#ffdad6] text-[#93000a]' },
  REINSTATE_USER: { icon: 'lock_open', color: 'bg-[#a0f3d4] text-[#00513e]' },
  UPDATE_SETTINGS: { icon: 'settings', color: 'bg-[#ffe8b5] text-[#5a3b00]' },
  CREATE_CLERK_USER: { icon: 'person_add', color: 'bg-[#d8e2ff] text-[#001a73]' },
  HARD_DELETE_USER: { icon: 'delete_forever', color: 'bg-[#ffdad6] text-[#93000a]' },
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: '', from: '', to: '' })
  const [page, setPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 25 })
    if (filters.action) params.set('action', filters.action)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)

    api.get(`/admin/audit-logs?${params}`)
      .then(r => {
        setLogs(r.data?.logs ?? [])
        setPagination(r.data?.pagination ?? { page: 1, pages: 1, total: 0 })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filters])

  function handleFilterChange(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  function formatDate(d) {
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const roleColors = {
    admin: 'bg-[#ffdad6] text-[#93000a]',
    lecturer: 'bg-[#d8e2ff] text-[#001a73]',
    student: 'bg-[#a0f3d4] text-[#00513e]',
    dept_head: 'bg-[#ffe8b5] text-[#5a3b00]',
  }

  return (
    <AppLayout role="admin">
      <div className="mb-6">
        <h2 className="text-[32px] font-semibold text-[#03224d]">Audit Logs</h2>
        <p className="text-[14px] text-[#44474f]">
          Full activity trail for all administrative and system actions. {pagination.total > 0 && `${pagination.total} total entries.`}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#c4c6d0] rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-sm">
        <select
          value={filters.action}
          onChange={e => handleFilterChange('action', e.target.value)}
          className="flex-1 border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#03224d] bg-white text-[#1b1c1c]"
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={e => handleFilterChange('from', e.target.value)}
          className="flex-1 border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#03224d]"
          placeholder="From date"
        />
        <input
          type="date"
          value={filters.to}
          onChange={e => handleFilterChange('to', e.target.value)}
          className="flex-1 border border-[#c4c6d0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#03224d]"
          placeholder="To date"
        />
        {(filters.action || filters.from || filters.to) && (
          <button
            onClick={() => { setFilters({ action: '', from: '', to: '' }); setPage(1) }}
            className="flex items-center gap-1 px-3 py-2 text-[12px] font-bold text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#c4c6d0] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6"><LoadingSkeleton type="table" count={8} /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-[#44474f]">
            <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-3">manage_search</span>
            <p className="text-[15px] font-medium">No audit log entries found</p>
            <p className="text-[13px] mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f6f3f2] border-b border-[#c4c6d0] text-[11px] font-bold text-[#44474f] uppercase tracking-wider">
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Actor</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Target</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Details</th>
                  <th className="text-left px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c4c6d0]/40">
                {logs.map(log => {
                  const meta = ACTION_LABELS[log.action] ?? { icon: 'history', color: 'bg-[#f0eded] text-[#44474f]' }
                  return (
                    <tr key={log._id} className="hover:bg-[#fbf9f8] transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${meta.color}`}>
                          <span className="material-symbols-outlined text-[14px]">{meta.icon}</span>
                          {log.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1b1c1c] truncate max-w-[140px]">{log.actorName}</div>
                        {log.actorRole && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleColors[log.actorRole] ?? 'bg-[#f0eded] text-[#44474f]'}`}>
                            {log.actorRole.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-[#44474f]">
                        <span className="font-mono text-[11px] bg-[#f0eded] px-1.5 py-0.5 rounded">{log.targetModel}</span>
                        {log.targetId && <span className="text-[11px] text-[#747780] ml-1">#{log.targetId.slice(-6)}</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-[#44474f] max-w-[200px] truncate">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </td>
                      <td className="px-4 py-3 text-[#44474f] whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-[#c4c6d0] flex items-center justify-between text-[13px]">
            <span className="text-[#44474f]">
              Page {pagination.page} of {pagination.pages} ({pagination.total} entries)
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded border border-[#c4c6d0] text-[#03224d] font-bold disabled:opacity-40 hover:bg-[#f0eded] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, Math.min(pagination.pages - 4, page - 2)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded border text-[12px] font-bold transition-colors ${p === page ? 'bg-[#03224d] text-white border-[#03224d]' : 'border-[#c4c6d0] text-[#44474f] hover:bg-[#f0eded]'}`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1.5 rounded border border-[#c4c6d0] text-[#03224d] font-bold disabled:opacity-40 hover:bg-[#f0eded] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
