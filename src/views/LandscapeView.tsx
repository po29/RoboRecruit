import { useState } from 'react'
import { companies } from '../data'
import { AddCompanyForm } from '../components/company/AddCompanyForm'
import { CompanyGrid } from '../components/company/CompanyGrid'
import { CompanyModal } from '../components/company/CompanyModal'
import { FilterPanel } from '../components/filters/FilterPanel'
import { useFilteredCompanies } from '../hooks/useFilteredCompanies'
import { useUserCompanies } from '../hooks/useUserCompanies'

export function LandscapeView() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filtered = useFilteredCompanies()
  const { userCompanies, userJobsByCompany, addCompany } = useUserCompanies()

  const allShown = [...filtered, ...userCompanies]
  const totalCount = companies.length + userCompanies.length

  return (
    <div className="flex min-h-0 flex-1">
      {/* Filter sidebar */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[#1e3a5f] lg:block">
        <FilterPanel />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#1e3a5f] px-4 py-3">
          <p className="font-mono text-sm text-slate-400">
            <span className="font-semibold text-cyan-400">{allShown.length}</span>
            <span className="text-slate-500"> / {totalCount} companies</span>
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-6">
            <AddCompanyForm onAdd={(name, website, jobs, extra) => addCompany(name, website, jobs, extra)} />
          </div>
          <CompanyGrid companies={allShown} onSelect={setSelectedId} extraJobsByCompany={userJobsByCompany} />
        </div>
      </div>

      <CompanyModal companyId={selectedId} onClose={() => setSelectedId(null)} extraJobsByCompany={userJobsByCompany} />
    </div>
  )
}
