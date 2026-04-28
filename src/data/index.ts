import { ProblemDomain } from '../types'
import { companies } from './companies'
import { jobs } from './jobs'

export { companies } from './companies'
export { jobs } from './jobs'

export const companiesById = Object.fromEntries(companies.map(c => [c.id, c]))

export const jobsByCompany = jobs.reduce<Record<string, typeof jobs>>(
  (acc, j) => {
    ;(acc[j.companyId] ??= []).push(j)
    return acc
  },
  {},
)

export const allTechNames: string[] = [
  ...new Set(companies.flatMap(c => c.techStack.map(t => t.name))),
].sort()

export const allDomains: ProblemDomain[] = [
  ...new Set(companies.flatMap(c => c.problems)),
] as ProblemDomain[]
