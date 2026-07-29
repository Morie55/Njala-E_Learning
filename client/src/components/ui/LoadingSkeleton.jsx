/**
 * Modern, fully responsive, high-performance loading skeleton component for NELMS UI.
 * Supports multiple skeleton presets: 'card', 'table', 'list', 'stat', 'detail'.
 */
export default function LoadingSkeleton({
  type = 'card',
  count = 4,
  gridCols,
  className = '',
}) {
  const items = Array.from({ length: count })

  // 1. STATS / KPI CARD SKELETON (Responsive 1 -> 2 -> 4 columns)
  if (type === 'stat') {
    const defaultStatCols = gridCols || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    return (
      <div className={`grid ${defaultStatCols} gap-3 sm:gap-4 lg:gap-5 w-full ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#c4c6d0]/70 rounded-xl p-3.5 sm:p-4 md:p-5 shadow-xs flex items-center gap-3 sm:gap-4 transition-all w-full min-w-0"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="skeleton w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
              <div className="skeleton h-3 w-1/2 rounded-full" />
              <div className="skeleton h-5 sm:h-6 w-3/4 rounded-md" />
              <div className="skeleton h-2.5 w-1/3 rounded-full hidden sm:block" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 2. TABLE SKELETON (Mobile compact row + desktop expanded table)
  if (type === 'table') {
    return (
      <div className={`bg-white border border-[#c4c6d0]/70 rounded-xl overflow-hidden shadow-xs w-full ${className}`}>
        {/* Table Header */}
        <div className="bg-[#f8f6f5] border-b border-[#c4c6d0] px-3.5 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4">
          <div className="skeleton h-4 w-28 sm:w-36 rounded-full" />
          <div className="hidden sm:flex gap-3 md:gap-4 items-center shrink-0">
            <div className="skeleton h-4 w-20 md:w-24 rounded-full" />
            <div className="skeleton h-4 w-16 md:w-20 rounded-full" />
            <div className="skeleton h-4 w-12 md:w-16 rounded-full hidden md:block" />
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-[#c4c6d0]/50">
          {items.map((_, i) => (
            <div
              key={i}
              className="px-3.5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 hover:bg-[#fcfbfb] transition-colors"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {/* Primary Cell */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0">
                <div className="skeleton w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0" />
                <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                  <div className="skeleton h-3.5 sm:h-4 w-3/4 sm:w-2/5 rounded-md" />
                  <div className="skeleton h-2.5 sm:h-3 w-1/2 sm:w-1/4 rounded-full" />
                </div>
              </div>

              {/* Secondary Cells (Tablet / Desktop) */}
              <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
                <div className="skeleton h-3.5 w-20 lg:w-24 rounded-full" />
                <div className="skeleton h-6 w-16 lg:w-20 rounded-full" />
                <div className="skeleton h-4 w-12 lg:w-16 rounded-md" />
              </div>

              {/* Action / End Column */}
              <div className="skeleton w-5 h-5 sm:w-6 sm:h-6 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 3. LIST ITEM SKELETON (Mobile friendly list)
  if (type === 'list') {
    return (
      <div className={`space-y-2.5 sm:space-y-3 w-full ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#c4c6d0]/70 rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-xs min-w-0"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="skeleton w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
              <div className="skeleton h-3.5 sm:h-4 w-3/4 sm:w-2/3 rounded-md" />
              <div className="skeleton h-2.5 sm:h-3 w-1/2 sm:w-1/3 rounded-full" />
            </div>
            <div className="skeleton h-5 sm:h-6 w-12 sm:w-16 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  // 4. DETAIL PAGE HERO SKELETON (Responsive 1-col -> 3-col split)
  if (type === 'detail') {
    return (
      <div className={`space-y-4 sm:space-y-6 w-full ${className}`}>
        {/* Banner Hero */}
        <div className="bg-white border border-[#c4c6d0]/70 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4 shadow-xs">
          <div className="skeleton h-3.5 sm:h-4 w-28 sm:w-36 rounded-full" />
          <div className="skeleton h-6 sm:h-8 w-5/6 sm:w-2/3 rounded-lg" />
          <div className="skeleton h-3.5 sm:h-4 w-full sm:w-1/2 rounded-md" />
          <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2 flex-wrap">
            <div className="skeleton h-6 sm:h-7 w-20 sm:w-24 rounded-full" />
            <div className="skeleton h-6 sm:h-7 w-24 sm:w-28 rounded-full" />
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#c4c6d0]/70 rounded-xl p-4 sm:p-6 space-y-3">
              <div className="skeleton h-4 sm:h-5 w-1/3 rounded-md" />
              <div className="skeleton h-3.5 w-full rounded-md" />
              <div className="skeleton h-3.5 w-5/6 rounded-md" />
              <div className="skeleton h-3.5 w-2/3 rounded-md" />
            </div>
          </div>
          <div className="bg-white border border-[#c4c6d0]/70 rounded-xl p-4 sm:p-6 space-y-3 sm:space-y-4 h-fit">
            <div className="skeleton h-4 sm:h-5 w-1/2 rounded-md" />
            <div className="skeleton h-9 sm:h-10 w-full rounded-lg" />
            <div className="skeleton h-9 sm:h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // 5. DEFAULT CARD SKELETON (Responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop)
  const defaultCardCols = gridCols || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return (
    <div className={`grid ${defaultCardCols} gap-3 sm:gap-4 md:gap-5 w-full ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#c4c6d0]/70 rounded-xl p-3.5 sm:p-4 md:p-5 space-y-3.5 sm:space-y-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between w-full min-w-0"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Card Banner Image Placeholder */}
          <div className="relative">
            <div className="skeleton h-28 sm:h-36 md:h-40 w-full rounded-lg" />
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 skeleton h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
          </div>

          {/* Card Body */}
          <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
            <div className="skeleton h-3 sm:h-3.5 w-1/4 rounded-full" />
            <div className="skeleton h-4 sm:h-5 w-4/5 rounded-md" />
            <div className="skeleton h-3 sm:h-3.5 w-full rounded-md" />
            <div className="skeleton h-3 sm:h-3.5 w-2/3 rounded-md" />
          </div>

          {/* Instructor / Meta line */}
          <div className="flex items-center gap-2.5 sm:gap-3 pt-2 border-t border-[#c4c6d0]/40 min-w-0">
            <div className="skeleton w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0" />
            <div className="skeleton h-3 w-1/3 rounded-full flex-1" />
            <div className="skeleton h-3 w-10 sm:w-12 rounded-full shrink-0" />
          </div>

          {/* Progress bar line */}
          <div className="skeleton h-1.5 sm:h-2 w-full rounded-full mt-0.5 sm:mt-1" />
        </div>
      ))}
    </div>
  )
}
