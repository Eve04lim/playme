// src/api/music.ts
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

// モックデータ
const mockTracks: Track[] = [
  {
    id: '1',
    spotifyId: 'spotify-1',
    title: '夜明けのメロディー',
    artist: '山田太郎',
    album: 'Morning Songs',
    duration: 240000,
    artworkUrl: 'https://picsum.photos/300/300?random=1',
    previewUrl: 'https://example.com/preview1.mp3'
  },
  {
    id: '2',
    appleMusicId: 'apple-2',
    title: 'Urban Dreams',
    artist: 'City Lights',
    album: 'Metropolitan',
    duration: 180000,
    artworkUrl: 'https://picsum.photos/300/300?random=2',
    previewUrl: 'https://example.com/preview2.mp3'
  },
  {
    id: '3',
    spotifyId: 'spotify-3',
    title: '静寂の中で',
    artist: '田中花子',
    album: 'Quiet Moments',
    duration: 210000,
    artworkUrl: 'https://picsum.photos/300/300?random=3',
    previewUrl: 'https://example.com/preview3.mp3'
  },
  {
    id: '4',
    title: 'Electric Pulse',
    artist: 'Neon Wave',
    album: 'Synthwave Collection',
    duration: 195000,
    artworkUrl: 'https://picsum.photos/300/300?random=4',
    previewUrl: 'https://example.com/preview4.mp3'
  },
  {
    id: '5',
    title: '風のうた',
    artist: '森の歌声',
    album: 'Nature Sounds',
    duration: 225000,
    artworkUrl: 'https://picsum.photos/300/300?random=5',
    previewUrl: 'https://example.com/preview5.mp3'
  }
]

const mockPlaylists: Playlist[] = [
  {
    id: '1',
    userId: 'current-user-id',
    name: 'お気に入り',
    description: 'よく聴く曲のコレクション',
    isPublic: false,
    tracks: mockTracks.slice(0, 3),
    trackCount: 3,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    userId: 'current-user-id',
    name: 'ワークアウト',
    description: 'エクササイズ用の音楽',
    isPublic: true,
    tracks: mockTracks.slice(2, 4),
    trackCount: 2,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z'
  }
]

export const musicApi = {
  // 楽曲検索
  searchTracks: async (searchRequest: SearchRequest): Promise<SearchResponse> => {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const query = searchRequest.query.toLowerCase()
          const filteredTracks = mockTracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query) ||
            track.album?.toLowerCase().includes(query)
          )
          
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

    const response = await apiClient.get<SearchResponse>('/music/search', searchRequest as Record<string, unknown>)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Search failed')
    }
    return response.data
  },

  // 楽曲詳細取得
  getTrack: async (trackId: string): Promise<Track> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const track = mockTracks.find(t => t.id === trackId)
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

  // おすすめ楽曲取得
  getRecommendations: async (limit: number = 10): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // ランダムにシャッフルしたモック楽曲を返す
          const shuffled = [...mockTracks].sort(() => Math.random() - 0.5)
          resolve(shuffled.slice(0, limit))
        }, 1000)
      })
    }

    const response = await apiClient.get<Track[]>('/music/recommendations', { limit })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get recommendations')
    }
    return response.data
  },

  // プレイリスト一覧取得
  getPlaylists: async (): Promise<Playlist[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockPlaylists)
        }, 1000)
      })
    }

    const response = await apiClient.get<Playlist[]>('/music/playlists')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get playlists')
    }
    return response.data
  },

  // プレイリスト詳細取得
  getPlaylist: async (playlistId: string): Promise<Playlist> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlist = mockPlaylists.find(p => p.id === playlistId)
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

  // プレイリスト作成
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
          mockPlaylists.push(newPlaylist)
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

  // プレイリスト更新
  updatePlaylist: async (playlistId: string, updates: UpdatePlaylistRequest): Promise<Playlist> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlistIndex = mockPlaylists.findIndex(p => p.id === playlistId)
          if (playlistIndex >= 0) {
            mockPlaylists[playlistIndex] = {
              ...mockPlaylists[playlistIndex],
              ...updates,
              updatedAt: new Date().toISOString()
            }
            resolve(mockPlaylists[playlistIndex])
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

  // プレイリスト削除
  deletePlaylist: async (playlistId: string): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlistIndex = mockPlaylists.findIndex(p => p.id === playlistId)
          if (playlistIndex >= 0) {
            mockPlaylists.splice(playlistIndex, 1)
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

  // プレイリストに楽曲追加
  addTrackToPlaylist: async (data: AddTrackToPlaylistRequest): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlist = mockPlaylists.find(p => p.id === data.playlistId)
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

  // プレイリストから楽曲削除
  removeTrackFromPlaylist: async (playlistId: string, trackId: string): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlist = mockPlaylists.find(p => p.id === playlistId)
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

  // プレイリスト楽曲順序変更
  reorderPlaylistTracks: async (playlistId: string, trackIds: string[]): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const playlist = mockPlaylists.find(p => p.id === playlistId)
          if (playlist) {
            // 指定された順序で楽曲を並び替え
            const reorderedTracks = trackIds.map(id => 
              playlist.tracks.find(t => t.id === id)
            ).filter(Boolean) as Track[]
            
            playlist.tracks = reorderedTracks
            playlist.updatedAt = new Date().toISOString()
            resolve()
          } else {
            reject(new Error('Playlist not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.put(`/music/playlists/${playlistId}/reorder`, {
      trackIds
    })
    if (!response.success) {
      throw new Error(response.error || 'Failed to reorder tracks')
    }
  },

  // 人気楽曲取得
  getTrendingTracks: async (limit: number = 20): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // モック人気楽曲（ランダムにソート）
          const trending = [...mockTracks]
            .sort(() => Math.random() - 0.5)
            .slice(0, limit)
          resolve(trending)
        }, 1000)
      })
    }

    const response = await apiClient.get<Track[]>('/music/trending', { limit })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get trending tracks')
    }
    return response.data
  },

  // アーティスト楽曲取得
  getArtistTracks: async (artistName: string, limit: number = 20): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const artistTracks = mockTracks.filter(track =>
            track.artist.toLowerCase().includes(artistName.toLowerCase())
          ).slice(0, limit)
          resolve(artistTracks)
        }, 800)
      })
    }

    const response = await apiClient.get<Track[]>('/music/artists/tracks', {
      artist: artistName,
      limit
    })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get artist tracks')
    }
    return response.data
  },

  // アルバム楽曲取得
  getAlbumTracks: async (albumName: string): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const albumTracks = mockTracks.filter(track =>
            track.album?.toLowerCase().includes(albumName.toLowerCase())
          )
          resolve(albumTracks)
        }, 800)
      })
    }

    const response = await apiClient.get<Track[]>('/music/albums/tracks', {
      album: albumName
    })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get album tracks')
    }
    return response.data
  },

  // 楽曲統計取得
  getTrackStats: async (trackId: string): Promise<{
    playCount: number
    likeCount: number
    isLiked: boolean
  }> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            playCount: Math.floor(Math.random() * 10000),
            likeCount: Math.floor(Math.random() * 1000),
            isLiked: Math.random() > 0.5
          })
        }, 500)
      })
    }

    const response = await apiClient.get<{
      playCount: number
      likeCount: number
      isLiked: boolean
    }>(`/music/tracks/${trackId}/stats`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get track stats')
    }
    return response.data
  },

  // 楽曲をお気に入りに追加/削除
  toggleTrackLike: async (trackId: string): Promise<{ isLiked: boolean }> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            isLiked: Math.random() > 0.5
          })
        }, 500)
      })
    }

    const response = await apiClient.post<{ isLiked: boolean }>(`/music/tracks/${trackId}/like`)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to toggle track like')
    }
    return response.data
  },

  // 再生履歴追加
  addToPlayHistory: async (trackId: string): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Added track ${trackId} to play history`)
          resolve()
        }, 200)
      })
    }

    const response = await apiClient.post('/music/history', { trackId })
    if (!response.success) {
      throw new Error(response.error || 'Failed to add to play history')
    }
  },

  // 再生履歴取得
  getPlayHistory: async (limit: number = 50): Promise<Track[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // モック再生履歴（最近再生した楽曲）
          const history = [...mockTracks]
            .sort(() => Math.random() - 0.5)
            .slice(0, limit)
          resolve(history)
        }, 800)
      })
    }

    const response = await apiClient.get<Track[]>('/music/history', { limit })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get play history')
    }
    return response.data
  }
}

export default musicApi