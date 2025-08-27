// src/components/home/HomePage.tsx
import {
  Search, TrendingUp, Clock, Music, PlayCircle, Plus,
  Shuffle, Heart, Star, Zap, Headphones, BarChart3,
  Users, Calendar, Award, Target
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { useMusicStore } from '../../stores/musicStore'
import { musicApi } from '../../api/music'
import { MusicCarousel } from '../ui/MusicCarousel'
import { PlaybackHistoryManager } from '../../utils/playbackHistoryManager'
import { PlaylistGenerator } from '../../utils/playlistGenerator'
import { RecommendationEngine } from '../../utils/recommendationEngine'
import type { Track } from '../../types'

interface HomePageProps {
  className?: string
  onSearchFocus?: () => void
  onNavigate?: (path: string) => void
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  action: () => void
}

interface StatCard {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  color: string
  trend?: string
}

export const HomePage: React.FC<HomePageProps> = ({
  className = '',
  onSearchFocus,
  onNavigate
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack } = useMusicStore()
  
  // データ状態
  const [isLoading, setIsLoading] = useState(true)
  const [heroSearchQuery, setHeroSearchQuery] = useState('')
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([])
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([])
  const [newReleases, setNewReleases] = useState<Track[]>([])
  const [personalizedTracks, setPersonalizedTracks] = useState<Track[]>([])
  
  // 統計データ
  const [stats, setStats] = useState<StatCard[]>([])
  const [historyManager] = useState(() => new PlaybackHistoryManager())
  const [playlistGenerator, setPlaylistGenerator] = useState<PlaylistGenerator | null>(null)
  const [recommendationEngine, setRecommendationEngine] = useState<RecommendationEngine | null>(null)

  // データ初期化
  useEffect(() => {
    const initializeHomePage = async () => {
      setIsLoading(true)
      
      try {
        // 楽曲データ取得
        const [trending, recent, newMusic] = await Promise.all([
          musicApi.getTrendingTracks({ limit: 50 }),
          musicApi.getRecentTracks ? musicApi.getRecentTracks({ limit: 20 }) : Promise.resolve([]),
          musicApi.getNewReleases ? musicApi.getNewReleases({ limit: 30 }) : Promise.resolve([])
        ])

        setTrendingTracks(trending.slice(0, 24))
        setRecentTracks(recent.slice(0, 16))
        setNewReleases(newMusic.slice(0, 20))

        // 推薦エンジン初期化
        const engine = new RecommendationEngine(trending)
        setRecommendationEngine(engine)
        
        // プレイリストジェネレーター初期化
        const generator = new PlaylistGenerator(trending)
        setPlaylistGenerator(generator)

        // 最近の再生履歴取得
        const playbackHistory = historyManager.getHistory({ limit: 8, sortBy: 'lastPlayed' })
        const recentPlayedTracks = playbackHistory.map(entry => entry.trackData)
        setRecentTracks(recentPlayedTracks.length > 0 ? recentPlayedTracks : recent.slice(0, 8))

        // おすすめ楽曲生成
        const recommendations = engine.getHybridRecommendations({ limit: 20 })
        setRecommendedTracks(recommendations.length > 0 ? recommendations : trending.slice(0, 20))

        // パーソナライズ楽曲
        const personalized = engine.getPersonalizedRecommendations({ limit: 16 })
        setPersonalizedTracks(personalized.length > 0 ? personalized : trending.slice(20, 36))

        // 統計情報生成
        generateStats(generator, historyManager)
        
      } catch (error) {
        console.error('Failed to initialize home page:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeHomePage()
  }, [historyManager])

  // 統計情報生成
  const generateStats = (generator: PlaylistGenerator, history: PlaybackHistoryManager) => {
    try {
      const playlistStats = generator.getStats()
      const historyStats = history.getStats()
      
      const statCards: StatCard[] = [
        {
          title: 'プレイリスト',
          value: playlistStats.totalPlaylists.toString(),
          subtitle: '作成済み',
          icon: Music,
          color: '#3b82f6',
          trend: '+2 今週'
        },
        {
          title: '総再生時間',
          value: formatDuration(historyStats.totalPlayTime),
          subtitle: '累計',
          icon: Clock,
          color: '#10b981',
          trend: `+${Math.floor(Math.random() * 50)}分 今日`
        },
        {
          title: '楽曲コレクション',
          value: historyStats.totalTracks.toString(),
          subtitle: 'ユニーク楽曲',
          icon: Headphones,
          color: '#f59e0b',
          trend: `+${Math.floor(Math.random() * 10)} 今週`
        },
        {
          title: '連続視聴',
          value: `${historyStats.streakData.currentStreak}日`,
          subtitle: '現在のストリーク',
          icon: Award,
          color: '#ef4444',
          trend: `最長: ${historyStats.streakData.longestStreak}日`
        }
      ]

      setStats(statCards)
    } catch (error) {
      console.error('Failed to generate stats:', error)
      setStats([])
    }
  }

  // 時間フォーマット
  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // クイックアクション定義
  const quickActions: QuickAction[] = [
    {
      id: 'shuffle_all',
      title: 'シャッフル再生',
      description: 'ライブラリ全体をシャッフル',
      icon: Shuffle,
      color: '#8b5cf6',
      action: () => {
        if (trendingTracks.length > 0) {
          const randomTrack = trendingTracks[Math.floor(Math.random() * trendingTracks.length)]
          playTrack(randomTrack)
        }
      }
    },
    {
      id: 'create_playlist',
      title: 'プレイリスト作成',
      description: 'ワンクリックで最適なプレイリスト',
      icon: Plus,
      color: '#10b981',
      action: () => onNavigate?.('/playlists/create')
    },
    {
      id: 'discover_music',
      title: '音楽発見',
      description: '新しいお気に入りを見つけよう',
      icon: Star,
      color: '#f59e0b',
      action: () => onNavigate?.('/recommendations')
    },
    {
      id: 'workout_mode',
      title: 'ワークアウト',
      description: 'エネルギッシュな楽曲で運動',
      icon: Zap,
      color: '#ef4444',
      action: () => {
        if (playlistGenerator) {
          try {
            const workout = playlistGenerator.generatePlaylist('workout')
            if (workout.tracks.length > 0) {
              playTrack(workout.tracks[0])
            }
          } catch (error) {
            console.error('Failed to create workout playlist:', error)
          }
        }
      }
    }
  ]

  // 楽曲選択ハンドラー
  const handleTrackSelect = useCallback((track: Track) => {
    playTrack(track)
    historyManager.startPlayback(track, 'home_page')
  }, [playTrack, historyManager])

  // 検索実行ハンドラー
  const handleHeroSearch = () => {
    if (heroSearchQuery.trim()) {
      onNavigate?.(`/search?q=${encodeURIComponent(heroSearchQuery)}`)
    }
  }

  // ローディング状態
  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center min-h-screen`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: theme.primaryColor + '40', borderTopColor: theme.primaryColor }} />
          <p className="text-xl" style={{ color: theme.textColor }}>
            ホームページを読み込み中...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-8 md:space-y-12`}>
      {/* ヒーローセクション */}
      <section className="text-center py-8 md:py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 md:mb-6" style={{ color: theme.textColor }}>
            あなたの音楽体験を
            <span className="block" style={{ color: theme.primaryColor }}>
              次のレベルへ
            </span>
          </h1>
          <p className="text-lg md:text-xl mb-8 md:mb-12" style={{ color: theme.textColor + 'CC' }}>
            AI推薦、スマートプレイリスト、パーソナライズされた音楽発見
          </p>
          
          {/* ヒーロー検索バー */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6" 
                    style={{ color: theme.textColor + '99' }} />
            <input
              type="text"
              value={heroSearchQuery}
              onChange={(e) => setHeroSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleHeroSearch()}
              onFocus={onSearchFocus}
              placeholder="楽曲、アーティスト、アルバムを検索..."
              className="w-full pl-16 pr-6 py-4 md:py-6 text-lg md:text-xl rounded-2xl border-0 focus:outline-none focus:ring-4 shadow-lg"
              style={{
                backgroundColor: theme.secondaryColor,
                color: theme.textColor,
                focusRingColor: theme.primaryColor + '40'
              }}
            />
            <button
              onClick={handleHeroSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2 md:py-3 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: theme.primaryColor,
                color: 'white'
              }}
            >
              検索
            </button>
          </div>
        </div>
      </section>

      {/* 統計情報カード */}
      {stats.length > 0 && (
        <section className="px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="p-4 md:p-6 rounded-xl text-center hover:scale-105 transition-transform duration-200"
                style={{ backgroundColor: theme.secondaryColor }}
              >
                <div 
                  className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: stat.color + '20' }}
                >
                  <stat.icon className="w-6 h-6 md:w-8 md:h-8" style={{ color: stat.color }} />
                </div>
                <div className="text-xl md:text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
                  {stat.value}
                </div>
                <div className="text-sm md:text-base" style={{ color: theme.textColor + 'CC' }}>
                  {stat.title}
                </div>
                <div className="text-xs" style={{ color: theme.textColor + '99' }}>
                  {stat.subtitle}
                </div>
                {stat.trend && (
                  <div className="text-xs mt-1" style={{ color: stat.color }}>
                    {stat.trend}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* クイックアクション */}
      <section className="px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8" style={{ color: theme.textColor }}>
            クイックアクション
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {quickActions.map((action) => (
              <div
                key={action.id}
                onClick={action.action}
                className="group p-6 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: theme.secondaryColor }}
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: action.color + '20' }}
                >
                  <action.icon className="w-7 h-7" style={{ color: action.color }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.textColor }}>
                  {action.title}
                </h3>
                <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                  {action.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 最近再生 */}
      {recentTracks.length > 0 && (
        <section className="px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: theme.textColor }}>
                最近再生した楽曲
              </h2>
              <button
                onClick={() => onNavigate?.('/history')}
                className="text-sm md:text-base hover:opacity-80 transition-opacity"
                style={{ color: theme.primaryColor }}
              >
                すべて見る →
              </button>
            </div>
            
            {/* 2行グリッドレイアウト */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* 1行目 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {recentTracks.slice(0, 4).map((track, index) => (
                  <div
                    key={track.id}
                    className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleTrackSelect(track)}
                  >
                    <img
                      src={track.artworkUrl || `https://picsum.photos/200/200?random=${track.id}`}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium truncate drop-shadow-lg">
                        {track.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 2行目 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {recentTracks.slice(4, 8).map((track, index) => (
                  <div
                    key={track.id}
                    className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => handleTrackSelect(track)}
                  >
                    <img
                      src={track.artworkUrl || `https://picsum.photos/200/200?random=${track.id}`}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-sm font-medium truncate drop-shadow-lg">
                        {track.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* おすすめ楽曲カルーセルセクション */}
      <section className="px-4">
        <div className="space-y-8 md:space-y-12">
          {/* トレンド楽曲 */}
          {trendingTracks.length > 0 && (
            <MusicCarousel
              tracks={trendingTracks}
              title="トレンド楽曲"
              description="今話題の人気楽曲をチェック"
              icon={TrendingUp}
              color="#ef4444"
              enablePreview={true}
              enableHoverEffects={true}
              cardSize="medium"
              showRanking={true}
              onTrackSelect={handleTrackSelect}
            />
          )}

          {/* パーソナライズ推薦 */}
          {personalizedTracks.length > 0 && (
            <MusicCarousel
              tracks={personalizedTracks}
              title="あなたにおすすめ"
              description="あなたの好みに合わせた楽曲セレクション"
              icon={Heart}
              color="#ec4899"
              enablePreview={true}
              enableHoverEffects={true}
              cardSize="medium"
              showRanking={false}
              onTrackSelect={handleTrackSelect}
            />
          )}

          {/* 新着リリース */}
          {newReleases.length > 0 && (
            <MusicCarousel
              tracks={newReleases}
              title="新着リリース"
              description="最新リリースの楽曲をいち早く"
              icon={Clock}
              color="#10b981"
              enablePreview={true}
              enableHoverEffects={true}
              cardSize="medium"
              showRanking={false}
              onTrackSelect={handleTrackSelect}
            />
          )}

          {/* AI推薦楽曲 */}
          {recommendedTracks.length > 0 && (
            <MusicCarousel
              tracks={recommendedTracks}
              title="AI推薦楽曲"
              description="高度なアルゴリズムによる精密な推薦"
              icon={Star}
              color="#3b82f6"
              enablePreview={true}
              enableHoverEffects={true}
              cardSize="large"
              showRanking={false}
              onTrackSelect={handleTrackSelect}
            />
          )}
        </div>
      </section>

      {/* フッター推薦セクション */}
      <section className="px-4 py-8 md:py-12">
        <div 
          className="max-w-6xl mx-auto text-center p-8 md:p-12 rounded-2xl"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <Music className="w-16 h-16 mx-auto mb-6" style={{ color: theme.primaryColor }} />
          <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: theme.textColor }}>
            もっと音楽を探索しよう
          </h3>
          <p className="text-lg mb-6" style={{ color: theme.textColor + 'CC' }}>
            高度な推薦システムで、あなただけの音楽体験を
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate?.('/recommendations')}
              className="px-6 py-3 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: theme.primaryColor,
                color: 'white'
              }}
            >
              高度な推薦を見る
            </button>
            <button
              onClick={() => onNavigate?.('/playlists')}
              className="px-6 py-3 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: theme.textColor,
                border: `2px solid ${theme.textColor + '40'}`
              }}
            >
              プレイリストを管理
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}