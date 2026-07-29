export default function EmptyState({ icon = 'inbox', title = 'Nothing here yet', description, action }) {
  return (
    <div className="text-center py-20">
      <span
        className="material-symbols-outlined text-7xl text-[#c4c6d0] block mb-4"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        {icon}
      </span>
      <h3 className="text-[20px] font-semibold leading-7 text-[#03224d] mb-2">{title}</h3>
      {description && <p className="text-[14px] text-[#44474f] max-w-sm mx-auto mb-6">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-[#03224d] text-white px-5 py-2.5 rounded text-[12px] font-bold tracking-wide hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
