import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash, randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.substring(dot).toLowerCase() : ''
}

function getMimeType(ext: string): string {
  const types: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  }
  return types[ext] || 'application/octet-stream'
}

// Max 10MB
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params

  // 1. Get site's R2 config
  const { data: site, error: siteErr } = await supabase
    .from('landing_sites')
    .select('r2_bucket, r2_endpoint, r2_access_key_encrypted, r2_secret_key_encrypted, subdomain, domain')
    .eq('id', siteId)
    .single()

  if (siteErr || !site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  if (!site.r2_bucket || !site.r2_endpoint || !site.r2_access_key_encrypted || !site.r2_secret_key_encrypted) {
    return NextResponse.json({ error: 'R2 not configured for this site. Set up R2 credentials in Deploy tab.' }, { status: 400 })
  }

  // 2. Parse multipart form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `File too large. Max size is ${MAX_SIZE / 1024 / 1024}MB` }, { status: 400 })
  }

  const ext = getExtension(file.name)
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.ico', '.pdf', '.mp4', '.webm']
  if (!allowedExts.includes(ext)) {
    return NextResponse.json({ error: `File type "${ext}" not allowed` }, { status: 400 })
  }

  // 3. Read file buffer
  const buffer = Buffer.from(await file.arrayBuffer())
  const hash = createHash('md5').update(buffer).digest('hex').substring(0, 8)
  const fileName = `${randomUUID().substring(0, 8)}-${hash}${ext}`
  const siteSlug = site.subdomain || site.domain || siteId
  const key = `${siteSlug}/media/${fileName}`

  // 4. Upload to R2
  const accountId = site.r2_endpoint.replace('.r2.cloudflarestorage.com', '').replace('https://', '')
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: site.r2_access_key_encrypted,
      secretAccessKey: site.r2_secret_key_encrypted,
    },
  })

  try {
    await s3.send(new PutObjectCommand({
      Bucket: site.r2_bucket,
      Key: key,
      Body: buffer,
      ContentType: getMimeType(ext),
      CacheControl: 'public, max-age=31536000, immutable',
    }))
  } catch (err: any) {
    return NextResponse.json({ error: `Upload failed: ${err.message}` }, { status: 500 })
  }

  // 5. Build public URL
  // If domain is set and active, use that; otherwise use R2 dev URL
  const publicUrl = site.domain
    ? `https://${site.domain}/media/${fileName}`
    : `https://${site.r2_bucket}.${accountId}.r2.dev/${key}`

  return NextResponse.json({
    url: publicUrl,
    key,
    fileName,
    size: file.size,
    contentType: getMimeType(ext),
  })
}
