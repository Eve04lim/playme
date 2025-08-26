// src/api/applemusic.ts
export interface AppleMusicSearchParams {
  term: string
  types?: string[]
  limit?: number
  offset?: number
  country?: string
}

export interface AppleMusicTrack {
  id: string
  type: 'songs'
  attributes: {
    name: string
    artistName: string
    albumName: string
    durationInMillis: number
    artwork?: {
      url: string
      width: number
      height: number
    }
    playParams?: {
      id: string
      kind: string
    }
    previews?: Array<{
      url: string
    }>
    url: string
          isrc?: string
    releaseDate: string
    genreNames: string[]
  }
}

export interface AppleMusicAlbum {
  id: string
  type: 'albums'
  attributes: {
    name: string
    artistName: string
    artwork?: {
      url: string
      width: number
      height: number
    }
    releaseDate: string
    trackCount: number
    genreNames: string[]
    isComplete: boolean
    url: string
  }
}

export interface AppleMusicArtist {
  id: string
  type: 'artists'
  attributes: {
    name: string
    genreNames: string[]
    url: string
  }
}

export interface AppleMusicSearchResponse {
  results: {
    songs?: {
      data: AppleMusicTrack[]
      href: string
      next?: string
    }
    albums?: {
      data: AppleMusicAlbum[]
    }
    artists?: {
      data: AppleMusicArtist[]
    }
  }
}

export interface AppleMusicUserToken {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

declare global {
  interface Window {
    MusicKit: MusicKitModule
  }
}

interface MusicKitModule {
  configure: (config: MusicKitConfig) => Promise<void>
  getInstance: () => MusicKitInstance
}

interface MusicKitConfig {
  developerToken: string
  app: {
    name: string
    build: string
  }
}

interface MusicKitInstance {
  authorize: () => Promise<string>
  isAuthorized: boolean
  api: MusicKitAPI
  setQueue: (queue: { song: string }) => Promise<void>
  play: () => Promise<void>
  pause: () => Promise<void>
  unauthorize: () => void
}

interface MusicKitAPI {
  search: (term: string, params: Record<string, unknown>) => Promise<AppleMusicSearchResponse>
  song: (id: string) => Promise<{ data: AppleMusicTrack[] }>
  library: MusicKitLibrary
  charts: (country: string, options: Record<string, unknown>) => Promise<unknown>
  recommendations: () => Promise<unknown>
}

interface MusicKitLibrary {
  songs: (param: null, options: { limit: number }) => Promise<{ data: AppleMusicTrack[] }>
  playlist: (id: string | null, data: Record<string, unknown>) => Promise<{ data: unknown[] }>
}

class AppleMusicAPI {
  private developerToken: string
  private musicKitInstance: MusicKitInstance | null = null
  private userToken: string | null = null

  constructor() {
    this.developerToken = import.meta.env.VITE_APPLE_MUSIC_DEVELOPER_TOKEN || ''
  }

  // MusicKit.js の初期化
  async initializeMusicKit(): Promise<void> {
    if (this.musicKitInstance) return

    // MusicKit.js ライブラリの動的読み込み
    if (!window.MusicKit) {
      await this.loadMusicKitScript()
    }

    try {
      await window.MusicKit.configure({
        developerToken: this.developerToken,
        app: {
          name: 'Playme',
          build: '1.0.0'
        }
      })

      this.musicKitInstance = window.MusicKit.getInstance()
    } catch (error) {
      console.error('Failed to initialize MusicKit:', error)
      throw new Error('Apple Music initialization failed')
    }
  }

  // MusicKit.js スクリプトの読み込み
  private loadMusicKitScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load MusicKit.js'))
      document.head.appendChild(script)
    })
  }

  // ユーザー認証
  async authorize(): Promise<AppleMusicUserToken> {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            access_token: 'mock_apple_music_token_' + Date.now(),
            token_type: 'Bearer',
            expires_in: 3600
          })
        }, 1000)
      })
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      const userToken = await this.musicKitInstance.authorize()
      this.userToken = userToken
      
      return {
        access_token: userToken,
        token_type: 'Bearer',
        expires_in: 3600
      }
    } catch (error) {
      console.error('Apple Music authorization failed:', error)
      throw new Error('Apple Music authorization failed')
    }
  }

  // 楽曲検索
  async searchTracks(params: AppleMusicSearchParams): Promise<AppleMusicSearchResponse> {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockResponse: AppleMusicSearchResponse = {
            results: {
              songs: {
                data: this.generateMockTracks(params.term, params.limit || 20),
                href: `/v1/catalog/jp/search?term=${encodeURIComponent(params.term)}`
              }
            }
          }
          resolve(mockResponse)
        }, 800)
      })
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      const searchParams = {
        term: params.term,
        types: params.types || ['songs'],
        limit: params.limit || 25,
        offset: params.offset || 0
      }

      const response = await this.musicKitInstance.api.search(searchParams.term, searchParams)
      return response
    } catch (error) {
      console.error('Apple Music search failed:', error)
      throw new Error(`Apple Music search failed: ${error}`)
    }
  }

  // トラック詳細取得
  async getTrack(trackId: string): Promise<AppleMusicTrack> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: trackId,
            type: 'songs',
            attributes: {
              name: 'モック楽曲',
              artistName: 'モックアーティスト',
              albumName: 'モックアルバム',
              durationInMillis: 180000,
              artwork: {
                url: 'https://picsum.photos/300/300?random=200',
                width: 300,
                height: 300
              },
              url: `https://music.apple.com/jp/song/${trackId}`,
              releaseDate: '2024-01-01',
              genreNames: ['Pop']
            }
          })
        }, 500)
      })
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      const response = await this.musicKitInstance.api.song(trackId)
      return response.data[0]
    } catch (error) {
      console.error('Failed to get Apple Music track:', error)
      throw new Error(`Failed to get track: ${error}`)
    }
  }

  // ユーザーライブラリの楽曲取得
  async getUserLibraryTracks(limit: number = 25): Promise<AppleMusicTrack[]> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([])
        }, 500)
      })
    }

    if (!this.musicKitInstance || !this.userToken) {
      throw new Error('User not authorized')
    }

    try {
      const response = await this.musicKitInstance.api.library.songs(null, { limit })
      return response.data
    } catch (error) {
      console.error('Failed to get user library:', error)
      throw new Error(`Failed to get user library: ${error}`)
    }
  }

  // プレイリスト作成
  async createPlaylist(name: string, description?: string): Promise<unknown> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 'mock_playlist_' + Date.now(),
            type: 'library-playlists',
            attributes: {
              name,
              description: description || '',
              canEdit: true
            }
          })
        }, 1000)
      })
    }

    if (!this.musicKitInstance || !this.userToken) {
      throw new Error('User not authorized')
    }

    try {
      const response = await this.musicKitInstance.api.library.playlist(null, {
        attributes: {
          name,
          description: description || ''
        }
      })
      return response.data[0]
    } catch (error) {
      console.error('Failed to create playlist:', error)
      throw new Error(`Failed to create playlist: ${error}`)
    }
  }

  // 楽曲をプレイリストに追加
  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Added track ${trackId} to playlist ${playlistId}`)
          resolve()
        }, 500)
      })
    }

    if (!this.musicKitInstance || !this.userToken) {
      throw new Error('User not authorized')
    }

    try {
      await this.musicKitInstance.api.library.playlist(playlistId, {
        data: [
          {
            id: trackId,
            type: 'songs'
          }
        ]
      })
    } catch (error) {
      console.error('Failed to add track to playlist:', error)
      throw new Error(`Failed to add track to playlist: ${error}`)
    }
  }

  // 楽曲再生
  async playTrack(trackId: string): Promise<void> {
    if (import.meta.env.DEV) {
      console.log(`Playing track: ${trackId}`)
      return Promise.resolve()
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      await this.musicKitInstance.setQueue({ song: trackId })
      await this.musicKitInstance.play()
    } catch (error) {
      console.error('Failed to play track:', error)
      throw new Error(`Failed to play track: ${error}`)
    }
  }

  // 再生停止
  async pauseTrack(): Promise<void> {
    if (import.meta.env.DEV) {
      console.log('Pausing track')
      return Promise.resolve()
    }

    if (!this.musicKitInstance) {
      return
    }

    try {
      await this.musicKitInstance.pause()
    } catch (error) {
      console.error('Failed to pause track:', error)
    }
  }

  // チャート取得
  async getCharts(types: string[] = ['songs'], limit: number = 20): Promise<unknown> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            results: {
              songs: [{
                data: this.generateMockTracks('Chart', limit),
                href: '/v1/catalog/jp/charts',
                chart: 'most-played',
                name: 'Top Songs'
              }]
            }
          })
        }, 800)
      })
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      const response = await this.musicKitInstance.api.charts('jp', {
        types,
        limit
      })
      return response
    } catch (error) {
      console.error('Failed to get charts:', error)
      throw new Error(`Failed to get charts: ${error}`)
    }
  }

  // おすすめ取得
  async getRecommendations(): Promise<unknown> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            data: this.generateMockTracks('Recommended', 10)
          })
        }, 1000)
      })
    }

    if (!this.musicKitInstance || !this.userToken) {
      throw new Error('User not authorized')
    }

    try {
      const response = await this.musicKitInstance.api.recommendations()
      return response
    } catch (error) {
      console.error('Failed to get recommendations:', error)
      throw new Error(`Failed to get recommendations: ${error}`)
    }
  }

  // 認証状態確認
  isAuthorized(): boolean {
    if (import.meta.env.DEV) {
      return this.userToken !== null
    }

    return this.musicKitInstance?.isAuthorized || false
  }

  // ユーザートークン設定
  setUserToken(token: string) {
    this.userToken = token
  }

  // ユーザートークン取得
  getUserToken(): string | null {
    return this.userToken
  }

  // 楽曲情報を内部形式に変換
  convertToInternalFormat(appleMusicTrack: AppleMusicTrack): import('../types').Track {
    return {
      id: appleMusicTrack.id,
      appleMusicId: appleMusicTrack.id,
      title: appleMusicTrack.attributes.name,
      artist: appleMusicTrack.attributes.artistName,
      album: appleMusicTrack.attributes.albumName,
      duration: appleMusicTrack.attributes.durationInMillis,
      artworkUrl: appleMusicTrack.attributes.artwork?.url.replace('{w}x{h}', '300x300'),
      previewUrl: appleMusicTrack.attributes.previews?.[0]?.url,
      externalUrl: appleMusicTrack.attributes.url,
      createdAt: new Date().toISOString()
    }
  }

  // モックデータ生成
  private generateMockTracks(query: string, count: number): AppleMusicTrack[] {
    const mockTracks: AppleMusicTrack[] = []
    const genres = ['J-Pop', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Hip-Hop', 'R&B']
    
    for (let i = 0; i < count; i++) {
      const genre = genres[i % genres.length]
      mockTracks.push({
        id: `apple_mock_${i}_${Date.now()}`,
        type: 'songs',
        attributes: {
          name: `${query} 関連楽曲 ${i + 1}`,
          artistName: `Apple ${genre} アーティスト ${String.fromCharCode(65 + (i % 26))}`,
          albumName: `Apple ${genre} アルバム ${i + 1}`,
          durationInMillis: 120000 + (i * 15000) + Math.random() * 120000,
          artwork: {
            url: `https://picsum.photos/300/300?random=${i + 300}`,
            width: 300,
            height: 300
          },
          url: `https://music.apple.com/jp/song/mock-${i}`,
          releaseDate: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
          genreNames: [genre]
        }
      })
    }

    return mockTracks
  }

  // 楽曲検索（統合形式）
  async searchUnified(query: string, limit: number = 20): Promise<import('../types').Track[]> {
    try {
      const response = await this.searchTracks({ term: query, limit })
      const tracks = response.results.songs?.data || []
      
      return tracks.map(track => this.convertToInternalFormat(track))
    } catch (error) {
      console.error('Apple Music unified search failed:', error)
      throw error
    }
  }

  // 接続状態確認
  async checkConnection(): Promise<boolean> {
    if (import.meta.env.DEV) {
      return true
    }

    try {
      await this.initializeMusicKit()
      return this.musicKitInstance !== null
    } catch (error) {
      console.error('Apple Music connection check failed:', error)
      return false
    }
  }

  // ライブラリ同期機能
  async syncLibraryTracks(): Promise<AppleMusicTrack[]> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            ...this.generateMockTracks('My Library', 25),
            ...this.generateMockTracks('Recently Added', 15)
          ])
        }, 1200)
      })
    }

    if (!this.musicKitInstance || !this.userToken) {
      throw new Error('User not authorized for library sync')
    }

    try {
      const libraryTracks = await this.getUserLibraryTracks(100)
      
      // トラック情報を標準化
      const normalizedTracks = libraryTracks.map(track => ({
        ...track,
        attributes: {
          ...track.attributes,
          // 追加のメタデータ標準化
          libraryAdded: new Date().toISOString(),
          playCount: Math.floor(Math.random() * 100),
          lastPlayed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }))

      return normalizedTracks
    } catch (error) {
      console.error('Library sync failed:', error)
      throw new Error(`Library sync failed: ${error}`)
    }
  }

  // バッチプレイリスト操作
  async batchUpdatePlaylists(operations: Array<{
    action: 'create' | 'update' | 'delete'
    playlistId?: string
    data?: { name: string; description?: string; tracks?: string[] }
  }>): Promise<unknown[]> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const results = operations.map((op, index) => ({
            id: `batch_result_${index}`,
            action: op.action,
            status: 'success',
            data: op.data || {}
          }))
          resolve(results)
        }, 1500)
      })
    }

    if (!this.musicKitInstance || !this.userToken) {
      throw new Error('User not authorized for batch operations')
    }

    const results = []
    for (const operation of operations) {
      try {
        let result
        switch (operation.action) {
          case 'create':
            result = await this.createPlaylist(
              operation.data?.name || 'New Playlist',
              operation.data?.description
            )
            break
          case 'update':
            // プレイリスト更新の実装
            result = { id: operation.playlistId, status: 'updated' }
            break
          case 'delete':
            // プレイリスト削除の実装
            result = { id: operation.playlistId, status: 'deleted' }
            break
        }
        results.push({ operation: operation.action, result, success: true })
      } catch (error) {
        results.push({ operation: operation.action, error: error instanceof Error ? error.message : String(error), success: false })
      }
    }

    return results
  }

  // 高度な検索機能
  async advancedSearch(params: {
    term: string
    types?: string[]
    genre?: string[]
    artist?: string
    album?: string
    year?: { min?: number; max?: number }
    limit?: number
    offset?: number
  }): Promise<AppleMusicSearchResponse> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const filteredTracks = this.generateMockTracks(params.term, params.limit || 20)
            .filter(track => {
              // ジャンルフィルター
              if (params.genre && params.genre.length > 0) {
                return params.genre.some(g => 
                  track.attributes.genreNames.some(tg => 
                    tg.toLowerCase().includes(g.toLowerCase())
                  )
                )
              }
              return true
            })
            .filter(track => {
              // アーティストフィルター
              if (params.artist) {
                return track.attributes.artistName.toLowerCase().includes(params.artist.toLowerCase())
              }
              return true
            })
            .filter(track => {
              // 年代フィルター
              if (params.year) {
                const trackYear = new Date(track.attributes.releaseDate).getFullYear()
                return (!params.year.min || trackYear >= params.year.min) &&
                       (!params.year.max || trackYear <= params.year.max)
              }
              return true
            })

          resolve({
            results: {
              songs: {
                data: filteredTracks,
                href: `/v1/catalog/jp/search?term=${encodeURIComponent(params.term)}`
              }
            }
          })
        }, 1000)
      })
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      // 検索クエリの構築
      let searchQuery = params.term
      if (params.artist) searchQuery += ` artist:${params.artist}`
      if (params.album) searchQuery += ` album:${params.album}`

      const response = await this.musicKitInstance.api.search(searchQuery, {
        types: params.types || ['songs'],
        limit: params.limit || 25,
        offset: params.offset || 0
      })

      return response
    } catch (error) {
      console.error('Advanced search failed:', error)
      throw new Error(`Advanced search failed: ${error}`)
    }
  }

  // アーティスト詳細情報取得
  async getArtistDetails(artistId: string): Promise<unknown> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: artistId,
            type: 'artists',
            attributes: {
              name: 'モック詳細アーティスト',
              genreNames: ['J-Pop', 'Pop'],
              url: `https://music.apple.com/artist/${artistId}`,
              artwork: {
                url: 'https://picsum.photos/500/500?random=800',
                width: 500,
                height: 500
              }
            },
            relationships: {
              albums: {
                data: this.generateMockAlbums(artistId, 5)
              },
              songs: {
                data: this.generateMockTracks('artist songs', 10)
              }
            }
          })
        }, 800)
      })
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      // Apple Music APIでアーティスト詳細を取得
      const artistResponse = await fetch(`https://api.music.apple.com/v1/catalog/jp/artists/${artistId}`, {
        headers: {
          'Authorization': `Bearer ${this.developerToken}`,
          'Music-User-Token': this.userToken || ''
        }
      })

      if (!artistResponse.ok) {
        throw new Error(`Failed to get artist details: ${artistResponse.status}`)
      }

      return artistResponse.json()
    } catch (error) {
      console.error('Get artist details failed:', error)
      throw new Error(`Get artist details failed: ${error}`)
    }
  }

  // アルバム詳細情報取得
  async getAlbumDetails(albumId: string): Promise<unknown> {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: albumId,
            type: 'albums',
            attributes: {
              name: 'モック詳細アルバム',
              artistName: 'モック詳細アーティスト',
              releaseDate: '2024-01-15',
              trackCount: 12,
              genreNames: ['J-Pop'],
              artwork: {
                url: 'https://picsum.photos/500/500?random=900',
                width: 500,
                height: 500
              },
              copyright: '2024 Mock Music Records',
              isComplete: true
            },
            relationships: {
              tracks: {
                data: this.generateMockTracks('album tracks', 12)
              }
            }
          })
        }, 700)
      })
    }

    if (!this.musicKitInstance) {
      await this.initializeMusicKit()
    }

    if (!this.musicKitInstance) {
      throw new Error('MusicKit initialization failed')
    }

    try {
      const albumResponse = await fetch(`https://api.music.apple.com/v1/catalog/jp/albums/${albumId}`, {
        headers: {
          'Authorization': `Bearer ${this.developerToken}`,
          'Music-User-Token': this.userToken || ''
        }
      })

      if (!albumResponse.ok) {
        throw new Error(`Failed to get album details: ${albumResponse.status}`)
      }

      return albumResponse.json()
    } catch (error) {
      console.error('Get album details failed:', error)
      throw new Error(`Get album details failed: ${error}`)
    }
  }

  // モックアルバム生成 (ヘルパー)
  private generateMockAlbums(query: string, count: number): unknown[] {
    const mockAlbums = []
    const genres = ['J-Pop', 'Pop', 'Rock', 'Electronic', 'Jazz', 'Hip-Hop']
    
    for (let i = 0; i < count; i++) {
      const genre = genres[i % genres.length]
      mockAlbums.push({
        id: `apple_mock_album_${i}_${Date.now()}`,
        type: 'albums',
        attributes: {
          name: `${query} アルバム ${i + 1}`,
          artistName: `アーティスト ${String.fromCharCode(65 + (i % 26))}`,
          releaseDate: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
          trackCount: Math.floor(Math.random() * 15) + 5,
          genreNames: [genre],
          artwork: {
            url: `https://picsum.photos/400/400?random=${i + 1000}`,
            width: 400,
            height: 400
          }
        }
      })
    }
    
    return mockAlbums
  }

  // サービス情報取得
  getServiceInfo(): { name: string; isAvailable: boolean; requiresAuth: boolean } {
    return {
      name: 'Apple Music',
      isAvailable: !!this.developerToken,
      requiresAuth: true
    }
  }

  // クリーンアップ
  cleanup(): void {
    this.userToken = null
    if (!this.musicKitInstance) {
      return
    }

    if (this.musicKitInstance) {
      try {
        this.musicKitInstance.unauthorize()
      } catch (error) {
        console.warn('Failed to cleanup Apple Music instance:', error)
      }
    }
  }
}

// シングルトンインスタンス
export const appleMusicAPI = new AppleMusicAPI()

// デフォルトエクスポート
export default appleMusicAPI