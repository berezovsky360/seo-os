// Cloudflare API client for Landing Engine
// Handles R2 bucket management, DNS verification, SSL status

const CF_API = 'https://api.cloudflare.com/client/v4'

export interface CFAccount {
  id: string
  name: string
}

export interface CFBucket {
  name: string
  creation_date: string
  location?: string
}

export interface CFZone {
  id: string
  name: string
  status: string
  name_servers: string[]
}

export interface CFDnsRecord {
  id: string
  type: string
  name: string
  content: string
  proxied: boolean
  ttl: number
}

async function cfFetch<T>(
  path: string,
  token: string,
  options?: { method?: string; body?: any }
): Promise<{ success: boolean; result: T; errors: { message: string }[] }> {
  const res = await fetch(`${CF_API}${path}`, {
    method: options?.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  })
  const data = await res.json()
  if (!data.success) {
    const errMsg = data.errors?.map((e: any) => e.message).join(', ') || `HTTP ${res.status}`
    throw new Error(errMsg)
  }
  return data
}

// Verify token and get account info
export async function verifyToken(token: string): Promise<{ valid: boolean; accounts: CFAccount[] }> {
  // Verify the token
  await cfFetch<any>('/user/tokens/verify', token)

  // Try to get accounts — requires "Account Settings > Read" permission
  // If the token only has R2/DNS permissions, this may fail
  try {
    const { result } = await cfFetch<CFAccount[]>('/accounts?per_page=50', token)
    return { valid: true, accounts: result }
  } catch {
    // Token is valid but can't list accounts — user will provide Account ID manually
    return { valid: true, accounts: [] }
  }
}

// List R2 buckets for an account
export async function listBuckets(token: string, accountId: string): Promise<CFBucket[]> {
  const { result } = await cfFetch<{ buckets: CFBucket[] }>(
    `/accounts/${accountId}/r2/buckets`,
    token
  )
  return result.buckets || []
}

// Create a new R2 bucket
export async function createBucket(
  token: string,
  accountId: string,
  name: string,
  locationHint?: string
): Promise<CFBucket> {
  const body: any = { name }
  if (locationHint) body.locationHint = locationHint

  const { result } = await cfFetch<CFBucket>(
    `/accounts/${accountId}/r2/buckets`,
    token,
    { method: 'POST', body }
  )
  return result
}

// List DNS zones
export async function listZones(token: string): Promise<CFZone[]> {
  const { result } = await cfFetch<CFZone[]>('/zones?per_page=50&status=active', token)
  return result
}

// Get DNS records for a zone
export async function getDnsRecords(token: string, zoneId: string): Promise<CFDnsRecord[]> {
  const { result } = await cfFetch<CFDnsRecord[]>(
    `/zones/${zoneId}/dns_records?per_page=100`,
    token
  )
  return result
}

// Check if a domain has correct DNS records pointing to R2/Worker
export async function checkDns(
  token: string,
  zoneId: string,
  subdomain: string
): Promise<{
  found: boolean
  records: CFDnsRecord[]
  hasCname: boolean
  hasProxy: boolean
}> {
  const records = await getDnsRecords(token, zoneId)
  const matching = records.filter(r => r.name === subdomain || r.name.endsWith(`.${subdomain}`))
  const hasCname = matching.some(r => r.type === 'CNAME')
  const hasProxy = matching.some(r => r.proxied)
  return { found: matching.length > 0, records: matching, hasCname, hasProxy }
}

// Create R2 API credentials (access key + secret) for a specific account
// Note: This requires "Account > R2 > Admin" permissions on the token
export async function createR2ApiToken(
  token: string,
  accountId: string,
  bucketName: string
): Promise<{ accessKeyId: string; secretAccessKey: string }> {
  // R2 API tokens are created via the S3 API credentials endpoint
  const { result } = await cfFetch<{
    id: string
    accessKeyId: string
    secretAccessKey: string
  }>(
    `/accounts/${accountId}/r2/tokens`,
    token,
    {
      method: 'POST',
      body: {
        name: `seo-os-${bucketName}`,
        policies: [{
          effect: 'allow',
          permissionGroups: [{ id: 'object-read-write' }],
          resources: { [`com.cloudflare.edge.r2.bucket.${accountId}_default_${bucketName}`]: '*' },
        }],
      },
    }
  )
  return { accessKeyId: result.accessKeyId, secretAccessKey: result.secretAccessKey }
}

// Get the S3-compatible endpoint for an account
export function getR2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`
}
