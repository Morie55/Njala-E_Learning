import clsx from 'clsx'

const VARIANTS = {
  active:    'bg-[#a0f3d4] text-[#167159]',
  draft:     'bg-[#e4e2e1] text-[#44474f]',
  archived:  'bg-[#e4e2e1] text-[#747780]',
  completed: 'bg-[#a0f3d4] text-[#167159]',
  dropped:   'bg-[#ffdad6] text-[#93000a]',
  upcoming:  'bg-[#e4e2e1] text-[#44474f]',
}

export default function StatusBadge({ status }) {
  const label = status?.toUpperCase() ?? ''
  return (
    <span
      className={clsx(
        'text-[10px] font-bold px-2 py-1 rounded',
        VARIANTS[status?.toLowerCase()] ?? 'bg-[#e4e2e1] text-[#44474f]'
      )}
    >
      {label}
    </span>
  )
}
