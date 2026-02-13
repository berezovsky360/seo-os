import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INFRA_FIELDS = [
  'r2_bucket',
  'r2_endpoint',
  'r2_access_key_encrypted',
  'r2_secret_key_encrypted',
  'deploy_mode',
  'domain',
  'cf_hostname_id',
  'domain_status',
  'domain_dns_records',
  'pulse_enabled',
]

const INFRA_SELECT = INFRA_FIELDS.join(', ')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params

  const { data, error } = await supabase
    .from('landing_sites')
    .select(`id, ${INFRA_SELECT}`)
    .eq('id', siteId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params
  const body = await request.json()

  const allowed: Record<string, any> = {}
  for (const f of INFRA_FIELDS) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json(
      { error: 'No valid infrastructure fields provided' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('landing_sites')
    .update(allowed)
    .eq('id', siteId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
