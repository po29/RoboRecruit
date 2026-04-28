import { useState } from 'react'
import { Job } from '../../types'
import { JobRow } from './JobRow'

interface JobTableProps {
  jobs: Job[]
}

type SortKey = 'title' | 'level' | 'postedDate'
const PAGE_SIZE = 20

const levelOrder = ['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Lead', 'Manager']

export function JobTable({ jobs }: JobTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('postedDate')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)

  const sorted = [...jobs].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'title') cmp = a.title.localeCompare(b.title)
    else if (sortKey === 'level') cmp = levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level)
    else cmp = a.postedDate.localeCompare(b.postedDate)
    return sortAsc ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true); setPage(0) }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <span className="ml-1 text-cyan-400">{sortAsc ? '↑' : '↓'}</span>
    ) : (
      <span className="ml-1 text-slate-600">↕</span>
    )

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm text-slate-400">No jobs match your filters.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[#1e3a5f] text-left">
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">Company</th>
              <th
                className="cursor-pointer px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                onClick={() => handleSort('title')}
              >
                Title <SortIcon col="title" />
              </th>
              <th
                className="cursor-pointer px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                onClick={() => handleSort('level')}
              >
                Level <SortIcon col="level" />
              </th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">Skills</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">Location</th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">Remote</th>
              <th
                className="cursor-pointer px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                onClick={() => handleSort('postedDate')}
              >
                Posted <SortIcon col="postedDate" />
              </th>
              <th className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-slate-500" />
            </tr>
          </thead>
          <tbody>
            {paged.map(job => (
              <JobRow key={job.id} job={job} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#1e3a5f] px-4 py-3">
          <span className="font-mono text-xs text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="rounded border border-[#1e3a5f] px-2.5 py-1 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="rounded border border-[#1e3a5f] px-2.5 py-1 text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
