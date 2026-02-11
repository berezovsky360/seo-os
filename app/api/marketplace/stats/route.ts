import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/marketplace/stats — module install counts
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('module_install_stats')
      .select('module_id, install_count, last_installed_at')
      .order('install_count', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Convert to map for easy lookup
    const stats: Record<string, { install_count: number; last_installed_at: string | null }> = {}
    for (const row of data || []) {
      stats[row.module_id] = {
        install_count: row.install_count,
        last_installed_at: row.last_installed_at,
      }
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('[API] GET /marketplace/stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
