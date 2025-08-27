// src/components/ui/MusicCarousel.tsx
import { 
  ChevronLeft, ChevronRight, Play, Heart, Plus, 
  Music, Star, TrendingUp, Zap, MoreHorizontal 
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'

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

interface CarouselProps {
  tracks: EnhancedTrack[]
  title: string
  description?: string
  icon?: React.ElementType
  color?: string
  isLoading?: boolean
  error?: string
  enablePreview?: boolean
  enableHoverEffects?: boolean
  cardSize?: 'small' | 'medium' | 'large'
  showMetadata?: boolean
  showRanking?: boolean
  autoPlay?: boolean
  infinite?: boolean
  className?: string
  onTrackSelect?: (track: EnhancedTrack) => void
  onLike?: (track: EnhancedTrack) => void
  onAddToPlaylist?: (track: EnhancedTrack) => void
  onRefresh?: () => void
}

interface CarouselItemProps {
  track: EnhancedTrack
  index: number
  size: 'small' | 'medium' | 'large'
  showMetadata: boolean
  showRanking: boolean
  enablePreview: boolean
  enableHoverEffects: boolean
  onSelect: (track: EnhancedTrack) => void
  onLike: (track: EnhancedTrack, e: React.MouseEvent) => void
  onAddToPlaylist: (track: EnhancedTrack, e: React.MouseEvent) => void
  onPreview: (track: EnhancedTrack | null) => void
}

// カルーセルアイテムコンポーネント
const CarouselItem: React.FC<CarouselItemProps> = ({
  track,
  index,
  size,
  showMetadata,
  showRanking,
  enablePreview,
  enableHoverEffects,
  onSelect,
  onLike,
  onAddToPlaylist,
  onPreview
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { currentTrack, isPlaying } = useMusicStore()
  
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef<number>()

  const cardSizes = {
    small: { width: 'w-40', height: 'aspect-square', textSize: 'text-sm' },
    medium: { width: 'w-48', height: 'aspect-square', textSize: 'text-base' },
    large: { width: 'w-56', height: 'aspect-[4/5]', textSize: 'text-lg' }
  }

  const cardStyle = cardSizes[size]
  const isCurrentTrack = currentTrack?.id === track.id

  // ホバー処理
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    
    if (enablePreview) {
      hoverTimeoutRef.current = window.setTimeout(() => {
        onPreview(track)
      }, 800) // 0.8秒後にプレビュー開始
    }
  }, [enablePreview, track, onPreview])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    if (enablePreview) {
      onPreview(null) // プレビュー停止
    }
  }, [enablePreview, onPreview])

  // ランキング表示
  const getRankingBadge = () => {
    if (!showRanking) return null
    
    const rankColors = {
      0: 'bg-gradient-to-r from-yellow-400 to-yellow-600', // 1位: ゴールド
      1: 'bg-gradient-to-r from-gray-400 to-gray-600',     // 2位: シルバー
      2: 'bg-gradient-to-r from-orange-600 to-orange-800', // 3位: ブロンズ
    }
    
    const bgColor = rankColors[index as keyof typeof rankColors] || 'bg-gray-600'
    
    return (
      <div 
        className={`absolute top-2 left-2 w-8 h-8 ${bgColor} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg z-10`}
      >
        {index + 1}
      </div>
    )
  }

  // 楽曲バッジ
  const getTrackBadges = () => (
    <div className="absolute top-2 right-2 flex flex-col space-y-1 z-10">
      {track.popularity >= 90 && (
        <div className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-medium shadow-lg">
          🔥 HOT
        </div>
      )}
      {track.energy >= 0.8 && (
        <div className="px-2 py-1 bg-yellow-500 text-black text-xs rounded-full font-medium shadow-lg">
          ⚡ HIGH
        </div>
      )}
      {track.popularity < 40 && (
        <div className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full font-medium shadow-lg">
          💎 GEM
        </div>
      )}
    </div>
  )

  // メタデータ表示
  const getMetadata = () => {
    if (!showMetadata) return null
    
    return (
      <div className="mt-2 space-y-1">
        {/* 基本情報 */}
        <div className="flex items-center justify-between text-xs" style={{ color: theme.textColor + '99' }}>
          <span>{track.popularity}% 人気</span>
          <span>{Math.round(track.energy * 100)}% エネルギー</span>
        </div>
        
        {/* BPMと調性 */}
        {(track.bpm || track.bpm === 0) && (
          <div className="flex items-center justify-between text-xs" style={{ color: theme.textColor + '99' }}>
            <span>{track.bpm} BPM</span>
            <span>{Math.round(track.danceability * 100)}% ダンス</span>
          </div>
        )}
        
        {/* ジャンルタグ */}
        {track.genre && track.genre.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {track.genre.slice(0, size === 'small' ? 2 : 3).map((genre) => (
              <span
                key={genre}
                className="px-2 py-1 text-xs rounded-full truncate"
                style={{
                  backgroundColor: theme.primaryColor + '20',
                  color: theme.primaryColor,
                  maxWidth: '80px'
                }}
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`${cardStyle.width} flex-shrink-0 cursor-pointer group`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect(track)}
    >
      <div 
        className={`relative rounded-xl p-4 transition-all duration-300 ${
          enableHoverEffects 
            ? 'group-hover:scale-105 group-hover:shadow-2xl' 
            : ''
        } ${
          isCurrentTrack 
            ? 'ring-2 shadow-lg' 
            : ''
        }`}
        style={{ 
          backgroundColor: theme.secondaryColor,
          ringColor: isCurrentTrack ? theme.primaryColor : 'transparent'
        }}
      >
        {/* ランキングバッジ */}
        {getRankingBadge()}
        
        {/* アートワーク */}
        <div className={`relative mb-3 ${cardStyle.height} overflow-hidden rounded-lg`}>
          <img
            src={track.artworkUrl || `https://picsum.photos/300/300?random=${track.id}`}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* プレイオーバーレイ */}
          <div 
            className={`absolute inset-0 bg-black transition-opacity duration-300 rounded-lg flex items-center justify-center ${
              isHovered || isCurrentTrack 
                ? 'bg-opacity-50 opacity-100' 
                : 'bg-opacity-0 opacity-0'
            }`}
          >
            {/* メインプレイボタン */}
            <div className="relative">
              <Play 
                className={`w-12 h-12 text-white drop-shadow-lg transition-all duration-300 ${
                  isHovered ? 'scale-110' : 'scale-100'
                }`}
                fill="white"
              />
              
              {/* 現在再生中のインジケーター */}
              {isCurrentTrack && isPlaying && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* 楽曲バッジ */}
          {getTrackBadges()}

          {/* アクションボタン */}
          <div 
            className={`absolute bottom-2 right-2 flex space-x-1 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <button
              onClick={(e) => onLike(track, e)}
              className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
              title="お気に入りに追加"
            >
              <Heart className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={(e) => onAddToPlaylist(track, e)}
              className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
              title="プレイリストに追加"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* 楽曲情報 */}
        <div>
          <h3 
            className={`font-medium truncate mb-1 ${cardStyle.textSize}`}
            style={{ color: theme.textColor }}
            title={track.title}
          >
            {track.title}
          </h3>
          <p 
            className="text-sm truncate mb-1"
            style={{ color: theme.textColor + 'CC' }}
            title={track.artist}
          >
            {track.artist}
          </p>
          
          {track.album && size !== 'small' && (
            <p 
              className="text-xs truncate mb-2"
              style={{ color: theme.textColor + '99' }}
              title={track.album}
            >
              {track.album}
            </p>
          )}
          
          {/* メタデータ */}
          {getMetadata()}
        </div>
      </div>
    </div>
  )
}

// メインカルーセルコンポーネント
export const MusicCarousel: React.FC<CarouselProps> = ({
  tracks,
  title,
  description,
  icon: Icon = Music,
  color = '#3b82f6',
  isLoading = false,
  error,
  enablePreview = true,
  enableHoverEffects = true,
  cardSize = 'medium',
  showMetadata = true,
  showRanking = false,
  autoPlay = false,
  infinite = false,
  className = '',
  onTrackSelect,
  onLike,
  onAddToPlaylist,
  onRefresh
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack } = useMusicStore()
  
  const [scrollPosition, setScrollPosition] = useState(0)
  const [previewTrack, setPreviewTrack] = useState<EnhancedTrack | null>(null)
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoPlayTimeoutRef = useRef<number>()

  const itemsPerView = {
    small: 8,
    medium: 6,
    large: 4
  }[cardSize]

  const maxScroll = Math.max(0, tracks.length - itemsPerView)

  // オートプレイ処理
  useEffect(() => {
    if (!isAutoPlaying || tracks.length === 0) return

    autoPlayTimeoutRef.current = window.setInterval(() => {
      setScrollPosition(prev => {
        const next = prev + 1
        return infinite ? (next > maxScroll ? 0 : next) : Math.min(maxScroll, next)
      })
    }, 3000) // 3秒ごと

    return () => {
      if (autoPlayTimeoutRef.current) {
        clearInterval(autoPlayTimeoutRef.current)
      }
    }
  }, [isAutoPlaying, maxScroll, infinite, tracks.length])

  // スクロール処理
  const handleScroll = useCallback((direction: 'left' | 'right') => {
    setIsAutoPlaying(false) // 手動操作時はオートプレイ停止
    
    setScrollPosition(prev => {
      if (direction === 'left') {
        return infinite && prev === 0 ? maxScroll : Math.max(0, prev - 1)
      } else {
        return infinite && prev >= maxScroll ? 0 : Math.min(maxScroll, prev + 1)
      }
    })
  }, [maxScroll, infinite])

  // キーボード操作
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handleScroll('left')
          break
        case 'ArrowRight':
          e.preventDefault()
          handleScroll('right')
          break
        case ' ':
          e.preventDefault()
          setIsAutoPlaying(prev => !prev)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleScroll])

  // イベントハンドラー
  const handleTrackSelect = useCallback((track: EnhancedTrack) => {
    if (onTrackSelect) {
      onTrackSelect(track)
    } else {
      playTrack(track)
    }
  }, [onTrackSelect, playTrack])

  const handleLike = useCallback((track: EnhancedTrack, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onLike) {
      onLike(track)
    } else {
      console.log('Liked:', track.title)
    }
  }, [onLike])

  const handleAddToPlaylist = useCallback((track: EnhancedTrack, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAddToPlaylist) {
      onAddToPlaylist(track)
    } else {
      console.log('Added to playlist:', track.title)
    }
  }, [onAddToPlaylist])

  const handlePreview = useCallback((track: EnhancedTrack | null) => {
    if (!enablePreview) return
    setPreviewTrack(track)
  }, [enablePreview])

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center space-x-3 mb-6">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse"
            style={{ backgroundColor: color + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <div className="h-6 bg-gray-600 rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-gray-700 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="flex space-x-4">
          {Array.from({ length: itemsPerView }).map((_, index) => (
            <div key={index} className={`${itemsPerView === 8 ? 'w-40' : itemsPerView === 6 ? 'w-48' : 'w-56'} aspect-square bg-gray-600 rounded-xl animate-pulse`} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center space-x-3 mb-6">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
              {title}
            </h2>
            {description && (
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        <div 
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <p className="text-red-400 mb-3">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 rounded-lg text-sm transition-colors"
              style={{ 
                backgroundColor: theme.primaryColor,
                color: 'white'
              }}
            >
              再試行
            </button>
          )}
        </div>
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center space-x-3 mb-6">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
              {title}
            </h2>
            {description && (
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        <div 
          className="p-8 text-center rounded-xl"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <p style={{ color: theme.textColor + 'CC' }}>
            楽曲が見つかりませんでした
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`} ref={containerRef}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: color + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: theme.textColor }}>
              {title}
            </h2>
            {description && (
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* オートプレイトグル */}
          {autoPlay && (
            <button
              onClick={() => setIsAutoPlaying(prev => !prev)}
              className={`p-2 rounded-lg transition-colors ${
                isAutoPlaying 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}
              title={isAutoPlaying ? 'オートプレイ停止' : 'オートプレイ開始'}
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {/* 更新ボタン */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg transition-colors hover:bg-gray-700"
              title="更新"
            >
              <MoreHorizontal className="w-4 h-4" style={{ color: theme.primaryColor }} />
            </button>
          )}

          {/* ナビゲーションボタン */}
          <button
            onClick={() => handleScroll('left')}
            disabled={!infinite && scrollPosition === 0}
            className="p-2 rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" style={{ color: theme.textColor }} />
          </button>
          
          <button
            onClick={() => handleScroll('right')}
            disabled={!infinite && scrollPosition >= maxScroll}
            className="p-2 rounded-lg transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" style={{ color: theme.textColor }} />
          </button>
        </div>
      </div>

      {/* カルーセルコンテンツ */}
      <div className="relative overflow-hidden">
        <div 
          className="flex space-x-4 transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-${scrollPosition * (cardSize === 'small' ? 176 : cardSize === 'medium' ? 208 : 240)}px)`
          }}
        >
          {tracks.map((track, index) => (
            <CarouselItem
              key={track.id}
              track={track}
              index={index}
              size={cardSize}
              showMetadata={showMetadata}
              showRanking={showRanking}
              enablePreview={enablePreview}
              enableHoverEffects={enableHoverEffects}
              onSelect={handleTrackSelect}
              onLike={handleLike}
              onAddToPlaylist={handleAddToPlaylist}
              onPreview={handlePreview}
            />
          ))}
        </div>
      </div>

      {/* プログレスインジケーター */}
      {tracks.length > itemsPerView && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: maxScroll + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setScrollPosition(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === scrollPosition 
                  ? '' 
                  : 'bg-gray-600'
              }`}
              style={{ 
                backgroundColor: index === scrollPosition ? color : undefined 
              }}
            />
          ))}
        </div>
      )}

      {/* プレビュー表示 */}
      {previewTrack && enablePreview && (
        <div 
          className="fixed bottom-4 right-4 p-4 rounded-xl shadow-2xl z-50 max-w-sm"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center space-x-3">
            <img
              src={previewTrack.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
              alt={previewTrack.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: theme.textColor }}>
                {previewTrack.title}
              </p>
              <p className="text-xs truncate" style={{ color: theme.textColor + 'CC' }}>
                {previewTrack.artist}
              </p>
              <p className="text-xs" style={{ color: theme.primaryColor }}>
                プレビュー再生中...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}