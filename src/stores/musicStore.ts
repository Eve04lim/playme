// src/stores/musicStore.ts
import { create } from 'zustand'
import type {
    AddTrackToPlaylistRequest,
    CreatePlaylistRequest,
    PlayerState,
    Playlist,
    SearchRequest,
    SearchResponse,
    Track
} from '../types'

interface MusicState extends PlayerState {
  // プレイリスト関連
  playlists: Playlist[]
  playlistsLoading: boolean
  
  // 検索関連
  searchResults: Track[]
  searchLoading: boolean
  searchQuery: string
  
  // エラー状態
  error: string | null

  // プレイリスト操作
  createPlaylist: (data: CreatePlaylistRequest) => Promise<Playlist>
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  loadPlaylists: () => Promise<void>
  
  // 楽曲操作
  addTrackToPlaylist: (data: AddTrackToPlaylistRequest) => Promise<void>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
  searchTracks: (request: SearchRequest) => Promise<void>
  
  // プレイヤー操作
  playTrack: (track: Track, playlist?: Playlist) => void
  pauseTrack: () => void
  resumeTrack: () => void
  nextTrack: () => void
  previousTrack: () => void
  setVolume: (volume: number) => void
  setCurrentTime: (time: number) => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  addToQueue: (track: Track) => void
  clearQueue: () => void
  
  // ユーティリティ
  clearError: () => void
  clearSearchResults: () => void
}

// モックデータ
const mockTracks: Track[] = [
  {
    id: '1',
    title: '夜明けのメロディー',
    artist: '山田太郎',
    album: 'Morning Songs',
    duration: 240000,
    artworkUrl: 'https://picsum.photos/300/300?random=1',
    previewUrl: 'https://example.com/preview1.mp3'
  },
  {
    id: '2',
    title: 'Urban Dreams',
    artist: 'City Lights',
    album: 'Metropolitan',
    duration: 180000,
    artworkUrl: 'https://picsum.photos/300/300?random=2',
    previewUrl: 'https://example.com/preview2.mp3'
  },
  {
    id: '3',
    title: '静寂の中で',
    artist: '田中花子',
    album: 'Quiet Moments',
    duration: 210000,
    artworkUrl: 'https://picsum.photos/300/300?random=3',
    previewUrl: 'https://example.com/preview3.mp3'
  }
]

// モック API 関数
const mockSearchApi = async (request: SearchRequest): Promise<SearchResponse> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filteredTracks = mockTracks.filter(track =>
        track.title.toLowerCase().includes(request.query.toLowerCase()) ||
        track.artist.toLowerCase().includes(request.query.toLowerCase())
      )
      
      resolve({
        tracks: filteredTracks,
        total: filteredTracks.length
      })
    }, 800)
  })
}

const mockCreatePlaylistApi = async (data: CreatePlaylistRequest): Promise<Playlist> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: Date.now().toString(),
        userId: 'current-user-id',
        name: data.name,
        description: data.description,
        isPublic: data.isPublic || false,
        tracks: [],
        trackCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }, 500)
  })
}

export const useMusicStore = create<MusicState>()((set, get) => ({
  // プレイヤー状態
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'none',
  queue: [],
  queueIndex: 0,
  
  // その他の状態
  playlists: [],
  playlistsLoading: false,
  searchResults: [],
  searchLoading: false,
  searchQuery: '',
  error: null,

  // プレイリスト作成
  createPlaylist: async (data: CreatePlaylistRequest) => {
    set({ playlistsLoading: true, error: null })
    try {
      const playlist = await mockCreatePlaylistApi(data)
      set(state => ({
        playlists: [...state.playlists, playlist],
        playlistsLoading: false
      }))
      return playlist
    } catch (error) {
      set({
        playlistsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create playlist'
      })
      throw error
    }
  },

  // プレイリスト更新
  updatePlaylist: async (id: string, updates: Partial<Playlist>) => {
    set({ playlistsLoading: true, error: null })
    try {
      // API呼び出し（モック）
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        playlists: state.playlists.map(playlist =>
          playlist.id === id
            ? { ...playlist, ...updates, updatedAt: new Date().toISOString() }
            : playlist
        ),
        playlistsLoading: false
      }))
    } catch (error) {
      set({
        playlistsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update playlist'
      })
      throw error
    }
  },

  // プレイリスト削除
  deletePlaylist: async (id: string) => {
    set({ playlistsLoading: true, error: null })
    try {
      // API呼び出し（モック）
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        playlists: state.playlists.filter(playlist => playlist.id !== id),
        playlistsLoading: false
      }))
    } catch (error) {
      set({
        playlistsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete playlist'
      })
      throw error
    }
  },

  // プレイリスト読み込み
  loadPlaylists: async () => {
    set({ playlistsLoading: true, error: null })
    try {
      // API呼び出し（モック）
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // モックプレイリスト
      const mockPlaylists: Playlist[] = [
        {
          id: '1',
          userId: 'current-user-id',
          name: 'お気に入り',
          description: 'よく聴く曲のコレクション',
          isPublic: false,
          tracks: mockTracks.slice(0, 2),
          trackCount: 2,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        }
      ]
      
      set({
        playlists: mockPlaylists,
        playlistsLoading: false
      })
    } catch (error) {
      set({
        playlistsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load playlists'
      })
      throw error
    }
  },

  // 楽曲をプレイリストに追加
  addTrackToPlaylist: async (data: AddTrackToPlaylistRequest) => {
    try {
      // API呼び出し（モック）
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        playlists: state.playlists.map(playlist =>
          playlist.id === data.playlistId
            ? {
                ...playlist,
                tracks: [...playlist.tracks, { ...data.trackData, id: Date.now().toString() }],
                trackCount: playlist.trackCount + 1,
                updatedAt: new Date().toISOString()
              }
            : playlist
        )
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add track'
      })
      throw error
    }
  },

  // 楽曲をプレイリストから削除
  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      set(state => ({
        playlists: state.playlists.map(playlist =>
          playlist.id === playlistId
            ? {
                ...playlist,
                tracks: playlist.tracks.filter(track => track.id !== trackId),
                trackCount: playlist.trackCount - 1,
                updatedAt: new Date().toISOString()
              }
            : playlist
        )
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to remove track'
      })
      throw error
    }
  },

  // 楽曲検索
  searchTracks: async (request: SearchRequest) => {
    set({ searchLoading: true, searchQuery: request.query, error: null })
    try {
      const response = await mockSearchApi(request)
      set({
        searchResults: response.tracks,
        searchLoading: false
      })
    } catch (error) {
      set({
        searchLoading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      })
      throw error
    }
  },

  // 楽曲再生
  playTrack: (track: Track, playlist?: Playlist) => {
    let newQueue = [track]
    let queueIndex = 0

    if (playlist) {
      newQueue = playlist.tracks
      queueIndex = playlist.tracks.findIndex(t => t.id === track.id)
    }

    set({
      currentTrack: track,
      isPlaying: true,
      queue: newQueue,
      queueIndex: Math.max(0, queueIndex),
      currentTime: 0,
      duration: track.duration
    })
  },

  // 一時停止
  pauseTrack: () => {
    set({ isPlaying: false })
  },

  // 再開
  resumeTrack: () => {
    set({ isPlaying: true })
  },

  // 次の曲
  nextTrack: () => {
    const { queue, queueIndex, shuffle, repeat } = get()
    if (queue.length === 0) return

    let nextIndex = queueIndex + 1

    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
    } else if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        nextIndex = 0
      } else {
        return // 最後の曲で終了
      }
    }

    const nextTrack = queue[nextIndex]
    if (nextTrack) {
      set({
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        currentTime: 0,
        duration: nextTrack.duration
      })
    }
  },

  // 前の曲
  previousTrack: () => {
    const { queue, queueIndex } = get()
    if (queue.length === 0 || queueIndex <= 0) return

    const prevTrack = queue[queueIndex - 1]
    if (prevTrack) {
      set({
        currentTrack: prevTrack,
        queueIndex: queueIndex - 1,
        currentTime: 0,
        duration: prevTrack.duration
      })
    }
  },

  // ボリューム設定
  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(1, volume)) })
  },

  // 再生位置設定
  setCurrentTime: (time: number) => {
    const { duration } = get()
    set({ currentTime: Math.max(0, Math.min(duration, time)) })
  },

  // シャッフル切り替え
  toggleShuffle: () => {
    set(state => ({ shuffle: !state.shuffle }))
  },

  // リピート切り替え
  toggleRepeat: () => {
    set(state => ({
      repeat: state.repeat === 'none' ? 'all' : state.repeat === 'all' ? 'one' : 'none'
    }))
  },

  // キューに追加
  addToQueue: (track: Track) => {
    set(state => ({
      queue: [...state.queue, track]
    }))
  },

  // キューをクリア
  clearQueue: () => {
    set({
      queue: [],
      queueIndex: 0,
      currentTrack: null,
      isPlaying: false
    })
  },

  // エラークリア
  clearError: () => {
    set({ error: null })
  },

  // 検索結果クリア
  clearSearchResults: () => {
    set({
      searchResults: [],
      searchQuery: ''
    })
  }
}))