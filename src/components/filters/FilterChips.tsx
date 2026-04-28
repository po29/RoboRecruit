import { useFilterStore } from '../../store/filterStore'

export function FilterChips() {
  const { domains, technologies, stages, hasOpenJobs, toggleDomain, toggleTechnology, toggleStage, setHasOpenJobs, clearAll } =
    useFilterStore()

  const total = domains.length + technologies.length + stages.length + (hasOpenJobs ? 1 : 0)
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-[#1e3a5f] px-3 py-2">
      {domains.map(d => (
        <button
          key={d}
          onClick={() => toggleDomain(d)}
          className="flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-colors"
        >
          {d} <span className="text-[10px] opacity-60">×</span>
        </button>
      ))}
      {technologies.map(t => (
        <button
          key={t}
          onClick={() => toggleTechnology(t)}
          className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-colors"
        >
          {t} <span className="text-[10px] opacity-60">×</span>
        </button>
      ))}
      {stages.map(s => (
        <button
          key={s}
          onClick={() => toggleStage(s)}
          className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-colors"
        >
          {s} <span className="text-[10px] opacity-60">×</span>
        </button>
      ))}
      {hasOpenJobs && (
        <button
          onClick={() => setHasOpenJobs(false)}
          className="flex items-center gap-1 rounded border border-green-500/40 bg-green-500/10 px-1.5 py-0.5 font-mono text-[10px] text-green-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 transition-colors"
        >
          Has jobs <span className="text-[10px] opacity-60">×</span>
        </button>
      )}
      <button
        onClick={clearAll}
        className="ml-auto text-[10px] font-mono text-slate-500 hover:text-red-400 transition-colors"
      >
        Clear all
      </button>
    </div>
  )
}
