import { useMemo } from 'react'
import { companiesById } from '../data'

export function useCompanyById(id: string | null) {
  return useMemo(() => (id ? companiesById[id] : undefined), [id])
}
