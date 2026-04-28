import { Job } from '../../types'
import { companiesById } from '../../data'
import { Badge } from '../ui/Badge'

interface JobRowProps {
  job: Job
}

const levelColors: Record<string, string> = {
  Intern: 'border-slate-500/40 text-slate-400 bg-slate-500/10',
  Junior: 'border-green-500/40 text-green-400 bg-green-500/10',
  Mid: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  Senior: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  Staff: 'border-violet-500/40 text-violet-400 bg-violet-500/10',
  Principal: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  Lead: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
  Manager: 'border-pink-500/40 text-pink-400 bg-pink-500/10',
}

export function JobRow({ job }: JobRowProps) {
  const company = companiesById[job.companyId]
  const levelClass = levelColors[job.level] ?? levelColors.Mid
  const daysAgo = Math.floor(
    (Date.now() - new Date(job.postedDate).getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <tr className="group border-b border-[#1e3a5f] hover:bg-[#0d1220] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#1e3a5f] bg-[#0a0e1a]">
            <img
              src={company?.logo}
              alt={company?.name}
              className="h-4 w-4 object-contain"
              onError={e => {
                const el = e.currentTarget
                el.style.display = 'none'
                const p = el.parentElement
                if (p && company) p.innerHTML = `<span class="font-mono text-[10px] font-bold text-cyan-400">${company.name.charAt(0)}</span>`
              }}
            />
          </div>
          <span className="text-xs font-medium text-slate-300 whitespace-nowrap">{company?.name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white">{job.title}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${levelClass}`}>
          {job.level}
        </span>
      </td>
      <td className="max-w-[220px] px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {job.skills.slice(0, 4).map(s => (
            <Badge key={s} label={s} variant="tech" small />
          ))}
          {job.skills.length > 4 && (
            <Badge label={`+${job.skills.length - 4}`} variant="count" small />
          )}
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{job.location}</td>
      <td className="px-4 py-3">
        {job.remote && (
          <span className="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 font-mono text-[9px] text-green-400">
            Remote
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
        {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
      </td>
      <td className="px-4 py-3">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-cyan-500/30 px-2 py-1 font-mono text-[10px] text-cyan-400 hover:bg-cyan-500/10 transition-colors"
        >
          Apply ↗
        </a>
      </td>
    </tr>
  )
}
