import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encrypt, getEncryptionKey } from '@/lib/utils/encryption'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/sites/[siteId]/credentials
 * Save WordPress credentials (encrypts password on server)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const body = await request.json()
    const { wp_username, wp_app_password } = body

    console.log('Saving credentials for site:', siteId)

    // Validate inputs
    if (!wp_username || !wp_app_password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Get encryption key
    let encryptionKey: string
    try {
      encryptionKey = getEncryptionKey()
    } catch (error) {
      console.error('Encryption key not found:', error)
      return NextResponse.json(
        { error: 'Server configuration error: Encryption key not set. Please run: npm run generate-key' },
        { status: 500 }
      )
    }

    // Encrypt the password
    let encryptedPassword: string
    try {
      encryptedPassword = await encrypt(wp_app_password, encryptionKey)
      console.log('Password encrypted successfully')
    } catch (error) {
      console.error('Encryption failed:', error)
      return NextResponse.json(
        { error: 'Failed to encrypt password' },
        { status: 500 }
      )
    }

    // Update site in database
    const { data, error } = await supabase
      .from('sites')
      .update({
        wp_username: wp_username.trim(),
        wp_app_password: encryptedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siteId)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      )
    }

    // Return site data WITHOUT decrypted password
    return NextResponse.json({
      success: true,
      site: {
        ...data,
        wp_app_password: '***', // Mask password in response
      },
    })
  } catch (error) {
    console.error('Error saving credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
