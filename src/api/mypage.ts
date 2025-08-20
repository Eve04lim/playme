// src/api/mypage.ts
import type {
    FavoriteLyric,
    MyPageColumn,
    MyPageSettings,
    MyPageTheme
} from '../types'
import { apiClient } from './client'

// モックデータ
const mockThemes: MyPageTheme[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    backgroundColor: '#121212',
    primaryColor: '#1db954',
    secondaryColor: '#191414',
    textColor: '#ffffff'
  },
  {
    id: 'purple',
    name: 'Purple Dream',
    backgroundColor: '#1a1625',
    primaryColor: '#8b5cf6',
    secondaryColor: '#2d1b69',
    textColor: '#f8fafc'
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    backgroundColor: '#0f1419',
    primaryColor: '#06b6d4',
    secondaryColor: '#0891b2',
    textColor: '#f0f9ff'
  }
]

const mockFavoriteLyrics: FavoriteLyric[] = [
  {
    id: '1',
    userId: 'current-user-id',
    trackId: '1',
    text: '音楽は心の言葉',
    artist: '山田太郎',
    songTitle: '夜明けのメロディー',
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    userId: 'current-user-id',
    trackId: '2',
    text: 'Every beat tells a story',
    artist: 'City Lights',
    songTitle: 'Urban Dreams',
    createdAt: '2025-01-02T00:00:00Z'
  }
]

export const myPageApi = {
  // マイページ設定取得
  getSettings: async (): Promise<MyPageSettings> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: '1',
            userId: 'current-user-id',
            theme: mockThemes[0],
            columns: [
              { id: '1', playlistId: '1', position: 0 },
              { id: '2', playlistId: '2', position: 1 },
              { id: '3', playlistId: '', position: 2 }
            ],
            showWaveform: true,
            showLyrics: true,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString()
          })
        }, 800)
      })
    }

    const response = await apiClient.get<MyPageSettings>('/mypage/settings')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get settings')
    }
    return response.data
  },

  // マイページ設定更新
  updateSettings: async (settings: Partial<MyPageSettings>): Promise<MyPageSettings> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const updatedSettings: MyPageSettings = {
            id: '1',
            userId: 'current-user-id',
            theme: settings.theme || mockThemes[0],
            columns: settings.columns || [],
            showWaveform: settings.showWaveform ?? true,
            showLyrics: settings.showLyrics ?? true,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString()
          }
          resolve(updatedSettings)
        }, 500)
      })
    }

    const response = await apiClient.put<MyPageSettings>('/mypage/settings', settings)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update settings')
    }
    return response.data
  },

  // テーマ一覧取得
  getAvailableThemes: async (): Promise<MyPageTheme[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockThemes)
        }, 500)
      })
    }

    const response = await apiClient.get<MyPageTheme[]>('/mypage/themes')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get themes')
    }
    return response.data
  },

  // カスタムテーマ作成
  createCustomTheme: async (theme: Omit<MyPageTheme, 'id'>): Promise<MyPageTheme> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const customTheme: MyPageTheme = {
            ...theme,
            id: `custom-${Date.now()}`
          }
          resolve(customTheme)
        }, 500)
      })
    }

    const response = await apiClient.post<MyPageTheme>('/mypage/themes', theme)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create custom theme')
    }
    return response.data
  },

  // カラム設定更新
  updateColumns: async (columns: MyPageColumn[]): Promise<MyPageColumn[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // 位置を正規化
          const normalizedColumns = columns.map((col, index) => ({
            ...col,
            position: index
          }))
          resolve(normalizedColumns)
        }, 500)
      })
    }

    const response = await apiClient.put<MyPageColumn[]>('/mypage/columns', { columns })
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update columns')
    }
    return response.data
  },

  // お気に入り歌詞一覧取得
  getFavoriteLyrics: async (): Promise<FavoriteLyric[]> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockFavoriteLyrics)
        }, 600)
      })
    }

    const response = await apiClient.get<FavoriteLyric[]>('/mypage/lyrics')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get favorite lyrics')
    }
    return response.data
  },

  // お気に入り歌詞追加
  addFavoriteLyric: async (lyric: Omit<FavoriteLyric, 'id' | 'userId' | 'createdAt'>): Promise<FavoriteLyric> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newLyric: FavoriteLyric = {
            ...lyric,
            id: Date.now().toString(),
            userId: 'current-user-id',
            createdAt: new Date().toISOString()
          }
          mockFavoriteLyrics.push(newLyric)
          resolve(newLyric)
        }, 500)
      })
    }

    const response = await apiClient.post<FavoriteLyric>('/mypage/lyrics', lyric)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to add favorite lyric')
    }
    return response.data
  },

  // お気に入り歌詞更新
  updateFavoriteLyric: async (lyricId: string, updates: Partial<FavoriteLyric>): Promise<FavoriteLyric> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const lyricIndex = mockFavoriteLyrics.findIndex(l => l.id === lyricId)
          if (lyricIndex >= 0) {
            mockFavoriteLyrics[lyricIndex] = {
              ...mockFavoriteLyrics[lyricIndex],
              ...updates
            }
            resolve(mockFavoriteLyrics[lyricIndex])
          } else {
            reject(new Error('Lyric not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.patch<FavoriteLyric>(`/mypage/lyrics/${lyricId}`, updates)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update favorite lyric')
    }
    return response.data
  },

  // お気に入り歌詞削除
  deleteFavoriteLyric: async (lyricId: string): Promise<void> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const lyricIndex = mockFavoriteLyrics.findIndex(l => l.id === lyricId)
          if (lyricIndex >= 0) {
            mockFavoriteLyrics.splice(lyricIndex, 1)
            resolve()
          } else {
            reject(new Error('Lyric not found'))
          }
        }, 500)
      })
    }

    const response = await apiClient.delete(`/mypage/lyrics/${lyricId}`)
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete favorite lyric')
    }
  },

  // 背景画像アップロード
  uploadBackgroundImage: async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        // プログレスのシミュレーション
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          if (onProgress) onProgress(progress)
          
          if (progress >= 100) {
            clearInterval(interval)
            resolve('https://picsum.photos/1920/1080?random=' + Date.now())
          }
        }, 100)
      })
    }

    const response = await apiClient.uploadFile<{ imageUrl: string }>('/mypage/background', file, onProgress)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to upload background image')
    }
    return response.data.imageUrl
  },

  // 設定のエクスポート
  exportSettings: async (): Promise<Blob> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockSettings = {
            theme: mockThemes[0],
            columns: [
              { id: '1', playlistId: '1', position: 0 },
              { id: '2', playlistId: '2', position: 1 },
              { id: '3', playlistId: '', position: 2 }
            ],
            favoriteLyrics: mockFavoriteLyrics,
            showWaveform: true,
            showLyrics: true,
            exportedAt: new Date().toISOString()
          }
          
          const blob = new Blob([JSON.stringify(mockSettings, null, 2)], {
            type: 'application/json'
          })
          resolve(blob)
        }, 1000)
      })
    }

    const response = await apiClient.get('/mypage/export')
    return response as unknown as Blob
  },

  // 設定のインポート
  importSettings: async (file: File): Promise<MyPageSettings> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const settings = JSON.parse(reader.result as string) as {
              theme?: MyPageTheme
              columns?: MyPageColumn[]
              showWaveform?: boolean
              showLyrics?: boolean
            }
            setTimeout(() => {
              resolve({
                id: '1',
                userId: 'current-user-id',
                theme: settings.theme || mockThemes[0],
                columns: settings.columns || [],
                showWaveform: settings.showWaveform ?? true,
                showLyrics: settings.showLyrics ?? true,
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: new Date().toISOString()
              })
            }, 1000)
          } catch {
            reject(new Error('Invalid settings file'))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      })
    }

    const response = await apiClient.uploadFile<MyPageSettings>('/mypage/import', file)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to import settings')
    }
    return response.data
  },

  // 使用統計取得
  getUsageStats: async (): Promise<{
    totalPlayTime: number // 秒
    favoriteGenres: string[]
    mostPlayedTracks: Array<{ trackId: string; playCount: number }>
    streakDays: number
  }> => {
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            totalPlayTime: 86400, // 24時間分の秒数
            favoriteGenres: ['J-Pop', 'Electronic', 'Jazz', 'Rock'],
            mostPlayedTracks: [
              { trackId: '1', playCount: 45 },
              { trackId: '2', playCount: 32 },
              { trackId: '3', playCount: 28 }
            ],
            streakDays: 7
          })
        }, 800)
      })
    }

    const response = await apiClient.get<{
      totalPlayTime: number
      favoriteGenres: string[]
      mostPlayedTracks: Array<{ trackId: string; playCount: number }>
      streakDays: number
    }>('/mypage/stats')
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get usage stats')
    }
    return response.data
  }
}

export default myPageApi