import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: budgets, error } = await serviceClient
      .from('usage_budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budgets: budgets || [] })
  } catch (error) {
    console.error('[API] usage/budgets GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { service, monthly_limit, alert_at_80, alert_at_100, block_at_limit } = body

    if (!service || monthly_limit == null) {
      return NextResponse.json({ error: 'service and monthly_limit are required' }, { status: 400 })
    }

    const allowed = ['gemini', 'openai', 'dataforseo', 'all']
    if (!allowed.includes(service)) {
      return NextResponse.json({ error: `Invalid service. Allowed: ${allowed.join(', ')}` }, { status: 400 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await serviceClient
      .from('usage_budgets')
      .upsert(
        {
          user_id: user.id,
          service,
          monthly_limit: Number(monthly_limit),
          alert_at_80: alert_at_80 ?? true,
          alert_at_100: alert_at_100 ?? true,
          block_at_limit: block_at_limit ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,service' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budget: data })
  } catch (error) {
    console.error('[API] usage/budgets POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save budget' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    if (!service) {
      return NextResponse.json({ error: 'service parameter required' }, { status: 400 })
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await serviceClient
      .from('usage_budgets')
      .delete()
      .eq('user_id', user.id)
      .eq('service', service)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[API] usage/budgets DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete budget' },
      { status: 500 }
    )
  }
}
