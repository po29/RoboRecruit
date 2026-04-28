import { Company } from '../../types'
import { Badge } from '../ui/Badge'

interface CompanyCardProps {
  company: Company
  jobCount: number
  onClick: (id: string) => void
}

const stageColors: Record<string, string> = {
  Seed: 'text-pink-400',
  'Series A': 'text-orange-400',
  'Series B': 'text-amber-400',
  'Series C': 'text-yellow-400',
  'Series D': 'text-lime-400',
  'Series E': 'text-green-400',
  Public: 'text-cyan-400',
  Subsidiary: 'text-violet-400',
}

export function CompanyCard({ company, jobCount, onClick }: CompanyCardProps) {
  const maxDomains = 2
  const maxTech = 5
  const extraDomains = company.problems.length - maxDomains
  const extraTech = company.techStack.length - maxTech

  return (
    <button
      onClick={() => onClick(company.id)}
      className="group relative flex flex-col gap-3 rounded-xl border border-[#1e3a5f] bg-[#111827] p-4 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#131f30] hover:shadow-lg hover:shadow-cyan-500/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1e3a5f] bg-[#0d1220] group-hover:border-cyan-500/30">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-7 w-7 object-contain"
              onError={e => {
                const el = e.currentTarget
                el.style.display = 'none'
                const parent = el.parentElement
                if (parent) {
                  parent.innerHTML = `<span class="font-mono text-sm font-bold text-cyan-400">${company.name.charAt(0)}</span>`
                }
              }}
            />
          ) : (
            <span className="font-mono text-sm font-bold text-cyan-400">{company.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold text-white group-hover:text-cyan-50">{company.name}</p>
            {company.discovered && (
              <span className="shrink-0 rounded border border-cyan-500/30 bg-cyan-500/10 px-1 py-0.5 font-mono text-[8px] text-cyan-400">NEW</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {company.hq}{company.founded ? ` · Est. ${company.founded}` : ''}
          </p>
        </div>
        <span className={`shrink-0 font-mono text-[10px] font-semibold ${stageColors[company.stage] ?? 'text-slate-400'}`}>
          {company.stage}
        </span>
      </div>

      {/* Problem domains */}
      <div className="flex flex-wrap gap-1">
        {company.problems.slice(0, maxDomains).map(d => (
          <Badge key={d} label={d} variant="domain" small />
        ))}
        {extraDomains > 0 && (
          <Badge label={`+${extraDomains}`} variant="count" small />
        )}
      </div>

      {/* Tech stack */}
      <div className="flex flex-wrap gap-1">
        {company.techStack.slice(0, maxTech).map(t => (
          <Badge key={t.name} label={t.name} variant="tech" small />
        ))}
        {extraTech > 0 && (
          <Badge label={`+${extraTech}`} variant="count" small />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#1e3a5f] pt-2">
        <span className="text-[10px] font-mono text-slate-500">
          {company.products.length} product{company.products.length !== 1 ? 's' : ''}
        </span>
        {jobCount > 0 ? (
          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-green-400 border border-green-500/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            {jobCount} open role{jobCount !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">No open roles</span>
        )}
      </div>
    </button>
  )
}
