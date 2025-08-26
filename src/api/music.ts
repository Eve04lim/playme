// src/api/music.ts（更新版）
import type {
  AddTrackToPlaylistRequest,
  CreatePlaylistRequest,
  Playlist,
  SearchRequest,
  SearchResponse,
  Track,
  UpdatePlaylistRequest
} from '../types'
import { apiClient } from './client'
import { spotifyAPI } from './spotify'

// 拡張されたTrack型
interface EnhancedTrack extends Track {
  genre: string[]
  mood: string[]
  bpm?: number
  key?: string
  energy: number // 0-1
  danceability: number // 0-1
  valence: number // 0-1 (positivity)
  releaseDate: string
  popularity: number // 0-100
}

// 大幅に拡充されたモックデータ（50曲以上）
const enhancedMockTracks: EnhancedTrack[] = [
  // J-Pop
  {
    id: '1',
    spotifyId: 'spotify-1',
    title: '夜明けのメロディー',
    artist: '山田太郎',
    album: 'Morning Songs',
    duration: 240000,
    artworkUrl: 'https://picsum.photos/300/300?random=1',
    previewUrl: 'https://example.com/preview1.mp3',
    genre: ['J-Pop', 'Ballad'],
    mood: ['peaceful', 'uplifting'],
    bpm: 80,
    key: 'C Major',
    energy: 0.4,
    danceability: 0.3,
    valence: 0.7,
    releaseDate: '2024-01-15',
    popularity: 85
  },
  {
    id: '2',
    title: '青春の記憶',
    artist: '佐藤花子',
    album: 'Youth Chronicles',
    duration: 220000,
    artworkUrl: 'https://picsum.photos/300/300?random=2',
    genre: ['J-Pop', 'Rock'],
    mood: ['nostalgic', 'energetic'],
    bpm: 120,
    energy: 0.8,
    danceability: 0.6,
    valence: 0.6,
    releaseDate: '2024-02-20',
    popularity: 92
  },
  {
    id: '3',
    title: '恋する季節',
    artist: '田中愛美',
    album: 'Love Songs',
    duration: 200000,
    artworkUrl: 'https://picsum.photos/300/300?random=3',
    genre: ['J-Pop', 'Love Song'],
    mood: ['romantic', 'sweet'],
    bpm: 95,
    energy: 0.5,
    danceability: 0.4,
    valence: 0.9,
    releaseDate: '2024-03-14',
    popularity: 78
  },

  // Electronic/EDM
  {
    id: '4',
    title: 'Electric Pulse',
    artist: 'Neon Wave',
    album: 'Synthwave Collection',
    duration: 195000,
    artworkUrl: 'https://picsum.photos/300/300?random=4',
    genre: ['Electronic', 'Synthwave'],
    mood: ['energetic', 'futuristic'],
    bpm: 128,
    energy: 0.9,
    danceability: 0.8,
    valence: 0.7,
    releaseDate: '2024-01-08',
    popularity: 88
  },
  {
    id: '5',
    title: 'Digital Dreams',
    artist: 'Cyber Space',
    album: 'Virtual Reality',
    duration: 280000,
    artworkUrl: 'https://picsum.photos/300/300?random=5',
    genre: ['Electronic', 'Ambient'],
    mood: ['dreamy', 'atmospheric'],
    bpm: 140,
    energy: 0.7,
    danceability: 0.9,
    valence: 0.6,
    releaseDate: '2024-02-01',
    popularity: 73
  },
  {
    id: '6',
    title: 'Bass Drop Revolution',
    artist: 'DJ Thunder',
    album: 'Club Anthems',
    duration: 210000,
    artworkUrl: 'https://picsum.photos/300/300?random=6',
    genre: ['Electronic', 'Dubstep'],
    mood: ['intense', 'powerful'],
    bpm: 150,
    energy: 1.0,
    danceability: 1.0,
    valence: 0.8,
    releaseDate: '2024-01-22',
    popularity: 91
  },

  // Rock
  {
    id: '7',
    title: 'Thunder Road',
    artist: 'Wild Stallions',
    album: 'Rock Revolution',
    duration: 245000,
    artworkUrl: 'https://picsum.photos/300/300?random=7',
    genre: ['Rock', 'Hard Rock'],
    mood: ['aggressive', 'powerful'],
    bpm: 140,
    energy: 0.9,
    danceability: 0.5,
    valence: 0.7,
    releaseDate: '2024-01-30',
    popularity: 86
  },
  {
    id: '8',
    title: 'Midnight Drive',
    artist: 'Highway Kings',
    album: 'Road Trip',
    duration: 265000,
    artworkUrl: 'https://picsum.photos/300/300?random=8',
    genre: ['Rock', 'Alternative'],
    mood: ['adventurous', 'free'],
    bpm: 120,
    energy: 0.7,
    danceability: 0.4,
    valence: 0.6,
    releaseDate: '2024-02-15',
    popularity: 79
  },

  // Jazz
  {
    id: '9',
    title: 'Smooth Jazz Café',
    artist: 'Blue Note Quartet',
    album: 'Evening Sessions',
    duration: 320000,
    artworkUrl: 'https://picsum.photos/300/300?random=9',
    genre: ['Jazz', 'Smooth Jazz'],
    mood: ['relaxing', 'sophisticated'],
    bpm: 70,
    energy: 0.3,
    danceability: 0.2,
    valence: 0.5,
    releaseDate: '2024-01-05',
    popularity: 68
  },
  {
    id: '10',
    title: 'Saxophone Serenade',
    artist: 'Miles Davis Jr.',
    album: 'Jazz Standards',
    duration: 290000,
    artworkUrl: 'https://picsum.photos/300/300?random=10',
    genre: ['Jazz', 'Bebop'],
    mood: ['melancholic', 'thoughtful'],
    bpm: 85,
    energy: 0.4,
    danceability: 0.3,
    valence: 0.4,
    releaseDate: '2024-02-28',
    popularity: 75
  },

  // Classical
  {
    id: '11',
    title: 'Symphony No. 10',
    artist: 'Modern Orchestra',
    album: 'Contemporary Classics',
    duration: 420000,
    artworkUrl: 'https://picsum.photos/300/300?random=11',
    genre: ['Classical', 'Symphony'],
    mood: ['dramatic', 'epic'],
    bpm: 60,
    energy: 0.6,
    danceability: 0.1,
    valence: 0.5,
    releaseDate: '2024-01-10',
    popularity: 62
  },
  {
    id: '12',
    title: 'Piano Concerto in D',
    artist: 'Virtuoso Ensemble',
    album: 'Chamber Music',
    duration: 380000,
    artworkUrl: 'https://picsum.photos/300/300?random=12',
    genre: ['Classical', 'Piano'],
    mood: ['elegant', 'refined'],
    bpm: 90,
    energy: 0.5,
    danceability: 0.1,
    valence: 0.6,
    releaseDate: '2024-03-01',
    popularity: 71
  },

  // Hip-Hop
  {
    id: '13',
    title: 'Street Flow',
    artist: 'MC Rhythm',
    album: 'Urban Tales',
    duration: 185000,
    artworkUrl: 'https://picsum.photos/300/300?random=13',
    genre: ['Hip-Hop', 'Rap'],
    mood: ['confident', 'urban'],
    bpm: 95,
    energy: 0.8,
    danceability: 0.7,
    valence: 0.7,
    releaseDate: '2024-02-10',
    popularity: 89
  },
  {
    id: '14',
    title: 'Golden Era',
    artist: 'Old School Crew',
    album: 'Back to the Roots',
    duration: 230000,
    artworkUrl: 'https://picsum.photos/300/300?random=14',
    genre: ['Hip-Hop', 'Old School'],
    mood: ['nostalgic', 'groovy'],
    bpm: 88,
    energy: 0.6,
    danceability: 0.8,
    valence: 0.8,
    releaseDate: '2024-01-25',
    popularity: 83
  },

  // R&B
  {
    id: '15',
    title: 'Soulful Night',
    artist: 'Velvet Voice',
    album: 'Midnight Sessions',
    duration: 255000,
    artworkUrl: 'https://picsum.photos/300/300?random=15',
    genre: ['R&B', 'Soul'],
    mood: ['sensual', 'smooth'],
    bpm: 75,
    energy: 0.5,
    danceability: 0.6,
    valence: 0.6,
    releaseDate: '2024-02-05',
    popularity: 77
  },

  // World Music
  {
    id: '16',
    title: '桜舞い散る頃',
    artist: '和楽器バンド',
    album: 'Japanese Fusion',
    duration: 270000,
    artworkUrl: 'https://picsum.photos/300/300?random=16',
    genre: ['World', 'Japanese Traditional'],
    mood: ['peaceful', 'cultural'],
    bpm: 110,
    energy: 0.6,
    danceability: 0.4,
    valence: 0.7,
    releaseDate: '2024-03-20',
    popularity: 84
  },

  // Indie
  {
    id: '17',
    title: 'Coffee Shop Dreams',
    artist: 'Indie Collective',
    album: 'Acoustic Sessions',
    duration: 195000,
    artworkUrl: 'https://picsum.photos/300/300?random=17',
    genre: ['Indie', 'Acoustic'],
    mood: ['cozy', 'intimate'],
    bpm: 85,
    energy: 0.3,
    danceability: 0.2,
    valence: 0.6,
    releaseDate: '2024-01-12',
    popularity: 69
  },

  // Pop
  {
    id: '18',
    title: 'Summer Vibes',
    artist: 'Pop Stars',
    album: 'Feel Good Hits',
    duration: 180000,
    artworkUrl: 'https://picsum.photos/300/300?random=18',
    genre: ['Pop', 'Summer'],
    mood: ['happy', 'upbeat'],
    bpm: 125,
    energy: 0.8,
    danceability: 0.9,
    valence: 0.9,
    releaseDate: '2024-03-15',
    popularity: 95
  },

  // Ambient
  {
    id: '19',
    title: 'Meditation Space',
    artist: 'Zen Master',
    album: 'Mindful Music',
    duration: 360000,
    artworkUrl: 'https://picsum.photos/300/300?random=19',
    genre: ['Ambient', 'Meditation'],
    mood: ['peaceful', 'calming'],
    bpm: 60,
    energy: 0.1,
    danceability: 0.1,
    valence: 0.5,
    releaseDate: '2024-01-01',
    popularity: 58
  },

  // Folk
  {
    id: '20',
    title: 'Mountain Song',
    artist: 'Folk Wanderer',
    album: 'Nature Tales',
    duration: 235000,
    artworkUrl: 'https://picsum.photos/300/300?random=20',
    genre: ['Folk', 'Acoustic'],
    mood: ['nostalgic', 'earthy'],
    bpm: 90,
    energy: 0.4,
    danceability: 0.2,
    valence: 0.6,
    releaseDate: '2024-02-18',
    popularity: 66
  },

  // 追加の楽曲（21-50）- より多様性を持たせる
  ...Array.from({ length: 30 }, (_, i) => {
    const genres = [
      ['Alternative', 'Grunge'], ['Punk', 'Hardcore'], ['Metal', 'Progressive'],
      ['Reggae', 'Dancehall'], ['Blues', 'Delta Blues'], ['Country', 'Bluegrass'],
      ['Techno', 'Deep House'], ['Trance', 'Progressive Trance'], ['Drum & Bass', 'Liquid'],
      ['Funk', 'Disco'], ['Latin', 'Salsa'], ['Afrobeat', 'World'],
      ['New Age', 'Chillout'], ['Garage', 'UK Garage'], ['Trap', 'Future Bass']
    ]
    
    const moods = [
      ['energetic', 'party'], ['melancholic', 'introspective'], ['aggressive', 'rebellious'],
      ['romantic', 'passionate'], ['mysterious', 'dark'], ['playful', 'fun'],
      ['epic', 'cinematic'], ['groovy', 'funky'], ['ethereal', 'transcendent']
    ]

    const genreIndex = i % genres.length
    const moodIndex = i % moods.length

    return {
      id: `${21 + i}`,
      title: `Track ${21 + i} - ${genres[genreIndex][0]} Style`,
      artist: `Artist ${String.fromCharCode(65 + (i % 26))}`,
      album: `Album ${Math.floor(i / 5) + 1}`,
      duration: 180000 + Math.random() * 180000,
      artworkUrl: `https://picsum.photos/300/300?random=${21 + i}`,
      genre: genres[genreIndex],
      mood: moods[moodIndex],
      bpm: 60 + Math.floor(Math.random() * 120),
      energy: Math.random(),
      danceability: Math.random(),
      valence: Math.random(),
      releaseDate: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      popularity: Math.floor(Math.random() * 100)
    } as EnhancedTrack
  })
]

// プレイリストモックデータも拡充
const enhancedMockPlaylists: Playlist[] = [
  {
    id: '1',
    userId: 'current-user-id',
    name: 'お気に入り',
    description: 'よく聴く曲のコレクション',
    isPublic: false,
    tracks: enhancedMockTracks.slice(0, 8),
    trackCount: 8,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    userId: 'current-user-id',
    name: 'ワークアウト',
    description: 'エクササイズ用の音楽',
    isPublic: true,
    tracks: enhancedMockTracks.filter(t => t.energy > 0.7).slice(0, 6),
    trackCount: 6,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z'
  },
  {
    id: '3',
    userId: 'current-user-id',
    name: 'チルアウト',
    description: 'リラックス用の音楽',
    isPublic: false,
    tracks: enhancedMockTracks.filter(t => t.energy < 0.4).slice(0, 10),
    trackCount: 10,
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z'
  },
  {
    id: '4',
    userId: 'current-user-id',
    name: 'ダンスミックス',
    description: 'パーティー・ダンス用',
    isPublic: true,
    tracks: enhancedMockTracks.filter(t => t.danceability > 0.7).slice(0, 12),
    trackCount: 12,
    createdAt: '2025-01-04T00:00:00Z',
    updatedAt: '2025-01-04T00:00:00Z'
  }
]

export const musicApi = {
  // 楽曲検索（強化版）
  searchTracks: async (searchRequest: SearchRequest): Promise<SearchResponse> => {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const query = searchRequest.query.toLowerCase()
          let filteredTracks = enhancedMockTracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query) ||
            track.album?.toLowerCase().includes(query) ||
            track.genre.some(g => g.toLowerCase().includes(query)) ||
            track.mood.some(m => m.toLowerCase().includes(query))
          )

          // ジャンルフィルター（検索リクエストに含まれる場合）
          const extendedSearchRequest = searchRequest as SearchRequest & {
            genre?: string
            bpmMin?: number
            bpmMax?: number
          }
          
          const genreFilter = extendedSearchRequest.genre
          if (genreFilter) {
            filteredTracks = filteredTracks.filter(track =>
              track.genre.some(g => g.toLowerCase().includes(genreFilter.toLowerCase()))
            )
          }

          // BPM範囲フィルター
          const bpmMin = extendedSearchRequest.bpmMin
          const bpmMax = extendedSearchRequest.bpmMax
          if (bpmMin || bpmMax) {
            filteredTracks = filteredTracks.filter(track => {
              if (!track.bpm) return false
              return (!bpmMin || track.bpm >= bpmMin) && (!bpmMax || track.bpm <= bpmMax)
            })
          }

          // 人気度でソート
          filteredTracks.sort((a, b) => b.popularity - a.popularity)
          
          const limit = searchRequest.limit || 20
          const offset = searchRequest.offset || 0
          const paginatedTracks = filteredTracks.slice(offset, offset + limit)
          
          resolve({
            tracks: paginatedTracks,
            total: filteredTracks.length
          })
        }, 800)
      })
    }

    // Spotify APIを使用した実際の検索
    try {
      const spotifyResult = await spotifyAPI.searchTracks({
        query: searchRequest.query,
        type: 'track',
        limit: searchRequest.limit,
        offset: searchRequest.offset
      })

      // Spotify形式から内部形式に変換
      const tracks: Track[] = spotifyResult.tracks.items.map(item => ({
        id: item.id,
        spotifyId: item.id,
        title: item.name,
        artist: item.artists.map(a => a.name).join(', '),
        album: item.album.name,
        duration: item.duration_ms,
        artworkUrl: item.album.images[0]?.url,
        previewUrl: item.preview_url || undefined,
        externalUrl: item.external_urls.spotify
      }))

      return {
        tracks,
        total: spotifyResult.tracks.total
      }
    } catch (error) {
      console.warn('Spotify API search failed, falling back to mock data:', error)
      // Spotify API失敗時はモックデータを使用
      return musicApi.searchTracks(searchRequest)
    }
  },

  // 楽曲詳細取得
  getTrack: async (trackId: string): Promise<Track> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const track = enhancedMockTracks.find(t => t.id === trackId)
          if (track) {
            resolve(track)
          } else {
            reject(new Error('Track not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.get<Track>(`/music/tracks/${trackId}`)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Track not found')
    }
    return response.data
  },

  // ジャンル別楽曲取得
  getTracksByGenre: async (genre: string, limit: number = 20): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const genreTracks = enhancedMockTracks
            .filter(track => track.genre.some(g => g.toLowerCase().includes(genre.toLowerCase())))
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, limit)
          resolve(genreTracks)
        }, 600)
      })
    }

    const response = await apiClient.get<Track[]>('/music/genre', { genre, limit })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get tracks by genre')
    }
    return response.data
  },

  // ムード別楽曲取得
  getTracksByMood: async (mood: string, limit: number = 20): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const moodTracks = enhancedMockTracks
            .filter(track => track.mood.some(m => m.toLowerCase().includes(mood.toLowerCase())))
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, limit)
          resolve(moodTracks)
        }, 600)
      })
    }

    const response = await apiClient.get<Track[]>('/music/mood', { mood, limit })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get tracks by mood')
    }
    return response.data
  },

  // 高度な検索（フィルター付き）
  advancedSearch: async (params: {
    query?: string
    genre?: string[]
    mood?: string[]
    bpmMin?: number
    bpmMax?: number
    energyMin?: number
    energyMax?: number
    yearMin?: number
    yearMax?: number
    limit?: number
    offset?: number
  }): Promise<SearchResponse> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let filteredTracks = enhancedMockTracks

          // テキスト検索
          if (params.query) {
            const query = params.query.toLowerCase()
            filteredTracks = filteredTracks.filter(track =>
              track.title.toLowerCase().includes(query) ||
              track.artist.toLowerCase().includes(query) ||
              track.album?.toLowerCase().includes(query)
            )
          }

          // ジャンルフィルター
          if (params.genre && params.genre.length > 0) {
            filteredTracks = filteredTracks.filter(track =>
              params.genre!.some(g => track.genre.some(tg => tg.toLowerCase().includes(g.toLowerCase())))
            )
          }

          // ムードフィルター
          if (params.mood && params.mood.length > 0) {
            filteredTracks = filteredTracks.filter(track =>
              params.mood!.some(m => track.mood.some(tm => tm.toLowerCase().includes(m.toLowerCase())))
            )
          }

          // BPMフィルター
          if (params.bpmMin !== undefined || params.bpmMax !== undefined) {
            filteredTracks = filteredTracks.filter(track => {
              if (!track.bpm) return false
              return (!params.bpmMin || track.bpm >= params.bpmMin) &&
                     (!params.bpmMax || track.bpm <= params.bpmMax)
            })
          }

          // エネルギーフィルター
          if (params.energyMin !== undefined || params.energyMax !== undefined) {
            filteredTracks = filteredTracks.filter(track =>
              (!params.energyMin || track.energy >= params.energyMin) &&
              (!params.energyMax || track.energy <= params.energyMax)
            )
          }

          // 年代フィルター
          if (params.yearMin !== undefined || params.yearMax !== undefined) {
            filteredTracks = filteredTracks.filter(track => {
              const year = new Date(track.releaseDate).getFullYear()
              return (!params.yearMin || year >= params.yearMin) &&
                     (!params.yearMax || year <= params.yearMax)
            })
          }

          // 人気度でソート
          filteredTracks.sort((a, b) => b.popularity - a.popularity)

          const limit = params.limit || 20
          const offset = params.offset || 0
          const paginatedTracks = filteredTracks.slice(offset, offset + limit)

          resolve({
            tracks: paginatedTracks,
            total: filteredTracks.length
          })
        }, 1000)
      })
    }

    const response = await apiClient.get<SearchResponse>('/music/search/advanced', params as Record<string, unknown>)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Advanced search failed')
    }
    return response.data
  },

  // おすすめ楽曲取得（強化版）
  getRecommendations: async (params?: {
    genres?: string[]
    seedTracks?: string[]
    limit?: number
    targetEnergy?: number
    targetDanceability?: number
    targetValence?: number
  }): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let recommendedTracks = [...enhancedMockTracks]

          // ジャンルベースの推薦
          if (params?.genres && params.genres.length > 0) {
            recommendedTracks = recommendedTracks.filter(track =>
              params.genres!.some(g => track.genre.some(tg => tg.toLowerCase().includes(g.toLowerCase())))
            )
          }

          // エネルギー・ダンス・感情の類似性
          if (params?.targetEnergy !== undefined) {
            recommendedTracks.sort((a, b) => 
              Math.abs(a.energy - params.targetEnergy!) - Math.abs(b.energy - params.targetEnergy!)
            )
          }

          // シャッフルして多様性を確保
          recommendedTracks = recommendedTracks
            .sort(() => Math.random() - 0.5)
            .slice(0, params?.limit || 10)

          resolve(recommendedTracks)
        }, 1000)
      })
    }

    const response = await apiClient.get<Track[]>('/music/recommendations', params as Record<string, unknown>)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get recommendations')
    }
    return response.data
  },

  // プレイリスト一覧取得（強化版）
  getPlaylists: async (): Promise<Playlist[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(enhancedMockPlaylists)
        }, 1000)
      })
    }

    const response = await apiClient.get<Playlist[]>('/music/playlists')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get playlists')
    }
    return response.data
  },

  // 人気楽曲取得（チャート）
  getTrendingTracks: async (params?: {
    genre?: string
    timeRange?: 'short_term' | 'medium_term' | 'long_term'
    limit?: number
  }): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let trendingTracks = [...enhancedMockTracks]

          if (params?.genre) {
            trendingTracks = trendingTracks.filter(track =>
              track.genre.some(g => g.toLowerCase().includes(params.genre!.toLowerCase()))
            )
          }

          // 人気度でソート
          trendingTracks.sort((a, b) => b.popularity - a.popularity)
          
          resolve(trendingTracks.slice(0, params?.limit || 20))
        }, 800)
      })
    }

    const response = await apiClient.get<Track[]>('/music/trending', params as Record<string, unknown>)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get trending tracks')
    }
    return response.data
  },

  // 新着楽曲取得
  getNewReleases: async (limit: number = 20): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newReleases = [...enhancedMockTracks]
            .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
            .slice(0, limit)
          resolve(newReleases)
        }, 800)
      })
    }

    const response = await apiClient.get<Track[]>('/music/new-releases', { limit })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get new releases')
    }
    return response.data
  },

  // 利用可能なジャンル一覧取得
  getAvailableGenres: async (): Promise<string[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const genres = Array.from(new Set(
            enhancedMockTracks.flatMap(track => track.genre)
          )).sort()
          resolve(genres)
        }, 300)
      })
    }

    const response = await apiClient.get<string[]>('/music/genres')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get genres')
    }
    return response.data
  },

  // 利用可能なムード一覧取得
  getAvailableMoods: async (): Promise<string[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const moods = Array.from(new Set(
            enhancedMockTracks.flatMap(track => track.mood)
          )).sort()
          resolve(moods)
        }, 300)
      })
    }

    const response = await apiClient.get<string[]>('/music/moods')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get moods')
    }
    return response.data
  },

  // 既存のAPI関数も継続...
  getPlaylist: async (playlistId: string): Promise<Playlist> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlist = enhancedMockPlaylists.find(p => p.id === playlistId)
          if (playlist) {
            resolve(playlist)
          } else {
            reject(new Error('Playlist not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.get<Playlist>(`/music/playlists/${playlistId}`)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Playlist not found')
    }
    return response.data
  },

  createPlaylist: async (playlistData: CreatePlaylistRequest): Promise<Playlist> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newPlaylist: Playlist = {
            id: Date.now().toString(),
            userId: 'current-user-id',
            name: playlistData.name,
            description: playlistData.description,
            isPublic: playlistData.isPublic || false,
            tracks: [],
            trackCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          enhancedMockPlaylists.push(newPlaylist)
          resolve(newPlaylist)
        }, 800)
      })
    }

    const response = await apiClient.post<Playlist>('/music/playlists', playlistData)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create playlist')
    }
    return response.data
  },

  updatePlaylist: async (playlistId: string, updates: UpdatePlaylistRequest): Promise<Playlist> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlistIndex = enhancedMockPlaylists.findIndex(p => p.id === playlistId)
          if (playlistIndex >= 0) {
            enhancedMockPlaylists[playlistIndex] = {
              ...enhancedMockPlaylists[playlistIndex],
              ...updates,
              updatedAt: new Date().toISOString()
            }
            resolve(enhancedMockPlaylists[playlistIndex])
          } else {
            reject(new Error('Playlist not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.put<Playlist>(`/music/playlists/${playlistId}`, updates)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update playlist')
    }
    return response.data
  },

  deletePlaylist: async (playlistId: string): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlistIndex = enhancedMockPlaylists.findIndex(p => p.id === playlistId)
          if (playlistIndex >= 0) {
            enhancedMockPlaylists.splice(playlistIndex, 1)
            resolve()
          } else {
            reject(new Error('Playlist not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.delete(`/music/playlists/${playlistId}`)
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete playlist')
    }
  },

  addTrackToPlaylist: async (data: AddTrackToPlaylistRequest): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlist = enhancedMockPlaylists.find(p => p.id === data.playlistId)
          if (playlist) {
            const newTrack: Track = {
              ...data.trackData,
              id: Date.now().toString()
            }
            playlist.tracks.push(newTrack)
            playlist.trackCount += 1
            playlist.updatedAt = new Date().toISOString()
            resolve()
          } else {
            reject(new Error('Playlist not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.post(`/music/playlists/${data.playlistId}/tracks`, {
      trackData: data.trackData
    })
    if (!response.success) {
      throw new Error(response.error || 'Failed to add track to playlist')
    }
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlist = enhancedMockPlaylists.find(p => p.id === playlistId)
          if (playlist) {
            const trackIndex = playlist.tracks.findIndex(t => t.id === trackId)
            if (trackIndex >= 0) {
              playlist.tracks.splice(trackIndex, 1)
              playlist.trackCount -= 1
              playlist.updatedAt = new Date().toISOString()
              resolve()
            } else {
              reject(new Error('Track not found in playlist'))
            }
          } else {
            reject(new Error('Playlist not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.delete(`/music/playlists/${playlistId}/tracks/${trackId}`)
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove track from playlist')
    }
  }
}

export default musicApi