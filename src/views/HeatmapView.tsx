import { useState } from 'react'
import { TechHeatmap } from '../components/charts/TechHeatmap'
import { companies } from '../data'
import { useFilteredCompanies } from '../hooks/useFilteredCompanies'

export function HeatmapView() {
  const [useFiltered, setUseFiltered] = useState(false)
  const filtered = useFilteredCompanies()
  const data = useFiltered ? filtered : companies

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-semibold text-white">Tech Stack Heatmap</h1>
          <p className="mt-1 text-sm text-slate-400">
            Which companies use which technologies — cyan = yes, dim = no.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
          <div
            onClick={() => setUseFiltered(v => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useFiltered ? 'bg-cyan-500' : 'bg-[#1e3a5f]'}`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useFiltered ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </div>
          Show filtered companies only
        </label>
      </div>

      <div className="rounded-xl border border-[#1e3a5f] bg-[#111827] p-4">
        <TechHeatmap companies={data} />
      </div>
    </div>
  )
}
