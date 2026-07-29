import { useEffect, useRef } from 'react'

const APPS = [
  {
    name: 'Academic Catalog',
    description: 'Browse courses & syllabus',
    icon: 'menu_book',
    bgColor: 'bg-[#d8e2ff]',
    textColor: 'text-[#001a41]',
    href: '/courses',
    external: false,
  },
  {
    name: 'Njala e-Library',
    description: 'Digital journals & papers',
    icon: 'local_library',
    bgColor: 'bg-[#a0f3d4]',
    textColor: 'text-[#002117]',
    href: 'https://njala.edu.sl',
    external: true,
  },
  {
    name: 'Student Portal',
    description: 'Fees & registration',
    icon: 'school',
    bgColor: 'bg-[#ffdcbb]',
    textColor: 'text-[#2b1700]',
    href: '/profile',
    external: false,
  },
  {
    name: 'Institutional Webmail',
    description: 'Campus inbox & mail',
    icon: 'mail',
    bgColor: 'bg-[#e4e2e1]',
    textColor: 'text-[#03224d]',
    href: 'https://mail.njala.edu.sl',
    external: true,
  },
  {
    name: 'Exams & Timetable',
    description: 'Schedule & exam dates',
    icon: 'calendar_month',
    bgColor: 'bg-[#ffdad6]',
    textColor: 'text-[#93000a]',
    href: '/assignments',
    external: false,
  },
  {
    name: 'IT Support Desk',
    description: 'Helpdesk & ticket system',
    icon: 'contact_support',
    bgColor: 'bg-[#d8e2ff]',
    textColor: 'text-[#001a41]',
    href: 'mailto:support@njala.edu.sl',
    external: true,
  },
]

export default function AppsDropdown({ onClose }) {
  const ref = useRef(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#c4c6d0] rounded-xl shadow-xl z-50 overflow-hidden"
      style={{ boxShadow: '0 12px 32px -8px rgba(3,34,77,0.15)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#c4c6d0] flex items-center justify-between bg-[#fbf9f8]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[#03224d]">apps</span>
          <h3 className="text-[14px] font-bold text-[#03224d]">Njala Campus Services</h3>
        </div>
        <span className="text-[11px] font-semibold text-[#086b53] bg-[#a0f3d4]/40 px-2 py-0.5 rounded-full">
          Quick Launch
        </span>
      </div>

      {/* Grid of Apps */}
      <div className="p-3 grid grid-cols-2 gap-2 max-h-96 overflow-y-auto no-scrollbar">
        {APPS.map((app) => (
          <a
            key={app.name}
            href={app.href}
            target={app.external ? '_blank' : '_self'}
            rel={app.external ? 'noreferrer' : undefined}
            onClick={onClose}
            className="p-3 rounded-lg border border-transparent hover:border-[#c4c6d0]/60 hover:bg-[#f6f3f2] transition-all flex flex-col items-start gap-2 group cursor-pointer active:scale-98"
          >
            <div className={`w-9 h-9 rounded-lg ${app.bgColor} ${app.textColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
              <span className="material-symbols-outlined text-[20px]">{app.icon}</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1b1c1c] leading-tight group-hover:text-[#03224d]">
                {app.name}
              </p>
              <p className="text-[11px] text-[#44474f] leading-tight mt-0.5 line-clamp-1">
                {app.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[#f6f3f2] border-t border-[#c4c6d0] text-center">
        <p className="text-[11px] text-[#747780]">
          Njala University Integrated Academic Ecosystem
        </p>
      </div>
    </div>
  )
}
