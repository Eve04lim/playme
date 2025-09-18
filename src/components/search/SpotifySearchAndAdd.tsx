// src/components/search/SpotifySearchAndAdd.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Search, Plus, AlertCircle, CheckCircle, Loader, Globe } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { useSpotify } from '../../hooks/useSpotify'
import { debounce } from '../../utils/spotifyHelpers'
import type { SpotifyUserProfile } from '../../schemas/spotify'

interface SpotifySearchAndAddProps {
  onPlaylistUpdated?: () => void
}

interface StatusMessage {
  text: string
  type: 'info' | 'warn' | 'error' | 'success'
}

const AVAILABLE_MARKETS = [
  { code: 'JP', name: '日本' },
  { code: 'US', name: 'アメリカ' },
  { code: 'GB', name: 'イギリス' },
  { code: 'DE', name: 'ドイツ' },
  { code: 'KR', name: '韓国' }
]

export const SpotifySearchAndAdd: React.FC<SpotifySearchAndAddProps> = ({ onPlaylistUpdated }) => {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<any[]>([])
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<string>('')
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Stores
  const { playlists, selectedPlaylistId, setSelectedPlaylist } = usePlaylistStore()
  
  // Hooks
  const spotify = useSpotify({
    onNotify: (message, type) => {
      setStatusMessage({ text: message, type })
      // 自動クリア（成功・情報メッセージのみ）
      if (type === 'info' || type === 'success') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => {
          setStatusMessage(null)
        }, 5000)
      }
    }
  })

  // 初回ユーザー情報とプレイリスト取得
  useEffect(() => {
    const initializeData = async () => {
      try {
        // ユーザー情報を取得してmarket初期化
        const profile = await spotify.getMe()
        setUserProfile(profile)
        setSelectedMarket(profile.country || 'US')
        
        // プレイリスト一覧取得
        await spotify.getUserPlaylists()
        
        // デフォルトプレイリスト選択
        if (!selectedPlaylistId && playlists.length > 0) {
          setSelectedPlaylist(playlists[0].id)
        }
      } catch (error) {
        console.error('Initialization failed:', error)
      }
    }
    
    if (!userProfile) {
      initializeData()
    }
  }, [spotify, userProfile, selectedPlaylistId, playlists, setSelectedPlaylist])

  // 検索実行
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    setStatusMessage(null)
    setHasSearched(true)
    
    try {
      const result = await spotify.searchTracks({
        query: searchQuery,
        limit: 15,
        market: selectedMarket || undefined
      })
      
      setTracks(result.tracks.items || [])
      
      if (!result.tracks.items?.length) {
        setStatusMessage({
          text: '検索結果が見つかりませんでした。新規プレイリスト作成で試してみてください！',
          type: 'warn'
        })
      }
    } catch (error) {
      console.error('Search failed:', error)
      setTracks([])
    }
  }, [spotify, selectedMarket])

  // Debounced検索
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      performSearch(searchQuery)
    }, 500),
    [performSearch]
  )

  // 入力値変更時のdebounced検索
  useEffect(() => {
    if (query.length >= 2) {
      debouncedSearch(query)
    } else {
      setTracks([])
      setHasSearched(false)
    }
  }, [query, debouncedSearch])

  // 即座に検索実行（ボタンクリックやEnterキー）
  const handleImmediateSearch = useCallback(() => {
    if (query.trim()) {
      performSearch(query.trim())
    }
  }, [query, performSearch])

  // プレイリストに楽曲追加
  const handleAddToPlaylist = useCallback(async (trackId: string, trackName: string) => {
    if (!selectedPlaylistId) {
      setStatusMessage({ text: 'プレイリストを選択してください', type: 'warn' })
      return
    }
    
    setAddingTrackId(trackId)
    
    try {
      await spotify.addToPlaylist(selectedPlaylistId, trackId, trackName)
      
      // 成功通知は useSpotify フックで処理
      onPlaylistUpdated?.()
      
    } catch (error) {
      // エラー通知も useSpotify フックで処理
      console.error('Failed to add track:', error)
    } finally {
      setAddingTrackId(null)
    }
  }, [selectedPlaylistId, spotify, onPlaylistUpdated])

  // キーボードイベント処理
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleImmediateSearch()
    }
  }, [handleImmediateSearch])

  // ステータスメッセージのスタイル取得
  const getMessageStyles = (type: StatusMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/50 text-green-300'
      case 'error':
        return 'bg-red-500/20 border-red-500/50 text-red-300'
      case 'warn':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
      case 'info':
      default:
        return 'bg-blue-500/20 border-blue-500/50 text-blue-300'
    }
  }

  // メッセージアイコン取得
  const getMessageIcon = (type: StatusMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      case 'error':
      case 'warn':
        return <AlertCircle className="w-4 h-4" />
      case 'info':
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 検索セクション */}
      <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="曲名 / アーティスト名を検索... (2文字以上で自動検索)"
                className="w-full bg-white/10 text-white pl-10 pr-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400"
                disabled={spotify.loading}
              />
              {spotify.loading && (
                <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4 animate-spin" />
              )}
            </div>
            <button 
              onClick={handleImmediateSearch} 
              disabled={spotify.loading || !query.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4" />
              検索
            </button>
          </div>
          
          {/* マーケット選択 */}
          {userProfile && (
            <div className="flex items-center gap-3 text-sm">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">地域:</span>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="bg-white/10 text-white px-3 py-2 rounded border border-white/20 outline-none focus:ring-2 focus:ring-green-500"
              >
                {AVAILABLE_MARKETS.map((market) => (
                  <option key={market.code} value={market.code} className="bg-gray-800">
                    {market.name} ({market.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* プレイリスト選択 */}
      {playlists.length > 0 && (
        <div className="bg-white/5 backdrop-blur-md p-4 rounded-lg">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-300 font-medium">追加先プレイリスト:</span>
            <select
              value={selectedPlaylistId || ''}
              onChange={(e) => setSelectedPlaylist(e.target.value || null)}
              className="flex-1 bg-white/10 text-white px-3 py-2 rounded border border-white/20 outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">プレイリストを選択...</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id} className="bg-gray-800">
                  {playlist.name} ({playlist.tracks?.total || 0} tracks)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ステータスメッセージ表示 */}
      {statusMessage && (
        <div className={`p-4 rounded-lg flex items-center gap-2 border ${getMessageStyles(statusMessage.type)}`}>
          {getMessageIcon(statusMessage.type)}
          <span className="text-sm flex-1">
            {statusMessage.text}
          </span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* 検索結果 */}
      <div className="space-y-3">
        {tracks.map((track) => (
          <div key={track.id} className="bg-white/5 backdrop-blur-md p-4 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* アルバムアート */}
                <img 
                  src={track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || 'https://via.placeholder.com/64x64?text=♪'} 
                  alt={track.name}
                  className="w-12 h-12 rounded object-cover flex-shrink-0"
                  loading="lazy"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate" title={track.name}>
                    {track.name}
                  </div>
                  <div className="text-gray-400 text-sm truncate">
                    {track.artists?.map((artist: any) => artist.name).join(', ') || 'Unknown Artist'}
                  </div>
                  <div className="text-gray-500 text-xs truncate">
                    {track.album?.name}
                  </div>
                  {track.preview_url && (
                    <div className="text-xs text-green-400 mt-1">
                      プレビュー可能
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleAddToPlaylist(track.id, track.name)}
                disabled={!selectedPlaylistId || addingTrackId === track.id || spotify.loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded text-white text-sm font-medium flex items-center gap-2 transition-colors flex-shrink-0"
              >
                {addingTrackId === track.id ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {addingTrackId === track.id ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* 空状態の表示 */}
      {tracks.length === 0 && hasSearched && !spotify.loading && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">検索結果が見つかりませんでした</p>
          <p className="text-gray-500 text-sm">キーワードを変えて再試行するか、新しいプレイリストを作成してみてください</p>
        </div>
      )}
      
      {tracks.length === 0 && !hasSearched && !spotify.loading && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">楽曲を検索してプレイリストに追加しましょう</p>
          <p className="text-gray-500 text-sm">アーティスト名や楽曲名を2文字以上入力すると自動で検索が始まります</p>
        </div>
      )}
    </div>
  )
}