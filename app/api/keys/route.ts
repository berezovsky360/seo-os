import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { encrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/keys
 * List all API keys for the authenticated user (masked values).
 */
export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_type, label, is_valid, last_validated_at, validation_error, usage_count, balance, encrypted_value, created_at')
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Mask the encrypted values for client display
    const keys = (data || []).map(row => {
      // Create masked version: first 4 chars + ***
      const rawEncrypted = row.encrypted_value || ''
      // We can't show the real value, so show a placeholder based on key_type
      const masked = rawEncrypted ? `${row.key_type}...***` : ''

      return {
        id: row.id,
        key_type: row.key_type,
        label: row.label,
        is_valid: row.is_valid,
        last_validated_at: row.last_validated_at,
        validation_error: row.validation_error,
        usage_count: row.usage_count,
        balance: row.balance,
        masked_value: masked,
        created_at: row.created_at,
      }
    })

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('[API] GET /keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/keys
 * Save a new API key (encrypts server-side).
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key_type, value, label } = await request.json()

    if (!key_type || !value) {
      return NextResponse.json(
        { error: 'Missing required fields: key_type, value' },
        { status: 400 }
      )
    }

    const validTypes = ['gemini', 'dataforseo', 'gsc', 'ga4']
    if (!validTypes.includes(key_type)) {
      return NextResponse.json(
        { error: `Invalid key_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Encrypt the key value
    const encryptionKey = getEncryptionKey()
    const encryptedValue = await encrypt(value, encryptionKey)

    // Upsert: update if key_type already exists for this user
    const { data, error } = await supabase
      .from('api_keys')
      .upsert({
        user_id: user.id,
        key_type,
        encrypted_value: encryptedValue,
        label: label || null,
        is_valid: false, // Will be validated separately
        validation_error: null,
      }, { onConflict: 'user_id,key_type' })
      .select('id, key_type, label')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, key: data }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
