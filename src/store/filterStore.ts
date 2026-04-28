import { create } from 'zustand'
import { CompanyStage, FilterState, ProblemDomain } from '../types'

interface FilterStore extends FilterState {
  toggleDomain: (d: ProblemDomain) => void
  toggleTechnology: (t: string) => void
  toggleStage: (s: CompanyStage) => void
  setHasOpenJobs: (v: boolean) => void
  clearAll: () => void
}

const defaultState: FilterState = {
  domains: [],
  technologies: [],
  stages: [],
  hasOpenJobs: false,
}

export const useFilterStore = create<FilterStore>(set => ({
  ...defaultState,

  toggleDomain: d =>
    set(s => ({
      domains: s.domains.includes(d) ? s.domains.filter(x => x !== d) : [...s.domains, d],
    })),

  toggleTechnology: t =>
    set(s => ({
      technologies: s.technologies.includes(t)
        ? s.technologies.filter(x => x !== t)
        : [...s.technologies, t],
    })),

  toggleStage: stage =>
    set(s => ({
      stages: s.stages.includes(stage)
        ? s.stages.filter(x => x !== stage)
        : [...s.stages, stage],
    })),

  setHasOpenJobs: v => set({ hasOpenJobs: v }),

  clearAll: () => set(defaultState),
}))
