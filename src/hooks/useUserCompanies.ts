import { useState, useCallback } from 'react'
import { Company, CompanyStage, Job, ProblemDomain, TechItem, Product } from '../types'

export interface UserCompanyExtra {
  hq?: string
  description?: string
  logo?: string
  problems?: ProblemDomain[]
  techStack?: TechItem[]
  products?: Product[]
}

const COMPANIES_KEY = 'roborecruit:userCompanies'
const JOBS_KEY = 'roborecruit:userJobs'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function loadCompanies(): Company[] {
  try {
    return JSON.parse(localStorage.getItem(COMPANIES_KEY) ?? '[]') as Company[]
  } catch {
    return []
  }
}

function loadJobs(): Job[] {
  try {
    return JSON.parse(localStorage.getItem(JOBS_KEY) ?? '[]') as Job[]
  } catch {
    return []
  }
}

function groupByCompany(jobs: Job[]): Record<string, Job[]> {
  return jobs.reduce<Record<string, Job[]>>((acc, j) => {
    ;(acc[j.companyId] ??= []).push(j)
    return acc
  }, {})
}

export function useUserCompanies() {
  const [userCompanies, setUserCompanies] = useState<Company[]>(loadCompanies)
  const [userJobsByCompany, setUserJobsByCompany] = useState<Record<string, Job[]>>(() =>
    groupByCompany(loadJobs())
  )

  const addCompany = useCallback((name: string, website: string, jobs: Job[] = [], extra: UserCompanyExtra = {}) => {
    const id = `user-${slugify(name)}-${Date.now()}`
    const taggedJobs = jobs.map(j => ({ ...j, companyId: id }))

    const entry: Company = {
      id,
      name: name.trim(),
      logo: extra.logo ?? '',
      website: website.trim(),
      hq: extra.hq ?? '',
      stage: CompanyStage.SeriesA,
      problems: extra.problems ?? [],
      techStack: extra.techStack ?? [],
      products: extra.products ?? [],
      description: extra.description ?? '',
      jobCount: taggedJobs.length,
      userAdded: true,
    }

    setUserCompanies(prev => {
      const updated = [...prev, entry]
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(updated))
      return updated
    })

    if (taggedJobs.length > 0) {
      setUserJobsByCompany(prev => {
        const existing = Object.values(prev).flat()
        const allJobs = [...existing, ...taggedJobs]
        localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs))
        return { ...prev, [id]: taggedJobs }
      })
    }
  }, [])

  return { userCompanies, userJobsByCompany, addCompany }
}
