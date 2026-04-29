import { ProblemDomain, TechCategory, TechItem, Product } from '../types'
import { callClaude } from './claudeApi'

export interface AnalyzedCompanyInfo {
  description: string
  hq: string
  logo: string
  problems: ProblemDomain[]
  techStack: TechItem[]
  products: Product[]
}

const PROBLEM_DOMAINS = Object.values(ProblemDomain).join(', ')
const TECH_CATEGORIES = Object.values(TechCategory).join(', ')

const PROMPT_TEMPLATE = (pageText: string) => `
You are analyzing a robotics company's website. Extract structured info and respond with ONLY valid JSON (no markdown, no explanation).

Website text (truncated):
---
${pageText.slice(0, 6000)}
---

Return this exact JSON shape:
{
  "description": "2-3 sentence company description",
  "hq": "City, State (US) or City, Country",
  "logo": "absolute URL to logo image if you can infer it, else empty string",
  "problems": ["exact values from: ${PROBLEM_DOMAINS}"],
  "techStack": [{"name": "technology name", "category": "exact value from: ${TECH_CATEGORIES}"}],
  "products": [{"name": "product name", "description": "one sentence", "category": "Hardware|Software|Platform|Service"}]
}

Rules:
- problems must be exact strings from the list above
- techStack category must be exact strings from the list above
- Include only technologies clearly mentioned or strongly implied
- Return at most 3 products
- If a field is unknown, use empty string or empty array
`.trim()

async function fetchPageText(url: string): Promise<string> {
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  const res = await fetch(proxy, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Failed to fetch website (${res.status})`)
  const html = await res.text()
  // Strip tags, collapse whitespace
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseJson(text: string): AnalyzedCompanyInfo | null {
  try {
    // Extract JSON block in case Claude wrapped it
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const raw = JSON.parse(match[0]) as Record<string, unknown>

    const validDomains = new Set<string>(Object.values(ProblemDomain))
    const validCategories = new Set<string>(Object.values(TechCategory))

    return {
      description: typeof raw['description'] === 'string' ? raw['description'] : '',
      hq: typeof raw['hq'] === 'string' ? raw['hq'] : '',
      logo: typeof raw['logo'] === 'string' ? raw['logo'] : '',
      problems: (Array.isArray(raw['problems']) ? raw['problems'] : []).filter(
        (d): d is ProblemDomain => typeof d === 'string' && validDomains.has(d)
      ),
      techStack: (Array.isArray(raw['techStack']) ? raw['techStack'] : []).filter(
        (t): t is TechItem =>
          typeof (t as TechItem).name === 'string' &&
          typeof (t as TechItem).category === 'string' &&
          validCategories.has((t as TechItem).category)
      ),
      products: (Array.isArray(raw['products']) ? raw['products'] : [])
        .slice(0, 3)
        .filter(
          (p): p is Product =>
            typeof (p as Product).name === 'string' &&
            typeof (p as Product).description === 'string'
        )
        .map(p => ({ ...p, category: (p as Product).category ?? 'Software' })),
    }
  } catch {
    return null
  }
}

export async function analyzeCompanyWebsite(url: string): Promise<AnalyzedCompanyInfo> {
  const pageText = await fetchPageText(url)
  const response = await callClaude(PROMPT_TEMPLATE(pageText))
  const parsed = parseJson(response)
  if (!parsed) throw new Error('Claude returned unparseable JSON')
  return parsed
}
