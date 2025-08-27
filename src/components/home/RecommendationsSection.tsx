// src/components/home/RecommendationsSection.tsx
import { 
  TrendingUp, Heart, Star, Clock, Music, Zap,
  Shuffle, ChevronRight, Play
} from 'lucide-react'
import React, { useCallback } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { MusicCarousel } from '../ui/MusicCarousel'
import type { Track } from '../../types'

interface RecommendationCategory {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  tracks: Track[]
  showRanking?: boolean
  cardSize?: 'small' | 'medium' | 'large'
}

interface RecommendationsSectionProps {
  trendingTracks?: Track[]
  personalizedTracks?: Track[]
  newReleases?: Track[]
  recommendedTracks?: Track[]
  onTrackSelect?: (track: Track) => void
  onNavigate?: (path: string) => void
  className?: string
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  trendingTracks = [],
  personalizedTracks = [],
  newReleases = [],
  recommendedTracks = [],
  onTrackSelect,
  onNavigate,
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)

  // 楽曲選択ハンドラー
  const handleTrackSelect = useCallback((track: Track) => {
    onTrackSelect?.(track)
  }, [onTrackSelect])

  // いいねハンドラー
  const handleLike = useCallback((track: Track) => {
    console.log('Liked track:', track.title)
    // 実際の実装ではいいね状態を管理
  }, [])

  // プレイリスト追加ハンドラー
  const handleAddToPlaylist = useCallback((track: Track) => {
    console.log('Added to playlist:', track.title)
    // 実際の実装ではプレイリスト選択モーダルを表示
  }, [])

  // 推薦カテゴリ定義
  const categories: RecommendationCategory[] = [
    {
      id: 'trending',
      title: 'トレンド楽曲',
      description: '今話題の人気楽曲をチェック',
      icon: TrendingUp,
      color: '#ef4444',
      tracks: trendingTracks,
      showRanking: true,
      cardSize: 'medium'
    },
    {
      id: 'personalized',
      title: 'あなたにおすすめ',
      description: 'あなたの好みに合わせた楽曲セレクション',
      icon: Heart,
      color: '#ec4899',
      tracks: personalizedTracks,
      showRanking: false,
      cardSize: 'medium'
    },
    {
      id: 'new_releases',
      title: '新着リリース',
      description: '最新リリースの楽曲をいち早く',
      icon: Clock,
      color: '#10b981',
      tracks: newReleases,
      showRanking: false,
      cardSize: 'medium'
    },
    {
      id: 'ai_recommendations',
      title: 'AI推薦楽曲',
      description: '高度なアルゴリズムによる精密な推薦',
      icon: Star,
      color: '#3b82f6',
      tracks: recommendedTracks,
      showRanking: false,
      cardSize: 'large'
    }
  ].filter(category => category.tracks.length > 0)

  if (categories.length === 0) {
    return (
      <section className={`${className} px-4`}>
        <div className="max-w-6xl mx-auto text-center py-12">
          <Music className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: theme.textColor }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: theme.textColor }}>
            おすすめ楽曲を読み込み中
          </h3>
          <p className="text-lg" style={{ color: theme.textColor + 'CC' }}>
            あなた向けの楽曲を準備しています...
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={`${className} px-4`}>
      <div className="space-y-8 md:space-y-12">
        {/* セクションヘッダー */}
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: theme.textColor }}>
            おすすめ楽曲
          </h2>
          <p className="text-lg" style={{ color: theme.textColor + 'CC' }}>
            AI推薦システムがあなたの好みを学習し、最適な楽曲を提案します
          </p>
        </div>

        {/* カテゴリ別カルーセル */}
        {categories.map((category, index) => (
          <div key={category.id} className="space-y-4">
            {/* カテゴリヘッダー */}
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  <category.icon className="w-5 h-5" style={{ color: category.color }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: theme.textColor }}>
                    {category.title}
                  </h3>
                  <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    {category.description}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => onNavigate?.(`/recommendations/${category.id}`)}
                className="flex items-center space-x-1 text-sm hover:opacity-80 transition-opacity"
                style={{ color: category.color }}
              >
                <span>もっと見る</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* カルーセル */}
            <MusicCarousel
              tracks={category.tracks}
              enablePreview={true}
              enableHoverEffects={true}
              cardSize={category.cardSize}
              showRanking={category.showRanking}
              showMetadata={true}
              onTrackSelect={handleTrackSelect}
              onLike={handleLike}
              onAddToPlaylist={handleAddToPlaylist}
            />
          </div>
        ))}

        {/* 追加機能プロモーション */}
        <div className="max-w-6xl mx-auto">
          <div 
            className="relative p-8 md:p-12 rounded-2xl overflow-hidden"
            style={{ backgroundColor: theme.secondaryColor }}
          >
            {/* 背景グラデーション */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryColor}40 0%, transparent 100%)`
              }}
            />
            
            <div className="relative text-center">
              <div className="flex justify-center space-x-4 mb-6">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.primaryColor + '20' }}
                >
                  <Star className="w-8 h-8" style={{ color: theme.primaryColor }} />
                </div>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#10b981' + '20' }}
                >
                  <Zap className="w-8 h-8" style={{ color: '#10b981' }} />
                </div>
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#f59e0b' + '20' }}
                >
                  <Shuffle className="w-8 h-8" style={{ color: '#f59e0b' }} />
                </div>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: theme.textColor }}>
                もっと音楽を探索しよう
              </h3>
              
              <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: theme.textColor + 'CC' }}>
                高度な推薦システム、カスタムプレイリスト作成、詳細な音楽分析で
                <br className="hidden md:block" />
                あなただけの音楽体験を
              </p>

              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <button
                  onClick={() => onNavigate?.('/recommendations')}
                  className="px-8 py-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                  style={{
                    backgroundColor: theme.primaryColor,
                    color: 'white'
                  }}
                >
                  <Star className="w-5 h-5" />
                  <span>高度な推薦を見る</span>
                </button>
                
                <button
                  onClick={() => onNavigate?.('/playlists/create')}
                  className="px-8 py-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.textColor,
                    border: `2px solid ${theme.textColor + '40'}`
                  }}
                >
                  <Music className="w-5 h-5" />
                  <span>プレイリスト作成</span>
                </button>
              </div>
            </div>

            {/* 装飾的な背景要素 */}
            <div className="absolute top-4 left-4 w-8 h-8 opacity-20">
              <Music className="w-full h-full" style={{ color: theme.primaryColor }} />
            </div>
            
            <div className="absolute bottom-4 right-4 w-6 h-6 opacity-20">
              <Play className="w-full h-full" style={{ color: theme.primaryColor }} />
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              className="text-center p-6 rounded-xl"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <div className="text-3xl font-bold mb-2" style={{ color: '#ef4444' }}>
                {categories.reduce((sum, cat) => sum + cat.tracks.length, 0)}
              </div>
              <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                推薦楽曲数
              </div>
            </div>
            
            <div 
              className="text-center p-6 rounded-xl"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <div className="text-3xl font-bold mb-2" style={{ color: '#10b981' }}>
                {categories.length}
              </div>
              <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                推薦カテゴリ
              </div>
            </div>
            
            <div 
              className="text-center p-6 rounded-xl"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <div className="text-3xl font-bold mb-2" style={{ color: '#3b82f6' }}>
                AI
              </div>
              <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                推薦エンジン
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}