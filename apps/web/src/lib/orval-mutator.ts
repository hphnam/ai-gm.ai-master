import { apiFetch, type FetchOpts } from './api-client'

// Orval mutator (fetch-style). The generated client calls this with
// (url, RequestInit) — same shape as fetch — so we forward straight to
// apiFetch which already handles credentials, x-request-id, and ApiError
// translation.
export const orvalMutator = async <T>(url: string, init?: FetchOpts): Promise<T> => {
  return apiFetch<T>(url, init)
}

export default orvalMutator
