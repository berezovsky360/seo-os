import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getDailyStats, getTopPages, getReferrerStats, getDeviceStats } from '@/lib/services/pulseService'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserId(): Promise<string | null> {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user?.id || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { siteId } = await params
  const days = parseInt(request.nextUrl.searchParams.get('days') || '30')

  // Verify ownership
  const { data: site } = await serviceSupabase
    .from('landing_sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single()

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const [daily, topPages, referrers, devices] = await Promise.all([
    getDailyStats(serviceSupabase, siteId, days),
    getTopPages(serviceSupabase, siteId),
    getReferrerStats(serviceSupabase, siteId),
    getDeviceStats(serviceSupabase, siteId),
  ])

  return NextResponse.json({ daily, topPages, referrers, devices })
}
