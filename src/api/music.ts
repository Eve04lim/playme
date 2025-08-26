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
import { appleMusicAPI } from './applemusic'

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

// 大規模モックデータ生成ヘルパー
const generateExtensiveMockTracks = (): EnhancedTrack[] => {
  const genres = [
    'J-Pop', 'K-Pop', 'Pop', 'Rock', 'Alternative Rock', 'Hard Rock', 'Punk Rock',
    'Electronic', 'EDM', 'House', 'Techno', 'Dubstep', 'Synthwave', 'Ambient',
    'Hip-Hop', 'Rap', 'R&B', 'Soul', 'Funk', 'Neo-Soul',
    'Jazz', 'Smooth Jazz', 'Bebop', 'Fusion', 'Blues',
    'Classical', 'Symphony', 'Chamber Music', 'Opera', 'Contemporary Classical',
    'Country', 'Folk', 'Acoustic', 'Indie', 'Indie Pop', 'Indie Rock',
    'Reggae', 'Ska', 'Dancehall', 'Latin', 'Salsa', 'Bossa Nova',
    'Metal', 'Heavy Metal', 'Death Metal', 'Progressive Metal',
    'World Music', 'Celtic', 'Flamenco', 'African', 'Asian Traditional'
  ]

  const moods = [
    'energetic', 'relaxing', 'uplifting', 'melancholic', 'romantic', 'aggressive',
    'peaceful', 'nostalgic', 'dreamy', 'powerful', 'playful', 'dramatic',
    'mysterious', 'joyful', 'sad', 'angry', 'hopeful', 'intense', 'calm',
    'adventurous', 'thoughtful', 'passionate', 'cool', 'warm', 'dark', 'bright'
  ]

  const keys = [
    'C Major', 'C Minor', 'D Major', 'D Minor', 'E Major', 'E Minor',
    'F Major', 'F Minor', 'G Major', 'G Minor', 'A Major', 'A Minor',
    'B Major', 'B Minor', 'F# Major', 'F# Minor', 'Bb Major', 'Bb Minor'
  ]

  const artistNames = [
    // Japanese Artists
    '山田太郎', '佐藤花子', '田中愛美', '鈴木健一', '高橋美咲', '伊藤翔太',
    '渡辺真理', '中村大輝', '小林優子', '加藤理沙', '吉田拓海', '山本舞',
    // International Artists
    'Luna Phoenix', 'Neon Wave', 'Cyber Space', 'DJ Thunder', 'Wild Stallions',
    'Highway Kings', 'Blue Note Quartet', 'Miles Davis Jr.', 'Modern Orchestra',
    'Virtuoso Ensemble', 'Echo Chamber', 'Stellar Dreams', 'Urban Legends',
    'Midnight Riders', 'Crystal Rain', 'Fire Storm', 'Ocean Breeze', 'Sky Walker',
    'Golden Hours', 'Silver Lining', 'Rainbow Bridge', 'Thunder Cloud',
    'Diamond Dust', 'Emerald City', 'Ruby Red', 'Sapphire Blue', 'Platinum',
    // More diverse names
    'The Crimson Tides', 'Velvet Underground Revival', 'Electric Sheep',
    'Cosmic Wanderers', 'Digital Nomads', 'Analog Dreams', 'Neon Knights',
    'Cyber Punks', 'Retro Futurists', 'Time Travelers', 'Space Cadets'
  ]

  const albumTitles = [
    // English Albums
    'Morning Songs', 'Youth Chronicles', 'Love Songs', 'Synthwave Collection',
    'Virtual Reality', 'Club Anthems', 'Rock Revolution', 'Road Trip',
    'Evening Sessions', 'Jazz Standards', 'Contemporary Classics', 'Chamber Music',
    'New Horizons', 'Digital Dreams', 'Urban Tales', 'Midnight Stories',
    'Golden Hour', 'Silver Screen', 'Crystal Clear', 'Electric Storm',
    'Ocean Waves', 'Mountain High', 'Valley Low', 'Desert Wind',
    'Forest Deep', 'River Flow', 'Fire Dance', 'Ice Cold',
    'Summer Nights', 'Winter Days', 'Spring Awakening', 'Autumn Leaves',
    // Japanese Albums
    '青春の歌', '夢の世界', '星の夜', '海の歌', '山の調べ', '風の旋律',
    '花の季節', '鳥の歌声', '雨の音', '雷の響き', '雪の静寂', '太陽の輝き'
  ]

  const songTitles = [
    // Japanese Titles
    '夜明けのメロディー', '青春の記憶', '恋する季節', '桜散る道', '夏の思い出',
    '秋風の歌', '冬の星座', '春の足音', '雨上がりの空', '虹の向こう側',
    '月夜の散歩', '朝露の歌', '夕焼けの詩', '海辺の約束', '山頂の景色',
    // English Titles
    'Electric Pulse', 'Digital Dreams', 'Bass Drop Revolution', 'Thunder Road',
    'Midnight Drive', 'Smooth Jazz Café', 'Saxophone Serenade', 'Symphony No. 10',
    'Piano Concerto in D', 'Dancing in the Rain', 'Sunset Boulevard',
    'Neon Lights', 'City Nights', 'Highway to Dreams', 'Starlight Express',
    'Moonbeam Serenade', 'Ocean Breeze', 'Mountain Echo', 'Forest Whispers',
    'Desert Mirage', 'Arctic Wind', 'Tropical Paradise', 'Urban Jungle',
    'Crystal Cave', 'Golden Gate', 'Silver Moon', 'Diamond Stars',
    'Ruby Heart', 'Emerald Eyes', 'Sapphire Sky', 'Platinum Dreams'
  ]

  const tracks: EnhancedTrack[] = []

  for (let i = 0; i < 250; i++) {
    const genre = genres[Math.floor(Math.random() * genres.length)]
    const secondaryGenre = genres[Math.floor(Math.random() * genres.length)]
    const mood1 = moods[Math.floor(Math.random() * moods.length)]
    const mood2 = moods[Math.floor(Math.random() * moods.length)]
    const artist = artistNames[Math.floor(Math.random() * artistNames.length)]
    const album = albumTitles[Math.floor(Math.random() * albumTitles.length)]
    const title = songTitles[Math.floor(Math.random() * songTitles.length)]
    const key = keys[Math.floor(Math.random() * keys.length)]

    // BPMを ジャンルに基づいて調整
    let bpm = 120
    if (genre.includes('Electronic') || genre.includes('EDM') || genre.includes('House') || genre.includes('Techno')) {
      bpm = 120 + Math.floor(Math.random() * 60) // 120-180
    } else if (genre.includes('Hip-Hop') || genre.includes('Rap')) {
      bpm = 80 + Math.floor(Math.random() * 40) // 80-120
    } else if (genre.includes('Jazz') || genre.includes('Blues')) {
      bpm = 60 + Math.floor(Math.random() * 40) // 60-100
    } else if (genre.includes('Rock') || genre.includes('Metal')) {
      bpm = 100 + Math.floor(Math.random() * 80) // 100-180
    } else if (genre.includes('Classical')) {
      bpm = 60 + Math.floor(Math.random() * 60) // 60-120
    } else {
      bpm = 80 + Math.floor(Math.random() * 60) // 80-140
    }

    // エネルギー・ダンス・感情をジャンルに基づいて調整
    let energy = 0.5
    let danceability = 0.5
    let valence = 0.5

    if (genre.includes('Electronic') || genre.includes('EDM') || genre.includes('House')) {
      energy = 0.7 + Math.random() * 0.3
      danceability = 0.8 + Math.random() * 0.2
      valence = 0.6 + Math.random() * 0.4
    } else if (genre.includes('Jazz') || genre.includes('Classical')) {
      energy = 0.2 + Math.random() * 0.4
      danceability = 0.1 + Math.random() * 0.3
      valence = 0.3 + Math.random() * 0.4
    } else if (genre.includes('Rock') || genre.includes('Metal')) {
      energy = 0.7 + Math.random() * 0.3
      danceability = 0.3 + Math.random() * 0.4
      valence = 0.5 + Math.random() * 0.3
    } else if (genre.includes('Hip-Hop') || genre.includes('Rap')) {
      energy = 0.6 + Math.random() * 0.4
      danceability = 0.7 + Math.random() * 0.3
      valence = 0.4 + Math.random() * 0.6
    } else {
      energy = 0.3 + Math.random() * 0.6
      danceability = 0.3 + Math.random() * 0.6
      valence = 0.3 + Math.random() * 0.7
    }

    // リリース日を過去3年間でランダムに設定
    const startDate = new Date('2022-01-01')
    const endDate = new Date('2024-12-31')
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
    
    // 人気度をジャンルと年代に基づいて調整
    let popularity = 50 + Math.floor(Math.random() * 50)
    if (randomDate.getFullYear() === 2024) {
      popularity += 10 // 新しい楽曲はより人気
    }
    if (genre.includes('Pop') || genre.includes('J-Pop') || genre.includes('K-Pop')) {
      popularity += 15 // ポップスは人気が高い
    }

    // 長さをジャンルに基づいて調整
    let duration = 180000 // 3分デフォルト
    if (genre.includes('Classical')) {
      duration = 300000 + Math.random() * 300000 // 5-10分
    } else if (genre.includes('Electronic') || genre.includes('EDM')) {
      duration = 240000 + Math.random() * 120000 // 4-6分
    } else {
      duration = 150000 + Math.random() * 150000 // 2.5-5分
    }

    const track: EnhancedTrack = {
      id: `mock_${i + 1}`,
      spotifyId: `spotify_mock_${i + 1}`,
      appleMusicId: `apple_mock_${i + 1}`,
      title: `${title} ${i > songTitles.length ? `(${Math.floor(i / songTitles.length) + 1})` : ''}`,
      artist,
      album,
      duration: Math.floor(duration),
      artworkUrl: `https://picsum.photos/300/300?random=${i + 100}&blur=1`,
      previewUrl: `https://example.com/preview${i + 1}.mp3`,
      externalUrl: `https://music.example.com/track/${i + 1}`,
      genre: genre === secondaryGenre ? [genre] : [genre, secondaryGenre],
      mood: mood1 === mood2 ? [mood1] : [mood1, mood2],
      bpm,
      key,
      energy: Math.round(energy * 100) / 100,
      danceability: Math.round(danceability * 100) / 100,
      valence: Math.round(valence * 100) / 100,
      releaseDate: randomDate.toISOString().split('T')[0],
      popularity: Math.min(100, Math.max(0, popularity)),
      createdAt: new Date().toISOString()
    }

    tracks.push(track)
  }

  return tracks.sort((a, b) => b.popularity - a.popularity) // 人気順でソート
}

// 大幅に拡充されたモックデータ（250曲）
const enhancedMockTracks: EnhancedTrack[] = generateExtensiveMockTracks()

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
  },

  // === 統合APIレイヤー ===
  
  // サービス設定・優先度管理
  serviceConfig: {
    spotify: { enabled: true, priority: 1, weight: 0.6 },
    appleMusic: { enabled: true, priority: 2, weight: 0.4 }
  },

  // キャッシュシステム（メモリベース）
  cache: new Map<string, { data: unknown; timestamp: number; ttl: number }>(),

  // レート制限管理
  rateLimitState: {
    spotify: { requests: 0, resetTime: Date.now(), limit: 100 }, // 100 requests per hour
    appleMusic: { requests: 0, resetTime: Date.now(), limit: 1000 }, // 1000 requests per hour
    lastRequestTimes: new Map<string, number>(),
    minRequestInterval: 100 // minimum 100ms between requests
  },

  // エラー統計・ログ
  errorStats: {
    totalErrors: 0,
    errorsByService: { spotify: 0, appleMusic: 0, unified: 0 },
    errorsByType: { network: 0, auth: 0, rateLimit: 0, timeout: 0, unknown: 0 },
    lastErrors: [] as Array<{ timestamp: number; service: string; type: string; message: string }>
  },

  // キャッシュヘルパー
  getFromCache: function<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data as T
  },

  setCache: function<T>(key: string, data: T, ttlMs: number = 300000) { // 5分デフォルト
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  },

  clearCache: function() {
    this.cache.clear()
  },

  // レート制限チェック・管理
  checkRateLimit: function(service: 'spotify' | 'appleMusic'): { allowed: boolean; waitTime?: number } {
    const now = Date.now()
    const serviceLimit = this.rateLimitState[service]
    
    // 1時間ごとにリクエスト数をリセット
    if (now > serviceLimit.resetTime + 3600000) { // 1 hour
      serviceLimit.requests = 0
      serviceLimit.resetTime = now
    }
    
    // リクエスト制限チェック
    if (serviceLimit.requests >= serviceLimit.limit) {
      const waitTime = serviceLimit.resetTime + 3600000 - now
      return { allowed: false, waitTime }
    }
    
    // 最小間隔チェック
    const lastRequestKey = `${service}_last_request`
    const lastRequestTime = this.rateLimitState.lastRequestTimes.get(lastRequestKey) || 0
    const timeSinceLastRequest = now - lastRequestTime
    
    if (timeSinceLastRequest < this.rateLimitState.minRequestInterval) {
      return { 
        allowed: false, 
        waitTime: this.rateLimitState.minRequestInterval - timeSinceLastRequest 
      }
    }
    
    return { allowed: true }
  },

  recordRequest: function(service: 'spotify' | 'appleMusic') {
    const now = Date.now()
    this.rateLimitState[service].requests++
    this.rateLimitState.lastRequestTimes.set(`${service}_last_request`, now)
  },

  // エラーハンドリング・ログ
  logError: function(service: string, error: unknown, context?: string) {
    const now = Date.now()
    let errorType = 'unknown'
    let errorMessage = 'Unknown error'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // エラータイプの判定
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorType = 'rateLimit'
      } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('unauthorized')) {
        errorType = 'auth'
      } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        errorType = 'timeout'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorType = 'network'
      }
    }
    
    // 統計更新
    this.errorStats.totalErrors++
    this.errorStats.errorsByService[service as keyof typeof this.errorStats.errorsByService]++
    this.errorStats.errorsByType[errorType as keyof typeof this.errorStats.errorsByType]++
    
    // 最新エラーログ（最大50件）
    this.errorStats.lastErrors.unshift({
      timestamp: now,
      service,
      type: errorType,
      message: context ? `${context}: ${errorMessage}` : errorMessage
    })
    
    if (this.errorStats.lastErrors.length > 50) {
      this.errorStats.lastErrors.pop()
    }
    
    // コンソールログ（開発環境のみ詳細出力）
    if (import.meta.env.DEV) {
      console.error(`[${service}] ${errorType.toUpperCase()}: ${errorMessage}`, {
        context,
        timestamp: new Date(now).toISOString(),
        error
      })
    } else {
      console.warn(`API Error [${service}]: ${errorMessage}`)
    }
  },

  // リトライロジック（指数バックオフ）
  retryWithBackoff: async function<T>(
    operation: () => Promise<T>,
    service: string,
    options: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      retryCondition?: (error: unknown) => boolean
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = (error) => {
        if (error instanceof Error) {
          // 一時的なエラーの場合のみリトライ
          return error.message.includes('429') || 
                 error.message.includes('timeout') ||
                 error.message.includes('network') ||
                 error.message.includes('500') ||
                 error.message.includes('503')
        }
        return false
      }
    } = options

    let lastError: unknown
    
    for (let attempt = 0; attempt < maxRetries + 1; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
        
        return await operation()
      } catch (error) {
        lastError = error
        
        // 最後の試行の場合、またはリトライ条件を満たさない場合は諦める
        if (attempt === maxRetries || !retryCondition(error)) {
          this.logError(service, error, `Final attempt failed (${attempt + 1}/${maxRetries + 1})`)
          break
        }
        
        this.logError(service, error, `Retry attempt ${attempt + 1}/${maxRetries + 1}`)
      }
    }
    
    throw lastError
  },

  // 回路ブレーカーパターン（サービス障害時の自動フォールバック）
  circuitBreakerState: {
    spotify: { failures: 0, lastFailTime: 0, state: 'closed' }, // closed, open, half-open
    appleMusic: { failures: 0, lastFailTime: 0, state: 'closed' }
  },

  checkCircuitBreaker: function(service: 'spotify' | 'appleMusic'): boolean {
    const breaker = this.circuitBreakerState[service]
    const now = Date.now()
    const recoveryTimeout = 60000 // 1分後に復旧試行
    
    switch (breaker.state) {
      case 'closed':
        return true
        
      case 'open':
        if (now - breaker.lastFailTime > recoveryTimeout) {
          breaker.state = 'half-open'
          return true
        }
        return false
        
      case 'half-open':
        return true
        
      default:
        return true
    }
  },

  recordCircuitBreakerResult: function(service: 'spotify' | 'appleMusic', success: boolean) {
    const breaker = this.circuitBreakerState[service]
    
    if (success) {
      breaker.failures = 0
      breaker.state = 'closed'
    } else {
      breaker.failures++
      breaker.lastFailTime = Date.now()
      
      if (breaker.failures >= 5) {
        breaker.state = 'open'
        this.logError(service, new Error('Circuit breaker opened due to repeated failures'), 'Circuit Breaker')
      }
    }
  },

  // エラー統計取得
  getErrorStats: function() {
    return {
      ...this.errorStats,
      rateLimitStats: {
        spotify: {
          requests: this.rateLimitState.spotify.requests,
          limit: this.rateLimitState.spotify.limit,
          resetTime: this.rateLimitState.spotify.resetTime
        },
        appleMusic: {
          requests: this.rateLimitState.appleMusic.requests,
          limit: this.rateLimitState.appleMusic.limit,
          resetTime: this.rateLimitState.appleMusic.resetTime
        }
      },
      circuitBreakerStats: this.circuitBreakerState
    }
  },

  // エラー統計リセット
  resetErrorStats: function() {
    this.errorStats.totalErrors = 0
    this.errorStats.errorsByService = { spotify: 0, appleMusic: 0, unified: 0 }
    this.errorStats.errorsByType = { network: 0, auth: 0, rateLimit: 0, timeout: 0, unknown: 0 }
    this.errorStats.lastErrors = []
  },

  // 複数サービス統合検索
  multiServiceSearch: async function(params: {
    query: string
    limit?: number
    services?: ('spotify' | 'appleMusic')[]
    mergeResults?: boolean
  }): Promise<{ 
    tracks: Track[]
    sources: { spotify?: Track[]; appleMusic?: Track[] }
    total: number
    fromCache?: boolean
  }> {
    const { query, limit = 20, services = ['spotify', 'appleMusic'], mergeResults = true } = params
    const cacheKey = `multi_search_${query}_${limit}_${services.join(',')}_${mergeResults}`
    
    // キャッシュチェック
    const cached = this.getFromCache<{ tracks: Track[]; sources: Record<string, Track[]>; total: number }>(cacheKey)
    if (cached) {
      return { ...cached, fromCache: true }
    }

    const sources: { spotify?: Track[]; appleMusic?: Track[] } = {}
    const searchPromises: Promise<void>[] = []

    // Spotify検索（レート制限・エラーハンドリング付き）
    if (services.includes('spotify') && this.serviceConfig.spotify.enabled) {
      const spotifyPromise = (async () => {
        // 回路ブレーカーチェック
        if (!this.checkCircuitBreaker('spotify')) {
          this.logError('spotify', new Error('Circuit breaker is open'), 'multiServiceSearch')
          sources.spotify = []
          return
        }

        try {
          if (import.meta.env.DEV) {
            // 開発環境：モック実装
            const mockSpotifyTracks = enhancedMockTracks
              .filter(track => 
                track.title.toLowerCase().includes(query.toLowerCase()) ||
                track.artist.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, Math.ceil(limit * this.serviceConfig.spotify.weight))
              .map(track => ({ ...track, source: 'spotify' as const }))
            sources.spotify = mockSpotifyTracks
            this.recordCircuitBreakerResult('spotify', true)
          } else {
            // 本番環境：レート制限チェック
            const rateLimitCheck = this.checkRateLimit('spotify')
            if (!rateLimitCheck.allowed) {
              throw new Error(`Rate limit exceeded. Wait ${rateLimitCheck.waitTime}ms`)
            }

            // リトライ付きでSpotify API実行
            const spotifyResult = await this.retryWithBackoff(
              async () => {
                this.recordRequest('spotify')
                return await spotifyAPI.search({
                  query,
                  type: 'track',
                  limit: Math.ceil(limit * this.serviceConfig.spotify.weight)
                })
              },
              'spotify',
              { maxRetries: 2, baseDelay: 500 }
            )
            
            sources.spotify = spotifyResult.tracks?.items.map(item => ({
              id: `spotify_${item.id}`,
              spotifyId: item.id,
              title: item.name,
              artist: item.artists.map(a => a.name).join(', '),
              album: item.album.name,
              duration: item.duration_ms,
              artworkUrl: item.album.images[0]?.url,
              previewUrl: item.preview_url || undefined,
              externalUrl: item.external_urls.spotify,
              createdAt: new Date().toISOString(),
              source: 'spotify' as const
            } as Track & { source: string })) || []
            
            this.recordCircuitBreakerResult('spotify', true)
          }
        } catch (error) {
          this.logError('spotify', error, 'multiServiceSearch')
          this.recordCircuitBreakerResult('spotify', false)
          sources.spotify = []
        }
      })()
      searchPromises.push(spotifyPromise)
    }

    // Apple Music検索（レート制限・エラーハンドリング付き）
    if (services.includes('appleMusic') && this.serviceConfig.appleMusic.enabled) {
      const appleMusicPromise = (async () => {
        // 回路ブレーカーチェック
        if (!this.checkCircuitBreaker('appleMusic')) {
          this.logError('appleMusic', new Error('Circuit breaker is open'), 'multiServiceSearch')
          sources.appleMusic = []
          return
        }

        try {
          // レート制限チェック（開発環境以外）
          if (!import.meta.env.DEV) {
            const rateLimitCheck = this.checkRateLimit('appleMusic')
            if (!rateLimitCheck.allowed) {
              throw new Error(`Rate limit exceeded. Wait ${rateLimitCheck.waitTime}ms`)
            }
          }

          // リトライ付きでApple Music API実行
          const appleMusicTracks = await this.retryWithBackoff(
            async () => {
              if (!import.meta.env.DEV) {
                this.recordRequest('appleMusic')
              }
              return await appleMusicAPI.searchUnified(
                query, 
                Math.ceil(limit * this.serviceConfig.appleMusic.weight)
              )
            },
            'appleMusic',
            { maxRetries: 2, baseDelay: 1000 }
          )
          
          sources.appleMusic = appleMusicTracks.map(track => ({
            ...track,
            id: `apple_${track.id}`,
            source: 'appleMusic' as const
          } as Track & { source: string }))
          
          this.recordCircuitBreakerResult('appleMusic', true)
        } catch (error) {
          this.logError('appleMusic', error, 'multiServiceSearch')
          this.recordCircuitBreakerResult('appleMusic', false)
          sources.appleMusic = []
        }
      })()
      searchPromises.push(appleMusicPromise)
    }

    // 全検索完了まで待機
    await Promise.all(searchPromises)

    let finalTracks: Track[] = []
    
    if (mergeResults) {
      // 結果マージと重複除去
      const allTracks = [
        ...(sources.spotify || []),
        ...(sources.appleMusic || [])
      ] as (Track & { source: string })[]

      // 類似楽曲の重複除去（タイトルとアーティストの類似性で判定）
      const uniqueTracks = new Map<string, Track & { source: string }>()
      
      for (const track of allTracks) {
        const normalizedKey = `${track.title.toLowerCase().trim()}_${track.artist.toLowerCase().trim()}`
        
        if (!uniqueTracks.has(normalizedKey)) {
          uniqueTracks.set(normalizedKey, track)
        } else {
          // 既存の楽曲と比較して、より高い優先度のサービスの楽曲を保持
          const existingTrack = uniqueTracks.get(normalizedKey)!
          const currentPriority = this.serviceConfig[track.source as keyof typeof this.serviceConfig]?.priority || 999
          const existingPriority = this.serviceConfig[existingTrack.source as keyof typeof this.serviceConfig]?.priority || 999
          
          if (currentPriority < existingPriority) {
            uniqueTracks.set(normalizedKey, track)
          }
        }
      }

      finalTracks = Array.from(uniqueTracks.values())
        .sort((a, b) => {
          // サービス優先度でソート
          const aPriority = this.serviceConfig[a.source as keyof typeof this.serviceConfig]?.priority || 999
          const bPriority = this.serviceConfig[b.source as keyof typeof this.serviceConfig]?.priority || 999
          return aPriority - bPriority
        })
        .slice(0, limit)
    } else {
      // 結果を分離して返却（マージしない）
      finalTracks = [
        ...(sources.spotify || []).slice(0, Math.ceil(limit / 2)),
        ...(sources.appleMusic || []).slice(0, Math.ceil(limit / 2))
      ].slice(0, limit)
    }

    const result = {
      tracks: finalTracks,
      sources,
      total: finalTracks.length
    }

    // 結果をキャッシュ
    this.setCache(cacheKey, result, 180000) // 3分キャッシュ

    return result
  },

  // サービス別詳細検索
  serviceSpecificSearch: async function(params: {
    query: string
    service: 'spotify' | 'appleMusic'
    searchType?: 'track' | 'artist' | 'album' | 'all'
    limit?: number
  }): Promise<{
    tracks?: Track[]
    artists?: unknown[]
    albums?: unknown[]
    source: string
  }> {
    const { query, service, searchType = 'track', limit = 20 } = params
    const cacheKey = `${service}_search_${query}_${searchType}_${limit}`
    
    const cached = this.getFromCache<{
      tracks?: Track[]
      artists?: unknown[]
      albums?: unknown[]
      source: string
    }>(cacheKey)
    if (cached) return cached

    const result: {
      tracks?: Track[]
      artists?: unknown[]
      albums?: unknown[]
      source: string
    } = { source: service }

    try {
      if (service === 'spotify') {
        if (searchType === 'track' || searchType === 'all') {
          const spotifyResult = await spotifyAPI.search({ query, type: 'track', limit })
          result.tracks = spotifyResult.tracks?.items.map(item => ({
            id: `spotify_${item.id}`,
            spotifyId: item.id,
            title: item.name,
            artist: item.artists.map(a => a.name).join(', '),
            album: item.album.name,
            duration: item.duration_ms,
            artworkUrl: item.album.images[0]?.url,
            previewUrl: item.preview_url || undefined,
            externalUrl: item.external_urls.spotify,
            createdAt: new Date().toISOString()
          } as Track)) || []
        }
        
        if (searchType === 'artist' || searchType === 'all') {
          const artistResult = await spotifyAPI.search({ query, type: 'artist', limit })
          result.artists = artistResult.artists?.items || []
        }
        
        if (searchType === 'album' || searchType === 'all') {
          const albumResult = await spotifyAPI.search({ query, type: 'album', limit })
          result.albums = albumResult.albums?.items || []
        }
      } else if (service === 'appleMusic') {
        if (searchType === 'track' || searchType === 'all') {
          result.tracks = await appleMusicAPI.searchUnified(query, limit)
        }
        
        if (searchType === 'artist' || searchType === 'album' || searchType === 'all') {
          const appleMusicResult = await appleMusicAPI.advancedSearch({
            term: query,
            types: searchType === 'all' ? ['songs', 'artists', 'albums'] : [searchType === 'artist' ? 'artists' : 'albums'],
            limit
          })
          
          if (searchType === 'artist' || searchType === 'all') {
            result.artists = appleMusicResult.results.artists?.data || []
          }
          
          if (searchType === 'album' || searchType === 'all') {
            result.albums = appleMusicResult.results.albums?.data || []
          }
        }
      }
    } catch (error) {
      console.error(`${service} search failed:`, error)
      result.tracks = []
      result.artists = []
      result.albums = []
    }

    // キャッシュ
    this.setCache(cacheKey, result, 240000) // 4分キャッシュ
    
    return result
  },

  // サービス優先度設定更新
  updateServiceConfig: function(serviceId: 'spotify' | 'appleMusic', config: { 
    enabled?: boolean
    priority?: number
    weight?: number
  }) {
    if (this.serviceConfig[serviceId]) {
      this.serviceConfig[serviceId] = {
        ...this.serviceConfig[serviceId],
        ...config
      }
      
      // 設定変更時にキャッシュをクリア
      this.clearCache()
    }
  },

  // サービス接続状態チェック
  checkServiceConnections: async function(): Promise<{
    spotify: { connected: boolean; authenticated: boolean }
    appleMusic: { connected: boolean; authenticated: boolean }
  }> {
    const results = {
      spotify: { connected: false, authenticated: false },
      appleMusic: { connected: false, authenticated: false }
    }

    try {
      // Spotify接続チェック
      const spotifyToken = spotifyAPI.getStoredAccessToken()
      results.spotify.authenticated = !!spotifyToken
      results.spotify.connected = !!spotifyToken || import.meta.env.DEV
    } catch (error) {
      console.warn('Spotify connection check failed:', error)
    }

    try {
      // Apple Music接続チェック
      results.appleMusic.connected = await appleMusicAPI.checkConnection()
      results.appleMusic.authenticated = appleMusicAPI.isAuthorized()
    } catch (error) {
      console.warn('Apple Music connection check failed:', error)
    }

    return results
  },

  // 統合おすすめシステム
  getMultiServiceRecommendations: async function(params?: {
    seedTracks?: string[]
    genres?: string[]
    limit?: number
    services?: ('spotify' | 'appleMusic')[]
  }): Promise<{
    tracks: Track[]
    sources: { spotify?: Track[]; appleMusic?: Track[] }
    total: number
  }> {
    const { limit = 20, services = ['spotify', 'appleMusic'] } = params || {}
    const cacheKey = `multi_recommendations_${JSON.stringify(params)}`
    
    const cached = this.getFromCache<{
      tracks: Track[]
      sources: { spotify?: Track[]; appleMusic?: Track[] }
      total: number
    }>(cacheKey)
    if (cached) return cached

    const sources: { spotify?: Track[]; appleMusic?: Track[] } = {}
    const recommendationPromises: Promise<void>[] = []

    // Spotifyおすすめ取得
    if (services.includes('spotify') && this.serviceConfig.spotify.enabled) {
      const spotifyPromise = (async () => {
        try {
          // 開発環境ではモックデータを使用
          if (import.meta.env.DEV) {
            const mockRecommendations = enhancedMockTracks
              .filter(track => !params?.genres || 
                params.genres.some(g => track.genre.some(tg => tg.toLowerCase().includes(g.toLowerCase()))))
              .sort(() => Math.random() - 0.5)
              .slice(0, Math.ceil(limit * this.serviceConfig.spotify.weight))
            sources.spotify = mockRecommendations
          } else {
            // 本番環境でのSpotify APIを使用した実装
            sources.spotify = []
          }
        } catch (error) {
          console.warn('Spotify recommendations failed:', error)
          sources.spotify = []
        }
      })()
      recommendationPromises.push(spotifyPromise)
    }

    // Apple Musicおすすめ取得
    if (services.includes('appleMusic') && this.serviceConfig.appleMusic.enabled) {
      const appleMusicPromise = (async () => {
        try {
          const recommendations = await appleMusicAPI.getRecommendations()
          sources.appleMusic = Array.isArray(recommendations) 
            ? recommendations.slice(0, Math.ceil(limit * this.serviceConfig.appleMusic.weight))
            : []
        } catch (error) {
          console.warn('Apple Music recommendations failed:', error)
          sources.appleMusic = []
        }
      })()
      recommendationPromises.push(appleMusicPromise)
    }

    await Promise.all(recommendationPromises)

    // 結果のマージ
    const allTracks = [
      ...(sources.spotify || []),
      ...(sources.appleMusic || [])
    ]

    const result = {
      tracks: allTracks.slice(0, limit),
      sources,
      total: allTracks.length
    }

    this.setCache(cacheKey, result, 300000) // 5分キャッシュ
    
    return result
  }
}

export default musicApi