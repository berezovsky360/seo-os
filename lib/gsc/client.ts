/**
 * Google Search Console API Client
 *
 * Provides access to Search Analytics data with automatic OAuth token refresh.
 * Base URL: https://www.googleapis.com/webmasters/v3
 */

// ====== Types ======

export interface GSCTokenConfig {
  access_token: string
  refresh_token: string
  token_type?: string
  expiry_date?: number             // Unix timestamp in ms
  client_id: string
  client_secret: string
}

export interface GSCSearchAnalyticsRow {
  keys: string[]                   // [query] or [query, page] depending on dimensions
  clicks: number
  impressions: number
  ctr: number                      // 0–1 scale
  position: number
}

export interface GSCSite {
  siteUrl: string
  permissionLevel: string
}

export type GSCDimension = 'query' | 'page' | 'date' | 'country' | 'device'

export class GSCError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public reason?: string,
  ) {
    super(message)
    this.name = 'GSCError'
  }
}

// ====== Client ======

export class GSCClient {
  private baseUrl = 'https://www.googleapis.com/webmasters/v3'
  private accessToken: string
  private refreshToken: string
  private expiryDate: number
  private clientId: string
  private clientSecret: string
  private onTokenRefreshed?: (newToken: Partial<GSCTokenConfig>) => Promise<void>

  constructor(
    config: GSCTokenConfig,
    onTokenRefreshed?: (newToken: Partial<GSCTokenConfig>) => Promise<void>,
  ) {
    this.accessToken = config.access_token
    this.refreshToken = config.refresh_token
    this.expiryDate = config.expiry_date || 0
    this.clientId = config.client_id
    this.clientSecret = config.client_secret
    this.onTokenRefreshed = onTokenRefreshed
  }

  /**
   * Ensure the access token is valid, refreshing if needed.
   */
  private async ensureValidToken(): Promise<void> {
    // 1-minute buffer before expiry
    if (this.expiryDate > 0 && Date.now() < this.expiryDate - 60_000) {
      return
    }

    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      throw new GSCError(
        'Cannot refresh token: missing refresh_token, client_id, or client_secret',
        401,
      )
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new GSCError(
        `Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`,
        response.status,
        errorData.error,
      )
    }

    const tokenData = await response.json()
    this.accessToken = tokenData.access_token
    this.expiryDate = Date.now() + (tokenData.expires_in || 3600) * 1000

    // Persist the refreshed token
    if (this.onTokenRefreshed) {
      await this.onTokenRefreshed({
        access_token: this.accessToken,
        expiry_date: this.expiryDate,
      })
    }
  }

  /**
   * Make an authenticated request to the GSC API.
   */
  private async request<T>(method: string, url: string, body?: any): Promise<T> {
    await this.ensureValidToken()

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    // Handle 401 — try one more refresh
    if (response.status === 401) {
      this.expiryDate = 0 // force refresh
      await this.ensureValidToken()

      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!retryResponse.ok) {
        const err = await retryResponse.json().catch(() => ({}))
        throw new GSCError(
          `GSC API error: ${err.error?.message || retryResponse.statusText}`,
          retryResponse.status,
          err.error?.errors?.[0]?.reason,
        )
      }
      return retryResponse.json()
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new GSCError(
        `GSC API error: ${err.error?.message || response.statusText}`,
        response.status,
        err.error?.errors?.[0]?.reason,
      )
    }

    return response.json()
  }

  /**
   * Get search analytics data for a site.
   */
  async getSearchAnalytics(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: GSCDimension[] = ['query', 'page'],
    rowLimit: number = 5000,
    startRow: number = 0,
  ): Promise<GSCSearchAnalyticsRow[]> {
    const encodedUrl = encodeURIComponent(siteUrl)
    const url = `${this.baseUrl}/sites/${encodedUrl}/searchAnalytics/query`

    const body: any = {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      startRow,
    }

    const data = await this.request<any>('POST', url, body)
    return (data.rows || []).map((row: any) => ({
      keys: row.keys || [],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }))
  }

  /**
   * Get all search analytics with automatic pagination.
   * GSC API returns max 25,000 rows. Paginates in chunks of 5,000.
   */
  async getAllSearchAnalytics(
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: GSCDimension[] = ['query', 'page'],
  ): Promise<GSCSearchAnalyticsRow[]> {
    const allRows: GSCSearchAnalyticsRow[] = []
    const pageSize = 5000
    let startRow = 0

    while (true) {
      const rows = await this.getSearchAnalytics(
        siteUrl, startDate, endDate, dimensions, pageSize, startRow,
      )
      allRows.push(...rows)

      if (rows.length < pageSize || allRows.length >= 25000) {
        break
      }
      startRow += pageSize
    }

    return allRows
  }

  /**
   * List all verified GSC sites.
   */
  async getSites(): Promise<GSCSite[]> {
    const data = await this.request<any>('GET', `${this.baseUrl}/sites`)
    return (data.siteEntry || []).map((entry: any) => ({
      siteUrl: entry.siteUrl || '',
      permissionLevel: entry.permissionLevel || '',
    }))
  }
}

// ====== Factory ======

/**
 * Create a GSC client from a stored JSON token string.
 */
export function createGSCClient(
  tokenJson: string,
  onTokenRefreshed?: (newToken: Partial<GSCTokenConfig>) => Promise<void>,
): GSCClient {
  const config = JSON.parse(tokenJson) as GSCTokenConfig
  return new GSCClient(config, onTokenRefreshed)
}
