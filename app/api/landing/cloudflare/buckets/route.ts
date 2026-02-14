import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { listBuckets, createBucket, getR2Endpoint } from '@/lib/modules/landing-engine/cloudflare'

// GET: list R2 buckets
export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accountId = request.nextUrl.searchParams.get('account_id')
    if (!accountId) return NextResponse.json({ error: 'Missing account_id' }, { status: 400 })

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
    const buckets = await listBuckets(token, accountId)

    return NextResponse.json({
      buckets,
      endpoint: getR2Endpoint(accountId),
    })
  } catch (error) {
    console.error('[API] cloudflare/buckets GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list buckets' },
      { status: 500 }
    )
  }
}

// POST: create a new R2 bucket
export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { account_id, name, location } = body as {
      account_id: string
      name: string
      location?: string
    }

    if (!account_id || !name) {
      return NextResponse.json({ error: 'Missing account_id or name' }, { status: 400 })
    }

    // Validate bucket name
    if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(name)) {
      return NextResponse.json({ error: 'Invalid bucket name. Use lowercase letters, numbers, and hyphens (3-63 chars).' }, { status: 400 })
    }

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
    const bucket = await createBucket(token, account_id, name, location)

    return NextResponse.json({
      bucket,
      endpoint: getR2Endpoint(account_id),
    })
  } catch (error) {
    console.error('[API] cloudflare/buckets POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bucket' },
      { status: 500 }
    )
  }
}
