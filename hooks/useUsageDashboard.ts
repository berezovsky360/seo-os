import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ====== Types ======

export interface UsageSummary {
  total_cost: number
  total_requests: number
  total_tokens: number
}

export interface DailyCostEntry {
  date: string
  gemini?: number
  openai?: number
  dataforseo?: number
  total: number
  [key: string]: string | number | undefined
}

export interface ServiceBreakdown {
  [service: string]: {
    requests: number
    tokens: number
    cost: number
  }
}

export interface BudgetStatusItem {
  service: string
  monthly_limit: number
  current_spend: number
  percentage: number
  alert_at_80: boolean
  alert_at_100: boolean
  block_at_limit: boolean
}

export interface UsageLogEntry {
  id: string
  service: string
  action: string
  model: string
  prompt_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  estimated_cost: number
  metadata: Record<string, any>
  created_at: string
}

export interface UsageStatsResponse {
  period: string
  service_filter: string
  summary: UsageSummary
  daily_costs: DailyCostEntry[]
  service_breakdown: ServiceBreakdown
  model_breakdown: ServiceBreakdown
  budget_status: BudgetStatusItem[]
  log: {
    items: UsageLogEntry[]
    total: number
    page: number
    per_page: number
  }
}

export interface BudgetInput {
  service: string
  monthly_limit: number
  alert_at_80?: boolean
  alert_at_100?: boolean
  block_at_limit?: boolean
}

export interface BudgetRecord {
  id: string
  user_id: string
  service: string
  monthly_limit: number
  alert_at_80: boolean
  alert_at_100: boolean
  block_at_limit: boolean
  created_at: string
  updated_at: string
}

// ====== Hooks ======

export function useUsageStats(period: string, service: string, page: number = 1) {
  return useQuery<UsageStatsResponse>({
    queryKey: ['usage-stats', period, service, page],
    queryFn: async () => {
      const params = new URLSearchParams({ period, service, page: String(page), per_page: '50' })
      const res = await fetch(`/api/usage?${params}`)
      if (!res.ok) throw new Error('Failed to fetch usage stats')
      return res.json()
    },
    staleTime: 30_000,
  })
}

export function useBudgets() {
  return useQuery<BudgetRecord[]>({
    queryKey: ['usage-budgets'],
    queryFn: async () => {
      const res = await fetch('/api/usage/budgets')
      if (!res.ok) throw new Error('Failed to fetch budgets')
      const data = await res.json()
      return data.budgets
    },
    staleTime: 60_000,
  })
}

export function useSaveBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: BudgetInput) => {
      const res = await fetch('/api/usage/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Failed to save budget')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-budgets'] })
      queryClient.invalidateQueries({ queryKey: ['usage-stats'] })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (service: string) => {
      const res = await fetch(`/api/usage/budgets?service=${service}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete budget')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage-budgets'] })
      queryClient.invalidateQueries({ queryKey: ['usage-stats'] })
    },
  })
}
