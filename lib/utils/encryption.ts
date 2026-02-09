/**
 * Encryption utilities using Web Crypto API (AES-256-GCM)
 * For server-side use only (API routes, Edge Functions)
 */

/**
 * Generate a random encryption key (for initial setup)
 * Run this once and store in environment variables
 */
export async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  )

  const exported = await crypto.subtle.exportKey('raw', key)
  return Buffer.from(exported).toString('base64')
}

/**
 * Import encryption key from base64 string
 */
async function importKey(base64Key: string): Promise<CryptoKey> {
  const keyData = Buffer.from(base64Key, 'base64')
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns base64 encoded string: iv:encrypted
 */
export async function encrypt(plaintext: string, base64Key: string): Promise<string> {
  if (!plaintext) return ''

  const key = await importKey(base64Key)
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM

  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encoded
  )

  // Combine IV and encrypted data: iv:encrypted
  const ivBase64 = Buffer.from(iv).toString('base64')
  const encryptedBase64 = Buffer.from(encrypted).toString('base64')

  return `${ivBase64}:${encryptedBase64}`
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * Expects format: iv:encrypted (base64)
 */
export async function decrypt(encryptedData: string, base64Key: string): Promise<string> {
  if (!encryptedData) return ''

  const [ivBase64, encryptedBase64] = encryptedData.split(':')
  if (!ivBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted data format')
  }

  const key = await importKey(base64Key)
  const iv = Buffer.from(ivBase64, 'base64')
  const encrypted = Buffer.from(encryptedBase64, 'base64')

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Check if data is encrypted (has iv:encrypted format)
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false
  return data.includes(':') && data.split(':').length === 2
}

/**
 * Get encryption key from environment
 */
export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error('ENCRYPTION_KEY not found in environment variables')
  }

  return key
}
