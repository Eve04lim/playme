import {
  SpotifyAuthResponseSchema,
  SpotifySearchTracksResponseSchema,
  SpotifyUserProfileSchema,
  type SpotifyAuthResponse,
  type SpotifySearchTracksResponse,
  type SpotifyUserProfile
} from '../schemas/spotify'
import { PKCEStateManager } from '../utils/authHelpers'

export class SpotifyAuthError extends Error {
  constructor(message: string, public cause?: unknown, public statusCode?: number) {
    super(message)
    this.name = 'SpotifyAuthError'
  }
}

export class SpotifyAPIError extends Error {
  constructor(message: string, public statusCode?: number, public cause?: unknown) {
    super(message)
    this.name = 'SpotifyAPIError'
  }
}

interface SearchParams {
  query: string
  type: 'track' | 'artist' | 'album' | 'playlist'
  limit?: number
  offset?: number
  market?: string
}

class SpotifyAPI {
  private readonly clientId: string
  private readonly redirectUri: string
  private readonly baseUrl = 'https://api.spotify.com/v1'
  private readonly tokenUrl = 'https://accounts.spotify.com/api/token'
  private readonly authorizeUrl = 'https://accounts.spotify.com/authorize'
  private readonly maxRetries = 3
  private readonly baseRetryDelay = 1000

  constructor() {
    this.clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
    this.redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5173/auth/spotify/callback'
    
    if (!this.clientId) {
      throw new SpotifyAuthError('VITE_SPOTIFY_CLIENT_ID is required')
    }
  }

  async getAuthUrl(): Promise<string> {
    try {
      const pkceState = await PKCEStateManager.create()
      
      const scopes = [
        'user-read-private',
        'user-read-email',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing'
      ].join(' ')
      
      // 要求スコープを開発環境でログ出力
      if (import.meta.env.DEV) {
        console.debug('🎯 [Spotify Auth] Requesting scopes:', scopes)
      }

      const params = new URLSearchParams({
        client_id: this.clientId,
        response_type: 'code',
        redirect_uri: this.redirectUri,
        scope: scopes,
        code_challenge: pkceState.codeChallenge,
        code_challenge_method: 'S256',
        state: pkceState.state
      })

      return `${this.authorizeUrl}?${params.toString()}`
    } catch (error) {
      throw new SpotifyAuthError('Failed to generate auth URL', error)
    }
  }

  async exchangeCodeForToken(authCode: string, codeVerifier?: string, redirectUri?: string): Promise<SpotifyAuthResponse>
  async exchangeCodeForToken(params: { code: string; codeVerifier: string; redirectUri: string }): Promise<SpotifyAuthResponse>
  async exchangeCodeForToken(
    authCodeOrParams: string | { code: string; codeVerifier: string; redirectUri: string },
    codeVerifier?: string,
    redirectUri?: string
  ): Promise<SpotifyAuthResponse> {
    try {
      // オブジェクト形式と従来形式の両方をサポート
      let code: string
      let verifier: string
      let uri: string
      
      if (typeof authCodeOrParams === 'object') {
        code = authCodeOrParams.code
        verifier = authCodeOrParams.codeVerifier
        uri = authCodeOrParams.redirectUri
      } else {
        code = authCodeOrParams
        verifier = codeVerifier || ''
        uri = redirectUri || this.redirectUri
      }
      
      // 必須フィールドの検証
      if (!code || !verifier || !this.clientId) {
        throw new SpotifyAuthError(
          'Missing required fields for token exchange: ' +
          `code=${!!code}, verifier=${!!verifier}, client_id=${!!this.clientId}`
        )
      }
      
      const requestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: uri,
        client_id: this.clientId,
        code_verifier: verifier
      })
      
      console.log('🔄 [Token Exchange] Request details:', {
        url: this.tokenUrl,
        hasAuthCode: Boolean(code),
        codeLength: code?.length || 0,
        hasCodeVerifier: Boolean(verifier),
        verifierLength: verifier?.length || 0,
        redirectUri: uri,
        clientId: this.clientId ? this.clientId.substring(0, 8) + '...' : null,
        formData: {
          grant_type: 'authorization_code',
          hasCode: Boolean(code),
          hasRedirectUri: Boolean(uri),
          hasClientId: Boolean(this.clientId),
          hasCodeVerifier: Boolean(verifier)
        }
      })
      
      // CORS回避のためのプロキシチェック（開発環境）
      const tokenEndpoint = import.meta.env.DEV && import.meta.env.VITE_USE_PROXY 
        ? '/api/spotify/token'
        : this.tokenUrl
      
      console.log('🌐 [Token Exchange] Using endpoint:', tokenEndpoint)
      
      const response = await this.fetchWithRetry(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody
      })

      console.log('📨 [Token Exchange] Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.warn('⚠️ [Token Exchange] Failed to parse error response:', parseError)
          errorData = {}
        }
        
        console.error('❌ [Token Exchange] Failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error,
          errorDescription: errorData.error_description,
          errorUri: errorData.error_uri
        })
        
        // CORS エラーの判定と詳細表示
        if (response.status === 0 || response.type === 'opaque') {
          throw new SpotifyAuthError(
            'CORS error detected. Consider using server-side proxy endpoint (/api/spotify/token)',
            errorData,
            response.status
          )
        }
        
        throw new SpotifyAuthError(
          `トークン交換に失敗: ${errorData.error_description || errorData.error || response.statusText}. client設定/redirect URI/PKCE/CORSを確認してください。`,
          errorData,
          response.status
        )
      }

      const data = await response.json()
      console.log('✅ [Token Exchange] Response received:', {
        hasAccessToken: Boolean(data.access_token),
        hasRefreshToken: Boolean(data.refresh_token),
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope
      })
      
      const validatedData = SpotifyAuthResponseSchema.parse(data)
      
      // 付与されたスコープを開発環境でログ出力
      if (import.meta.env.DEV) {
        console.debug('✅ [Spotify Auth] Granted scope:', data.scope || 'scope not returned')
        if (data.scope) {
          const requestedScopes = [
            'user-read-private', 'user-read-email', 'user-library-read', 'user-library-modify',
            'playlist-read-private', 'playlist-modify-public', 'playlist-modify-private',
            'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing'
          ]
          const grantedScopes = data.scope.split(' ')
          const missingScopes = requestedScopes.filter(scope => !grantedScopes.includes(scope))
          
          if (missingScopes.length > 0) {
            console.warn('⚠️ [Spotify Auth] Missing scopes:', missingScopes)
            console.warn('💡 User may need to re-authorize with full permissions')
          } else {
            console.log('✨ [Spotify Auth] All requested scopes granted!')
          }
        }
      }
      
      // Note: PKCE状態のクリアはコールバック側で行う（統一性のため）
      
      return validatedData
    } catch (error) {
      console.error('❌ [Token Exchange] Exception caught:', error)
      
      if (error instanceof SpotifyAuthError) {
        throw error
      }
      throw new SpotifyAuthError('Failed to exchange code for token', error)
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<SpotifyAuthResponse> {
    try {
      const response = await this.fetchWithRetry(this.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new SpotifyAuthError(
          `Token refresh failed: ${errorData.error_description || response.statusText}`,
          errorData,
          response.status
        )
      }

      const data = await response.json()
      return SpotifyAuthResponseSchema.parse(data)
    } catch (error) {
      if (error instanceof SpotifyAuthError) {
        throw error
      }
      throw new SpotifyAuthError('Failed to refresh access token', error)
    }
  }

  async getCurrentUser(accessToken: string): Promise<SpotifyUserProfile> {
    if (import.meta.env.DEV) {
      console.log('👤 [Spotify User] Getting current user profile')
    }
    
    const response = await this.authenticatedRequest('/me', accessToken)
    const data = await response.json()
    const userProfile = SpotifyUserProfileSchema.parse(data)
    
    if (import.meta.env.DEV) {
      console.log('✅ [Spotify User] Profile retrieved', {
        id: userProfile.id,
        displayName: userProfile.display_name,
        country: userProfile.country,
        followers: userProfile.followers?.total
      })
    }
    
    return userProfile
  }

  async searchTracks(params: SearchParams, accessToken: string): Promise<SpotifySearchTracksResponse> {
    const searchParams = new URLSearchParams({
      q: params.query,
      type: params.type,
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
      ...(params.market && { market: params.market })
    })

    if (import.meta.env.DEV) {
      console.log('🎵 [Spotify Search]', {
        query: params.query,
        type: params.type,
        limit: params.limit || 20,
        offset: params.offset || 0,
        market: params.market || 'none'
      })
    }

    const response = await this.authenticatedRequest(`/search?${searchParams.toString()}`, accessToken)
    const data = await response.json()
    return SpotifySearchTracksResponseSchema.parse(data)
  }

  async getUserPlaylists(accessToken: string, limit = 20, offset = 0): Promise<{ items: unknown[], total: number }> {
    if (import.meta.env.DEV) {
      console.log('📜 [Spotify Playlists] Getting user playlists', { limit, offset })
    }
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    })

    const response = await this.authenticatedRequest(`/me/playlists?${params.toString()}`, accessToken)
    const data = await response.json()
    
    if (import.meta.env.DEV) {
      console.log('✅ [Spotify Playlists] Retrieved playlists', {
        total: data.total || 0,
        items: data.items?.length || 0,
        firstPlaylist: data.items?.[0]?.name || 'none'
      })
      
      if (data.total === 0 || !data.items?.length) {
        console.warn('⚠️ [Spotify Playlists] No playlists found. Possible causes:')
        console.warn('  1. User has no playlists in Spotify')
        console.warn('  2. Missing playlist-read-private scope')
        console.warn('  3. Development mode user access restriction')
      }
    }
    
    return data
  }

  private async authenticatedRequest(endpoint: string, accessToken: string, options?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    
    // Debug logging in DEV environment
    if (import.meta.env.DEV) {
      console.log(`🔍 [Spotify API] ${endpoint}`, {
        url,
        hasToken: !!accessToken,
        tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : 'none'
      })
    }
    
    const response = await this.fetchWithRetry(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    })

    // Debug response logging
    if (import.meta.env.DEV) {
      const spotifyTraceId = response.headers.get('x-spotify-trace-id')
      console.log(`📡 [Spotify API] Response ${response.status}`, {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        traceId: spotifyTraceId,
        contentType: response.headers.get('content-type')
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Enhanced error handling with specific status codes
      let errorMessage = errorData.error?.message || response.statusText
      let isProbablyDevModeIssue = false
      
      switch (response.status) {
        case 401:
          errorMessage = 'Spotify アクセストークンが無効です。再ログインしてください。'
          break
        case 403:
          // 403エラーは開発モードのユーザ制限が原因の可能性が高い
          isProbablyDevModeIssue = true
          if (errorData.error?.message?.includes('insufficient client scope') || 
              errorData.error?.message?.includes('scope') ||
              errorData.error?.message?.includes('permission')) {
            errorMessage = '🚨 Spotify APIアクセス拒否: スコープもしくは開発モードのユーザ制限の問題です'
          } else {
            errorMessage = '🚨 Spotify APIアクセス拒否: 開発モードのアプリでは所有者または追加されたユーザのみ使用可能です'
          }
          break
        case 429: {
          const retryAfter = response.headers.get('retry-after')
          errorMessage = `レート制限に達しました。${retryAfter ? `${retryAfter}秒後` : 'しばらく待って'}から再試行してください。`
          break
        }
        case 500:
        case 502:
        case 503:
          errorMessage = 'Spotifyサービスに一時的な問題が発生しています。しばらく待ってから再試行してください。'
          break
      }
      
      if (import.meta.env.DEV) {
        console.error(`❌ [Spotify API] Error ${response.status}:`, {
          endpoint,
          status: response.status,
          errorData,
          originalMessage: errorData.error?.message || response.statusText,
          enhancedMessage: errorMessage,
          retryAfter: response.headers.get('retry-after'),
          rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
          rateLimitReset: response.headers.get('x-ratelimit-reset')
        })
        
        // Development modeのユーザ制限の可能性を警告
        if (isProbablyDevModeIssue) {
          console.warn('🚨 [Spotify Dev Mode] Possible user access issue:')
          console.warn('📝 Development mode apps are restricted to:')
          console.warn('   1. App owner (the Spotify account that created the app)')
          console.warn('   2. Users explicitly added in Spotify Dashboard > Users and Access')
          console.warn('🔗 Check: https://developer.spotify.com/dashboard/applications/9251917aa4854566880160d8e6d5826f')
          console.warn('👥 Current user should be added to "Users and Access" section')
        }
      }
      
      throw new SpotifyAPIError(errorMessage, response.status, errorData)
    }

    return response
  }

  private async fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒タイムアウト

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // 429 Rate Limit の場合はリトライ
      if (response.status === 429 && attempt < this.maxRetries) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '1') * 1000
        const delay = Math.max(retryAfter, this.baseRetryDelay * Math.pow(2, attempt - 1))
        
        console.warn(`Rate limited. Retrying after ${delay}ms (attempt ${attempt}/${this.maxRetries})`)
        await this.delay(delay)
        return this.fetchWithRetry(url, options, attempt + 1)
      }

      // 5xx エラーや一時的なネットワークエラーの場合もリトライ
      if (this.isRetriableError(response.status) && attempt < this.maxRetries) {
        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1)
        console.warn(`Request failed with ${response.status}. Retrying after ${delay}ms (attempt ${attempt}/${this.maxRetries})`)
        await this.delay(delay)
        return this.fetchWithRetry(url, options, attempt + 1)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      // ネットワークエラーの場合もリトライ
      if (this.isNetworkError(error) && attempt < this.maxRetries) {
        const delay = this.baseRetryDelay * Math.pow(2, attempt - 1)
        console.warn(`Network error. Retrying after ${delay}ms (attempt ${attempt}/${this.maxRetries})`)
        await this.delay(delay)
        return this.fetchWithRetry(url, options, attempt + 1)
      }

      throw error
    }
  }

  private isRetriableError(status: number): boolean {
    return status >= 500 || status === 408 || status === 429
  }

  private isNetworkError(error: unknown): boolean {
    return error instanceof TypeError || 
           (error as Error)?.name === 'AbortError' ||
           (error as Error)?.message?.includes('network')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getPlaylistTracks(
    accessToken: string,
    playlistId: string, 
    opts?: { limit?: number; offset?: number; signal?: AbortSignal }
  ): Promise<{ items: unknown[], total: number }> {
    const limit = opts?.limit ?? 50
    const offset = opts?.offset ?? 0
    const signal = opts?.signal
    
    // market を付けない：地域未対応/ローカルでも落ちないようにする
    const endpoint = `/playlists/${encodeURIComponent(playlistId)}/tracks?limit=${limit}&offset=${offset}`
    const response = await this.authenticatedRequest(endpoint, accessToken, signal ? { signal } : {})
    return response.json()
  }
}

export const spotifyAPI = new SpotifyAPI()
export default spotifyAPI