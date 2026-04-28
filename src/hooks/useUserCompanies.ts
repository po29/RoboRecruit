import { useState, useCallback } from 'react'
import { Company, CompanyStage } from '../types'

const STORAGE_KEY = 'roborecruit:userCompanies'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function load(): Company[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Company[]
  } catch {
    return []
  }
}

export function useUserCompanies() {
  const [userCompanies, setUserCompanies] = useState<Company[]>(load)

  const addCompany = useCallback((name: string, website: string) => {
    const entry: Company = {
      id: `user-${slugify(name)}-${Date.now()}`,
      name: name.trim(),
      logo: '',
      website: website.trim(),
      hq: '',
      stage: CompanyStage.SeriesA,
      problems: [],
      techStack: [],
      products: [],
      description: '',
      jobCount: 0,
      userAdded: true,
    }
    setUserCompanies(prev => {
      const updated = [...prev, entry]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return { userCompanies, addCompany }
}
