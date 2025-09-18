// src/hooks/usePlaylistIntegration.ts
import { useCallback, useEffect, useState } from 'react'
import { PlaylistGenerator, type PlaylistEntry } from '../utils/playlistGenerator'
import type { Track, Album, Artist, Playlist } from '../types'

interface SearchResult {
  tracks: Track[]
  artists: Artist[]
  albums: Album[]
  playlists: Playlist[]
}

interface UsePlaylistIntegrationOptions {
  onPlaylistUpdate?: (playlist: PlaylistEntry) => void
  onError?: (error: Error) => void
}

interface UsePlaylistIntegrationReturn {
  // プレイリスト管理
  playlists: PlaylistEntry[]
  currentPlaylist: PlaylistEntry | null
  
  // 楽曲追加機能
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>
  addTracksToPlaylist: (playlistId: string, tracks: Track[]) => Promise<void>
  
  // 検索結果から追加
  addSearchResultToPlaylist: (playlistId: string, searchResult: SearchResult, type: 'tracks' | 'albums') => Promise<void>
  
  // プレイリスト操作
  createPlaylistFromSearch: (name: string, searchResults: Track[], description?: string) => Promise<PlaylistEntry>
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
  
  // バッチ操作
  addMultipleToPlaylist: (playlistId: string, items: { type: 'track' | 'album' | 'artist'; data: Track | Album | Artist }[]) => Promise<void>
  
  // プレイリスト状態
  isLoading: boolean
  error: string | null
  
  // ユーティリティ
  getPlaylistById: (id: string) => PlaylistEntry | null
  refreshPlaylists: () => void
}

export const usePlaylistIntegration = (
  playlistGenerator: PlaylistGenerator | null,
  options: UsePlaylistIntegrationOptions = {}
): UsePlaylistIntegrationReturn => {
  const { onPlaylistUpdate, onError } = options
  
  const [playlists, setPlaylists] = useState<PlaylistEntry[]>([])
  const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistEntry | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // プレイリスト一覧の更新
  const refreshPlaylists = useCallback(() => {
    if (!playlistGenerator) return
    
    try {
      const allPlaylists = playlistGenerator.getAllPlaylists()
      setPlaylists(allPlaylists)
    } catch (err) {
      console.error('Failed to refresh playlists:', err)
      setError(err instanceof Error ? err.message : 'プレイリストの読み込みに失敗しました')
    }
  }, [playlistGenerator])

  // 初期データ読み込み
  useEffect(() => {
    refreshPlaylists()
  }, [refreshPlaylists])

  // エラーハンドリング
  const handleError = useCallback((err: unknown) => {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    setError(errorMessage)
    onError?.(err instanceof Error ? err : new Error(errorMessage))
    console.error('Playlist integration error:', err)
  }, [onError])

  // プレイリストの更新通知
  const notifyPlaylistUpdate = useCallback((playlist: PlaylistEntry) => {
    onPlaylistUpdate?.(playlist)
    refreshPlaylists()
  }, [onPlaylistUpdate, refreshPlaylists])

  // 単一楽曲をプレイリストに追加
  const addTrackToPlaylist = useCallback(async (playlistId: string, track: Track): Promise<void> => {
    if (!playlistGenerator) {
      throw new Error('プレイリストジェネレーターが初期化されていません')
    }

    setIsLoading(true)
    setError(null)

    try {
      const updatedPlaylist = playlistGenerator.addTracksToPlaylist(playlistId, [track])
      notifyPlaylistUpdate(updatedPlaylist)
      
      // 現在のプレイリストが更新された場合
      if (currentPlaylist?.id === playlistId) {
        setCurrentPlaylist(updatedPlaylist)
      }
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, currentPlaylist, notifyPlaylistUpdate, handleError])

  // 複数楽曲をプレイリストに追加
  const addTracksToPlaylist = useCallback(async (playlistId: string, tracks: Track[]): Promise<void> => {
    if (!playlistGenerator) {
      throw new Error('プレイリストジェネレーターが初期化されていません')
    }

    setIsLoading(true)
    setError(null)

    try {
      const updatedPlaylist = playlistGenerator.addTracksToPlaylist(playlistId, tracks)
      notifyPlaylistUpdate(updatedPlaylist)
      
      if (currentPlaylist?.id === playlistId) {
        setCurrentPlaylist(updatedPlaylist)
      }
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, currentPlaylist, notifyPlaylistUpdate, handleError])

  // 検索結果からプレイリストに追加
  const addSearchResultToPlaylist = useCallback(async (
    playlistId: string, 
    searchResult: SearchResult, 
    type: 'tracks' | 'albums'
  ): Promise<void> => {
    if (!playlistGenerator) {
      throw new Error('プレイリストジェネレーターが初期化されていません')
    }

    setIsLoading(true)
    setError(null)

    try {
      let tracksToAdd: Track[] = []

      switch (type) {
        case 'tracks':
          tracksToAdd = searchResult.tracks
          break
        case 'albums':
          // アルバムの楽曲を展開（実際の実装では API から取得）
          tracksToAdd = searchResult.albums.flatMap(album => album.tracks || [])
          break
      }

      if (tracksToAdd.length === 0) {
        throw new Error('追加する楽曲が見つかりません')
      }

      await addTracksToPlaylist(playlistId, tracksToAdd)
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, addTracksToPlaylist, handleError])

  // 検索結果から新規プレイリスト作成
  const createPlaylistFromSearch = useCallback(async (
    name: string, 
    searchResults: Track[], 
    description?: string
  ): Promise<PlaylistEntry> => {
    if (!playlistGenerator) {
      throw new Error('プレイリストジェネレーターが初期化されていません')
    }

    setIsLoading(true)
    setError(null)

    try {
      const playlist = playlistGenerator.createCustomPlaylist(
        name,
        searchResults,
        description,
        ['search-created', 'custom']
      )

      notifyPlaylistUpdate(playlist)
      return playlist
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, notifyPlaylistUpdate, handleError])

  // プレイリストから楽曲削除
  const removeTrackFromPlaylist = useCallback(async (playlistId: string, trackId: string): Promise<void> => {
    if (!playlistGenerator) {
      throw new Error('プレイリストジェネレーターが初期化されていません')
    }

    setIsLoading(true)
    setError(null)

    try {
      const updatedPlaylist = playlistGenerator.removeTracksFromPlaylist(playlistId, [trackId])
      notifyPlaylistUpdate(updatedPlaylist)
      
      if (currentPlaylist?.id === playlistId) {
        setCurrentPlaylist(updatedPlaylist)
      }
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, currentPlaylist, notifyPlaylistUpdate, handleError])

  // 複数アイテムの一括追加
  const addMultipleToPlaylist = useCallback(async (
    playlistId: string, 
    items: { type: 'track' | 'album' | 'artist'; data: Track | Album | Artist }[]
  ): Promise<void> => {
    if (!playlistGenerator) {
      throw new Error('プレイリストジェネレーターが初期化されていません')
    }

    setIsLoading(true)
    setError(null)

    try {
      const allTracks: Track[] = []

      for (const item of items) {
        switch (item.type) {
          case 'track':
            allTracks.push(item.data)
            break
          case 'album':
            // アルバムの全楽曲を追加（実際の実装では API から取得）
            if (item.data.tracks) {
              allTracks.push(...item.data.tracks)
            }
            break
          case 'artist':
            // アーティストの人気楽曲を追加（実際の実装では API から取得）
            if (item.data.topTracks) {
              allTracks.push(...item.data.topTracks.slice(0, 10)) // 上位10曲
            }
            break
        }
      }

      // 重複を除去
      const uniqueTracks = allTracks.filter((track, index, array) => 
        array.findIndex(t => t.id === track.id) === index
      )

      await addTracksToPlaylist(playlistId, uniqueTracks)
    } catch (err) {
      handleError(err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [playlistGenerator, addTracksToPlaylist, handleError])

  // プレイリストをIDで取得
  const getPlaylistById = useCallback((id: string): PlaylistEntry | null => {
    return playlists.find(playlist => playlist.id === id) || null
  }, [playlists])

  return {
    // プレイリスト状態
    playlists,
    currentPlaylist,
    isLoading,
    error,
    
    // 楽曲追加機能
    addTrackToPlaylist,
    addTracksToPlaylist,
    addSearchResultToPlaylist,
    addMultipleToPlaylist,
    
    // プレイリスト操作
    createPlaylistFromSearch,
    removeTrackFromPlaylist,
    
    // ユーティリティ
    getPlaylistById,
    refreshPlaylists
  }
}

// 検索結果からプレイリストに追加するためのヘルパー関数
export const createAddToPlaylistHandler = (
  usePlaylistIntegrationReturn: UsePlaylistIntegrationReturn,
  defaultPlaylistId?: string
) => {
  return {
    // 楽曲を追加
    addTrack: async (track: Track, playlistId?: string) => {
      const targetPlaylistId = playlistId || defaultPlaylistId
      if (!targetPlaylistId) {
        throw new Error('プレイリストIDが指定されていません')
      }
      return usePlaylistIntegrationReturn.addTrackToPlaylist(targetPlaylistId, track)
    },
    
    // 複数楽曲を追加
    addTracks: async (tracks: Track[], playlistId?: string) => {
      const targetPlaylistId = playlistId || defaultPlaylistId
      if (!targetPlaylistId) {
        throw new Error('プレイリストIDが指定されていません')
      }
      return usePlaylistIntegrationReturn.addTracksToPlaylist(targetPlaylistId, tracks)
    },
    
    // 検索結果から新規プレイリスト作成
    createFromTracks: async (name: string, tracks: Track[], description?: string) => {
      return usePlaylistIntegrationReturn.createPlaylistFromSearch(name, tracks, description)
    }
  }
}

// プレイリスト選択用のホック
export const usePlaylistSelector = (playlists: PlaylistEntry[]) => {
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [showSelector, setShowSelector] = useState(false)

  const selectPlaylist = useCallback((playlistId: string) => {
    setSelectedPlaylist(playlistId)
    setShowSelector(false)
  }, [])

  const getSelectedPlaylist = useCallback(() => {
    if (!selectedPlaylist) return null
    return playlists.find(p => p.id === selectedPlaylist) || null
  }, [playlists, selectedPlaylist])

  return {
    selectedPlaylist,
    showSelector,
    setShowSelector,
    selectPlaylist,
    getSelectedPlaylist
  }
}