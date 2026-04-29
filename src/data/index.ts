import { ProblemDomain } from '../types'
import { companies as curatedCompanies } from './companies'
import { discoveredCompanies } from './discoveredCompanies'
import { discoveredJobsByCompany } from './discoveredJobs'
import { jobs } from './jobs'

export { jobs } from './jobs'

export const companies = [...curatedCompanies, ...discoveredCompanies]

export const companiesById = Object.fromEntries(companies.map(c => [c.id, c]))

export const jobsByCompany: Record<string, typeof jobs> = {
  ...jobs.reduce<Record<string, typeof jobs>>((acc, j) => {
    ;(acc[j.companyId] ??= []).push(j)
    return acc
  }, {}),
  ...discoveredJobsByCompany,
}

export const allTechNames: string[] = [
  ...new Set(companies.flatMap(c => c.techStack.map(t => t.name))),
].sort()

export const allDomains: ProblemDomain[] = [
  ...new Set(companies.flatMap(c => c.problems)),
] as ProblemDomain[]
