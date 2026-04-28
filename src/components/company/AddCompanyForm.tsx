import { useState } from 'react'
import { Job, JobLevel } from '../../types'

interface AddCompanyFormProps {
  onAdd: (name: string, website: string, jobs: Job[]) => void
}

function inferLevel(title: string): JobLevel {
  const t = title.toLowerCase()
  if (t.includes('intern')) return JobLevel.Intern
  if (t.includes('junior') || t.includes('associate')) return JobLevel.Junior
  if (t.includes('staff')) return JobLevel.Staff
  if (t.includes('principal')) return JobLevel.Principal
  if (t.includes('lead')) return JobLevel.Lead
  if (t.includes('senior') || t.includes('sr.')) return JobLevel.Senior
  if (t.includes('director') || t.includes('manager')) return JobLevel.Manager
  return JobLevel.Mid
}

async function fetchGreenhouse(token: string): Promise<Job[]> {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`)
  if (!res.ok) throw new Error(`Greenhouse responded ${res.status}`)
  const { jobs = [] }: { jobs: Record<string, unknown>[] } = await res.json()
  return jobs.map(r => ({
    id: `gh-${r['id']}`,
    companyId: '',                   // caller will retag with real company id
    title: String(r['title'] ?? ''),
    level: inferLevel(String(r['title'] ?? '')),
    skills: [],
    location: String((r['location'] as Record<string, unknown>)?.['name'] ?? ''),
    remote: String((r['location'] as Record<string, unknown>)?.['name'] ?? '').toLowerCase().includes('remote'),
    postedDate: String(r['updated_at'] ?? new Date().toISOString()).split('T')[0],
    url: String(r['absolute_url'] ?? ''),
  }))
}

async function fetchLever(token: string): Promise<Job[]> {
  const res = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`)
  if (!res.ok) throw new Error(`Lever responded ${res.status}`)
  const data: Record<string, unknown>[] = await res.json()
  return data.map(r => ({
    id: `lv-${r['id']}`,
    companyId: '',
    title: String(r['text'] ?? ''),
    level: inferLevel(String(r['text'] ?? '')),
    skills: [],
    location: String((r['categories'] as Record<string, unknown>)?.['location'] ?? ''),
    remote: String(r['workplaceType'] ?? '').toLowerCase() === 'remote',
    postedDate: r['createdAt']
      ? new Date(Number(r['createdAt'])).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    url: String(r['hostedUrl'] ?? r['applyUrl'] ?? ''),
  }))
}

export function AddCompanyForm({ onAdd }: AddCompanyFormProps) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [ats, setAts] = useState<'none' | 'greenhouse' | 'lever'>('none')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)

    let jobs: Job[] = []
    if (ats !== 'none' && token.trim()) {
      try {
        jobs = ats === 'greenhouse'
          ? await fetchGreenhouse(token.trim())
          : await fetchLever(token.trim())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
        setLoading(false)
        return
      }
    }

    onAdd(name.trim(), website.trim(), jobs)
    setName('')
    setWebsite('')
    setToken('')
    setAts('none')
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#111827] p-4">
      <h3 className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Add Company
      </h3>
      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
        Saved to your browser only. To make it permanent, use{' '}
        <span className="font-mono text-cyan-500/80">Copy to TypeScript</span> and add the snippet to{' '}
        <span className="font-mono text-cyan-500/80">src/data/companies.ts</span>, then git push.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Company Name *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="rounded-lg border border-[#1e3a5f] bg-[#0d1220] px-3 py-2 text-sm text-white placeholder-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
        />
        <input
          type="url"
          placeholder="Website URL (optional)"
          value={website}
          onChange={e => setWebsite(e.target.value)}
          className="rounded-lg border border-[#1e3a5f] bg-[#0d1220] px-3 py-2 text-sm text-white placeholder-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
        />

        {/* ATS — fetch live jobs on add */}
        <div className="flex gap-2">
          <select
            value={ats}
            onChange={e => { setAts(e.target.value as typeof ats); setToken(''); setError(null) }}
            className="rounded-lg border border-[#1e3a5f] bg-[#0d1220] px-3 py-2 text-sm text-slate-400 focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="none">ATS (optional)</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
          </select>
          {ats !== 'none' && (
            <input
              type="text"
              placeholder={ats === 'greenhouse' ? 'Board token e.g. figureai' : 'Board token e.g. skydio'}
              value={token}
              onChange={e => setToken(e.target.value)}
              className="flex-1 rounded-lg border border-[#1e3a5f] bg-[#0d1220] px-3 py-2 text-sm text-white placeholder-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
            />
          )}
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-sm font-semibold text-cyan-400 transition-colors hover:border-cyan-500/60 hover:bg-cyan-500/20 disabled:opacity-50"
        >
          {loading ? 'Fetching jobs…' : '+ Add Company'}
        </button>
      </form>
    </div>
  )
}
