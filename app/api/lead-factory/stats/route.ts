import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserId(): Promise<string | null> {
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user?.id || null
}

export async function GET(request: NextRequest) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const siteId = request.nextUrl.searchParams.get('site_id')

  let leadsQuery = serviceSupabase
    .from('leads')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
  if (siteId) leadsQuery = leadsQuery.eq('landing_site_id', siteId)

  let formsQuery = serviceSupabase
    .from('lead_forms')
    .select('id, submission_count')
    .eq('user_id', userId)
  if (siteId) formsQuery = formsQuery.eq('landing_site_id', siteId)

  let magnetsQuery = serviceSupabase
    .from('lead_magnets')
    .select('id, download_count')
    .eq('user_id', userId)
  if (siteId) magnetsQuery = magnetsQuery.eq('landing_site_id', siteId)

  const [leads, forms, magnets] = await Promise.all([
    leadsQuery,
    formsQuery,
    magnetsQuery,
  ])

  const totalSubmissions = (forms.data || []).reduce((sum, f) => sum + (f.submission_count || 0), 0)
  const totalDownloads = (magnets.data || []).reduce((sum, m) => sum + (m.download_count || 0), 0)

  return NextResponse.json({
    total_leads: leads.count || 0,
    total_forms: (forms.data || []).length,
    total_magnets: (magnets.data || []).length,
    total_submissions: totalSubmissions,
    total_downloads: totalDownloads,
  })
}
