import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-full flex-col bg-[#0a0e1a]">
      <TopBar onMenuToggle={() => setMobileOpen(o => !o)} menuOpen={mobileOpen} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-14 left-0 z-40 w-56 border-r border-[#1e3a5f] bg-[#0d1220] transition-transform duration-200 md:relative md:inset-auto md:translate-x-0 md:z-auto ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </aside>

        {/* Main content */}
        <main className="flex min-w-0 flex-1 flex-col overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
