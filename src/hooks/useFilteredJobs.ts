import { useMemo } from 'react'
import { jobs } from '../data'
import { JobLevel } from '../types'

export function useFilteredJobs(skillFilter: string[], levelFilter: JobLevel[]) {
  return useMemo(() => {
    return jobs.filter(j => {
      if (
        skillFilter.length > 0 &&
        !skillFilter.some(s => j.skills.some(js => js.toLowerCase().includes(s.toLowerCase())))
      )
        return false
      if (levelFilter.length > 0 && !levelFilter.includes(j.level)) return false
      return true
    })
  }, [skillFilter, levelFilter])
}
