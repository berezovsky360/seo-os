// Public lead capture endpoint — receives form POST data.
// No auth required (service role inserts).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  let body: Record<string, any>

  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    body = await request.json()
  } else {
    // form-urlencoded from HTML form
    const formData = await request.formData()
    body = Object.fromEntries(formData.entries())
  }

  const { form_id, landing_site_id, email, name, phone, ...customFields } = body

  if (!form_id || !email) {
    return NextResponse.json({ error: 'form_id and email are required' }, { status: 400 })
  }

  // Look up form to get owner user_id and magnet_id
  const { data: form } = await supabase
    .from('lead_forms')
    .select('user_id, magnet_id, success_message, redirect_url, landing_site_id')
    .eq('id', form_id)
    .single()

  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  // Extract UTM params
  const referer = request.headers.get('referer') || ''
  let utmSource: string | null = null
  let utmMedium: string | null = null
  let utmCampaign: string | null = null
  try {
    const url = new URL(referer)
    utmSource = url.searchParams.get('utm_source')
    utmMedium = url.searchParams.get('utm_medium')
    utmCampaign = url.searchParams.get('utm_campaign')
  } catch { /* not a valid URL */ }

  // Remove form_id and landing_site_id from custom fields
  delete customFields.form_id
  delete customFields.landing_site_id

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      user_id: form.user_id,
      landing_site_id: landing_site_id || form.landing_site_id || null,
      form_id,
      email,
      name: name || null,
      phone: phone || null,
      custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
      source_url: referer || null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Increment form submission count
  await supabase
    .from('lead_forms')
    .update({ submission_count: (await supabase.from('lead_forms').select('submission_count').eq('id', form_id).single()).data?.submission_count + 1 || 1 })
    .eq('id', form_id)

  // Auto-deliver magnet if configured
  if (form.magnet_id) {
    const { data: magnet } = await supabase
      .from('lead_magnets')
      .select('*')
      .eq('id', form.magnet_id)
      .single()

    if (magnet) {
      try {
        const { deliverMagnet } = await import('@/lib/modules/lead-factory/email-sender')
        await deliverMagnet(lead, magnet, supabase)
      } catch {
        // Email delivery failure shouldn't block lead capture
      }
    }
  }

  // Handle redirect (for HTML form submissions)
  if (form.redirect_url) {
    return NextResponse.redirect(form.redirect_url, 303)
  }

  return NextResponse.json({
    ok: true,
    message: form.success_message || 'Thank you!',
    lead_id: lead.id,
  })
}
