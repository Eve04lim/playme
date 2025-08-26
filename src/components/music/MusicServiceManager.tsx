// src/components/music/MusicServiceManager.tsx
import { AlertCircle, CheckCircle, Music, RefreshCw, Smartphone, Wifi, WifiOff } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { appleMusicAPI } from '../../api/applemusic'
import { spotifyAPI } from '../../api/spotify'
import { useMusicApiWithErrorHandling } from '../../hooks/useApiErrorHandler'
import { useAuthStore } from '../../stores/authStore'
import { useMyPageStore } from '../../stores/myPageStore'
import type { Track } from '../../types'

interface ServiceStatus {
  name: string
  connected: boolean
  loading: boolean
  error: string | null
  lastSync?: Date
}

interface MusicServiceManagerProps {
  onTrackSelect?: (track: Track) => void
  showSearchResults?: boolean
  className?: string
}

export const MusicServiceManager: React.FC<MusicServiceManagerProps> = ({
  onTrackSelect,
  showSearchResults = true,
  className = ""
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { user, connectSpotify, connectAppleMusic } = useAuthStore()
  const musicApiHandler = useMusicApiWithErrorHandling()
  
  const [services, setServices] = useState<Record<string, ServiceStatus>>({
    spotify: {
      name: 'Spotify',
      connected: false,
      loading: false,
      error: null
    },
    appleMusic: {
      name: 'Apple Music',
      connected: false,
      loading: false,
      error: null
    }
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    spotify: Track[]
    appleMusic: Track[]
    combined: Track[]
  }>({
    spotify: [],
    appleMusic: [],
    combined: []
  })
  const [activeService, setActiveService] = useState<'spotify' | 'appleMusic' | 'both'>('both')
  const [searchLoading, setSearchLoading] = useState(false)

  // サービス状態を初期化
  useEffect(() => {
    const initializeServices = async () => {
      // Spotify状態チェック
      setServices(prev => ({
        ...prev,
        spotify: {
          ...prev.spotify,
          connected: user?.spotifyConnected || false,
          loading: false
        }
      }))

      // Apple Music状態チェック
      try {
        const isAppleMusicAvailable = await appleMusicAPI.checkConnection()
        setServices(prev => ({
          ...prev,
          appleMusic: {
            ...prev.appleMusic,
            connected: user?.appleMusicConnected && isAppleMusicAvailable || false,
            loading: false
          }
        }))
      } catch {
        setServices(prev => ({
          ...prev,
          appleMusic: {
            ...prev.appleMusic,
            connected: false,
            loading: false,
            error: 'Apple Music接続チェックに失敗しました'
          }
        }))
      }
    }

    initializeServices()
  }, [user])

  // Spotify接続
  const handleSpotifyConnect = async () => {
    setServices(prev => ({
      ...prev,
      spotify: { ...prev.spotify, loading: true, error: null }
    }))

    try {
      await connectSpotify()
      setServices(prev => ({
        ...prev,
        spotify: {
          ...prev.spotify,
          connected: true,
          loading: false,
          lastSync: new Date()
        }
      }))
    } catch (error) {
      setServices(prev => ({
        ...prev,
        spotify: {
          ...prev.spotify,
          connected: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Spotify接続に失敗しました'
        }
      }))
    }
  }

  // Apple Music接続
  const handleAppleMusicConnect = async () => {
    setServices(prev => ({
      ...prev,
      appleMusic: { ...prev.appleMusic, loading: true, error: null }
    }))

    try {
      await appleMusicAPI.authorize()
      await connectAppleMusic()
      
      setServices(prev => ({
        ...prev,
        appleMusic: {
          ...prev.appleMusic,
          connected: true,
          loading: false,
          lastSync: new Date()
        }
      }))
    } catch (error) {
      setServices(prev => ({
        ...prev,
        appleMusic: {
          ...prev.appleMusic,
          connected: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Apple Music接続に失敗しました'
        }
      }))
    }
  }

  // 統合検索実行
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ spotify: [], appleMusic: [], combined: [] })
      return
    }

    setSearchLoading(true)

    try {
      const promises: Promise<Track[]>[] = []

      // Spotify検索
      if ((activeService === 'spotify' || activeService === 'both') && services.spotify.connected) {
        promises.push(
          spotifyAPI.searchTracks({ query, type: 'track', limit: 20 })
            .then(response => response.tracks.items.map(item => ({
              id: item.id,
              spotifyId: item.id,
              title: item.name,
              artist: item.artists.map(a => a.name).join(', '),
              album: item.album.name,
              duration: item.duration_ms,
              artworkUrl: item.album.images[0]?.url,
              previewUrl: item.preview_url || undefined,
              externalUrl: item.external_urls.spotify
            })))
            .catch(() => [])
        )
      } else {
        promises.push(Promise.resolve([]))
      }

      // Apple Music検索
      if ((activeService === 'appleMusic' || activeService === 'both') && services.appleMusic.connected) {
        promises.push(
          appleMusicAPI.searchUnified(query, 20)
            .catch(() => [])
        )
      } else {
        promises.push(Promise.resolve([]))
      }

      // モック検索（開発環境またはサービス未接続時）
      let mockResults: Track[] = []
      if (!services.spotify.connected && !services.appleMusic.connected) {
        try {
          const response = await musicApiHandler.searchTracks(query, false)
          if (response && typeof response === 'object' && 'tracks' in response) {
            mockResults = (response as { tracks: Track[] }).tracks || []
          }
        } catch {
          mockResults = []
        }
      }

      const [spotifyResults, appleMusicResults] = await Promise.all([...promises])

      // 結果を統合（重複削除）
      const combinedResults: Track[] = []
      const seenTitles = new Set<string>()

      // Spotify結果を追加
      spotifyResults.forEach(track => {
        const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`
        if (!seenTitles.has(key)) {
          seenTitles.add(key)
          combinedResults.push({ ...track, source: 'spotify' } as Track & { source: string })
        }
      })

      // Apple Music結果を追加
      appleMusicResults.forEach(track => {
        const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`
        if (!seenTitles.has(key)) {
          seenTitles.add(key)
          combinedResults.push({ ...track, source: 'appleMusic' } as Track & { source: string })
        }
      })

      // モック結果を追加（サービス未接続時）
      if (mockResults && mockResults.length > 0) {
        mockResults.forEach(track => {
          const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`
          if (!seenTitles.has(key)) {
            seenTitles.add(key)
            combinedResults.push({ ...track, source: 'mock' } as Track & { source: string })
          }
        })
      }
      if (mockResults) {
        mockResults.forEach(track => {
          const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`
          if (!seenTitles.has(key)) {
            seenTitles.add(key)
            combinedResults.push({ ...track, source: 'mock' } as Track & { source: string })
          }
        })
      }

      setSearchResults({
        spotify: spotifyResults,
        appleMusic: appleMusicResults,
        combined: combinedResults
      })
    } catch (error) {
      console.error('Unified search failed:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  // デバウンス検索
  const performSearchMemo = useCallback(performSearch, [activeService, services.spotify.connected, services.appleMusic.connected, musicApiHandler])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery) {
        performSearchMemo(searchQuery)
      }
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, performSearchMemo])

  // サービス状態インジケーター
  const ServiceStatusIndicator: React.FC<{ service: keyof typeof services }> = ({ service }) => {
    const status = services[service]
    
    return (
      <div 
        className="flex items-center justify-between p-4 rounded-lg border"
        style={{
          backgroundColor: theme.secondaryColor,
          borderColor: status.connected ? theme.primaryColor + '40' : theme.primaryColor + '20'
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
            backgroundColor: service === 'spotify' ? '#1db954' : '#000000'
          }}>
            {service === 'spotify' ? (
              <Music className="w-5 h-5 text-white" />
            ) : (
              <Smartphone className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-medium" style={{ color: theme.textColor }}>
              {status.name}
            </h3>
            <div className="flex items-center space-x-2">
              {status.connected ? (
                <div className="flex items-center space-x-1 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">接続済み</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400">
                  {musicApiHandler.isOnline ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  <span className="text-sm">未接続</span>
                </div>
              )}
              {status.lastSync && (
                <span className="text-xs text-gray-500">
                  {status.lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {status.loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" style={{ color: theme.primaryColor }} />
          ) : status.connected ? (
            <button
              className="px-3 py-1 rounded text-sm border"
              style={{
                color: theme.textColor,
                borderColor: theme.primaryColor + '40'
              }}
            >
              設定
            </button>
          ) : (
            <button
              onClick={service === 'spotify' ? handleSpotifyConnect : handleAppleMusicConnect}
              className="px-3 py-1 rounded text-sm text-white"
              style={{ backgroundColor: theme.primaryColor }}
              disabled={status.loading}
            >
              接続
            </button>
          )}
        </div>

        {status.error && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{status.error}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* サービス接続状態 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
          音楽サービス
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ServiceStatusIndicator service="spotify" />
          <ServiceStatusIndicator service="appleMusic" />
        </div>
      </div>

      {/* 統合検索 */}
      {showSearchResults && (services.spotify.connected || services.appleMusic.connected) && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium" style={{ color: theme.textColor }}>
            統合検索
          </h3>

          {/* 検索フィルター */}
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              {['both', 'spotify', 'appleMusic'].map(service => (
                <button
                  key={service}
                  onClick={() => setActiveService(service as 'spotify' | 'appleMusic' | 'both')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    activeService === service ? 'text-white' : 'text-gray-400'
                  }`}
                  style={{
                    backgroundColor: activeService === service 
                      ? theme.primaryColor 
                      : theme.secondaryColor
                  }}
                >
                  {service === 'both' ? '両方' : 
                   service === 'spotify' ? 'Spotify' : 'Apple Music'}
                </button>
              ))}
            </div>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="複数のサービスから検索..."
              className="w-full px-4 py-3 rounded-lg border"
              style={{
                backgroundColor: theme.backgroundColor,
                borderColor: theme.primaryColor + '40',
                color: theme.textColor
              }}
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ color: theme.primaryColor }} />
              </div>
            )}
          </div>

          {/* 検索結果 */}
          {searchResults.combined.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {searchResults.combined.map((track, index) => (
                <button
                  key={`${track.id}-${index}`}
                  onClick={() => onTrackSelect?.(track)}
                  className="w-full p-3 rounded-lg transition-all text-left hover:scale-[1.02]"
                  style={{ backgroundColor: theme.secondaryColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.primaryColor + '10'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.secondaryColor
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={track.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
                      alt={track.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate" style={{ color: theme.textColor }}>
                        {track.title}
                      </h4>
                      <p className="text-sm truncate" style={{ color: theme.textColor + 'CC' }}>
                        {track.artist}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: theme.primaryColor }}>
                        {(track as Track & { source?: string }).source === 'spotify' ? 'Spotify' : 
                         (track as Track & { source?: string }).source === 'appleMusic' ? 'Apple Music' : 'Local'}
                      </div>
                      <div className="text-xs" style={{ color: theme.textColor + '80' }}>
                        {Math.floor(track.duration / 60000)}:{String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className="p-4 rounded-lg"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textColor + '80' }}>
                接続済みサービス
              </p>
              <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {Object.values(services).filter(s => s.connected).length}
              </p>
            </div>
            <div className="text-2xl">🔗</div>
          </div>
        </div>

        <div 
          className="p-4 rounded-lg"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textColor + '80' }}>
                キャッシュサイズ
              </p>
              <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {musicApiHandler.cacheSize}
              </p>
            </div>
            <div className="text-2xl">💾</div>
          </div>
        </div>

        <div 
          className="p-4 rounded-lg"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textColor + '80' }}>
                接続状態
              </p>
              <p className="text-sm font-medium" style={{ 
                color: musicApiHandler.isOnline ? theme.primaryColor : '#ef4444' 
              }}>
                {musicApiHandler.isOnline ? 'オンライン' : 'オフライン'}
              </p>
            </div>
            <div className="text-2xl">
              {musicApiHandler.isOnline ? '🌐' : '📴'}
            </div>
          </div>
        </div>
      </div>

      {/* エラー状態表示 */}
      {musicApiHandler.error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-300 font-medium">API エラー</p>
              <p className="text-red-300 text-sm">{musicApiHandler.error}</p>
              {musicApiHandler.retryCount > 0 && (
                <p className="text-red-200 text-xs mt-1">
                  リトライ回数: {musicApiHandler.retryCount}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={musicApiHandler.clearError}
            className="mt-3 px-3 py-1 rounded text-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            エラーを閉じる
          </button>
        </div>
      )}

      {/* 開発環境情報 */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-300 font-medium">開発モード</p>
              <p className="text-yellow-300 text-sm">
                モックデータを使用しています。実際のAPI統合は本番環境で動作します。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}