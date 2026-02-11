import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/marketplace/templates/[slug]/install — clone template to user's recipes
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get the template
    const { data: template, error: tmplError } = await supabase
      .from('recipe_templates')
      .select('*')
      .eq('slug', slug)
      .eq('is_public', true)
      .single()

    if (tmplError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Clone to user's recipes table
    const recipeRow: Record<string, any> = {
      user_id: user.id,
      name: template.name,
      description: template.description,
      trigger_event: template.trigger_event,
      trigger_conditions: template.trigger_conditions || {},
      actions: template.actions,
      graph_layout: template.graph_layout || null,
      enabled: false,
    }

    let { data: recipe, error: insertError } = await supabase
      .from('recipes')
      .insert(recipeRow)
      .select()
      .single()

    // Fallback: if graph_layout column doesn't exist yet, retry without it
    if (insertError?.message?.includes('graph_layout')) {
      const { graph_layout: _, ...rowWithout } = recipeRow
      const retry = await supabase
        .from('recipes')
        .insert(rowWithout)
        .select()
        .single()
      recipe = retry.data
      insertError = retry.error
    }

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Increment install count (service role bypasses RLS)
    const { error: rpcError } = await supabase.rpc('increment_template_installs', { template_slug: slug })
    if (rpcError) {
      // Fallback: direct update
      await supabase
        .from('recipe_templates')
        .update({ install_count: (template.install_count || 0) + 1 })
        .eq('slug', slug)
    }

    return NextResponse.json({ recipe, template_name: template.name }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /marketplace/templates/[slug]/install error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
