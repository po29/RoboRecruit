import { useState } from 'react'
import { JobTable } from '../components/jobs/JobTable'
import { useFilteredJobs } from '../hooks/useFilteredJobs'
import { JobLevel } from '../types'

export function JobsView() {
  const [skillSearch, setSkillSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<JobLevel[]>([])
  const skillFilter = skillSearch.trim() ? [skillSearch.trim()] : []
  const filteredJobs = useFilteredJobs(skillFilter, levelFilter)

  const toggleLevel = (level: JobLevel) =>
    setLevelFilter(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level],
    )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="font-mono text-xl font-semibold text-white">Job Board</h1>
        <p className="mt-1 text-sm text-slate-400">
          <span className="text-cyan-400 font-semibold">{filteredJobs.length}</span> open positions
          across all companies
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter by skill (e.g. ROS 2, PyTorch)..."
            value={skillSearch}
            onChange={e => setSkillSearch(e.target.value)}
            className="w-64 rounded-lg border border-[#1e3a5f] bg-[#111827] px-3 py-1.5 pl-8 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
          <svg
            className="absolute left-2.5 top-2 h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {Object.values(JobLevel).map(level => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`rounded border px-2 py-0.5 font-mono text-xs transition-colors ${
                levelFilter.includes(level)
                  ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                  : 'border-[#1e3a5f] text-slate-400 hover:border-violet-500/40 hover:text-slate-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {(skillSearch || levelFilter.length > 0) && (
          <button
            onClick={() => { setSkillSearch(''); setLevelFilter([]) }}
            className="text-xs text-slate-500 hover:text-cyan-400"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[#1e3a5f] bg-[#111827]">
        <JobTable jobs={filteredJobs} />
      </div>
    </div>
  )
}
