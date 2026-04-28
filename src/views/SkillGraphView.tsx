import { useState } from 'react'
import { SkillGraph } from '../components/charts/SkillGraph'
import { useFilteredCompanies } from '../hooks/useFilteredCompanies'
import { ProblemDomain } from '../types'

const domainColors: Record<string, string> = {
  [ProblemDomain.HumanoidRobotics]: '#00e5ff',
  [ProblemDomain.MobileManipulation]: '#00ff88',
  [ProblemDomain.AutonomousNav]: '#f59e0b',
  [ProblemDomain.DroneUAV]: '#a78bfa',
  [ProblemDomain.InspectionSensing]: '#fb923c',
  [ProblemDomain.ManufacturingAuto]: '#34d399',
  [ProblemDomain.RoboticsFoundation]: '#60a5fa',
  [ProblemDomain.EmbodiedAI]: '#f472b6',
  [ProblemDomain.SafetyCollaboration]: '#fbbf24',
}

export function SkillGraphView() {
  const [minShared, setMinShared] = useState(2)
  const filtered = useFilteredCompanies()

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-semibold text-white">Skill Overlap Graph</h1>
          <p className="mt-1 text-sm text-slate-400">
            Companies are connected when they share hiring skills. Thicker edges = more overlap.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Min shared skills:</label>
          <input
            type="range"
            min={1}
            max={5}
            value={minShared}
            onChange={e => setMinShared(Number(e.target.value))}
            className="w-24 accent-cyan-400"
          />
          <span className="font-mono text-sm font-semibold text-cyan-400">{minShared}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(domainColors).map(([domain, color]) => (
          <div key={domain} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-slate-400">{domain}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#1e3a5f] bg-[#111827]" style={{ height: 560 }}>
        <SkillGraph companies={filtered} minSharedSkills={minShared} domainColors={domainColors} />
      </div>
    </div>
  )
}
