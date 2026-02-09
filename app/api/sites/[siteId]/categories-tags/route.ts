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
 * GET /api/sites/[siteId]/categories-tags
 * Get categories and tags from WordPress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params

    // Get site from database
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Check if credentials exist
    if (!site.wp_username || !site.wp_app_password) {
      return NextResponse.json(
        { error: 'WordPress credentials not configured' },
        { status: 400 }
      )
    }

    // Decrypt password if encrypted
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      const encryptionKey = getEncryptionKey()
      appPassword = await decrypt(appPassword, encryptionKey)
    }

    // Create WordPress client
    const wpClient = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword: appPassword,
    })

    // Fetch categories and tags in parallel
    const [categories, tags] = await Promise.all([
      wpClient.getCategories(),
      wpClient.getTags(),
    ])

    return NextResponse.json({
      success: true,
      categories,
      tags,
    })
  } catch (error) {
    console.error('Error fetching categories/tags:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch categories/tags',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sites/[siteId]/categories-tags
 * Create a new category or tag in WordPress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params
    const body = await request.json()
    const { type, name } = body // type: 'category' | 'tag'

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    // Get site from database
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('url, wp_username, wp_app_password')
      .eq('id', siteId)
      .single()

    if (siteError || !site || !site.wp_username || !site.wp_app_password) {
      return NextResponse.json(
        { error: 'WordPress credentials not configured' },
        { status: 400 }
      )
    }

    // Decrypt password if encrypted
    let appPassword = site.wp_app_password
    if (isEncrypted(appPassword)) {
      appPassword = await decrypt(appPassword, getEncryptionKey())
    }

    // Create WordPress client
    const wpClient = createWordPressClient({
      url: `https://${site.url}`,
      username: site.wp_username,
      appPassword: appPassword,
    })

    let result
    if (type === 'category') {
      result = await wpClient.createCategory(name)
    } else if (type === 'tag') {
      result = await wpClient.createTag(name)
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "category" or "tag"' }, { status: 400 })
    }

    return NextResponse.json({ success: true, item: result })
  } catch (error) {
    console.error('Error creating category/tag:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create' },
      { status: 500 }
    )
  }
}
