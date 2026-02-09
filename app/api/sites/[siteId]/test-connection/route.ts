import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'

// Server-side Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/sites/[siteId]/test-connection
 * Test WordPress connection (decrypts password on server)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params

    // Get site from database
    const { data: site, error } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (error || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Check if credentials exist
    if (!site.wp_username || !site.wp_app_password) {
      return NextResponse.json(
        { success: false, message: 'WordPress credentials not configured' },
        { status: 400 }
      )
    }

    // Decrypt password if encrypted
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      const encryptionKey = getEncryptionKey()
      appPassword = await decrypt(appPassword, encryptionKey)
    }

    // Test connection
    const wpClient = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword: appPassword,
    })

    const result = await wpClient.testConnection()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error testing connection:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      },
      { status: 500 }
    )
  }
}
