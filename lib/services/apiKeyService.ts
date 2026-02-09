/**
 * API Key Service — Client-side CRUD for API keys.
 *
 * Keys are encrypted server-side via /api/keys routes.
 * Client only sees masked values and validation status.
 */

import type { ApiKeyInfo, ApiKeyType } from '@/lib/core/events'

export const apiKeyService = {
  async getKeys(): Promise<ApiKeyInfo[]> {
    const res = await fetch('/api/keys')
    if (!res.ok) throw new Error('Failed to fetch API keys')
    const data = await res.json()
    return data.keys || []
  },

  async saveKey(keyType: ApiKeyType, value: string, label?: string): Promise<void> {
    const res = await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key_type: keyType, value, label }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to save API key')
    }
  },

  async deleteKey(keyType: ApiKeyType): Promise<void> {
    const res = await fetch(`/api/keys/${keyType}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to delete API key')
    }
  },

  async validateKey(keyType: ApiKeyType): Promise<{
    valid: boolean
    details?: Record<string, any>
    error?: string
  }> {
    const res = await fetch(`/api/keys/${keyType}/validate`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to validate key')
    }
    return res.json()
  },
}
