// Bitbucket OAuth Service
// Handles OAuth2 flow for Bitbucket authentication

export interface OAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scopes: string
}

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string
}

class BitbucketOAuthService {
  private config: OAuthConfig
  private tokenKey = 'bitbucket_oauth_token'
  private stateKey = 'bitbucket_oauth_state'

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_BITBUCKET_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_BITBUCKET_CLIENT_SECRET || '',
      redirectUri: import.meta.env.VITE_BITBUCKET_REDIRECT_URI || 'http://localhost:5173/oauth/callback',
      scope: '' // Bitbucket doesn't use scope parameter in requests, scopes are configured on the consumer
    }
  }

  // Generate a random state for security
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Build the OAuth authorization URL
  getAuthorizationUrl(): string {
    const state = this.generateState()
    localStorage.setItem(this.stateKey, state)
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      state: state
    })
    
    // Add redirect_uri if provided
    if (this.config.redirectUri) {
      params.append('redirect_uri', this.config.redirectUri)
    }
    
    return `https://bitbucket.org/site/oauth2/authorize?${params.toString()}`
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string, state: string): Promise<OAuthToken | null> {
    // Verify state for security
    const storedState = localStorage.getItem(this.stateKey)
    if (state !== storedState) {
      console.error('OAuth state mismatch - potential CSRF attack')
      return null
    }
    
    // Clear the state
    localStorage.removeItem(this.stateKey)
    
    const tokenUrl = 'https://bitbucket.org/site/oauth2/access_token'
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code
    })
    
    // Add redirect_uri if provided
    if (this.config.redirectUri) {
      params.append('redirect_uri', this.config.redirectUri)
    }
    
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: params.toString()
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Token exchange failed:', response.status, errorText)
        return null
      }
      
      const token: OAuthToken = await response.json()
      
      // Store token with expiration info
      const tokenData = {
        ...token,
        expires_at: Date.now() + (token.expires_in * 1000) - 300000 // 5 min buffer
      }
      
      localStorage.setItem(this.tokenKey, JSON.stringify(tokenData))
      console.log('✅ OAuth token stored successfully')
      
      return token
    } catch (error) {
      console.error('Error exchanging code for token:', error)
      return null
    }
  }

  // Get stored access token
  getAccessToken(): string | null {
    const tokenData = this.getTokenData()
    return tokenData?.access_token || null
  }

  // Get full token data
  getTokenData(): (OAuthToken & { expires_at: number }) | null {
    const stored = localStorage.getItem(this.tokenKey)
    if (!stored) return null
    
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  // Check if token is valid and not expired
  isTokenValid(): boolean {
    const tokenData = this.getTokenData()
    if (!tokenData) return false
    
    return Date.now() < tokenData.expires_at
  }

  // Refresh the access token using refresh token
  async refreshToken(): Promise<OAuthToken | null> {
    const tokenData = this.getTokenData()
    if (!tokenData?.refresh_token) {
      console.error('No refresh token available')
      return null
    }
    
    const tokenUrl = 'https://bitbucket.org/site/oauth2/access_token'
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token
    })
    
    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: params.toString()
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Token refresh failed:', response.status, errorText)
        this.clearToken()
        return null
      }
      
      const newToken: OAuthToken = await response.json()
      
      // Store new token
      const newTokenData = {
        ...newToken,
        expires_at: Date.now() + (newToken.expires_in * 1000) - 300000
      }
      
      localStorage.setItem(this.tokenKey, JSON.stringify(newTokenData))
      console.log('✅ OAuth token refreshed successfully')
      
      return newToken
    } catch (error) {
      console.error('Error refreshing token:', error)
      this.clearToken()
      return null
    }
  }

  // Clear stored token
  clearToken(): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.stateKey)
  }

  // Start OAuth flow
  startAuthFlow(): void {
    const authUrl = this.getAuthorizationUrl()
    console.log('🔐 Starting Bitbucket OAuth flow...')
    window.location.href = authUrl
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    if (this.isTokenValid()) {
      return this.getAccessToken()
    }
    
    // Try to refresh token
    const refreshedToken = await this.refreshToken()
    return refreshedToken?.access_token || null
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.isTokenValid()
  }
}

// Export singleton instance
export const bitbucketOAuth = new BitbucketOAuthService()
export default bitbucketOAuth