// Landing Engine — R2 Deployer
// Uploads rendered HTML, sitemap, robots.txt, and feed to Cloudflare R2.
// Uses @aws-sdk/client-s3 (R2 is S3-compatible).

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { createHash } from 'crypto'

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

export interface DeployFile {
  path: string       // e.g. "blog/my-post/index.html"
  content: string
  contentType: string // e.g. "text/html"
}

export interface DeployResult {
  uploaded: number
  skipped: number
  errors: string[]
}

function md5(content: string): string {
  return createHash('md5').update(content, 'utf8').digest('hex')
}

function getS3Client(config: R2Config): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

/**
 * Deploy files to Cloudflare R2.
 * Compares MD5 hashes with existing ETags to skip unchanged files.
 */
export async function deployToR2(
  config: R2Config,
  siteSlug: string,
  files: DeployFile[],
): Promise<DeployResult> {
  const client = getS3Client(config)
  let uploaded = 0
  let skipped = 0
  const errors: string[] = []

  for (const file of files) {
    const key = `${siteSlug}/${file.path}`
    const hash = md5(file.content)

    // Check if file already exists with same content
    try {
      const head = await client.send(new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }))

      // R2 returns ETag as quoted MD5 hash
      const existingHash = head.ETag?.replace(/"/g, '')
      if (existingHash === hash) {
        skipped++
        continue
      }
    } catch {
      // File doesn't exist yet — upload it
    }

    try {
      await client.send(new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: file.content,
        ContentType: file.contentType,
        CacheControl: 'public, max-age=3600, s-maxage=86400',
      }))
      uploaded++
    } catch (err: any) {
      errors.push(`Failed to upload ${key}: ${err.message}`)
    }
  }

  return { uploaded, skipped, errors }
}

/**
 * Prepare deploy files from a build result.
 * Converts rendered pages, sitemap, robots.txt, and RSS feed
 * into the file format expected by deployToR2.
 */
export function prepareBuildFiles(
  buildResult: {
    pages: { slug: string; html: string; validation: { valid: boolean } }[]
    sitemap: string
    robotsTxt: string
    rssFeed: string
  },
  trackingScript?: string,
): DeployFile[] {
  const files: DeployFile[] = []

  for (const page of buildResult.pages) {
    if (!page.validation.valid) continue

    let html = page.html

    // Inject tracking script before </body> if provided
    if (trackingScript) {
      html = html.replace('</body>', `${trackingScript}\n</body>`)
    }

    const path = page.slug === 'index'
      ? 'index.html'
      : `${page.slug}/index.html`

    files.push({ path, content: html, contentType: 'text/html; charset=utf-8' })
  }

  files.push({ path: 'sitemap.xml', content: buildResult.sitemap, contentType: 'application/xml' })
  files.push({ path: 'robots.txt', content: buildResult.robotsTxt, contentType: 'text/plain' })
  files.push({ path: 'feed.xml', content: buildResult.rssFeed, contentType: 'application/xml' })

  return files
}
