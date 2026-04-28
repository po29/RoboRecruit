import { useCompanyById } from '../../hooks/useCompanyById'
import { jobsByCompany } from '../../data'
import { TechCategory } from '../../types'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'

interface CompanyModalProps {
  companyId: string | null
  onClose: () => void
}

const techCategoryOrder = [
  TechCategory.Language,
  TechCategory.RoboticsOS,
  TechCategory.ML,
  TechCategory.Controls,
  TechCategory.Simulation,
  TechCategory.Perception,
  TechCategory.Cloud,
  TechCategory.Framework,
  TechCategory.Hardware,
  TechCategory.DevOps,
]

const levelColors: Record<string, string> = {
  Intern: 'text-slate-400',
  Junior: 'text-green-400',
  Mid: 'text-cyan-400',
  Senior: 'text-blue-400',
  Staff: 'text-violet-400',
  Principal: 'text-amber-400',
  Lead: 'text-orange-400',
  Manager: 'text-pink-400',
}

export function CompanyModal({ companyId, onClose }: CompanyModalProps) {
  const company = useCompanyById(companyId)
  const jobs = companyId ? (jobsByCompany[companyId] ?? []) : []

  if (!company) return <Modal open={false} onClose={onClose}>{null}</Modal>

  const grouped = techCategoryOrder.reduce<Record<string, string[]>>((acc, cat) => {
    const items = company.techStack.filter(t => t.category === cat).map(t => t.name)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <Modal open={!!companyId} onClose={onClose}>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-[#1e3a5f] p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#1e3a5f] bg-[#0d1220]">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="h-10 w-10 object-contain"
              onError={e => {
                const el = e.currentTarget
                el.style.display = 'none'
                const p = el.parentElement
                if (p) p.innerHTML = `<span class="font-mono text-xl font-bold text-cyan-400">${company.name.charAt(0)}</span>`
              }}
            />
          ) : (
            <span className="font-mono text-xl font-bold text-cyan-400">{company.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">{company.name}</h2>
            {company.discovered && (
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400">AUTO-DISCOVERED</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span>{company.hq}</span>
            {company.founded ? (
              <>
                <span>·</span>
                <span>Est. {company.founded}</span>
              </>
            ) : null}
            <span>·</span>
            <span className="font-mono text-amber-400">{company.stage}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-[#1e3a5f] px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
            >
              Website ↗
            </a>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#1e3a5f] text-slate-400 hover:border-slate-500 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-[70vh] overflow-y-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Description */}
          <p className="text-sm leading-relaxed text-slate-300">{company.description}</p>

          {/* Problem domains */}
          <div>
            <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Problem Domains
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {company.problems.map(d => (
                <Badge key={d} label={d} variant="domain" />
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Key Products
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {company.products.map(p => (
                <div
                  key={p.name}
                  className="rounded-lg border border-[#1e3a5f] bg-[#0d1220] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-white">{p.name}</p>
                    <span className="shrink-0 rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                      {p.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div>
            <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Tech Stack
            </h3>
            <div className="flex flex-col gap-2">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} className="flex items-start gap-3">
                  <span className="mt-0.5 w-20 shrink-0 font-mono text-[9px] text-slate-500">{cat}</span>
                  <div className="flex flex-wrap gap-1">
                    {items.map(name => (
                      <Badge key={name} label={name} variant="tech" small />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Open positions */}
          {jobs.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Open Positions ({jobs.length})
              </h3>
              <div className="flex flex-col gap-2">
                {jobs.map(job => (
                  <div
                    key={job.id}
                    className="flex flex-col gap-2 rounded-lg border border-[#1e3a5f] bg-[#0d1220] p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{job.title}</p>
                        <span className={`font-mono text-xs ${levelColors[job.level] ?? 'text-slate-400'}`}>
                          {job.level}
                        </span>
                        {job.remote && (
                          <span className="rounded border border-green-500/30 bg-green-500/10 px-1 py-0.5 font-mono text-[9px] text-green-400">
                            Remote
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{job.location}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {job.skills.slice(0, 6).map(s => (
                          <Badge key={s} label={s} variant="tech" small />
                        ))}
                      </div>
                    </div>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 self-start rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                    >
                      Apply ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
