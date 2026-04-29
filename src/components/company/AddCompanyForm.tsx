import { useState } from 'react'
import { Job, JobLevel } from '../../types'
import { analyzeCompanyWebsite, AnalyzedCompanyInfo } from '../../services/companyAnalyzer'
import { UserCompanyExtra } from '../../hooks/useUserCompanies'

interface AddCompanyFormProps {
  onAdd: (name: string, website: string, jobs: Job[], extra: UserCompanyExtra) => void
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
    companyId: '',
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

async function fetchAshby(slug: string): Promise<Job[]> {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)
  if (!res.ok) throw new Error(`Ashby responded ${res.status}`)
  const data = await res.json() as { jobPostings?: Record<string, unknown>[] }
  const postings = data.jobPostings ?? []
  return postings.map((r, i) => ({
    id: `ash-${r['id'] ?? i}`,
    companyId: '',
    title: String(r['title'] ?? ''),
    level: inferLevel(String(r['title'] ?? '')),
    skills: [],
    location: String((r['location'] as Record<string, unknown>)?.['city'] ?? r['locationName'] ?? ''),
    remote: String(r['locationName'] ?? '').toLowerCase().includes('remote'),
    postedDate: r['publishedDate']
      ? String(r['publishedDate']).split('T')[0]
      : new Date().toISOString().split('T')[0],
    url: String(r['jobUrl'] ?? ''),
  }))
}

export function AddCompanyForm({ onAdd }: AddCompanyFormProps) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [ats, setAts] = useState<'none' | 'greenhouse' | 'lever' | 'ashby'>('none')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzed, setAnalyzed] = useState<AnalyzedCompanyInfo | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editLogo, setEditLogo] = useState('')

  const hasApiKey = !!import.meta.env.VITE_ANTHROPIC_API_KEY

  async function handleFetchInfo() {
    if (!website.trim()) return
    setError(null)
    setAnalyzing(true)
    try {
      const info = await analyzeCompanyWebsite(website.trim())
      setAnalyzed(info)
      setEditDesc(info.description)
      setEditLogo(info.logo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze website')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)

    let jobs: Job[] = []
    if (ats !== 'none' && token.trim()) {
      try {
        if (ats === 'greenhouse') jobs = await fetchGreenhouse(token.trim())
        else if (ats === 'lever') jobs = await fetchLever(token.trim())
        else jobs = await fetchAshby(token.trim())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch jobs')
        setLoading(false)
        return
      }
    }

    const extra: UserCompanyExtra = analyzed
      ? {
          hq: analyzed.hq,
          description: editDesc,
          logo: editLogo,
          problems: analyzed.problems,
          techStack: analyzed.techStack,
          products: analyzed.products,
        }
      : {}

    onAdd(name.trim(), website.trim(), jobs, extra)
    setName('')
    setWebsite('')
    setToken('')
    setAts('none')
    setAnalyzed(null)
    setEditDesc('')
    setEditLogo('')
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

        {/* Website + Fetch Info */}
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Website URL (optional)"
            value={website}
            onChange={e => { setWebsite(e.target.value); setAnalyzed(null) }}
            className="flex-1 rounded-lg border border-[#1e3a5f] bg-[#0d1220] px-3 py-2 text-sm text-white placeholder-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
          />
          {hasApiKey && (
            <button
              type="button"
              onClick={handleFetchInfo}
              disabled={!website.trim() || analyzing}
              className="shrink-0 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 font-mono text-xs font-semibold text-violet-400 transition-colors hover:border-violet-500/60 hover:bg-violet-500/20 disabled:opacity-40"
            >
              {analyzing ? 'Analyzing…' : '✦ Fetch Info'}
            </button>
          )}
        </div>

        {/* ATS */}
        <div className="flex gap-2">
          <select
            value={ats}
            onChange={e => { setAts(e.target.value as typeof ats); setToken(''); setError(null) }}
            className="rounded-lg border border-[#1e3a5f] bg-[#0d1220] px-3 py-2 text-sm text-slate-400 focus:border-cyan-500/50 focus:outline-none"
          >
            <option value="none">ATS (optional)</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
          </select>
          {ats !== 'none' && (
            <input
              type="text"
              placeholder={
                ats === 'greenhouse' ? 'Board token e.g. figureai'
                : ats === 'lever' ? 'Board token e.g. skydio'
                : 'Board slug e.g. mycompany'
              }
              value={token}
              onChange={e => setToken(e.target.value)}
              className="flex-1 rounded-lg border border-[#1e3a5f] bg-[#0d1220] px-3 py-2 text-sm text-white placeholder-slate-600 transition-colors focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
            />
          )}
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        {/* Analyzed info preview */}
        {analyzed && (
          <div className="flex flex-col gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-violet-400">
              ✦ AI Extracted Info
            </p>

            {analyzed.hq && (
              <p className="text-[11px] text-slate-400">
                <span className="text-slate-500">HQ: </span>{analyzed.hq}
              </p>
            )}

            {/* Logo */}
            <div className="flex items-center gap-2">
              {editLogo && (
                <img
                  src={editLogo}
                  alt="logo preview"
                  className="h-6 w-6 rounded object-contain"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}
              <input
                type="url"
                placeholder="Logo URL"
                value={editLogo}
                onChange={e => setEditLogo(e.target.value)}
                className="flex-1 rounded border border-[#1e3a5f] bg-[#0d1220] px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-violet-500/40 focus:outline-none"
              />
            </div>

            {/* Description */}
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              rows={3}
              className="rounded border border-[#1e3a5f] bg-[#0d1220] px-2 py-1 text-[11px] text-slate-300 focus:border-violet-500/40 focus:outline-none resize-none"
            />

            {/* Problems */}
            {analyzed.problems.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analyzed.problems.map(d => (
                  <span key={d} className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400">
                    {d}
                  </span>
                ))}
              </div>
            )}

            {/* Tech stack */}
            {analyzed.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {analyzed.techStack.map(t => (
                  <span key={t.name} className="rounded border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                    {t.name}
                  </span>
                ))}
              </div>
            )}

            {/* Products */}
            {analyzed.products.length > 0 && (
              <div className="flex flex-col gap-1">
                {analyzed.products.map(p => (
                  <p key={p.name} className="text-[11px] text-slate-400">
                    <span className="text-white">{p.name}</span>{' '}
                    <span className="text-slate-600">·</span>{' '}
                    {p.description}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

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
