import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { decrypt, getEncryptionKey } from '@/lib/utils/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/keys/[keyType]/validate
 * Validate an API key by calling the provider's API.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ keyType: string }> }
) {
  try {
    const { keyType } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the encrypted key
    const { data: keyRow, error: fetchError } = await supabase
      .from('api_keys')
      .select('encrypted_value')
      .eq('user_id', user.id)
      .eq('key_type', keyType)
      .single()

    if (fetchError || !keyRow) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Decrypt
    const encryptionKey = getEncryptionKey()
    const decryptedValue = await decrypt(keyRow.encrypted_value, encryptionKey)

    // Validate against provider
    let valid = false
    let details: Record<string, any> = {}
    let validationError: string | null = null

    try {
      switch (keyType) {
        case 'gemini': {
          // Test Gemini API with a minimal request
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${decryptedValue}`
          )
          valid = res.ok
          if (!valid) {
            const err = await res.json().catch(() => ({}))
            validationError = err.error?.message || `HTTP ${res.status}`
          } else {
            const data = await res.json()
            details = { models_count: data.models?.length || 0 }
          }
          break
        }

        case 'dataforseo': {
          // DataForSEO uses login:password base64 auth
          const res = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
            headers: {
              'Authorization': `Basic ${Buffer.from(decryptedValue).toString('base64')}`,
              'Content-Type': 'application/json',
            },
          })
          valid = res.ok
          if (valid) {
            const data = await res.json()
            details = {
              balance: data.tasks?.[0]?.result?.[0]?.money?.balance,
              currency: data.tasks?.[0]?.result?.[0]?.money?.currency,
            }
          } else {
            validationError = `HTTP ${res.status}`
          }
          break
        }

        case 'gsc':
        case 'ga4': {
          // OAuth tokens — just check if it's a valid JSON token
          try {
            const token = JSON.parse(decryptedValue)
            valid = !!(token.access_token || token.refresh_token)
            if (!valid) validationError = 'Token missing access_token or refresh_token'
            details = { has_refresh_token: !!token.refresh_token }
          } catch {
            validationError = 'Invalid JSON token format'
          }
          break
        }

        default:
          validationError = `Unknown key type: ${keyType}`
      }
    } catch (err) {
      validationError = err instanceof Error ? err.message : 'Validation request failed'
    }

    // Update key validation status
    await supabase
      .from('api_keys')
      .update({
        is_valid: valid,
        last_validated_at: new Date().toISOString(),
        validation_error: validationError,
        balance: details.balance ?? null,
      })
      .eq('user_id', user.id)
      .eq('key_type', keyType)

    return NextResponse.json({
      valid,
      details: valid ? details : undefined,
      error: validationError || undefined,
    })
  } catch (error) {
    console.error(`[API] POST /keys/validate error:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
