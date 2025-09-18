// src/components/home/AdvancedRecommendations.tsx
import { 
  ChevronLeft, ChevronRight, Heart, Play, Plus, RefreshCw, TrendingUp,
  Music, Zap, Coffee, Users, Clock, Star, Filter, Shuffle
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { musicApi } from '../../api/music'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import type { Track } from '../../types'

// 拡張されたTrack型（音楽分析データを含む）
interface EnhancedTrack extends Track {
  genre: string[]
  mood: string[]
  bpm?: number
  key?: string
  energy: number // 0-1
  danceability: number // 0-1
  valence: number // 0-1 (positivity)
  releaseDate: string
  popularity: number // 0-100
}

// 推薦セクション定義
interface RecommendationSection {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  tracks: EnhancedTrack[]
  isLoading: boolean
  error?: string
  algorithm: 'genre' | 'popularity' | 'energy' | 'recent' | 'mood' | 'similarity'
  params: Record<string, unknown>
  refreshable: boolean
  customizable: boolean
  priority: number
}

// ユーザー履歴追跡
interface UserInteraction {
  trackId: string
  action: 'play' | 'like' | 'skip' | 'add_to_playlist'
  timestamp: Date
  context?: string
}

interface AdvancedRecommendationsProps {
  className?: string
  maxSections?: number
  tracksPerSection?: number
  enableUserLearning?: boolean
  enableHoverPreview?: boolean
  enableCustomization?: boolean
}

export const AdvancedRecommendations: React.FC<AdvancedRecommendationsProps> = ({
  className = '',
  maxSections = 8,
  tracksPerSection = 12,
  enableUserLearning = true,
  enableHoverPreview = true,
  enableCustomization = true
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack, currentTrack, isPlaying } = useMusicStore()
  
  const [sections, setSections] = useState<RecommendationSection[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [userInteractions, setUserInteractions] = useState<UserInteraction[]>([])
  const [availableGenres] = useState<string[]>([])
  const [previewTrack, setPreviewTrack] = useState<EnhancedTrack | null>(null)
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({})
  const [selectedFilters] = useState<{
    genres: string[]
    energyRange: [number, number]
    popularityRange: [number, number]
  }>({
    genres: [],
    energyRange: [0, 1],
    popularityRange: [0, 100]
  })

  const hoverTimeoutRef = useRef<number>()

  // 推薦セクション定義の生成
  const createRecommendationSections = useCallback((): RecommendationSection[] => [
    {
      id: 'trending',
      title: 'トレンド楽曲',
      description: '今最も人気の楽曲',
      icon: TrendingUp,
      color: '#ef4444',
      tracks: [],
      isLoading: true,
      algorithm: 'popularity',
      params: { sortBy: 'popularity', timeRange: 'week' },
      refreshable: true,
      customizable: false,
      priority: 1
    },
    {
      id: 'new_releases',
      title: '新着リリース',
      description: '最新の楽曲をチェック',
      icon: Clock,
      color: '#10b981',
      tracks: [],
      isLoading: true,
      algorithm: 'recent',
      params: { sortBy: 'releaseDate', limit: tracksPerSection },
      refreshable: true,
      customizable: false,
      priority: 2
    },
    {
      id: 'high_energy',
      title: 'ハイエナジー',
      description: 'エネルギッシュな楽曲',
      icon: Zap,
      color: '#f59e0b',
      tracks: [],
      isLoading: true,
      algorithm: 'energy',
      params: { energyMin: 0.7, sortBy: 'energy' },
      refreshable: true,
      customizable: true,
      priority: 3
    },
    {
      id: 'chill_vibes',
      title: 'チルアウト',
      description: 'リラックスできる楽曲',
      icon: Coffee,
      color: '#8b5cf6',
      tracks: [],
      isLoading: true,
      algorithm: 'mood',
      params: { mood: 'relaxing', energyMax: 0.5 },
      refreshable: true,
      customizable: true,
      priority: 4
    },
    {
      id: 'edm_electronic',
      title: 'EDM・エレクトロニック',
      description: 'ダンス・エレクトロニックミュージック',
      icon: Music,
      color: '#3b82f6',
      tracks: [],
      isLoading: true,
      algorithm: 'genre',
      params: { genres: ['Electronic', 'EDM', 'House', 'Techno'] },
      refreshable: true,
      customizable: true,
      priority: 5
    },
    {
      id: 'jazz_classics',
      title: 'ジャズ・クラシックス',
      description: '上質なジャズセレクション',
      icon: Star,
      color: '#d97706',
      tracks: [],
      isLoading: true,
      algorithm: 'genre',
      params: { genres: ['Jazz', 'Smooth Jazz', 'Bebop', 'Blues'] },
      refreshable: true,
      customizable: true,
      priority: 6
    },
    {
      id: 'j_pop_hits',
      title: 'J-Popヒッツ',
      description: '話題のJ-Pop楽曲',
      icon: Heart,
      color: '#ec4899',
      tracks: [],
      isLoading: true,
      algorithm: 'genre',
      params: { genres: ['J-Pop', 'K-Pop'], popularityMin: 70 },
      refreshable: true,
      customizable: true,
      priority: 7
    },
    {
      id: 'personalized',
      title: 'あなたへのおすすめ',
      description: '視聴履歴に基づく提案',
      icon: Users,
      color: '#06b6d4',
      tracks: [],
      isLoading: true,
      algorithm: 'similarity',
      params: { basedOnHistory: true },
      refreshable: true,
      customizable: false,
      priority: 8
    }
  ], [tracksPerSection])

  // ユーザーインタラクションの記録
  const recordInteraction = useCallback((trackId: string, action: UserInteraction['action'], context?: string) => {
    if (!enableUserLearning) return

    setUserInteractions(prev => {
      const newInteraction: UserInteraction = {
        trackId,
        action,
        timestamp: new Date(),
        context
      }
      
      // 最新1000件のインタラクションを保持
      const updated = [newInteraction, ...prev].slice(0, 1000)
      
      // LocalStorageに保存
      try {
        localStorage.setItem('user-music-interactions', JSON.stringify(updated))
      } catch (error) {
        console.warn('Failed to save user interactions:', error)
      }
      
      return updated
    })
  }, [enableUserLearning])

  // ユーザー履歴の分析
  const analyzeUserPreferences = useCallback(() => {
    if (userInteractions.length === 0) return null

    const recentInteractions = userInteractions.slice(0, 100) // 最近100件を分析

    // TODO: 実際の実装では、trackIdから楽曲データを取得して分析
    // ここではモック実装
    const mockAnalysis = {
      preferredGenres: ['Electronic', 'J-Pop', 'Rock'],
      preferredMoods: ['energetic', 'uplifting'],
      averageEnergy: 0.7,
      averagePopularity: 75,
      playtimeHours: [8, 12, 18, 22], // よく聞く時間帯
      recentlyLiked: recentInteractions
        .filter(i => i.action === 'like')
        .map(i => i.trackId)
        .slice(0, 10)
    }

    return mockAnalysis
  }, [userInteractions])

  // アルゴリズム別の楽曲取得
  const fetchTracksByAlgorithm = useCallback(async (
    algorithm: RecommendationSection['algorithm'],
    params: Record<string, unknown>
  ): Promise<EnhancedTrack[]> => {
    try {
      switch (algorithm) {
        case 'popularity':
          return await musicApi.getTrendingTracks({
            limit: tracksPerSection,
            ...params
          }) as EnhancedTrack[]

        case 'recent':
          return await musicApi.getNewReleases(tracksPerSection) as EnhancedTrack[]

        case 'energy':
          return await musicApi.advancedSearch({
            energyMin: params.energyMin as number,
            energyMax: params.energyMax as number,
            limit: tracksPerSection
          }).then(result => result.tracks as EnhancedTrack[])

        case 'genre': {
          const genres = params.genres as string[]
          if (genres.length === 0) return []
          
          const genreResults = await Promise.all(
            genres.map(genre => 
              musicApi.getTracksByGenre(genre, Math.ceil(tracksPerSection / genres.length))
            )
          )
          return genreResults.flat() as EnhancedTrack[]
        }

        case 'mood': {
          const mood = params.mood as string
          if (!mood) return []
          
          return await musicApi.getTracksByMood(mood, tracksPerSection) as EnhancedTrack[]
        }

        case 'similarity': {
          const userPrefs = analyzeUserPreferences()
          if (!userPrefs) {
            // 履歴がない場合はポピュラー楽曲を返す
            return await musicApi.getTrendingTracks({ limit: tracksPerSection }) as EnhancedTrack[]
          }
          
          return await musicApi.getRecommendations({
            genres: userPrefs.preferredGenres,
            targetEnergy: userPrefs.averageEnergy,
            limit: tracksPerSection
          }) as EnhancedTrack[]
        }

        default:
          return []
      }
    } catch (error) {
      console.error(`Failed to fetch tracks for algorithm ${algorithm}:`, error)
      return []
    }
  }, [tracksPerSection, analyzeUserPreferences])

  // セクションデータの読み込み
  const loadSectionData = useCallback(async (section: RecommendationSection) => {
    setSections(prev => prev.map(s => 
      s.id === section.id 
        ? { ...s, isLoading: true, error: undefined }
        : s
    ))

    try {
      let tracks = await fetchTracksByAlgorithm(section.algorithm, section.params)
      
      // フィルター適用
      if (selectedFilters.genres.length > 0) {
        tracks = tracks.filter(track => 
          track.genre?.some(g => selectedFilters.genres.includes(g))
        )
      }
      
      if (selectedFilters.energyRange[0] > 0 || selectedFilters.energyRange[1] < 1) {
        tracks = tracks.filter(track => 
          track.energy >= selectedFilters.energyRange[0] && 
          track.energy <= selectedFilters.energyRange[1]
        )
      }
      
      if (selectedFilters.popularityRange[0] > 0 || selectedFilters.popularityRange[1] < 100) {
        tracks = tracks.filter(track => 
          track.popularity >= selectedFilters.popularityRange[0] && 
          track.popularity <= selectedFilters.popularityRange[1]
        )
      }

      setSections(prev => prev.map(s => 
        s.id === section.id 
          ? { ...s, tracks: tracks.slice(0, tracksPerSection), isLoading: false }
          : s
      ))
    } catch (error) {
      setSections(prev => prev.map(s => 
        s.id === section.id 
          ? { 
              ...s, 
              tracks: [], 
              isLoading: false, 
              error: error instanceof Error ? error.message : '読み込みエラー'
            }
          : s
      ))
    }
  }, [fetchTracksByAlgorithm, selectedFilters, tracksPerSection])

  // 全セクションの読み込み
  const loadAllSections = useCallback(async () => {
    setIsInitialLoading(true)
    
    const initialSections = createRecommendationSections()
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxSections)
    
    setSections(initialSections)

    const loadPromises = initialSections.map(section => loadSectionData(section))
    await Promise.all(loadPromises)
    
    setIsInitialLoading(false)
  }, [createRecommendationSections, maxSections, loadSectionData])

  // 初期化
  useEffect(() => {
    // 保存されたユーザーインタラクションを読み込み
    try {
      const saved = localStorage.getItem('user-music-interactions')
      if (saved) {
        const parsed = JSON.parse(saved) as UserInteraction[]
        setUserInteractions(parsed.map(i => ({
          ...i,
          timestamp: new Date(i.timestamp)
        })))
      }
    } catch (error) {
      console.warn('Failed to load user interactions:', error)
    }

    // 利用可能なジャンル一覧を取得
    musicApi.getAvailableGenres().then(setAvailableGenres)
    
    loadAllSections()
  }, [loadAllSections])

  // 楽曲プレビュー処理
  const handleTrackHover = useCallback((track: EnhancedTrack) => {
    if (!enableHoverPreview) return

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    hoverTimeoutRef.current = window.setTimeout(() => {
      setPreviewTrack(track)
    }, 1000) // 1秒ホバーでプレビュー開始
  }, [enableHoverPreview])

  const handleTrackLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    setPreviewTrack(null)
  }, [])

  // 楽曲選択処理
  const handleTrackSelect = useCallback((track: EnhancedTrack, context: string) => {
    playTrack(track)
    recordInteraction(track.id, 'play', context)
  }, [playTrack, recordInteraction])

  // いいね処理
  const handleLikeTrack = useCallback((track: EnhancedTrack, e: React.MouseEvent) => {
    e.stopPropagation()
    recordInteraction(track.id, 'like', 'recommendation')
    // TODO: お気に入りに追加の実装
    console.log('Liked track:', track.title)
  }, [recordInteraction])

  // プレイリスト追加処理
  const handleAddToPlaylist = useCallback((track: EnhancedTrack, e: React.MouseEvent) => {
    e.stopPropagation()
    recordInteraction(track.id, 'add_to_playlist', 'recommendation')
    // TODO: プレイリスト追加の実装
    console.log('Added to playlist:', track.title)
  }, [recordInteraction])

  // カルーセルスクロール処理
  const scrollSection = useCallback((sectionId: string, direction: 'left' | 'right') => {
    setScrollPositions(prev => {
      const current = prev[sectionId] || 0
      const maxScroll = Math.max(0, (sections.find(s => s.id === sectionId)?.tracks.length || 0) - 6)
      const newPosition = direction === 'left' 
        ? Math.max(0, current - 1)
        : Math.min(maxScroll, current + 1)
      
      return { ...prev, [sectionId]: newPosition }
    })
  }, [sections])

  // セクション更新処理
  const refreshSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (section) {
      loadSectionData(section)
    }
  }, [sections, loadSectionData])

  // 楽曲カードコンポーネント
  const TrackCard: React.FC<{ 
    track: EnhancedTrack
    sectionId: string
  }> = ({ track, sectionId }) => (
    <div
      className="flex-shrink-0 w-48 cursor-pointer group"
      onMouseEnter={() => handleTrackHover(track)}
      onMouseLeave={handleTrackLeave}
      onClick={() => handleTrackSelect(track, sectionId)}
    >
      <div 
        className="relative rounded-xl p-4 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl"
        style={{ backgroundColor: theme.secondaryColor }}
      >
        {/* アートワーク */}
        <div className="relative mb-3">
          <img
            src={track.artworkUrl || `https://picsum.photos/200/200?random=${track.id}`}
            alt={track.title}
            className="w-full aspect-square rounded-lg object-cover shadow-lg"
          />
          
          {/* プレイオーバーレイ */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
            <Play 
              className="w-12 h-12 text-white drop-shadow-lg transform scale-100 group-hover:scale-110 transition-transform"
              fill="white"
            />
          </div>

          {/* 楽曲情報バッジ */}
          <div className="absolute top-2 left-2 flex flex-col space-y-1">
            {track.popularity >= 80 && (
              <div className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                🔥 HOT
              </div>
            )}
            {track.energy >= 0.8 && (
              <div className="px-2 py-1 bg-yellow-500 text-black text-xs rounded-full">
                ⚡ HIGH
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleLikeTrack(track, e)}
              className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
            >
              <Heart className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => handleAddToPlaylist(track, e)}
              className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* 現在再生中のインジケーター */}
          {currentTrack?.id === track.id && isPlaying && (
            <div className="absolute bottom-2 right-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* 楽曲情報 */}
        <div>
          <h3 
            className="font-medium text-sm truncate mb-1"
            style={{ color: theme.textColor }}
          >
            {track.title}
          </h3>
          <p 
            className="text-xs truncate mb-2"
            style={{ color: theme.textColor + 'CC' }}
          >
            {track.artist}
          </p>
          
          {/* メタデータ */}
          <div className="flex items-center justify-between text-xs" style={{ color: theme.textColor + '99' }}>
            <span>{track.popularity}% 人気</span>
            <span>{Math.round(track.energy * 100)}% エネルギー</span>
          </div>
          
          {/* ジャンルタグ */}
          {track.genre && track.genre.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {track.genre.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-1 text-xs rounded-full"
                  style={{
                    backgroundColor: theme.primaryColor + '20',
                    color: theme.primaryColor
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className={`${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: theme.textColor }}
          >
            高度なおすすめ機能
          </h1>
          <p 
            className="text-lg"
            style={{ color: theme.textColor + 'CC' }}
          >
            250曲のデータベースから最適化された楽曲をお届け
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* フィルターボタン */}
          {enableCustomization && (
            <button
              className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              style={{
                backgroundColor: theme.secondaryColor,
                color: theme.textColor
              }}
            >
              <Filter className="w-4 h-4" />
              <span>フィルター</span>
            </button>
          )}
          
          {/* 全体更新ボタン */}
          <button
            onClick={loadAllSections}
            disabled={isInitialLoading}
            className="px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
            style={{
              backgroundColor: theme.primaryColor,
              color: 'white'
            }}
          >
            <Shuffle className={`w-4 h-4 ${isInitialLoading ? 'animate-spin' : ''}`} />
            <span>{isInitialLoading ? '読み込み中...' : '全体更新'}</span>
          </button>
        </div>
      </div>

      {/* セクション一覧 */}
      <div className="space-y-12">
        {sections.map((section) => {
          const scrollPosition = scrollPositions[section.id] || 0
          const maxScroll = Math.max(0, section.tracks.length - 6)
          
          return (
            <div key={section.id} className="section-container">
              {/* セクションヘッダー */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: section.color + '20' }}
                  >
                    <section.icon 
                      className="w-6 h-6" 
                      style={{ color: section.color }} 
                    />
                  </div>
                  <div>
                    <h2 
                      className="text-xl font-semibold"
                      style={{ color: theme.textColor }}
                    >
                      {section.title}
                    </h2>
                    <p 
                      className="text-sm"
                      style={{ color: theme.textColor + 'CC' }}
                    >
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* 更新ボタン */}
                  {section.refreshable && (
                    <button
                      onClick={() => refreshSection(section.id)}
                      disabled={section.isLoading}
                      className="p-2 rounded-lg transition-colors hover:bg-gray-700"
                      title="セクション更新"
                    >
                      <RefreshCw 
                        className={`w-4 h-4 ${section.isLoading ? 'animate-spin' : ''}`}
                        style={{ color: theme.primaryColor }}
                      />
                    </button>
                  )}

                  {/* ナビゲーションボタン */}
                  <button
                    onClick={() => scrollSection(section.id, 'left')}
                    disabled={scrollPosition === 0}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" style={{ color: theme.textColor }} />
                  </button>
                  
                  <button
                    onClick={() => scrollSection(section.id, 'right')}
                    disabled={scrollPosition >= maxScroll}
                    className="p-2 rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" style={{ color: theme.textColor }} />
                  </button>
                </div>
              </div>

              {/* セクションコンテンツ */}
              <div className="relative overflow-hidden">
                {section.isLoading && (
                  <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin" style={{ color: theme.primaryColor }} />
                  </div>
                )}

                {section.error && (
                  <div 
                    className="p-6 rounded-xl text-center"
                    style={{ backgroundColor: theme.secondaryColor }}
                  >
                    <p className="text-red-400 mb-3">{section.error}</p>
                    <button
                      onClick={() => refreshSection(section.id)}
                      className="px-4 py-2 rounded-lg text-sm transition-colors"
                      style={{ 
                        backgroundColor: theme.primaryColor,
                        color: 'white'
                      }}
                    >
                      再試行
                    </button>
                  </div>
                )}

                {!section.isLoading && !section.error && section.tracks.length > 0 && (
                  <div 
                    className="flex space-x-4 transition-transform duration-300"
                    style={{
                      transform: `translateX(-${scrollPosition * 200}px)`
                    }}
                  >
                    {section.tracks.map((track) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        sectionId={section.id}
                      />
                    ))}
                  </div>
                )}

                {!section.isLoading && !section.error && section.tracks.length === 0 && (
                  <div 
                    className="p-8 text-center rounded-xl"
                    style={{ backgroundColor: theme.secondaryColor }}
                  >
                    <p style={{ color: theme.textColor + 'CC' }}>
                      楽曲が見つかりませんでした
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* プレビュー再生中の表示 */}
      {previewTrack && enableHoverPreview && (
        <div 
          className="fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl z-50"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center space-x-3">
            <img
              src={previewTrack.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
              alt={previewTrack.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <p className="font-medium text-sm" style={{ color: theme.textColor }}>
                プレビュー再生中
              </p>
              <p className="text-xs" style={{ color: theme.textColor + 'CC' }}>
                {previewTrack.title} - {previewTrack.artist}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}