const STORAGE_KEY = 'module-visits'

export function recordModuleVisit(moduleId: string): void {
  if (typeof window === 'undefined') return
  try {
    const counts = getModuleVisitCounts()
    counts[moduleId] = (counts[moduleId] || 0) + 1
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts))
  } catch {
    // localStorage unavailable
  }
}

export function getModuleVisitCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
