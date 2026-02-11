import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseDeviceLabel(ua: string): string {
  let browser = 'Unknown'
  let os = 'Unknown'

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edg')) browser = 'Edge'

  if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('iPhone')) os = 'iPhone'
  else if (ua.includes('Android')) os = 'Android'

  return `${browser} / ${os}`
}

function parseDeviceName(ua: string): string {
  let browser = 'Unknown Browser'
  let os = 'Unknown OS'

  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Edg')) browser = 'Edge'

  if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('iPhone')) os = 'iPhone'
  else if (ua.includes('Android')) os = 'Android'

  return `${browser} on ${os}`
}

// POST /api/auth/log-login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = body.userId
    const status = body.status || 'success'

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const ua = request.headers.get('user-agent') || ''
    const deviceLabel = parseDeviceLabel(ua)
    const deviceName = parseDeviceName(ua)

    // Record login history
    await supabase.from('login_history').insert({
      user_id: userId,
      ip_address: ip,
      user_agent: ua,
      device_label: deviceLabel,
      status,
    })

    // Upsert active session (if successful login)
    if (status === 'success') {
      // Mark all user's sessions as not current
      await supabase
        .from('active_sessions')
        .update({ is_current: false })
        .eq('user_id', userId)

      // Check if same device already has a session
      const { data: existing } = await supabase
        .from('active_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('device_name', deviceName)
        .limit(1)

      if (existing && existing.length > 0) {
        // Update existing session
        await supabase
          .from('active_sessions')
          .update({
            ip_address: ip,
            user_agent: ua,
            last_active_at: new Date().toISOString(),
            is_current: true,
          })
          .eq('id', existing[0].id)
      } else {
        // Create new session
        await supabase.from('active_sessions').insert({
          user_id: userId,
          device_name: deviceName,
          ip_address: ip,
          user_agent: ua,
          is_current: true,
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Log login error:', error)
    return NextResponse.json({ error: 'Failed to log login' }, { status: 500 })
  }
}
