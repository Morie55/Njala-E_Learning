/**
 * Modern, fully responsive, high-performance loading skeleton component for NELMS UI.
 * Supports multiple skeleton presets: 'card', 'table', 'list', 'stat', 'detail', 'profile'.
 *
 * Usage:
 *   <LoadingSkeleton type="card" count={4} />
 *   <LoadingSkeleton type="table" count={6} />
 *   <LoadingSkeleton type="stat" count={4} />
 *   <LoadingSkeleton type="list" count={5} />
 *   <LoadingSkeleton type="detail" />
 *   <LoadingSkeleton type="profile" />
 */
export default function LoadingSkeleton({
  type = 'card',
  count = 4,
  gridCols,
  className = '',
}) {
  const items = Array.from({ length: count })

  /* ─────────────────── 1. STAT / KPI CARD ─────────────────── */
  if (type === 'stat') {
    const cols = gridCols || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
    return (
      <div className={`grid ${cols} gap-3 sm:gap-4 lg:gap-5 w-full ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#c4c6d0]/60 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-3 sm:gap-4 w-full min-w-0 overflow-hidden relative"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="skeleton-pulse w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="skeleton h-3 w-16 sm:w-20 rounded-full" />
              <div className="skeleton h-6 sm:h-7 w-3/4 rounded-lg" />
              <div className="skeleton h-2.5 w-1/3 rounded-full" />
            </div>
            {/* accent glow strip */}
            <div className="absolute right-0 top-0 h-full w-1 rounded-r-2xl bg-gradient-to-b from-[#03224d]/10 to-transparent" />
          </div>
        ))}
      </div>
    )
  }

  /* ─────────────────── 2. TABLE ─────────────────── */
  if (type === 'table') {
    return (
      <div className={`bg-white border border-[#c4c6d0]/60 rounded-2xl overflow-hidden shadow-xs w-full ${className}`}>
        {/* Table header row */}
        <div className="bg-[#f8f6f5] border-b border-[#e4e1df] px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="skeleton h-3.5 w-32 sm:w-40 rounded-full" />
          <div className="ml-auto hidden sm:flex gap-6 items-center shrink-0">
            <div className="skeleton h-3 w-20 sm:w-24 rounded-full" />
            <div className="skeleton h-3 w-16 rounded-full" />
            <div className="skeleton h-3 w-12 rounded-full hidden md:block" />
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#c4c6d0]/40">
          {items.map((_, i) => (
            <div
              key={i}
              className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Avatar + name block */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 min-w-0">
                <div className="skeleton-pulse w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="skeleton h-3.5 w-3/4 sm:w-2/5 rounded-md" />
                  <div className="skeleton h-2.5 w-1/2 sm:w-1/4 rounded-full" />
                </div>
              </div>

              {/* Secondary columns - desktop */}
              <div className="hidden md:flex items-center gap-5 lg:gap-7 shrink-0">
                <div className="skeleton h-3 w-20 lg:w-24 rounded-full" />
                <div className="skeleton h-6 w-16 lg:w-20 rounded-full" />
                <div className="skeleton h-3.5 w-10 lg:w-14 rounded-md" />
              </div>

              {/* Mobile badge */}
              <div className="md:hidden shrink-0">
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ─────────────────── 3. LIST ─────────────────── */
  if (type === 'list') {
    return (
      <div className={`space-y-2.5 sm:space-y-3 w-full ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#c4c6d0]/60 rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 shadow-xs min-w-0"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="skeleton-pulse w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="skeleton h-3.5 sm:h-4 w-3/4 sm:w-2/3 rounded-md" />
              <div className="skeleton h-2.5 w-1/2 sm:w-1/3 rounded-full" />
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="skeleton h-5 sm:h-6 w-14 sm:w-16 rounded-full" />
              <div className="skeleton h-2.5 w-10 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ─────────────────── 4. DETAIL PAGE ─────────────────── */
  if (type === 'detail') {
    return (
      <div className={`space-y-4 sm:space-y-6 w-full ${className}`}>
        {/* Hero banner */}
        <div className="bg-white border border-[#c4c6d0]/60 rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 shadow-xs">
          <div className="skeleton h-3.5 w-24 sm:w-32 rounded-full" />
          <div className="skeleton h-7 sm:h-9 w-5/6 sm:w-2/3 rounded-xl" />
          <div className="skeleton h-4 w-full sm:w-1/2 rounded-md" />
          <div className="flex gap-2.5 pt-1 flex-wrap">
            <div className="skeleton h-7 sm:h-8 w-20 sm:w-24 rounded-full" />
            <div className="skeleton h-7 sm:h-8 w-24 sm:w-28 rounded-full" />
            <div className="skeleton h-7 sm:h-8 w-16 sm:w-20 rounded-full" />
          </div>
        </div>

        {/* 2/3 + 1/3 layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#c4c6d0]/60 rounded-2xl p-4 sm:p-6 space-y-3.5 shadow-xs">
              <div className="skeleton h-5 w-1/3 rounded-lg" />
              <div className="space-y-2.5">
                <div className="skeleton h-3.5 w-full rounded-md" />
                <div className="skeleton h-3.5 w-[92%] rounded-md" />
                <div className="skeleton h-3.5 w-5/6 rounded-md" />
                <div className="skeleton h-3.5 w-3/4 rounded-md" />
                <div className="skeleton h-3.5 w-2/3 rounded-md" />
              </div>
            </div>
            <div className="bg-white border border-[#c4c6d0]/60 rounded-2xl p-4 sm:p-6 space-y-3 shadow-xs">
              <div className="skeleton h-5 w-1/4 rounded-lg" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="skeleton h-16 rounded-xl" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-[#c4c6d0]/60 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="skeleton h-5 w-1/2 rounded-lg" />
              <div className="skeleton h-10 sm:h-11 w-full rounded-xl" />
              <div className="skeleton h-10 sm:h-11 w-full rounded-xl" />
              <div className="skeleton h-px w-full" />
              <div className="space-y-2">
                <div className="skeleton h-3.5 w-3/4 rounded-md" />
                <div className="skeleton h-3.5 w-1/2 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─────────────────── 5. PROFILE ─────────────────── */
  if (type === 'profile') {
    return (
      <div className={`space-y-4 sm:space-y-6 w-full ${className}`}>
        {/* Profile header */}
        <div className="bg-white border border-[#c4c6d0]/60 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 shadow-xs">
          <div className="skeleton-pulse w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5 min-w-0 w-full sm:w-auto">
            <div className="skeleton h-5 sm:h-6 w-40 sm:w-56 rounded-lg" />
            <div className="skeleton h-3.5 w-28 sm:w-36 rounded-full" />
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="skeleton h-6 w-16 rounded-full" />
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-14 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0 self-end sm:self-center">
            <div className="skeleton h-9 w-24 rounded-xl" />
            <div className="skeleton h-9 w-9 rounded-xl" />
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#c4c6d0]/60 rounded-xl p-4 space-y-2 shadow-xs">
              <div className="skeleton h-3 w-20 rounded-full" />
              <div className="skeleton h-4.5 w-3/4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ─────────────────── 6. DEFAULT: CARD GRID ─────────────────── */
  const cols = gridCols || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
  return (
    <div className={`grid ${cols} gap-3 sm:gap-4 md:gap-5 w-full ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#c4c6d0]/60 rounded-2xl overflow-hidden shadow-xs flex flex-col min-w-0 group"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Card image banner */}
          <div className="relative">
            <div className="skeleton h-32 sm:h-40 md:h-44 w-full rounded-none" style={{ borderRadius: 0 }} />
            <div className="absolute top-3 left-3">
              <div className="skeleton h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
            </div>
            <div className="absolute top-3 right-3">
              <div className="skeleton h-6 w-6 rounded-full" />
            </div>
          </div>

          {/* Card body */}
          <div className="p-3.5 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3 flex-1 flex flex-col">
            <div className="skeleton h-2.5 w-1/4 rounded-full" />
            <div className="skeleton h-4 sm:h-5 w-[85%] rounded-lg" />
            <div className="space-y-1.5">
              <div className="skeleton h-3 w-full rounded-md" />
              <div className="skeleton h-3 w-4/5 rounded-md" />
            </div>

            <div className="flex-1" />

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <div className="skeleton h-2.5 w-14 rounded-full" />
                <div className="skeleton h-2.5 w-8 rounded-full" />
              </div>
              <div className="skeleton h-1.5 w-full rounded-full" />
            </div>

            {/* Instructor row */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-2 border-t border-[#e4e1df]">
              <div className="skeleton-pulse w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0" />
              <div className="skeleton h-3 flex-1 max-w-[120px] rounded-full" />
              <div className="skeleton h-3 w-10 sm:w-12 rounded-full shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
