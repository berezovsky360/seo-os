// Cloudflare API — Custom Hostnames (Cloudflare for SaaS)
// Manages custom domain registration, SSL, and DNS verification.

export interface CloudflareConfig {
  apiToken: string
  zoneId: string
}

export interface CustomHostnameResult {
  id: string
  hostname: string
  status: string
  ssl: { status: string }
  verification_errors?: string[]
  ownership_verification?: {
    type: string
    name: string
    value: string
  }
  ownership_verification_http?: {
    http_url: string
    http_body: string
  }
}

const CF_API = 'https://api.cloudflare.com/client/v4'

async function cfFetch<T>(
  config: CloudflareConfig,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const json = await res.json() as { success: boolean; result: T; errors: { message: string }[] }
  if (!json.success) {
    throw new Error(`Cloudflare API error: ${json.errors.map(e => e.message).join(', ')}`)
  }
  return json.result
}

/**
 * Register a custom hostname with Cloudflare for SaaS.
 * This enables SSL auto-provisioning for the customer's domain.
 */
export async function createCustomHostname(
  config: CloudflareConfig,
  hostname: string,
): Promise<CustomHostnameResult> {
  return cfFetch<CustomHostnameResult>(config, `/zones/${config.zoneId}/custom_hostnames`, {
    method: 'POST',
    body: JSON.stringify({
      hostname,
      ssl: {
        method: 'http',
        type: 'dv',
        settings: {
          http2: 'on',
          min_tls_version: '1.2',
        },
      },
    }),
  })
}

/**
 * Check status of a custom hostname (SSL, ownership verification).
 */
export async function getCustomHostname(
  config: CloudflareConfig,
  hostnameId: string,
): Promise<CustomHostnameResult> {
  return cfFetch<CustomHostnameResult>(
    config,
    `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
  )
}

/**
 * Delete a custom hostname.
 */
export async function deleteCustomHostname(
  config: CloudflareConfig,
  hostnameId: string,
): Promise<void> {
  await cfFetch(
    config,
    `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
    { method: 'DELETE' },
  )
}

/**
 * Get DNS records that the user needs to set up for a custom domain.
 * Returns CNAME target and optional TXT verification record.
 */
export function getDnsInstructions(
  result: CustomHostnameResult,
  fallbackTarget: string,
): { type: string; name: string; value: string; purpose: string }[] {
  const records: { type: string; name: string; value: string; purpose: string }[] = []

  // CNAME to point at the Cloudflare Worker / R2
  records.push({
    type: 'CNAME',
    name: result.hostname,
    value: fallbackTarget,
    purpose: 'Route traffic to your landing site',
  })

  // Ownership verification TXT (if needed)
  if (result.ownership_verification) {
    records.push({
      type: result.ownership_verification.type,
      name: result.ownership_verification.name,
      value: result.ownership_verification.value,
      purpose: 'Domain ownership verification',
    })
  }

  return records
}
