import { allDomains, allTechNames } from '../../data'
import { useFilterStore } from '../../store/filterStore'
import { CompanyStage } from '../../types'
import { MultiSelect } from './MultiSelect'

export function FilterPanel() {
  const { domains, technologies, stages, hasOpenJobs, toggleDomain, toggleTechnology, toggleStage, setHasOpenJobs, clearAll } =
    useFilterStore()

  const totalActive = domains.length + technologies.length + stages.length + (hasOpenJobs ? 1 : 0)

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <p className="text-xs font-semibold text-white">Filters</p>
        {totalActive > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] font-mono text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear ({totalActive})
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 overflow-y-auto px-3 pb-4">
        {/* Has open jobs toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-slate-400">Has open positions</label>
          <button
            onClick={() => setHasOpenJobs(!hasOpenJobs)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              hasOpenJobs ? 'bg-cyan-500' : 'bg-[#1e3a5f]'
            }`}
          >
            <span
              className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                hasOpenJobs ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="border-t border-[#1e3a5f]" />

        <MultiSelect
          label="Problem Domain"
          options={allDomains}
          selected={domains}
          onToggle={d => toggleDomain(d as typeof domains[number])}
          variant="domain"
        />

        <div className="border-t border-[#1e3a5f]" />

        <MultiSelect
          label="Technology"
          options={allTechNames}
          selected={technologies}
          onToggle={toggleTechnology}
          variant="tech"
        />

        <div className="border-t border-[#1e3a5f]" />

        <MultiSelect
          label="Company Stage"
          options={Object.values(CompanyStage)}
          selected={stages}
          onToggle={s => toggleStage(s as CompanyStage)}
          variant="stage"
        />
      </div>
    </div>
  )
}
