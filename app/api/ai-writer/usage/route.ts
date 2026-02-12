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

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Calculate date filter
    let dateFilter: string | null = null
    if (period === '7d') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (period === '30d') {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    // Fetch all logs for the period
    let query = serviceClient
      .from('ai_usage_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (dateFilter) {
      query = query.gte('created_at', dateFilter)
    }

    const { data: logs, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const entries = logs || []

    // Aggregate stats
    let totalTokens = 0
    let totalCost = 0
    let totalRequests = entries.length
    const modelBreakdown: Record<string, { requests: number; tokens: number; cost: number }> = {}

    for (const log of entries) {
      totalTokens += log.total_tokens || 0
      totalCost += Number(log.estimated_cost) || 0

      if (!modelBreakdown[log.model]) {
        modelBreakdown[log.model] = { requests: 0, tokens: 0, cost: 0 }
      }
      modelBreakdown[log.model].requests += 1
      modelBreakdown[log.model].tokens += log.total_tokens || 0
      modelBreakdown[log.model].cost += Number(log.estimated_cost) || 0
    }

    // Recent 20 requests
    const recent = entries.slice(0, 20).map(log => ({
      id: log.id,
      action: log.action,
      model: log.model,
      prompt_tokens: log.prompt_tokens,
      output_tokens: log.output_tokens,
      total_tokens: log.total_tokens,
      estimated_cost: Number(log.estimated_cost),
      created_at: log.created_at,
    }))

    return NextResponse.json({
      period,
      total_requests: totalRequests,
      total_tokens: totalTokens,
      total_cost: totalCost,
      model_breakdown: modelBreakdown,
      recent,
    })
  } catch (error) {
    console.error('[API] ai-writer/usage error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}
