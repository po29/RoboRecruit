import { Company } from '../../types'

interface SkillGraphProps {
  companies: Company[]
  minSharedSkills: number
  domainColors: Record<string, string>
}

// Placeholder — D3 force-directed graph coming soon
export function SkillGraph({ companies }: SkillGraphProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl opacity-20">⬡</div>
      <div>
        <p className="font-mono text-sm font-semibold text-slate-300">Skill Overlap Graph</p>
        <p className="mt-1 text-xs text-slate-500">
          D3 force-directed visualization — coming soon
        </p>
        <p className="mt-3 text-xs text-slate-600">
          {companies.length} companies loaded · will show shared-skill edges between them
        </p>
      </div>
    </div>
  )
}
