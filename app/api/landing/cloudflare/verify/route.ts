import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'
import { verifyToken } from '@/lib/modules/landing-engine/cloudflare'

// GET: verify stored Cloudflare token and return account info
export async function GET() {
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

    if (!keyRow) {
      return NextResponse.json({ connected: false, error: 'No Cloudflare API token saved' })
    }

    const encryptionKey = getEncryptionKey()
    const token = await decrypt(keyRow.encrypted_value, encryptionKey)

    const result = await verifyToken(token)

    // Update validation status
    await serviceClient
      .from('api_keys')
      .update({ is_valid: true, last_validated_at: new Date().toISOString(), validation_error: null })
      .eq('user_id', user.id)
      .eq('key_type', 'cloudflare')

    return NextResponse.json({
      connected: true,
      accounts: result.accounts,
    })
  } catch (error) {
    console.error('[API] cloudflare/verify error:', error)
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    })
  }
}
