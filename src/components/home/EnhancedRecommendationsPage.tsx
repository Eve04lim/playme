// src/components/home/EnhancedRecommendationsPage.tsx
import { 
  TrendingUp, Zap, Heart, Music, Star, Clock, 
  Filter, Shuffle, Settings, BarChart3
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { musicApi } from '../../api/music'
import { MusicCarousel } from '../ui/MusicCarousel'
import { useMyPageStore } from '../../stores/myPageStore'
import { useHoverPreview } from '../../hooks/useHoverPreview'
import { RecommendationEngine } from '../../utils/recommendationEngine'

// 拡張されたTrack型
interface EnhancedTrack {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  artworkUrl?: string
  previewUrl?: string
  externalUrl?: string
  genre: string[]
  mood: string[]
  bpm?: number
  energy: number
  danceability: number
  valence: number
  popularity: number
  releaseDate: string
  createdAt?: string
}

// ランキングカテゴリ
interface RankingCategory {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  algorithm: 'popularity' | 'energy' | 'recent' | 'danceability' | 'hybrid'
  params?: Record<string, unknown>
}

// フィルター設定
interface FilterSettings {
  genres: string[]
  energyRange: [number, number]
  popularityRange: [number, number]
  bpmRange: [number, number]
  yearRange: [number, number]
  onlyWithPreview: boolean
}

interface EnhancedRecommendationsPageProps {
  className?: string
}

export const EnhancedRecommendationsPage: React.FC<EnhancedRecommendationsPageProps> = ({
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  
  const [allTracks, setAllTracks] = useState<EnhancedTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [availableGenres, setAvailableGenres] = useState<string[]>([])
  const [recommendationEngine, setRecommendationEngine] = useState<RecommendationEngine | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    genres: [],
    energyRange: [0, 1],
    popularityRange: [0, 100],
    bpmRange: [60, 200],
    yearRange: [2020, 2024],
    onlyWithPreview: false
  })

  // ホバープレビュー機能
  const { startPreview, stopPreview, previewState } = useHoverPreview({
    enabled: true,
    volume: 0.4,
    maxPreviewDuration: 15000, // 15秒
    onPreviewStart: (track) => {
      console.log('Preview started:', track.title)
    },
    onPreviewEnd: (track) => {
      console.log('Preview ended:', track.title)
    }
  })

  // ランキングカテゴリ定義
  const rankingCategories: RankingCategory[] = [
    {
      id: 'top_hits',
      title: '人気楽曲ランキング',
      description: '最も人気の高い楽曲をランキング形式で',
      icon: TrendingUp,
      color: '#ef4444',
      algorithm: 'popularity'
    },
    {
      id: 'high_energy',
      title: 'エネルギーランキング',
      description: 'エネルギッシュな楽曲をエネルギー値順に',
      icon: Zap,
      color: '#f59e0b',
      algorithm: 'energy'
    },
    {
      id: 'new_releases',
      title: '新着リリース',
      description: '最新の楽曲をリリース日順に',
      icon: Clock,
      color: '#10b981',
      algorithm: 'recent'
    },
    {
      id: 'dance_hits',
      title: 'ダンスヒッツ',
      description: 'ダンサビリティの高い楽曲',
      icon: Music,
      color: '#8b5cf6',
      algorithm: 'danceability'
    },
    {
      id: 'ai_recommended',
      title: 'AI推薦ランキング',
      description: '高度なアルゴリズムによる総合ランキング',
      icon: Star,
      color: '#06b6d4',
      algorithm: 'hybrid'
    }
  ]

  // ジャンル別カテゴリ
  const genreCategories = [
    { id: 'edm', title: 'EDM・エレクトロニック', genres: ['Electronic', 'EDM', 'House', 'Techno', 'Dubstep'], color: '#3b82f6' },
    { id: 'jazz', title: 'ジャズ・クラシックス', genres: ['Jazz', 'Smooth Jazz', 'Bebop', 'Blues'], color: '#d97706' },
    { id: 'jpop', title: 'J-Pop・K-Pop', genres: ['J-Pop', 'K-Pop'], color: '#ec4899' },
    { id: 'rock', title: 'ロック・オルタナティブ', genres: ['Rock', 'Alternative Rock', 'Hard Rock', 'Indie Rock'], color: '#dc2626' },
    { id: 'hiphop', title: 'ヒップホップ・R&B', genres: ['Hip-Hop', 'Rap', 'R&B', 'Soul'], color: '#7c3aed' }
  ]

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      try {
        // 250曲のデータセットを取得
        const [trending, genres] = await Promise.all([
          musicApi.getTrendingTracks({ limit: 250 }),
          musicApi.getAvailableGenres()
        ])
        
        const enhancedTracks = trending as EnhancedTrack[]
        setAllTracks(enhancedTracks)
        setAvailableGenres(genres)
        
        // 推薦エンジンの初期化
        const engine = new RecommendationEngine(enhancedTracks)
        
        // 模擬的なユーザーインタラクションデータを追加（実際の実装では localStorage から読み込み）
        const mockInteractions = generateMockUserInteractions(enhancedTracks)
        engine.addInteractions(mockInteractions)
        
        setRecommendationEngine(engine)
        
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // 模擬ユーザーインタラクションの生成
  const generateMockUserInteractions = (tracks: EnhancedTrack[]) => {
    const interactions = []
    const now = new Date()
    
    // 過去30日間のランダムなインタラクションを生成
    for (let i = 0; i < 100; i++) {
      const track = tracks[Math.floor(Math.random() * tracks.length)]
      const daysAgo = Math.floor(Math.random() * 30)
      const timestamp = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      
      const actions: ('play' | 'like' | 'skip' | 'add_to_playlist')[] = ['play', 'like', 'skip', 'add_to_playlist']
      const action = actions[Math.floor(Math.random() * actions.length)]
      
      interactions.push({
        trackId: track.id,
        action,
        timestamp,
        context: 'recommendation',
        playDuration: action === 'play' ? Math.random() * track.duration : undefined,
        completionRate: action === 'play' ? Math.random() * 0.8 + 0.2 : undefined
      })
    }
    
    return interactions
  }

  // フィルター適用
  const applyFilters = useCallback((tracks: EnhancedTrack[]): EnhancedTrack[] => {
    return tracks.filter(track => {
      // ジャンルフィルター
      if (filterSettings.genres.length > 0 && 
          !track.genre.some(g => filterSettings.genres.includes(g))) {
        return false
      }
      
      // エネルギーフィルター
      if (track.energy < filterSettings.energyRange[0] || 
          track.energy > filterSettings.energyRange[1]) {
        return false
      }
      
      // 人気度フィルター
      if (track.popularity < filterSettings.popularityRange[0] || 
          track.popularity > filterSettings.popularityRange[1]) {
        return false
      }
      
      // BPMフィルター
      if (track.bpm && (track.bpm < filterSettings.bpmRange[0] || 
                       track.bpm > filterSettings.bpmRange[1])) {
        return false
      }
      
      // 年代フィルター
      const year = new Date(track.releaseDate).getFullYear()
      if (year < filterSettings.yearRange[0] || year > filterSettings.yearRange[1]) {
        return false
      }
      
      // プレビュー有無フィルター
      if (filterSettings.onlyWithPreview && !track.previewUrl) {
        return false
      }
      
      return true
    })
  }, [filterSettings])

  // アルゴリズム別楽曲取得
  const getTracksByAlgorithm = useCallback((algorithm: RankingCategory['algorithm'], limit: number = 12): EnhancedTrack[] => {
    const filteredTracks = applyFilters(allTracks)
    
    switch (algorithm) {
      case 'popularity':
        return filteredTracks
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, limit)
      
      case 'energy':
        return filteredTracks
          .sort((a, b) => b.energy - a.energy)
          .slice(0, limit)
      
      case 'recent':
        return filteredTracks
          .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
          .slice(0, limit)
      
      case 'danceability':
        return filteredTracks
          .sort((a, b) => b.danceability - a.danceability)
          .slice(0, limit)
      
      case 'hybrid':
        if (!recommendationEngine) {
          return filteredTracks.slice(0, limit)
        }
        return recommendationEngine.getHybridRecommendations({ limit })
      
      default:
        return filteredTracks.slice(0, limit)
    }
  }, [allTracks, applyFilters, recommendationEngine])

  // ジャンル別楽曲取得
  const getTracksByGenres = useCallback((genres: string[], limit: number = 12): EnhancedTrack[] => {
    const filteredTracks = applyFilters(allTracks)
    
    return filteredTracks
      .filter(track => track.genre.some(g => genres.some(targetGenre => 
        g.toLowerCase().includes(targetGenre.toLowerCase())
      )))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
  }, [allTracks, applyFilters])

  // ハンドラー
  const handleTrackSelect = useCallback((track: EnhancedTrack) => {
    // 楽曲選択時の処理
    console.log('Selected track:', track.title)
    
    // ユーザーインタラクションを記録
    if (recommendationEngine) {
      recommendationEngine.addInteractions([{
        trackId: track.id,
        action: 'play',
        timestamp: new Date(),
        context: 'recommendation_page'
      }])
    }
  }, [recommendationEngine])

  const handleLike = useCallback((track: EnhancedTrack) => {
    console.log('Liked track:', track.title)
    
    if (recommendationEngine) {
      recommendationEngine.addInteractions([{
        trackId: track.id,
        action: 'like',
        timestamp: new Date(),
        context: 'recommendation_page'
      }])
    }
  }, [recommendationEngine])

  const handleAddToPlaylist = useCallback((track: EnhancedTrack) => {
    console.log('Added to playlist:', track.title)
    
    if (recommendationEngine) {
      recommendationEngine.addInteractions([{
        trackId: track.id,
        action: 'add_to_playlist',
        timestamp: new Date(),
        context: 'recommendation_page'
      }])
    }
  }, [recommendationEngine])

  const handleTrackHover = useCallback((track: EnhancedTrack | null) => {
    if (track) {
      startPreview(track)
    } else {
      stopPreview()
    }
  }, [startPreview, stopPreview])

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center min-h-screen`}>
        <div className="text-center">
          <BarChart3 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: theme.primaryColor }} />
          <p className="text-xl" style={{ color: theme.textColor }}>
            250曲データベースを読み込み中...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-12`}>
      {/* ヘッダー */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4" style={{ color: theme.textColor }}>
          高度な楽曲推薦システム
        </h1>
        <p className="text-lg mb-6" style={{ color: theme.textColor + 'CC' }}>
          250曲のデータベースから、人気度・エネルギー値・ユーザー履歴に基づく最適化された推薦
        </p>
        
        {/* 統計情報 */}
        <div className="flex justify-center space-x-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
              {allTracks.length}
            </div>
            <div className="text-sm" style={{ color: theme.textColor + '99' }}>
              総楽曲数
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
              {availableGenres.length}
            </div>
            <div className="text-sm" style={{ color: theme.textColor + '99' }}>
              ジャンル数
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
              {recommendationEngine?.getUserProfile()?.preferredGenres.length || 0}
            </div>
            <div className="text-sm" style={{ color: theme.textColor + '99' }}>
              学習済みジャンル
            </div>
          </div>
        </div>

        {/* フィルターボタン */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
            style={{
              backgroundColor: showFilters ? theme.primaryColor : theme.secondaryColor,
              color: showFilters ? 'white' : theme.textColor
            }}
          >
            <Filter className="w-4 h-4" />
            <span>フィルター</span>
          </button>
          
          <button
            className="px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
            style={{
              backgroundColor: theme.secondaryColor,
              color: theme.textColor
            }}
          >
            <Settings className="w-4 h-4" />
            <span>設定</span>
          </button>
        </div>
      </div>

      {/* ランキングセクション */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>
          人気度・エネルギー値ランキング
        </h2>
        
        {rankingCategories.map((category) => (
          <MusicCarousel
            key={category.id}
            tracks={getTracksByAlgorithm(category.algorithm, 20)}
            title={category.title}
            description={category.description}
            icon={category.icon}
            color={category.color}
            enablePreview={true}
            enableHoverEffects={true}
            cardSize="medium"
            showMetadata={true}
            showRanking={category.algorithm !== 'hybrid'}
            onTrackSelect={handleTrackSelect}
            onLike={handleLike}
            onAddToPlaylist={handleAddToPlaylist}
          />
        ))}
      </div>

      {/* ジャンル別セクション */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>
          ジャンル別おすすめ
        </h2>
        
        {genreCategories.map((category) => (
          <MusicCarousel
            key={category.id}
            tracks={getTracksByGenres(category.genres, 15)}
            title={category.title}
            description={`${category.genres.join('・')}の人気楽曲`}
            icon={Music}
            color={category.color}
            enablePreview={true}
            enableHoverEffects={true}
            cardSize="medium"
            showMetadata={true}
            showRanking={false}
            onTrackSelect={handleTrackSelect}
            onLike={handleLike}
            onAddToPlaylist={handleAddToPlaylist}
          />
        ))}
      </div>

      {/* AI推薦セクション */}
      {recommendationEngine && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>
            ユーザー履歴ベース推薦
          </h2>
          
          <MusicCarousel
            tracks={recommendationEngine.getHybridRecommendations({ limit: 18 })}
            title="あなたへのおすすめ"
            description="視聴履歴と好みを分析した個人向け推薦"
            icon={Heart}
            color="#ec4899"
            enablePreview={true}
            enableHoverEffects={true}
            cardSize="large"
            showMetadata={true}
            showRanking={false}
            onTrackSelect={handleTrackSelect}
            onLike={handleLike}
            onAddToPlaylist={handleAddToPlaylist}
          />
        </div>
      )}

      {/* プレビュー再生中の表示 */}
      {previewState.track && (
        <div 
          className="fixed bottom-6 right-6 p-4 rounded-xl shadow-2xl z-50 max-w-sm"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center space-x-3">
            <img
              src={previewState.track.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
              alt={previewState.track.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: theme.textColor }}>
                {previewState.track.title}
              </p>
              <p className="text-xs truncate" style={{ color: theme.textColor + 'CC' }}>
                {previewState.track.artist}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-xs" style={{ color: theme.primaryColor }}>
                  ホバープレビュー再生中
                </p>
              </div>
            </div>
          </div>
          
          {/* プレビュープログレス */}
          {previewState.duration > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-600 rounded-full h-1">
                <div 
                  className="h-1 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: theme.primaryColor,
                    width: `${(previewState.currentTime / previewState.duration) * 100}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1" style={{ color: theme.textColor + '99' }}>
                <span>{Math.floor(previewState.currentTime)}s</span>
                <span>{Math.floor(previewState.duration)}s</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}