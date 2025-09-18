// src/hooks/__tests__/useSpotify.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSpotify } from '../useSpotify'
import { useAuthStore } from '../../stores/authStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { spotifyAPI } from '../../api/spotify'

// モック
vi.mock('../../stores/authStore')
vi.mock('../../stores/playlistStore')
vi.mock('../../api/spotify')

const mockAuthStore = {
  getValidSpotifyToken: vi.fn(),
  logout: vi.fn()
}

const mockPlaylistStore = {
  setPlaylists: vi.fn(),
  incrementTrackCount: vi.fn(),
  rollbackTrackCount: vi.fn()
}

const mockSpotifyAPI = {
  getCurrentUser: vi.fn(),
  searchTracks: vi.fn()
}

beforeEach(() => {
  vi.clearAllMocks()
  
  // モックの設定
  vi.mocked(useAuthStore).mockReturnValue(mockAuthStore as any)
  vi.mocked(usePlaylistStore).mockReturnValue(mockPlaylistStore as any)
  vi.mocked(spotifyAPI).mockReturnValue(mockSpotifyAPI as any)
  
  // デフォルトのレスポンス設定
  mockAuthStore.getValidSpotifyToken.mockResolvedValue('mock-token')
  mockSpotifyAPI.getCurrentUser.mockResolvedValue({
    id: 'user1',
    display_name: 'Test User',
    country: 'JP'
  })
})

describe('useSpotify', () => {
  describe('getMe', () => {
    it('should get user profile successfully', async () => {
      const mockProfile = {
        id: 'user123',
        display_name: 'Test User',
        country: 'JP',
        email: 'test@example.com'
      }
      
      mockSpotifyAPI.getCurrentUser.mockResolvedValue(mockProfile)

      const { result } = renderHook(() => useSpotify())

      expect(result.current.loading).toBe(false)
      
      const profile = await result.current.getMe()
      
      expect(profile).toEqual(mockProfile)
      expect(mockAuthStore.getValidSpotifyToken).toHaveBeenCalled()
      expect(mockSpotifyAPI.getCurrentUser).toHaveBeenCalledWith('mock-token')
    })

    it('should handle token error and trigger logout on 401', async () => {
      const tokenError = new Error('401: Unauthorized')
      mockAuthStore.getValidSpotifyToken.mockRejectedValue(tokenError)

      const mockNotify = vi.fn()
      const { result } = renderHook(() => useSpotify({ onNotify: mockNotify }))

      await expect(result.current.getMe()).rejects.toThrow('401: Unauthorized')

      expect(mockNotify).toHaveBeenCalledWith(
        '認証が切れました。再ログインしてください。',
        'error'
      )
      
      // ログアウトが遅延実行される
      await waitFor(() => {
        expect(mockAuthStore.logout).toHaveBeenCalled()
      }, { timeout: 2000 })
    })
  })

  describe('searchTracks', () => {
    it('should search tracks successfully', async () => {
      const mockSearchResult = {
        tracks: {
          items: [
            { id: 'track1', name: 'Song 1' },
            { id: 'track2', name: 'Song 2' }
          ],
          total: 2
        }
      }

      mockSpotifyAPI.searchTracks.mockResolvedValue(mockSearchResult)

      const { result } = renderHook(() => useSpotify())

      const searchParams = {
        query: 'test song',
        limit: 10,
        market: 'JP'
      }

      const searchResult = await result.current.searchTracks(searchParams)

      expect(searchResult).toEqual(mockSearchResult)
      expect(mockSpotifyAPI.searchTracks).toHaveBeenCalledWith({
        query: 'test song',
        type: 'track',
        limit: 10,
        offset: 0,
        market: 'JP'
      }, 'mock-token')
    })

    it('should handle search error', async () => {
      const searchError = new Error('Search failed')
      mockSpotifyAPI.searchTracks.mockRejectedValue(searchError)

      const mockNotify = vi.fn()
      const { result } = renderHook(() => useSpotify({ onNotify: mockNotify }))

      await expect(result.current.searchTracks({ query: 'test' })).rejects.toThrow('Search failed')

      expect(mockNotify).toHaveBeenCalledWith('Search failed', 'error')
      expect(result.current.error).toBe('Search failed')
    })
  })

  describe('addToPlaylist', () => {
    beforeEach(() => {
      // fetchのモック
      global.fetch = vi.fn()
    })

    it('should add track to playlist with optimistic update', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      }
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const mockNotify = vi.fn()
      const { result } = renderHook(() => useSpotify({ onNotify: mockNotify }))

      await result.current.addToPlaylist('playlist123', 'track456', 'Test Song')

      // 楽観更新が実行される
      expect(mockPlaylistStore.incrementTrackCount).toHaveBeenCalledWith('playlist123', 1)

      // API呼び出しが正しい
      expect(fetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/playlists/playlist123/tracks',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ uris: ['spotify:track:track456'] })
        })
      )

      // 成功通知
      expect(mockNotify).toHaveBeenCalledWith(
        '✅ "Test Song" をプレイリストに追加しました',
        'info'
      )

      // rollbackは呼ばれない
      expect(mockPlaylistStore.rollbackTrackCount).not.toHaveBeenCalled()
    })

    it('should rollback on API failure', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          error: { message: 'Insufficient permissions' }
        })
      }
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const mockNotify = vi.fn()
      const { result } = renderHook(() => useSpotify({ onNotify: mockNotify }))

      await expect(
        result.current.addToPlaylist('playlist123', 'track456', 'Test Song')
      ).rejects.toThrow()

      // 楽観更新が実行される
      expect(mockPlaylistStore.incrementTrackCount).toHaveBeenCalledWith('playlist123', 1)

      // 失敗時にrollbackが実行される
      expect(mockPlaylistStore.rollbackTrackCount).toHaveBeenCalledWith('playlist123', 1)
    })

    it('should handle 401 error with logout', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({})
      }
      
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const mockNotify = vi.fn()
      const { result } = renderHook(() => useSpotify({ onNotify: mockNotify }))

      await result.current.addToPlaylist('playlist123', 'track456', 'Test Song')

      // 楽観更新
      expect(mockPlaylistStore.incrementTrackCount).toHaveBeenCalledWith('playlist123', 1)
      
      // rollback
      expect(mockPlaylistStore.rollbackTrackCount).toHaveBeenCalledWith('playlist123', 1)

      // 認証エラー通知
      expect(mockNotify).toHaveBeenCalledWith(
        '認証が切れました。再ログインしてください。',
        'error'
      )

      // ログアウトが遅延実行される
      await waitFor(() => {
        expect(mockAuthStore.logout).toHaveBeenCalled()
      }, { timeout: 2000 })
    })

    it('should handle rate limit with retry', async () => {
      // 初回は429 Rate Limited
      const rateLimitResponse = {
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => name === 'retry-after' ? '2' : null
        },
        json: () => Promise.resolve({})
      }

      // 再試行後は成功
      const successResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce(rateLimitResponse as any)
        .mockResolvedValueOnce(successResponse as any)

      const mockNotify = vi.fn()
      const { result } = renderHook(() => useSpotify({ onNotify: mockNotify }))

      // タイマーのモック
      vi.useFakeTimers()
      
      const addPromise = result.current.addToPlaylist('playlist123', 'track456', 'Test Song')

      // Rate limit通知
      expect(mockNotify).toHaveBeenCalledWith(
        'リクエスト制限に達しました。2秒後に自動で再試行します...',
        'warn'
      )

      // 時間を進めて再試行を実行
      vi.advanceTimersByTime(2000)
      
      await addPromise

      // 再試行通知
      expect(mockNotify).toHaveBeenCalledWith('再試行中...', 'info')

      // 最終的に成功通知
      expect(mockNotify).toHaveBeenCalledWith(
        '✅ "Test Song" をプレイリストに追加しました',
        'info'
      )

      // rollbackは呼ばれない（最終的に成功したため）
      expect(mockPlaylistStore.rollbackTrackCount).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })
})