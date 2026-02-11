import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAccount } from '@/lib/modules/telegraph/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/telegraph/accounts
 * List user's Telegraph accounts
 */
export async function GET() {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('telegraph_accounts')
      .select('id, short_name, author_name, author_url, page_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    return NextResponse.json({ success: true, accounts: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/telegraph/accounts
 * Create a new Telegraph account
 */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { short_name, author_name, author_url } = body

    if (!short_name) {
      return NextResponse.json({ error: 'short_name is required' }, { status: 400 })
    }

    // Create account via Telegraph API
    const account = await createAccount(short_name, author_name, author_url)

    // Store in database
    const { data, error } = await supabase
      .from('telegraph_accounts')
      .insert({
        user_id: user.id,
        short_name: account.short_name,
        author_name: account.author_name || null,
        author_url: account.author_url || null,
        access_token: account.access_token,
      })
      .select('id, short_name, author_name, author_url, page_count, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to store account' }, { status: 500 })
    }

    return NextResponse.json({ success: true, account: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
