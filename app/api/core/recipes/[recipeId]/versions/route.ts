import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/core/recipes/[recipeId]/versions — list all versions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('recipe_versions')
      .select('id, version_number, created_at, label')
      .eq('recipe_id', recipeId)
      .eq('user_id', user.id)
      .order('version_number', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[API] GET recipe versions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/core/recipes/[recipeId]/versions — restore a version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { version_id } = await request.json()
    if (!version_id) return NextResponse.json({ error: 'Missing version_id' }, { status: 400 })

    // Fetch the version snapshot
    const { data: version, error: vErr } = await supabase
      .from('recipe_versions')
      .select('snapshot')
      .eq('id', version_id)
      .eq('recipe_id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (vErr || !version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

    const snapshot = version.snapshot as Record<string, any>

    // Snapshot current state before restoring
    const { data: currentRecipe } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (currentRecipe) {
      const { data: lastVersion } = await supabase
        .from('recipe_versions')
        .select('version_number')
        .eq('recipe_id', recipeId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

      await supabase.from('recipe_versions').insert({
        recipe_id: recipeId,
        user_id: user.id,
        version_number: (lastVersion?.version_number || 0) + 1,
        snapshot: currentRecipe,
        label: 'Before restore',
      })
    }

    // Restore from snapshot
    const restoreFields: Record<string, any> = {}
    for (const key of ['name', 'description', 'enabled', 'trigger_event', 'trigger_conditions', 'actions', 'site_ids', 'graph_layout']) {
      if (key in snapshot) restoreFields[key] = snapshot[key]
    }

    const { data, error } = await supabase
      .from('recipes')
      .update(restoreFields)
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] POST restore recipe version error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
