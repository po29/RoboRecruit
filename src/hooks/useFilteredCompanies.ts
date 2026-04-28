import { useMemo } from 'react'
import { companies, jobsByCompany } from '../data'
import { useFilterStore } from '../store/filterStore'

export function useFilteredCompanies() {
  const { domains, technologies, stages, hasOpenJobs } = useFilterStore()

  return useMemo(() => {
    return companies.filter(c => {
      if (domains.length > 0 && !domains.some(d => c.problems.includes(d))) return false
      if (
        technologies.length > 0 &&
        !technologies.some(t => c.techStack.some(ts => ts.name === t))
      )
        return false
      if (stages.length > 0 && !stages.includes(c.stage)) return false
      if (hasOpenJobs && (jobsByCompany[c.id]?.length ?? 0) === 0) return false
      return true
    })
  }, [domains, technologies, stages, hasOpenJobs])
}
