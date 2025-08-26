// src/api/spotify.ts
export interface SpotifySearchParams {
  query: string
  type: 'track' | 'artist' | 'album' | 'playlist'
  limit?: number
  offset?: number
  market?: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  album: {
    id: string
    name: string
    images: Array<{ url: string; width: number; height: number }>
    release_date: string
  }
  duration_ms: number
  preview_url: string | null
  external_urls: { spotify: string }
  popularity: number
}

export interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[]
    total: number
    limit: number
    offset: number
  }
}

export interface SpotifyAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export interface SpotifyArtist {
  id: string
  name: string
  images: Array<{ url: string; width: number; height: number }>
  genres: string[]
  popularity: number
  followers: { total: number }
  external_urls: { spotify: string }
}

export interface SpotifyAlbum {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  images: Array<{ url: string; width: number; height: number }>
  release_date: string
  total_tracks: number
  genres: string[]
  popularity: number
  external_urls: { spotify: string }
  tracks?: {
    items: SpotifyTrack[]
    total: number
  }
}

export interface SpotifyExtendedSearchResponse {
  tracks?: {
    items: SpotifyTrack[]
    total: number
    limit: number
    offset: number
  }
  artists?: {
    items: SpotifyArtist[]
    total: number
    limit: number
    offset: number
  }
  albums?: {
    items: SpotifyAlbum[]
    total: number
    limit: number
    offset: number
  }
}

class SpotifyAPI {
  private clientId: string
  private redirectUri: string
  private accessToken: string | null = null

  constructor() {
    this.clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || ''
    this.redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || ''
  }

  // 認証URL生成
  getAuthUrl(): string {
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

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes,
      state: this.generateRandomString(16),
    })

    return `https://accounts.spotify.com/authorize?${params.toString()}`
  }

  // アクセストークン取得
  async getAccessToken(authCode: string): Promise<SpotifyAuthResponse> {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            access_token: 'mock_access_token_' + Date.now(),
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'user-read-private user-read-email'
          })
        }, 1000)
      })
    }

    // 本番環境用実装
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.clientId}:${import.meta.env.VITE_SPOTIFY_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: this.redirectUri
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get access token')
    }

    const responseData = await response.json()
    
    // 型ガードによる安全な変換
    if (!isSpotifyAuthResponse(responseData)) {
      throw new Error('Invalid auth response format')
    }
    
    this.accessToken = responseData.access_token
    return responseData
  }

  // 楽曲検索
  async searchTracks(params: SpotifySearchParams): Promise<SpotifySearchResponse> {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockResponse: SpotifySearchResponse = {
            tracks: {
              items: this.generateMockTracks(params.query, params.limit || 20),
              total: 1000,
              limit: params.limit || 20,
              offset: params.offset || 0
            }
          }
          resolve(mockResponse)
        }, 800)
      })
    }

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const searchParams = new URLSearchParams({
      q: params.query,
      type: params.type,
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
      ...(params.market && { market: params.market })
    })

    const response = await fetch(
      `https://api.spotify.com/v1/search?${searchParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Spotify access token expired')
      }
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const responseData = await response.json()
    
    // 型ガードによる安全な変換
    if (!isSpotifySearchResponse(responseData)) {
      throw new Error('Invalid search response format')
    }
    
    return responseData
  }

  // トラック詳細取得
  async getTrack(trackId: string): Promise<SpotifyTrack> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: trackId,
            name: 'モック楽曲',
            artists: [{ id: 'artist1', name: 'モックアーティスト' }],
            album: {
              id: 'album1',
              name: 'モックアルバム',
              images: [{ url: 'https://picsum.photos/300/300?random=100', width: 300, height: 300 }],
              release_date: '2024-01-01'
            },
            duration_ms: 180000,
            preview_url: 'https://example.com/preview.mp3',
            external_urls: { spotify: `https://open.spotify.com/track/${trackId}` },
            popularity: 75
          })
        }, 500)
      })
    }

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get track: ${response.status}`)
    }

    const responseData = await response.json()
    
    // 型ガードによる安全な変換
    if (!isSpotifyTrack(responseData)) {
      throw new Error('Invalid track response format')
    }
    
    return responseData
  }

  // ユーザープレイリスト取得
  async getUserPlaylists(limit: number = 20): Promise<{ items: unknown[], total: number }> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            items: [],
            total: 0
          })
        }, 500)
      })
    }

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get playlists: ${response.status}`)
    }

    return response.json()
  }

  // 拡張検索（複数タイプ対応）
  async search(params: SpotifySearchParams): Promise<SpotifyExtendedSearchResponse> {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockResponse: SpotifyExtendedSearchResponse = {}
          
          if (params.type === 'track' || !params.type) {
            mockResponse.tracks = {
              items: this.generateMockTracks(params.query, params.limit || 20),
              total: 1000,
              limit: params.limit || 20,
              offset: params.offset || 0
            }
          }
          
          if (params.type === 'artist') {
            mockResponse.artists = {
              items: this.generateMockArtists(params.query, params.limit || 20),
              total: 500,
              limit: params.limit || 20,
              offset: params.offset || 0
            }
          }
          
          if (params.type === 'album') {
            mockResponse.albums = {
              items: this.generateMockAlbums(params.query, params.limit || 20),
              total: 800,
              limit: params.limit || 20,
              offset: params.offset || 0
            }
          }
          
          resolve(mockResponse)
        }, 800)
      })
    }

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const searchParams = new URLSearchParams({
      q: params.query,
      type: params.type,
      limit: (params.limit || 20).toString(),
      offset: (params.offset || 0).toString(),
      ...(params.market && { market: params.market })
    })

    const response = await fetch(
      `https://api.spotify.com/v1/search?${searchParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Spotify access token expired')
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`)
      }
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const responseData = await response.json()
    
    if (!isSpotifyExtendedSearchResponse(responseData)) {
      throw new Error('Invalid search response format')
    }
    
    return responseData
  }

  // アーティスト情報取得
  async getArtist(artistId: string): Promise<SpotifyArtist> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: artistId,
            name: 'モックアーティスト',
            images: [{ url: 'https://picsum.photos/400/400?random=300', width: 400, height: 400 }],
            genres: ['j-pop', 'pop'],
            popularity: 82,
            followers: { total: 1250000 },
            external_urls: { spotify: `https://open.spotify.com/artist/${artistId}` }
          })
        }, 500)
      })
    }

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`)
      }
      throw new Error(`Failed to get artist: ${response.status}`)
    }

    const responseData = await response.json()
    
    if (!isSpotifyArtist(responseData)) {
      throw new Error('Invalid artist response format')
    }
    
    return responseData
  }

  // アルバム情報取得
  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: albumId,
            name: 'モックアルバム',
            artists: [{ id: 'artist1', name: 'モックアーティスト' }],
            images: [{ url: 'https://picsum.photos/400/400?random=400', width: 400, height: 400 }],
            release_date: '2024-01-01',
            total_tracks: 12,
            genres: ['j-pop'],
            popularity: 75,
            external_urls: { spotify: `https://open.spotify.com/album/${albumId}` },
            tracks: {
              items: this.generateMockTracks('album tracks', 12),
              total: 12
            }
          })
        }, 500)
      })
    }

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after')
        throw new Error(`Rate limited. Retry after ${retryAfter} seconds`)
      }
      throw new Error(`Failed to get album: ${response.status}`)
    }

    const responseData = await response.json()
    
    if (!isSpotifyAlbum(responseData)) {
      throw new Error('Invalid album response format')
    }
    
    return responseData
  }

  // アーティストのトップトラック取得
  async getArtistTopTracks(artistId: string, market: string = 'JP'): Promise<SpotifyTrack[]> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(this.generateMockTracks('top tracks', 10))
        }, 600)
      })
    }

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get artist top tracks: ${response.status}`)
    }

    const responseData = await response.json()
    return responseData.tracks || []
  }

  // モックアーティスト生成
  private generateMockArtists(query: string, count: number): SpotifyArtist[] {
    const mockArtists: SpotifyArtist[] = []
    const genres = ['j-pop', 'rock', 'electronic', 'jazz', 'classical', 'hip-hop', 'r&b']
    
    for (let i = 0; i < count; i++) {
      const genre = genres[i % genres.length]
      mockArtists.push({
        id: `mock_artist_${i}_${Date.now()}`,
        name: `${query} アーティスト ${i + 1}`,
        images: [
          { 
            url: `https://picsum.photos/400/400?random=${i + 500}`, 
            width: 400, 
            height: 400 
          }
        ],
        genres: [genre],
        popularity: Math.floor(Math.random() * 100),
        followers: { total: Math.floor(Math.random() * 10000000) },
        external_urls: {
          spotify: `https://open.spotify.com/artist/mock_${i}`
        }
      })
    }
    
    return mockArtists
  }

  // モックアルバム生成
  private generateMockAlbums(query: string, count: number): SpotifyAlbum[] {
    const mockAlbums: SpotifyAlbum[] = []
    const genres = ['j-pop', 'rock', 'electronic', 'jazz', 'classical', 'hip-hop', 'r&b']
    
    for (let i = 0; i < count; i++) {
      const genre = genres[i % genres.length]
      mockAlbums.push({
        id: `mock_album_${i}_${Date.now()}`,
        name: `${query} アルバム ${i + 1}`,
        artists: [
          { 
            id: `artist_${i}`, 
            name: `アーティスト ${String.fromCharCode(65 + (i % 26))}` 
          }
        ],
        images: [
          { 
            url: `https://picsum.photos/400/400?random=${i + 600}`, 
            width: 400, 
            height: 400 
          }
        ],
        release_date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
        total_tracks: Math.floor(Math.random() * 15) + 5,
        genres: [genre],
        popularity: Math.floor(Math.random() * 100),
        external_urls: {
          spotify: `https://open.spotify.com/album/mock_${i}`
        }
      })
    }
    
    return mockAlbums
  }

  // モック楽曲生成
  private generateMockTracks(query: string, count: number): SpotifyTrack[] {
    const mockTracks: SpotifyTrack[] = []
    const genres = ['J-Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Hip-Hop', 'R&B']
    
    for (let i = 0; i < count; i++) {
      const genre = genres[i % genres.length]
      mockTracks.push({
        id: `mock_track_${i}_${Date.now()}`,
        name: `${query}に関連する楽曲 ${i + 1}`,
        artists: [
          { 
            id: `artist_${i}`, 
            name: `${genre}アーティスト ${String.fromCharCode(65 + (i % 26))}` 
          }
        ],
        album: {
          id: `album_${i}`,
          name: `${genre} アルバム ${i + 1}`,
          images: [
            { 
              url: `https://picsum.photos/300/300?random=${i + 100}`, 
              width: 300, 
              height: 300 
            }
          ],
          release_date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`
        },
        duration_ms: 120000 + (i * 15000) + Math.random() * 120000,
        preview_url: `https://example.com/preview_${i}.mp3`,
        external_urls: {
          spotify: `https://open.spotify.com/track/mock_${i}`
        },
        popularity: Math.floor(Math.random() * 100)
      })
    }

    return mockTracks
  }

  // ランダム文字列生成
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // アクセストークン設定
  setAccessToken(token: string) {
    this.accessToken = token
  }

  // アクセストークン取得
  getStoredAccessToken(): string | null {
    return this.accessToken
  }
}

// シングルトンインスタンス
export const spotifyAPI = new SpotifyAPI()

// 型ガード関数
function isSpotifyAuthResponse(data: unknown): data is SpotifyAuthResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as SpotifyAuthResponse).access_token === 'string' &&
    typeof (data as SpotifyAuthResponse).token_type === 'string' &&
    typeof (data as SpotifyAuthResponse).expires_in === 'number'
  )
}

function isSpotifySearchResponse(data: unknown): data is SpotifySearchResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as SpotifySearchResponse).tracks === 'object' &&
    Array.isArray((data as SpotifySearchResponse).tracks.items)
  )
}

function isSpotifyTrack(data: unknown): data is SpotifyTrack {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as SpotifyTrack).id === 'string' &&
    typeof (data as SpotifyTrack).name === 'string' &&
    Array.isArray((data as SpotifyTrack).artists)
  )
}

function isSpotifyExtendedSearchResponse(data: unknown): data is SpotifyExtendedSearchResponse {
  return (
    typeof data === 'object' &&
    data !== null
  )
}

function isSpotifyArtist(data: unknown): data is SpotifyArtist {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as SpotifyArtist).id === 'string' &&
    typeof (data as SpotifyArtist).name === 'string' &&
    Array.isArray((data as SpotifyArtist).images)
  )
}

function isSpotifyAlbum(data: unknown): data is SpotifyAlbum {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as SpotifyAlbum).id === 'string' &&
    typeof (data as SpotifyAlbum).name === 'string' &&
    Array.isArray((data as SpotifyAlbum).artists)
  )
}

// デフォルトエクスポート
export default spotifyAPI