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