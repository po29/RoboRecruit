import { useState } from 'react'

interface AddCompanyFormProps {
  onAdd: (name: string, website: string) => void
}

export function AddCompanyForm({ onAdd }: AddCompanyFormProps) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), website.trim())
    setName('')
    setWebsite('')
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
        <button
          type="submit"
          className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 font-mono text-sm font-semibold text-cyan-400 transition-colors hover:border-cyan-500/60 hover:bg-cyan-500/20"
        >
          + Add Company
        </button>
      </form>
    </div>
  )
}
