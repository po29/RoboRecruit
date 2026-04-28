import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  description: string
}

const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Landscape',
    description: 'Company grid & filters',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/heatmap',
    label: 'Tech Heatmap',
    description: 'Companies × tech matrix',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    to: '/skills',
    label: 'Skill Graph',
    description: 'Shared-skill overlap',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    to: '/jobs',
    label: 'Job Board',
    description: 'All open positions',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <nav className="flex h-full flex-col gap-1 px-3 py-4">
      <div className="mb-4 px-2">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-500">
          Navigation
        </p>
      </div>

      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onClose}
          className={({ isActive }) =>
            `group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
              isActive
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:bg-[#1e2d3d] hover:text-white border border-transparent'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}>
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{item.label}</p>
                <p className="mt-0.5 text-[10px] text-slate-500 group-hover:text-slate-400">{item.description}</p>
              </div>
            </>
          )}
        </NavLink>
      ))}

      <div className="mt-auto border-t border-[#1e3a5f] pt-4">
        <p className="px-2 text-[10px] font-mono text-slate-600">
          v0.1.0 · Static seed data
        </p>
      </div>
    </nav>
  )
}
