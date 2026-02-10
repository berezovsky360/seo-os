import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt, getEncryptionKey, isEncrypted } from '@/lib/utils/encryption'
import { createWordPressClient } from '@/lib/wordpress/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/sites/[siteId]/upload-media
 * Upload an image file to WordPress Media Library
 * Accepts: FormData with 'file' field
 * Returns: { success: true, url: string, media_id: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params

    // Get site credentials
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ success: false, error: 'Site not found' }, { status: 404 })
    }

    if (!site.wp_username || !site.wp_app_password) {
      return NextResponse.json({ success: false, error: 'WordPress credentials not configured' }, { status: 400 })
    }

    // Parse FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Decrypt password
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      const encryptionKey = getEncryptionKey()
      appPassword = await decrypt(appPassword, encryptionKey)
    }

    // Create WP client
    const wpClient = createWordPressClient({
      url: `https://${site.url.replace(/^https?:\/\//, '')}`,
      username: site.wp_username,
      appPassword,
    })

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to WP
    const result = await wpClient.uploadMedia({
      imageBuffer: buffer,
      filename: file.name,
      mimeType: file.type || 'image/jpeg',
    })

    return NextResponse.json({
      success: true,
      url: result.source_url,
      media_id: result.id,
    })
  } catch (error) {
    console.error('[API] upload-media error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
