// Lead Service — Supabase queries for leads, forms, and magnets.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface LeadForm {
  id: string
  user_id: string
  landing_site_id: string | null
  name: string
  form_type: string
  fields: { name: string; type: string; required: boolean }[]
  magnet_id: string | null
  success_message: string
  redirect_url: string | null
  popup_config: Record<string, any> | null
  button_text: string
  is_active: boolean
  submission_count: number
  created_at: string
}

export interface LeadMagnet {
  id: string
  user_id: string
  landing_site_id: string | null
  name: string
  file_url: string | null
  file_type: string
  description: string | null
  download_count: number
  created_at: string
}

export interface Lead {
  id: string
  user_id: string
  landing_site_id: string | null
  form_id: string | null
  email: string
  name: string | null
  phone: string | null
  custom_fields: Record<string, any> | null
  source_url: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  status: string
  pipeline_stage: string
  lead_score: number
  magnet_delivered: boolean
  session_id: string | null
  ip_country: string | null
  device_type: string | null
  last_seen_at: string | null
  total_page_views: number
  total_downloads: number
  created_at: string
}

// ====== Forms ======

export async function getForms(supabase: SupabaseClient, userId: string, siteId?: string) {
  let query = supabase
    .from('lead_forms')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (siteId) query = query.eq('landing_site_id', siteId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as LeadForm[]
}

export async function getForm(supabase: SupabaseClient, formId: string, userId: string) {
  const { data, error } = await supabase
    .from('lead_forms')
    .select('*')
    .eq('id', formId)
    .eq('user_id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data as LeadForm
}

export async function createForm(supabase: SupabaseClient, userId: string, form: Partial<LeadForm>) {
  const { data, error } = await supabase
    .from('lead_forms')
    .insert({ user_id: userId, ...form })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as LeadForm
}

export async function updateForm(supabase: SupabaseClient, formId: string, userId: string, updates: Partial<LeadForm>) {
  const allowed: Record<string, any> = {}
  const fields = ['name', 'form_type', 'fields', 'magnet_id', 'success_message', 'redirect_url', 'popup_config', 'button_text', 'is_active']
  for (const f of fields) {
    if ((updates as any)[f] !== undefined) allowed[f] = (updates as any)[f]
  }

  const { data, error } = await supabase
    .from('lead_forms')
    .update(allowed)
    .eq('id', formId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as LeadForm
}

export async function deleteForm(supabase: SupabaseClient, formId: string, userId: string) {
  const { error } = await supabase
    .from('lead_forms')
    .delete()
    .eq('id', formId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

// ====== Magnets ======

export async function getMagnets(supabase: SupabaseClient, userId: string, siteId?: string) {
  let query = supabase
    .from('lead_magnets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (siteId) query = query.eq('landing_site_id', siteId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as LeadMagnet[]
}

export async function getMagnet(supabase: SupabaseClient, magnetId: string, userId: string) {
  const { data, error } = await supabase
    .from('lead_magnets')
    .select('*')
    .eq('id', magnetId)
    .eq('user_id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data as LeadMagnet
}

export async function createMagnet(supabase: SupabaseClient, userId: string, magnet: Partial<LeadMagnet>) {
  const { data, error } = await supabase
    .from('lead_magnets')
    .insert({ user_id: userId, ...magnet })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as LeadMagnet
}

export async function updateMagnet(supabase: SupabaseClient, magnetId: string, userId: string, updates: Partial<LeadMagnet>) {
  const allowed: Record<string, any> = {}
  const fields = ['name', 'file_url', 'file_type', 'description', 'landing_site_id']
  for (const f of fields) {
    if ((updates as any)[f] !== undefined) allowed[f] = (updates as any)[f]
  }

  const { data, error } = await supabase
    .from('lead_magnets')
    .update(allowed)
    .eq('id', magnetId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as LeadMagnet
}

export async function deleteMagnet(supabase: SupabaseClient, magnetId: string, userId: string) {
  const { error } = await supabase
    .from('lead_magnets')
    .delete()
    .eq('id', magnetId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

// ====== Leads ======

export async function getLeads(
  supabase: SupabaseClient,
  userId: string,
  options?: { siteId?: string; status?: string; stage?: string; search?: string; page?: number; perPage?: number }
) {
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (options?.siteId) query = query.eq('landing_site_id', options.siteId)
  if (options?.status) query = query.eq('status', options.status)
  if (options?.stage) query = query.eq('pipeline_stage', options.stage)
  if (options?.search) query = query.ilike('email', `%${options.search}%`)

  const perPage = options?.perPage || 50
  const page = options?.page || 1
  query = query.range((page - 1) * perPage, page * perPage - 1)

  const { data, count, error } = await query
  if (error) throw new Error(error.message)
  return { leads: data as Lead[], total: count || 0 }
}

export async function getLead(supabase: SupabaseClient, leadId: string, userId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .eq('user_id', userId)
    .single()

  if (error) throw new Error(error.message)
  return data as Lead
}

// ====== Stats ======

export async function getLeadStats(supabase: SupabaseClient, userId: string, siteId?: string) {
  let leadsQuery = supabase
    .from('leads')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
  if (siteId) leadsQuery = leadsQuery.eq('landing_site_id', siteId)

  let formsQuery = supabase
    .from('lead_forms')
    .select('id, submission_count')
    .eq('user_id', userId)
  if (siteId) formsQuery = formsQuery.eq('landing_site_id', siteId)

  let magnetsQuery = supabase
    .from('lead_magnets')
    .select('id, download_count')
    .eq('user_id', userId)
  if (siteId) magnetsQuery = magnetsQuery.eq('landing_site_id', siteId)

  const [leads, forms, magnets] = await Promise.all([
    leadsQuery,
    formsQuery,
    magnetsQuery,
  ])

  const totalSubmissions = (forms.data || []).reduce((sum, f) => sum + (f.submission_count || 0), 0)
  const totalDownloads = (magnets.data || []).reduce((sum, m) => sum + (m.download_count || 0), 0)

  return {
    total_leads: leads.count || 0,
    total_forms: (forms.data || []).length,
    total_magnets: (magnets.data || []).length,
    total_submissions: totalSubmissions,
    total_downloads: totalDownloads,
  }
}
