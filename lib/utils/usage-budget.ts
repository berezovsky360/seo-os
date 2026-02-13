/**
 * Server-side utility for checking budget limits before making API calls.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface BudgetCheckResult {
  allowed: boolean
  currentSpend: number
  limit: number
  percentage: number
  blockAtLimit: boolean
}

/**
 * Check the current month's spend for a service against the user's budget.
 * Returns { allowed, currentSpend, limit, percentage }.
 * If no budget is set, returns allowed=true with limit=0.
 */
export async function checkBudget(
  supabase: SupabaseClient,
  userId: string,
  service: string,
): Promise<BudgetCheckResult> {
  // Get budget for this service (or 'all' as fallback)
  const { data: budgets } = await supabase
    .from('usage_budgets')
    .select('*')
    .eq('user_id', userId)
    .in('service', [service, 'all'])

  // Prefer service-specific budget, fall back to 'all'
  const budget = budgets?.find(b => b.service === service) || budgets?.find(b => b.service === 'all')

  if (!budget) {
    return { allowed: true, currentSpend: 0, limit: 0, percentage: 0, blockAtLimit: false }
  }

  // Calculate current month's spend
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  let query = supabase
    .from('ai_usage_log')
    .select('estimated_cost')
    .eq('user_id', userId)
    .gte('created_at', firstOfMonth)

  if (service !== 'all') {
    query = query.eq('service', service)
  }

  const { data: logs } = await query

  const currentSpend = (logs || []).reduce((sum, row) => sum + (Number(row.estimated_cost) || 0), 0)
  const limit = Number(budget.monthly_limit) || 0
  const percentage = limit > 0 ? (currentSpend / limit) * 100 : 0
  const allowed = !budget.block_at_limit || percentage < 100

  return {
    allowed,
    currentSpend,
    limit,
    percentage,
    blockAtLimit: budget.block_at_limit,
  }
}
