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
    <div className="overflow-x-auto">
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
                  <div className="flex items-center gap-2">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
