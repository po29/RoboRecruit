interface BadgeProps {
  label: string
  variant?: 'domain' | 'tech' | 'stage' | 'level' | 'count' | 'remote'
  onClick?: () => void
  active?: boolean
  small?: boolean
}

const variantStyles: Record<string, string> = {
  domain: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20',
  tech: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20',
  stage: 'border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20',
  level: 'border-violet-500/40 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20',
  count: 'border-slate-500/40 text-slate-300 bg-slate-500/10',
  remote: 'border-green-500/40 text-green-300 bg-green-500/10',
}

const activeStyles: Record<string, string> = {
  domain: 'bg-cyan-500/30 border-cyan-400 text-cyan-200',
  tech: 'bg-emerald-500/30 border-emerald-400 text-emerald-200',
  stage: 'bg-amber-500/30 border-amber-400 text-amber-200',
  level: 'bg-violet-500/30 border-violet-400 text-violet-200',
  count: '',
  remote: '',
}

export function Badge({ label, variant = 'tech', onClick, active = false, small = false }: BadgeProps) {
  const base = variantStyles[variant] ?? variantStyles.tech
  const activeClass = active ? (activeStyles[variant] ?? '') : ''
  const cursor = onClick ? 'cursor-pointer' : 'cursor-default'
  const size = small ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center rounded border font-mono font-medium transition-colors select-none ${size} ${base} ${activeClass} ${cursor}`}
    >
      {label}
    </span>
  )
}
