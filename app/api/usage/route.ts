import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const serviceFilter = searchParams.get('service') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '50'), 100)

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Date filter
    let dateFilter: string | null = null
    if (period === '7d') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (period === '30d') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    } else if (period === '90d') {
      dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Fetch all logs for the period (for aggregation)
    let query = serviceClient
      .from('ai_usage_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dateFilter) query = query.gte('created_at', dateFilter)
    if (serviceFilter !== 'all') query = query.eq('service', serviceFilter)

    const { data: logs, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const entries = logs || []

    // Summary stats
    let totalTokens = 0
    let totalCost = 0
    const serviceBreakdown: Record<string, { requests: number; tokens: number; cost: number }> = {}
    const modelBreakdown: Record<string, { requests: number; tokens: number; cost: number }> = {}

    // Daily costs accumulator
    const dailyMap: Record<string, Record<string, number>> = {}

    for (const log of entries) {
      const cost = Number(log.estimated_cost) || 0
      const tokens = log.total_tokens || 0
      const service = log.service || 'gemini'
      const model = log.model || 'unknown'

      totalTokens += tokens
      totalCost += cost

      // Service breakdown
      if (!serviceBreakdown[service]) {
        serviceBreakdown[service] = { requests: 0, tokens: 0, cost: 0 }
      }
      serviceBreakdown[service].requests += 1
      serviceBreakdown[service].tokens += tokens
      serviceBreakdown[service].cost += cost

      // Model breakdown
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { requests: 0, tokens: 0, cost: 0 }
      }
      modelBreakdown[model].requests += 1
      modelBreakdown[model].tokens += tokens
      modelBreakdown[model].cost += cost

      // Daily aggregation
      const day = log.created_at.split('T')[0]
      if (!dailyMap[day]) dailyMap[day] = {}
      dailyMap[day][service] = (dailyMap[day][service] || 0) + cost
    }

    // Convert daily map to sorted array
    const dailyCosts = Object.entries(dailyMap)
      .map(([date, services]) => {
        const total = Object.values(services).reduce((s, v) => s + v, 0)
        return { date, ...services, total }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // Budget status (current month)
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: budgets } = await serviceClient
      .from('usage_budgets')
      .select('*')
      .eq('user_id', user.id)

    // Calculate current month spend per service
    const monthLogs = entries.filter(l => l.created_at >= firstOfMonth)
    const monthSpendByService: Record<string, number> = {}
    let monthTotalSpend = 0
    for (const log of monthLogs) {
      const cost = Number(log.estimated_cost) || 0
      const service = log.service || 'gemini'
      monthSpendByService[service] = (monthSpendByService[service] || 0) + cost
      monthTotalSpend += cost
    }

    const budgetStatus = (budgets || []).map(b => {
      const spend = b.service === 'all'
        ? monthTotalSpend
        : (monthSpendByService[b.service] || 0)
      const limit = Number(b.monthly_limit) || 0
      return {
        service: b.service,
        monthly_limit: limit,
        current_spend: spend,
        percentage: limit > 0 ? (spend / limit) * 100 : 0,
        alert_at_80: b.alert_at_80,
        alert_at_100: b.alert_at_100,
        block_at_limit: b.block_at_limit,
      }
    })

    // Paginated log entries
    const start = (page - 1) * perPage
    const paginatedLogs = entries.slice(start, start + perPage).map(log => ({
      id: log.id,
      service: log.service || 'gemini',
      action: log.action,
      model: log.model,
      prompt_tokens: log.prompt_tokens,
      output_tokens: log.output_tokens,
      total_tokens: log.total_tokens,
      estimated_cost: Number(log.estimated_cost),
      metadata: log.metadata,
      created_at: log.created_at,
    }))

    return NextResponse.json({
      period,
      service_filter: serviceFilter,
      summary: {
        total_cost: totalCost,
        total_requests: entries.length,
        total_tokens: totalTokens,
      },
      daily_costs: dailyCosts,
      service_breakdown: serviceBreakdown,
      model_breakdown: modelBreakdown,
      budget_status: budgetStatus,
      log: {
        items: paginatedLogs,
        total: entries.length,
        page,
        per_page: perPage,
      },
    })
  } catch (error) {
    console.error('[API] usage error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
