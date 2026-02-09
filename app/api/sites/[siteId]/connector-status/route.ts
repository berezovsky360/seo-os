import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/sites/[siteId]/connector-status
 * Check if the SEO OS Connector plugin is installed on the WordPress site
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params

    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { success: false, message: 'Site not found' },
        { status: 404 }
      )
    }

    if (!site.wp_username || !site.wp_app_password) {
      return NextResponse.json({
        success: false,
        installed: false,
        message: 'WordPress credentials not configured',
      })
    }

    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      const encryptionKey = getEncryptionKey()
      appPassword = await decrypt(appPassword, encryptionKey)
    }

    const wpClient = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword,
    })

    // Ping the connector
    const pingResult = await wpClient.pingConnector()

    if (!pingResult.success) {
      return NextResponse.json({
        success: true,
        installed: false,
        message: pingResult.message,
      })
    }

    // Get detailed info
    const info = await wpClient.getConnectorInfo()

    return NextResponse.json({
      success: true,
      installed: true,
      version: pingResult.version,
      message: pingResult.message,
      info,
    })
  } catch (error) {
    console.error('Error checking connector status:', error)
    return NextResponse.json(
      { success: false, installed: false, message: 'Failed to check connector status' },
      { status: 500 }
    )
  }
}
