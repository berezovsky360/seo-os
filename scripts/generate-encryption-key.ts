/**
 * Generate encryption key for WordPress credentials
 * Run: npx tsx scripts/generate-encryption-key.ts
 */

import { generateEncryptionKey } from '../lib/utils/encryption'

async function main() {
  console.log('🔐 Generating AES-256-GCM encryption key...\n')

  const key = await generateEncryptionKey()

  console.log('✅ Encryption key generated successfully!\n')
  console.log('📋 Add this to your .env.local file:\n')
  console.log(`ENCRYPTION_KEY=${key}\n`)
  console.log('⚠️  IMPORTANT: Keep this key secure and never commit it to git!')
  console.log('⚠️  Store it in environment variables for production (Vercel, etc.)\n')
}

main().catch(console.error)
