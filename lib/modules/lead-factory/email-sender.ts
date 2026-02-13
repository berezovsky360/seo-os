// Lead Factory — Email Sender (Resend API)
// Delivers lead magnets to captured leads via email.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface LeadRecord {
  id: string
  email: string
  name: string | null
}

export interface MagnetRecord {
  id: string
  name: string
  file_url: string | null
  file_type: string | null
}

/**
 * Deliver a lead magnet to a lead via email using Resend API.
 * Updates lead.magnet_delivered and creates a lead_downloads record.
 */
export async function deliverMagnet(
  lead: LeadRecord,
  magnet: MagnetRecord,
  supabase: SupabaseClient,
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) throw new Error('RESEND_API_KEY not configured')

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@mail.antigravity.dev'
  const recipientName = lead.name || 'there'

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:2rem">
      <h2 style="margin:0 0 1rem;font-size:1.25rem">Hey ${recipientName}!</h2>
      <p style="color:#374151;line-height:1.6;margin:0 0 1.5rem">
        Your download is ready: <strong>${magnet.name}</strong>
      </p>
      ${magnet.file_url ? `<a href="${magnet.file_url}" style="display:inline-block;padding:.75rem 1.5rem;background:#e94560;color:#fff;border-radius:.5rem;text-decoration:none;font-weight:600">Download Now</a>` : '<p style="color:#6b7280">The download link will be sent shortly.</p>'}
      <p style="color:#9ca3af;font-size:.8rem;margin-top:2rem">You received this because you signed up on our site.</p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: lead.email,
      subject: `Your download: ${magnet.name}`,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error (${res.status}): ${body}`)
  }

  // Mark lead as delivered
  await supabase
    .from('leads')
    .update({ magnet_delivered: true })
    .eq('id', lead.id)

  // Record download
  await supabase
    .from('lead_downloads')
    .insert({
      lead_id: lead.id,
      magnet_id: magnet.id,
    })

  // Increment download count
  await supabase.rpc('increment_counter', {
    table_name: 'lead_magnets',
    column_name: 'download_count',
    row_id: magnet.id,
  }).then(() => {}, () => {
    // RPC may not exist yet; fallback to manual increment
    return supabase
      .from('lead_magnets')
      .select('download_count')
      .eq('id', magnet.id)
      .single()
      .then(({ data }) => {
        if (data) {
          return supabase
            .from('lead_magnets')
            .update({ download_count: (data.download_count || 0) + 1 })
            .eq('id', magnet.id)
        }
      })
  })
}
