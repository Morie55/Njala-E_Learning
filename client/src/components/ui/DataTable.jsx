export default function DataTable({ columns, rows, emptyMessage = 'No data found.', actions }) {
  if (!rows?.length) {
    return (
      <div className="text-center py-16 text-[#44474f]">
        <span className="material-symbols-outlined text-5xl text-[#c4c6d0] block mb-2">inbox</span>
        <p className="text-[14px]">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Desktop table (sm and above) ─────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f6f3f2]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-[12px] font-bold tracking-wider text-[#44474f] uppercase px-4 py-3 border-b border-[#c4c6d0]"
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="text-left text-[12px] font-bold tracking-wider text-[#44474f] uppercase px-4 py-3 border-b border-[#c4c6d0]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row._id ?? idx}
                className="border-b border-[#c4c6d0] hover:bg-[#f6f3f2] transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-[14px] text-[#1b1c1c]">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile card list (below sm) ──────────────────────────────── */}
      <div className="block sm:hidden divide-y divide-[#c4c6d0]">
        {rows.map((row, idx) => (
          <div
            key={row._id ?? idx}
            className="px-4 py-4 space-y-2 hover:bg-[#f6f3f2] transition-colors"
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#44474f] shrink-0 pt-0.5 w-28">
                  {col.label}
                </span>
                <span className="text-[13px] text-[#1b1c1c] text-right min-w-0 break-words">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </span>
              </div>
            ))}
            {actions && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#c4c6d0]/50 mt-2">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
