import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { listZones, checkDns } from '@/lib/modules/landing-engine/cloudflare'

// GET: list zones or check DNS for a domain
export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: keyRow } = await serviceClient
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user.id)
      .eq('key_type', 'cloudflare')
      .single()

    if (!keyRow) return NextResponse.json({ error: 'Cloudflare token not configured' }, { status: 400 })

    const token = await decrypt(keyRow.encrypted_value, getEncryptionKey())

    // If zone_id and domain are provided, check DNS
    const zoneId = request.nextUrl.searchParams.get('zone_id')
    const domain = request.nextUrl.searchParams.get('domain')

    if (zoneId && domain) {
      const dnsCheck = await checkDns(token, zoneId, domain)
      return NextResponse.json({ dns: dnsCheck })
    }

    // Otherwise list all zones
    const zones = await listZones(token)
    return NextResponse.json({ zones })
  } catch (error) {
    console.error('[API] cloudflare/zones GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch zones' },
      { status: 500 }
    )
  }
}
