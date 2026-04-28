interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  variant?: 'domain' | 'tech' | 'stage'
}

const colors = {
  domain: { active: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300', dot: 'bg-cyan-400' },
  tech: { active: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300', dot: 'bg-emerald-400' },
  stage: { active: 'bg-amber-500/20 border-amber-400/50 text-amber-300', dot: 'bg-amber-400' },
}

export function MultiSelect({ label, options, selected, onToggle, variant = 'tech' }: MultiSelectProps) {
  const c = colors[variant]

  return (
    <div>
      <p className="mb-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-500">
        {label}
        {selected.length > 0 && (
          <span className="ml-1.5 rounded bg-slate-700 px-1 py-0.5 text-[9px] text-slate-300">
            {selected.length}
          </span>
        )}
      </p>
      <div className="flex flex-col gap-1">
        {options.map(opt => {
          const isSelected = selected.includes(opt)
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                isSelected
                  ? `${c.active}`
                  : 'border-transparent text-slate-400 hover:bg-[#1e2d3d] hover:text-slate-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSelected ? c.dot : 'bg-slate-600'}`}
              />
              <span className="truncate font-mono">{opt}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
