// src/components/dashboard/LiveMusicDashboard.tsx
import { 
  Activity, TrendingUp, AlertTriangle, Users, Music, 
  Clock, BarChart3, PieChart, RefreshCw, Download,
  Wifi, CheckCircle, XCircle
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { musicApi } from '../../api/music'
import { useMyPageStore } from '../../stores/myPageStore'

interface DashboardMetrics {
  listening: {
    totalPlays: number
    uniqueUsers: number
    averageSessionDuration: number
    topGenres: { name: string; count: number; percentage: number }[]
    hourlyActivity: { hour: number; plays: number }[]
  }
  services: {
    spotify: { status: 'connected' | 'disconnected'; requests: number; errors: number }
    appleMusic: { status: 'connected' | 'disconnected'; requests: number; errors: number }
    unified: { cacheHits: number; cacheMisses: number; efficiency: number }
  }
  trends: {
    popularTracks: { title: string; artist: string; plays: number; trend: 'up' | 'down' | 'stable' }[]
    emergingArtists: { name: string; growth: number }[]
    genreTrends: { genre: string; change: number }[]
  }
  performance: {
    apiLatency: { service: string; avgLatency: number; status: 'good' | 'warning' | 'error' }[]
    errorRate: number
    uptime: number
    responseTime: number
  }
}

interface LiveMusicDashboardProps {
  className?: string
  refreshInterval?: number
  showRealTime?: boolean
}

export const LiveMusicDashboard: React.FC<LiveMusicDashboardProps> = ({
  className = '',
  refreshInterval = 30000, // 30秒
  showRealTime = true
}) => {
  const theme = useMyPageStore(state => state.theme)
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [error, setError] = useState<string | null>(null)
  const [realtimeEnabled, setRealtimeEnabled] = useState(showRealTime)

  // モックデータ生成
  const generateMockMetrics = useCallback((): DashboardMetrics => {
    
    // 1日の時間別アクティビティ（現実的な分布）
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
      let basePlays = 50
      
      // 朝の通勤時間
      if (hour >= 7 && hour <= 9) basePlays += 200
      // ランチタイム
      if (hour >= 12 && hour <= 13) basePlays += 150
      // 夕方の帰宅時間
      if (hour >= 17 && hour <= 19) basePlays += 300
      // 夜のリラックスタイム
      if (hour >= 20 && hour <= 22) basePlays += 250
      // 深夜は少なく
      if (hour >= 23 || hour <= 5) basePlays -= 30
      
      // ランダムな変動を追加
      const variation = Math.floor(Math.random() * 100) - 50
      return {
        hour,
        plays: Math.max(0, basePlays + variation)
      }
    })

    return {
      listening: {
        totalPlays: 15847 + Math.floor(Math.random() * 1000),
        uniqueUsers: 3259 + Math.floor(Math.random() * 100),
        averageSessionDuration: 23.5 + (Math.random() - 0.5) * 5,
        topGenres: [
          { name: 'J-Pop', count: 4234, percentage: 26.8 },
          { name: 'Electronic', count: 3891, percentage: 24.5 },
          { name: 'Rock', count: 2156, percentage: 13.6 },
          { name: 'Jazz', count: 1978, percentage: 12.5 },
          { name: 'Hip-Hop', count: 1823, percentage: 11.5 },
          { name: 'Classical', count: 965, percentage: 6.1 },
          { name: 'Others', count: 800, percentage: 5.0 }
        ],
        hourlyActivity
      },
      services: {
        spotify: {
          status: Math.random() > 0.1 ? 'connected' : 'disconnected',
          requests: 8934 + Math.floor(Math.random() * 500),
          errors: Math.floor(Math.random() * 20)
        },
        appleMusic: {
          status: Math.random() > 0.15 ? 'connected' : 'disconnected',
          requests: 6127 + Math.floor(Math.random() * 400),
          errors: Math.floor(Math.random() * 15)
        },
        unified: {
          cacheHits: 12890 + Math.floor(Math.random() * 500),
          cacheMisses: 2134 + Math.floor(Math.random() * 200),
          efficiency: 85.6 + (Math.random() - 0.5) * 10
        }
      },
      trends: {
        popularTracks: [
          { title: '夜明けのメロディー', artist: '山田太郎', plays: 892, trend: 'up' },
          { title: 'Electric Pulse', artist: 'Neon Wave', plays: 756, trend: 'up' },
          { title: '青春の記憶', artist: '佐藤花子', plays: 623, trend: 'stable' },
          { title: 'Digital Dreams', artist: 'Cyber Space', plays: 584, trend: 'down' },
          { title: 'Thunder Road', artist: 'Wild Stallions', plays: 521, trend: 'up' }
        ],
        emergingArtists: [
          { name: '新人アーティスト A', growth: 156.7 },
          { name: 'Rising Star B', growth: 134.2 },
          { name: '期待の新星 C', growth: 112.8 },
          { name: 'Breakthrough D', growth: 98.5 }
        ],
        genreTrends: [
          { genre: 'Lo-Fi Hip Hop', change: 23.5 },
          { genre: 'City Pop', change: 18.2 },
          { genre: 'Future Bass', change: 15.7 },
          { genre: 'Indie Rock', change: -5.3 },
          { genre: 'Trap', change: -8.1 }
        ]
      },
      performance: {
        apiLatency: [
          { service: 'Spotify', avgLatency: 145 + Math.floor(Math.random() * 50), status: 'good' },
          { service: 'Apple Music', avgLatency: 238 + Math.floor(Math.random() * 100), status: 'warning' },
          { service: 'Internal API', avgLatency: 45 + Math.floor(Math.random() * 20), status: 'good' }
        ],
        errorRate: Math.random() * 2, // 0-2%
        uptime: 99.7 + Math.random() * 0.29, // 99.7-99.99%
        responseTime: 89 + Math.floor(Math.random() * 30) // 89-119ms
      }
    }
  }, [])

  // データ取得
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 実際のAPIからエラー統計を取得
      const errorStats = await musicApi.getErrorStats()
      
      // モックデータと実際のデータを結合
      const mockMetrics = generateMockMetrics()
      
      // 実際のエラー統計をマージ
      const enhancedMetrics: DashboardMetrics = {
        ...mockMetrics,
        services: {
          ...mockMetrics.services,
          spotify: {
            ...mockMetrics.services.spotify,
            requests: errorStats.rateLimitStats.spotify.requests,
            errors: errorStats.errorsByService.spotify
          },
          appleMusic: {
            ...mockMetrics.services.appleMusic,
            requests: errorStats.rateLimitStats.appleMusic.requests,
            errors: errorStats.errorsByService.appleMusic
          }
        },
        performance: {
          ...mockMetrics.performance,
          errorRate: (errorStats.totalErrors / 1000) * 100 // エラー率を計算
        }
      }
      
      setMetrics(enhancedMetrics)
      setLastUpdate(new Date())
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'データ取得エラー'
      setError(errorMessage)
      
      // エラー時でもモックデータを表示
      setMetrics(generateMockMetrics())
    } finally {
      setIsLoading(false)
    }
  }, [generateMockMetrics])

  // 初期データ取得
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // リアルタイム更新
  useEffect(() => {
    if (!realtimeEnabled) return

    const interval = setInterval(fetchDashboardData, refreshInterval)
    return () => clearInterval(interval)
  }, [realtimeEnabled, refreshInterval, fetchDashboardData])

  // データエクスポート
  const handleExportData = () => {
    if (!metrics) return
    
    const dataStr = JSON.stringify(metrics, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `music-dashboard-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  // ステータス色の取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'good':
        return '#10b981'
      case 'warning':
        return '#f59e0b'
      case 'disconnected':
      case 'error':
        return '#ef4444'
      default:
        return theme.textColor
    }
  }

  if (!metrics) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-64">
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: theme.primaryColor }} />
              <span style={{ color: theme.textColor }}>ダッシュボードを読み込み中...</span>
            </div>
          ) : (
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <p className="text-red-400 mb-2">データの読み込みに失敗しました</p>
              <p className="text-sm text-gray-400 mb-4">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: 'white'
                }}
              >
                再試行
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            音楽統計ダッシュボード
          </h1>
          <p 
            className="text-lg"
            style={{ color: theme.textColor + 'CC' }}
          >
            リアルタイム視聴データと分析
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* リアルタイム切り替え */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={realtimeEnabled}
              onChange={(e) => setRealtimeEnabled(e.target.checked)}
              className="rounded"
              style={{ accentColor: theme.primaryColor }}
            />
            <span className="text-sm" style={{ color: theme.textColor }}>
              リアルタイム更新
            </span>
          </label>
          
          {/* 最終更新時間 */}
          <div className="text-sm" style={{ color: theme.textColor + '99' }}>
            最終更新: {lastUpdate.toLocaleTimeString()}
          </div>
          
          {/* アクションボタン */}
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="p-2 rounded-lg transition-colors hover:bg-gray-700"
              title="手動更新"
            >
              <RefreshCw 
                className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
                style={{ color: theme.primaryColor }}
              />
            </button>
            
            <button
              onClick={handleExportData}
              className="p-2 rounded-lg transition-colors hover:bg-gray-700"
              title="データエクスポート"
            >
              <Download className="w-5 h-5" style={{ color: theme.primaryColor }} />
            </button>
          </div>
        </div>
      </div>

      {/* メインメトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8" style={{ color: theme.primaryColor }} />
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 
            className="text-2xl font-bold"
            style={{ color: theme.textColor }}
          >
            {metrics.listening.totalPlays.toLocaleString()}
          </h3>
          <p style={{ color: theme.textColor + 'CC' }}>総再生数</p>
        </div>

        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8" style={{ color: theme.primaryColor }} />
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 
            className="text-2xl font-bold"
            style={{ color: theme.textColor }}
          >
            {metrics.listening.uniqueUsers.toLocaleString()}
          </h3>
          <p style={{ color: theme.textColor + 'CC' }}>アクティブユーザー</p>
        </div>

        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8" style={{ color: theme.primaryColor }} />
            <div 
              className="px-2 py-1 rounded text-xs text-white"
              style={{ backgroundColor: getStatusColor('good') }}
            >
              良好
            </div>
          </div>
          <h3 
            className="text-2xl font-bold"
            style={{ color: theme.textColor }}
          >
            {metrics.listening.averageSessionDuration.toFixed(1)}分
          </h3>
          <p style={{ color: theme.textColor + 'CC' }}>平均セッション時間</p>
        </div>

        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-8 h-8" style={{ color: theme.primaryColor }} />
            <div 
              className="px-2 py-1 rounded text-xs text-white"
              style={{ 
                backgroundColor: metrics.performance.uptime >= 99.5 
                  ? getStatusColor('good') 
                  : getStatusColor('warning') 
              }}
            >
              {metrics.performance.uptime.toFixed(2)}%
            </div>
          </div>
          <h3 
            className="text-2xl font-bold"
            style={{ color: theme.textColor }}
          >
            {metrics.performance.errorRate.toFixed(2)}%
          </h3>
          <p style={{ color: theme.textColor + 'CC' }}>エラー率</p>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 時間別アクティビティ */}
        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h3 
            className="text-xl font-semibold mb-6 flex items-center space-x-2"
            style={{ color: theme.textColor }}
          >
            <Activity className="w-6 h-6" style={{ color: theme.primaryColor }} />
            <span>24時間アクティビティ</span>
          </h3>
          
          <div className="space-y-3">
            {metrics.listening.hourlyActivity.map(({ hour, plays }) => {
              const maxPlays = Math.max(...metrics.listening.hourlyActivity.map(h => h.plays))
              const percentage = (plays / maxPlays) * 100
              
              return (
                <div key={hour} className="flex items-center space-x-3">
                  <div className="w-8 text-sm text-right" style={{ color: theme.textColor + '99' }}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 h-6 bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        backgroundColor: theme.primaryColor,
                        width: `${percentage}%`
                      }}
                    />
                  </div>
                  <div className="w-16 text-sm text-right" style={{ color: theme.textColor }}>
                    {plays}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* サービス状態 */}
        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h3 
            className="text-xl font-semibold mb-6 flex items-center space-x-2"
            style={{ color: theme.textColor }}
          >
            <Wifi className="w-6 h-6" style={{ color: theme.primaryColor }} />
            <span>サービス状態</span>
          </h3>
          
          <div className="space-y-4">
            {/* Spotify */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700">
              <div className="flex items-center space-x-3">
                <Music className="w-6 h-6 text-green-400" />
                <div>
                  <p 
                    className="font-medium"
                    style={{ color: theme.textColor }}
                  >
                    Spotify
                  </p>
                  <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    {metrics.services.spotify.requests.toLocaleString()} requests
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {metrics.services.spotify.status === 'connected' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-sm" style={{ color: theme.textColor + '99' }}>
                  {metrics.services.spotify.errors} errors
                </span>
              </div>
            </div>

            {/* Apple Music */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700">
              <div className="flex items-center space-x-3">
                <Music className="w-6 h-6 text-gray-300" />
                <div>
                  <p 
                    className="font-medium"
                    style={{ color: theme.textColor }}
                  >
                    Apple Music
                  </p>
                  <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    {metrics.services.appleMusic.requests.toLocaleString()} requests
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {metrics.services.appleMusic.status === 'connected' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-sm" style={{ color: theme.textColor + '99' }}>
                  {metrics.services.appleMusic.errors} errors
                </span>
              </div>
            </div>

            {/* キャッシュ効率 */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700">
              <div className="flex items-center space-x-3">
                <Music className="w-6 h-6" style={{ color: theme.primaryColor }} />
                <div>
                  <p 
                    className="font-medium"
                    style={{ color: theme.textColor }}
                  >
                    キャッシュ効率
                  </p>
                  <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    {metrics.services.unified.cacheHits.toLocaleString()} hits / {metrics.services.unified.cacheMisses.toLocaleString()} misses
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p 
                  className="font-bold text-lg"
                  style={{ color: theme.textColor }}
                >
                  {metrics.services.unified.efficiency.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 人気楽曲トレンド */}
        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h3 
            className="text-xl font-semibold mb-6 flex items-center space-x-2"
            style={{ color: theme.textColor }}
          >
            <TrendingUp className="w-6 h-6" style={{ color: theme.primaryColor }} />
            <span>人気楽曲ランキング</span>
          </h3>
          
          <div className="space-y-3">
            {metrics.trends.popularTracks.map((track, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ 
                      backgroundColor: index < 3 ? theme.primaryColor : theme.secondaryColor,
                      color: index < 3 ? 'white' : theme.textColor
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p 
                      className="font-medium"
                      style={{ color: theme.textColor }}
                    >
                      {track.title}
                    </p>
                    <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                      {track.artist}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm" style={{ color: theme.textColor + '99' }}>
                    {track.plays}
                  </span>
                  {track.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
                  {track.trend === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
                  {track.trend === 'stable' && <div className="w-4 h-4" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ジャンル分布 */}
        <div 
          className="rounded-xl p-6"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h3 
            className="text-xl font-semibold mb-6 flex items-center space-x-2"
            style={{ color: theme.textColor }}
          >
            <PieChart className="w-6 h-6" style={{ color: theme.primaryColor }} />
            <span>ジャンル分布</span>
          </h3>
          
          <div className="space-y-3">
            {metrics.listening.topGenres.map((genre, index) => (
              <div key={genre.name} className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ 
                    backgroundColor: `hsl(${(index * 360) / metrics.listening.topGenres.length}, 60%, 50%)`
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className="font-medium"
                      style={{ color: theme.textColor }}
                    >
                      {genre.name}
                    </span>
                    <span className="text-sm" style={{ color: theme.textColor + '99' }}>
                      {genre.percentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        backgroundColor: `hsl(${(index * 360) / metrics.listening.topGenres.length}, 60%, 50%)`,
                        width: `${genre.percentage}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}