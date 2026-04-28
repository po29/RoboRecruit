import { useState } from 'react'
import { CompanyGrid } from '../components/company/CompanyGrid'
import { CompanyModal } from '../components/company/CompanyModal'
import { FilterPanel } from '../components/filters/FilterPanel'
import { useFilteredCompanies } from '../hooks/useFilteredCompanies'

export function LandscapeView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = useFilteredCompanies()

  return (
    <div className="flex min-h-0 flex-1">
      {/* Filter sidebar */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[#1e3a5f] lg:block">
        <FilterPanel />
      </aside>

      {/* Company grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#1e3a5f] px-4 py-3">
          <p className="font-mono text-sm text-slate-400">
            <span className="text-cyan-400 font-semibold">{filtered.length}</span>
            <span className="text-slate-500"> / 14 companies</span>
          </p>
          <div className="block lg:hidden">
            {/* Mobile: inline filter toggle could go here */}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <CompanyGrid companies={filtered} onSelect={setSelectedId} />
        </div>
      </div>

      <CompanyModal companyId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  )
}
