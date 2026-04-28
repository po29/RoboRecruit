import { Company, Job } from '../../types'
import { jobsByCompany } from '../../data'
import { useFilterStore } from '../../store/filterStore'
import { CompanyCard } from './CompanyCard'

interface CompanyGridProps {
  companies: Company[]
  onSelect: (id: string) => void
  extraJobsByCompany?: Record<string, Job[]>
}

export function CompanyGrid({ companies, onSelect, extraJobsByCompany }: CompanyGridProps) {
  const clearAll = useFilterStore(s => s.clearAll)

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="text-4xl opacity-20">⬡</div>
        <p className="text-sm text-slate-400">No companies match your filters.</p>
        <button
          onClick={clearAll}
          className="rounded-lg border border-[#1e3a5f] px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
        >
          Clear all filters
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {companies.map(company => (
        <CompanyCard
          key={company.id}
          company={company}
          jobCount={(jobsByCompany[company.id]?.length ?? 0) + (extraJobsByCompany?.[company.id]?.length ?? 0)}
          onClick={onSelect}
        />
      ))}
    </div>
  )
}
