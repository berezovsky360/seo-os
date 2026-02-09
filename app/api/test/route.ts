import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Test database connection by querying sites table
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Database query failed',
          error: error.message
        },
        { status: 500 }
      )
    }

    // Test auth
    const { data: { user } } = await supabase.auth.getUser()

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful!',
      database: 'Connected',
      tablesAccessible: true,
      authenticated: !!user,
      userEmail: user?.email || 'Not authenticated',
      sitesCount: data?.length || 0
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Supabase connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
