// src/hooks/useSpotify.ts
import { useCallback, useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { spotifyAPI } from '../api/spotify'
import { handleRateLimitAndRetry, extractErrorMessage } from '../utils/spotifyHelpers'
import type { SpotifyUserProfile } from '../schemas/spotify'

interface UseSpotifyOptions {
  onNotify?: (message: string, type: 'info' | 'warn' | 'error') => void
}

interface UseSpotifyReturn {
  // ユーザー情報
  getMe: () => Promise<SpotifyUserProfile>
  
  // 検索
  searchTracks: (params: {
    query: string
    limit?: number
    offset?: number
    market?: string
  }) => Promise<any>
  
  // プレイリスト操作
  getUserPlaylists: (limit?: number, offset?: number) => Promise<any[]>
  getPlaylistTracks: (playlistId: string) => Promise<any[]>
  addToPlaylist: (playlistId: string, trackId: string, trackName: string) => Promise<void>
  
  // 状態
  loading: boolean
  error: string | null
}

export const useSpotify = (options: UseSpotifyOptions = {}): UseSpotifyReturn => {
  const { onNotify } = options
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { getValidSpotifyToken, logout } = useAuthStore()
  const { incrementTrackCount, rollbackTrackCount } = usePlaylistStore()
  
  // AbortController management for in-flight requests
  const inflightRequests = useRef<Record<string, { promise: Promise<any>, abort: AbortController }>>({})
  
  // Cleanup function to abort all pending requests
  const abortAllRequests = useCallback(() => {
    Object.values(inflightRequests.current).forEach(({ abort }) => {
      try {
        abort.abort()
      } catch (e) {
        // Ignore AbortError
      }
    })
    inflightRequests.current = {}
  }, [])

  // 有効なトークンを取得
  const getToken = useCallback(async (): Promise<string> => {
    try {
      return await getValidSpotifyToken()
    } catch (error) {
      console.error('Token acquisition failed:', error)
      // 401の場合はログアウトを促す
      if (error instanceof Error && error.message.includes('401')) {
        onNotify?.('認証が切れました。再ログインしてください。', 'error')
        setTimeout(() => logout(), 1500)
      }
      throw error
    }
  }, [getValidSpotifyToken, onNotify, logout])

  // ユーザー情報取得
  const getMe = useCallback(async (): Promise<SpotifyUserProfile> => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getToken()
      const profile = await spotifyAPI.getCurrentUser(token)
      return profile
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ユーザー情報の取得に失敗しました'
      setError(message)
      onNotify?.(message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }, [getToken, onNotify])

  // 楽曲検索
  const searchTracks = useCallback(async (params: {
    query: string
    limit?: number
    offset?: number
    market?: string
  }) => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getToken()
      
      const searchResult = await spotifyAPI.searchTracks({
        query: params.query,
        type: 'track',
        limit: params.limit || 20,
        offset: params.offset || 0,
        market: params.market ?? 'JP'
      }, token)
      
      return searchResult
    } catch (error) {
      const message = error instanceof Error ? error.message : '検索に失敗しました'
      setError(message)
      onNotify?.(message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }, [getToken, onNotify])

  // プレイリスト一覧取得
  const getUserPlaylists = useCallback(async (limit = 50, offset = 0): Promise<any[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const token = await getToken()
      
      const makeRequest = async () => {
        const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        return response
      }

      let response = await makeRequest()
      
      // Rate limit対応
      if (response.status === 429) {
        response = await handleRateLimitAndRetry(response, makeRequest, onNotify)
      }

      if (!response.ok) {
        if (response.status === 401) {
          onNotify?.('認証が切れました。再ログインしてください。', 'error')
          setTimeout(() => logout(), 1500)
          return []
        }
        
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ [getUserPlaylists] Scope insufficient:', errorData)
          onNotify?.('プレイリストへのアクセス権限がありません。playlist-read-privateスコープが必要です。', 'error')
          throw new Error('Spotify playlist access denied. Missing playlist-read-private scope.')
        }
        
        const errorMessage = await extractErrorMessage(response)
        console.error('❌ [getUserPlaylists] API error:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const items = data.items || []
      console.log('🎧 playlists fetched:', items.length, items.slice(0,3).map((p: any) => p.name))
      return items
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'プレイリストの取得に失敗しました'
      setError(message)
      onNotify?.(message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }, [getToken, onNotify, logout])

  // プレイリストに楽曲追加（楽観更新+rollback対応）
  const addToPlaylist = useCallback(async (
    playlistId: string, 
    trackId: string, 
    trackName: string
  ): Promise<void> => {
    setLoading(true)
    setError(null)
    
    // 楽観更新（先にUIを更新）
    incrementTrackCount(playlistId, 1)
    
    try {
      const token = await getToken()
      const uri = `spotify:track:${trackId}`
      
      const makeRequest = async () => {
        return await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ uris: [uri] })
        })
      }

      let response = await makeRequest()
      
      // Rate limit対応
      if (response.status === 429) {
        response = await handleRateLimitAndRetry(response, makeRequest, onNotify)
      }

      if (!response.ok) {
        // 楽観更新をrollback
        rollbackTrackCount(playlistId, 1)
        
        if (response.status === 401) {
          onNotify?.('認証が切れました。再ログインしてください。', 'error')
          setTimeout(() => logout(), 1500)
          return
        }
        
        const errorMessage = await extractErrorMessage(response)
        throw new Error(errorMessage)
      }

      // 成功時の通知
      onNotify?.(`✅ "${trackName}" をプレイリストに追加しました`, 'info')
      
      // バックグラウンドでプレイリストを再取得（整合性確保）
      setTimeout(() => {
        getUserPlaylists().catch(console.warn)
      }, 1000)
      
    } catch (error) {
      // エラー時は必ずrollback
      rollbackTrackCount(playlistId, 1)
      
      const message = error instanceof Error ? error.message : '楽曲の追加に失敗しました'
      setError(message)
      onNotify?.(message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }, [getToken, incrementTrackCount, rollbackTrackCount, getUserPlaylists, onNotify, logout])

  // プレイリストのトラック取得 (with AbortController deduplication)
  const getPlaylistTracks = useCallback(async (playlistId: string): Promise<any[]> => {
    // Reuse in-flight request if exists
    const existingRequest = inflightRequests.current[playlistId]
    if (existingRequest) {
      return existingRequest.promise
    }
    
    const abortController = new AbortController()
    
    const requestPromise = (async () => {
      setLoading(true)
      setError(null)
      
      try {
        const token = await getToken()
        const response = await spotifyAPI.getPlaylistTracks(token, playlistId, { 
          limit: 50, 
          offset: 0, 
          signal: abortController.signal 
        })
      
      const items = Array.isArray(response?.items) ? response.items : []
      // "表示できる形"に正規化（is_local/episode/画像なしも残す）
      const tracks = items.map((it: any, idx: number) => {
        const t = it?.track ?? null
        if (!t) {
          // track= null (地域不一致など) → プレースホルダー表示できる最小情報に
          return {
            id: `missing-${idx}`,
            name: '(利用不可のトラック)',
            uri: it?.uri ?? '',
            artists: [],
            album: { name: '', images: [] },
            _meta: { missing: true },
          }
        }
        const isEpisode = t.type === 'episode'
        const isLocal = it?.is_local || t?.is_local
        return {
          id: t.id ?? t.uri ?? `local-${idx}`,
          name: t.name ?? '(名称不明)',
          uri: t.uri ?? '',
          duration_ms: t.duration_ms ?? 0,
          artists: Array.isArray(t.artists) ? t.artists.map((a: any) => ({ name: a?.name ?? '' })) : [],
          album: {
            name: t.album?.name ?? '',
            images: Array.isArray(t.album?.images) ? t.album.images : [],
          },
          _meta: { isEpisode, isLocal },
        }
      })
      // ここでは"表示不可な null のみ"を除外し、原則は残す
      const cleaned = tracks.filter(Boolean)
      
      console.log('🎵 tracks fetched:', playlistId, cleaned.length, cleaned.slice(0,5).map((t: any) => t.name))
      return cleaned
    } catch (error) {
      const message = error instanceof Error ? error.message : 'トラックの取得に失敗しました'
      setError(message)
      onNotify?.(message, 'error')
      throw error
    } finally {
      setLoading(false)
      // Clean up in-flight request tracking
      delete inflightRequests.current[playlistId]
    }
    })()
    
    // Store the request promise for deduplication
    inflightRequests.current[playlistId] = { promise: requestPromise, abort: abortController }
    
    return requestPromise
  }, [getToken, onNotify])

  // Cleanup on component unmount - abort all pending requests
  useEffect(() => {
    return () => {
      abortAllRequests()
    }
  }, [abortAllRequests])

  return {
    getMe,
    searchTracks,
    getUserPlaylists,
    getPlaylistTracks,
    addToPlaylist,
    loading,
    error
  }
}