// src/components/history/PlaybackHistoryPage.tsx
import {
  Clock, Play, Heart, MoreHorizontal, Filter, SortAsc, Calendar,
  Trophy, Medal, Award, Star, Target, Zap, BarChart3, TrendingUp,
  Music, Headphones, Volume2, SkipForward, RotateCcw
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import { PlaybackHistoryManager, type PlaybackHistoryEntry } from '../../utils/playbackHistoryManager'

interface FilterOptions {
  liked: boolean | null
  completionRateMin: number
  playCountMin: number
  dateRange: { start: Date; end: Date } | null
  sortBy: 'lastPlayed' | 'playCount' | 'totalTime' | 'completionRate' | 'firstPlayed'
  sortOrder: 'desc' | 'asc'
}

interface PlaybackHistoryPageProps {
  className?: string
}

export const PlaybackHistoryPage: React.FC<PlaybackHistoryPageProps> = ({
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack, currentTrack, isPlaying } = useMusicStore()
  
  const [historyManager] = useState(() => new PlaybackHistoryManager())
  const [historyEntries, setHistoryEntries] = useState<PlaybackHistoryEntry[]>([])
  const [clearRanking, setClearRanking] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [currentView, setCurrentView] = useState<'grid' | 'list' | 'ranking'>('grid')
  
  const [filters, setFilters] = useState<FilterOptions>({
    liked: null,
    completionRateMin: 0,
    playCountMin: 1,
    dateRange: null,
    sortBy: 'lastPlayed',
    sortOrder: 'desc'
  })

  // データの読み込み
  const loadData = useCallback(() => {
    setIsLoading(true)
    
    try {
      // 履歴データ取得
      const entries = historyManager.getHistory({
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        filter: {
          liked: filters.liked || undefined,
          completionRateMin: filters.completionRateMin,
          playCountMin: filters.playCountMin,
          dateRange: filters.dateRange || undefined
        }
      })
      
      setHistoryEntries(entries)
      
      // クリアランキング取得
      const ranking = historyManager.getClearRanking()
      setClearRanking(ranking)
      
      // 統計データ取得
      const statistics = historyManager.getStats()
      setStats(statistics)
      
    } catch (error) {
      console.error('Failed to load playback history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [historyManager, filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 時間フォーマット
  const formatDuration = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`
    }
    return `${minutes}分`
  }, [])

  // 完了率の表示
  const getCompletionBadge = useCallback((rate: number) => {
    if (rate >= 0.95) return { text: '完了', color: '#10b981', icon: '✓' }
    if (rate >= 0.8) return { text: `${Math.round(rate * 100)}%`, color: '#3b82f6', icon: '◐' }
    if (rate >= 0.5) return { text: `${Math.round(rate * 100)}%`, color: '#f59e0b', icon: '◑' }
    return { text: `${Math.round(rate * 100)}%`, color: '#ef4444', icon: '◯' }
  }, [])

  // ランクバッジの取得
  const getRankBadge = useCallback((entry: PlaybackHistoryEntry) => {
    if (clearRanking?.gold.includes(entry)) {
      return { rank: 'GOLD', color: '#fbbf24', icon: Trophy }
    }
    if (clearRanking?.silver.includes(entry)) {
      return { rank: 'SILVER', color: '#9ca3af', icon: Medal }
    }
    if (clearRanking?.bronze.includes(entry)) {
      return { rank: 'BRONZE', color: '#d97706', icon: Award }
    }
    if (clearRanking?.cleared.includes(entry)) {
      return { rank: 'CLEAR', color: '#10b981', icon: Target }
    }
    return { rank: 'NEW', color: '#6b7280', icon: Star }
  }, [clearRanking])

  // 続きから再生
  const handleResumePlay = useCallback((entry: PlaybackHistoryEntry) => {
    playTrack(entry.trackData)
    
    // 履歴に再生開始を記録
    setTimeout(() => {
      const audio = document.querySelector('audio') as HTMLAudioElement
      if (audio && entry.lastPosition > 0) {
        audio.currentTime = entry.lastPosition / 1000
      }
    }, 100)
    
    historyManager.startPlayback(entry.trackData, 'resume_playback')
  }, [playTrack, historyManager])

  // いいね切り替え
  const handleToggleLike = useCallback((entry: PlaybackHistoryEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (entry.likedAt) {
      historyManager.removeLike(entry.trackId)
    } else {
      historyManager.recordLike(entry.trackId)
    }
    
    loadData() // データを再読み込み
  }, [historyManager, loadData])

  // グリッドアイテムコンポーネント
  const GridItem: React.FC<{ entry: PlaybackHistoryEntry; index: number }> = ({ entry, index }) => {
    const completionBadge = getCompletionBadge(entry.completionRate)
    const rankBadge = getRankBadge(entry)
    const RankIcon = rankBadge.icon
    const isCurrentTrack = currentTrack?.id === entry.trackId
    const hasResumePoint = entry.lastPosition > entry.trackData.duration * 0.05 && entry.completionRate < 0.95

    return (
      <div
        className={`relative rounded-xl p-4 cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-xl ${
          isCurrentTrack ? 'ring-2' : ''
        }`}
        style={{ 
          backgroundColor: theme.secondaryColor,
          ringColor: isCurrentTrack ? theme.primaryColor : 'transparent'
        }}
        onClick={() => handleResumePlay(entry)}
      >
        {/* ランクバッジ */}
        <div 
          className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 z-10"
          style={{ backgroundColor: rankBadge.color, color: 'white' }}
        >
          <RankIcon className="w-3 h-3" />
          <span>{rankBadge.rank}</span>
        </div>

        {/* アートワーク */}
        <div className="relative mb-3 aspect-square overflow-hidden rounded-lg">
          <img
            src={entry.trackData.artworkUrl || `https://picsum.photos/300/300?random=${entry.trackId}`}
            alt={entry.trackData.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          
          {/* プレイオーバーレイ */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            {hasResumePoint ? (
              <div className="text-center">
                <RotateCcw className="w-8 h-8 text-white mb-1 mx-auto" />
                <span className="text-xs text-white">続きから再生</span>
              </div>
            ) : (
              <Play className="w-8 h-8 text-white" fill="white" />
            )}
          </div>

          {/* 進行状況バー */}
          {entry.completionRate > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-30">
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  backgroundColor: completionBadge.color,
                  width: `${entry.completionRate * 100}%`
                }}
              />
            </div>
          )}

          {/* 再生中インジケーター */}
          {isCurrentTrack && isPlaying && (
            <div className="absolute top-2 right-2">
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
            title={entry.trackData.title}
          >
            {entry.trackData.title}
          </h3>
          <p 
            className="text-xs truncate mb-2"
            style={{ color: theme.textColor + 'CC' }}
            title={entry.trackData.artist}
          >
            {entry.trackData.artist}
          </p>
          
          {/* 統計情報 */}
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: theme.textColor + '99' }}>
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1">
                <Play className="w-3 h-3" />
                <span>{entry.playCount}</span>
              </span>
              <span 
                className="px-2 py-1 rounded-full flex items-center space-x-1"
                style={{ backgroundColor: completionBadge.color, color: 'white' }}
              >
                <span>{completionBadge.icon}</span>
                <span>{completionBadge.text}</span>
              </span>
            </div>
          </div>

          {/* 最終再生日時 */}
          <p className="text-xs" style={{ color: theme.textColor + '66' }}>
            {entry.lastPlayedAt.toLocaleDateString('ja-JP')} {entry.lastPlayedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </p>

          {/* アクションボタン */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col space-y-1">
              <button
                onClick={(e) => handleToggleLike(entry, e)}
                className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
              >
                <Heart 
                  className={`w-4 h-4 ${entry.likedAt ? 'text-red-400' : 'text-white'}`}
                  fill={entry.likedAt ? 'currentColor' : 'none'}
                />
              </button>
              <button
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center hover:bg-opacity-80 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // クリアランキング表示
  const RankingSection: React.FC<{ 
    title: string
    entries: PlaybackHistoryEntry[]
    color: string
    icon: React.ElementType
  }> = ({ title, entries, color, icon: Icon }) => (
    <div className="mb-8">
      <div className="flex items-center space-x-3 mb-4">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: color + '20' }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: theme.textColor }}>
            {title}
          </h3>
          <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
            {entries.length}曲
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {entries.slice(0, 8).map((entry, index) => (
          <GridItem key={entry.trackId} entry={entry} index={index} />
        ))}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center min-h-screen`}>
        <div className="text-center">
          <Clock className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: theme.primaryColor }} />
          <p className="text-xl" style={{ color: theme.textColor }}>
            再生履歴を読み込み中...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} space-y-8`}>
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4" style={{ color: theme.textColor }}>
          再生履歴
        </h1>
        <p className="text-lg mb-6" style={{ color: theme.textColor + 'CC' }}>
          あなたの音楽体験を振り返る
        </p>

        {/* 統計サマリー */}
        {stats && (
          <div className="flex justify-center space-x-8 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {stats.totalTracks}
              </div>
              <div className="text-sm" style={{ color: theme.textColor + '99' }}>
                総楽曲数
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {formatDuration(stats.totalPlayTime)}
              </div>
              <div className="text-sm" style={{ color: theme.textColor + '99' }}>
                総再生時間
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {Math.round(stats.completionRateAverage * 100)}%
              </div>
              <div className="text-sm" style={{ color: theme.textColor + '99' }}>
                平均完了率
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                {stats.streakData.currentStreak}日
              </div>
              <div className="text-sm" style={{ color: theme.textColor + '99' }}>
                連続視聴
              </div>
            </div>
          </div>
        )}

        {/* ビュー切り替えとフィルター */}
        <div className="flex justify-center space-x-4">
          <div className="flex bg-gray-700 rounded-lg p-1">
            {[
              { id: 'grid', label: 'グリッド', icon: BarChart3 },
              { id: 'ranking', label: 'ランキング', icon: Trophy },
              { id: 'list', label: 'リスト', icon: Music }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCurrentView(id as any)}
                className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                  currentView === id 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                style={{
                  backgroundColor: currentView === id ? theme.primaryColor : 'transparent'
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            style={{
              backgroundColor: showFilters ? theme.primaryColor : theme.secondaryColor,
              color: showFilters ? 'white' : theme.textColor
            }}
          >
            <Filter className="w-4 h-4" />
            <span>フィルター</span>
          </button>
        </div>
      </div>

      {/* ランキングビュー */}
      {currentView === 'ranking' && clearRanking && (
        <div className="space-y-8">
          <RankingSection
            title="ゴールドランク"
            entries={clearRanking.gold}
            color="#fbbf24"
            icon={Trophy}
          />
          <RankingSection
            title="シルバーランク"
            entries={clearRanking.silver}
            color="#9ca3af"
            icon={Medal}
          />
          <RankingSection
            title="ブロンズランク"
            entries={clearRanking.bronze}
            color="#d97706"
            icon={Award}
          />
          <RankingSection
            title="クリア済み"
            entries={clearRanking.cleared}
            color="#10b981"
            icon={Target}
          />
        </div>
      )}

      {/* グリッドビュー */}
      {currentView === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
          {historyEntries.slice(0, 32).map((entry, index) => (
            <GridItem key={entry.trackId} entry={entry} index={index} />
          ))}
        </div>
      )}

      {/* 履歴が空の場合 */}
      {historyEntries.length === 0 && (
        <div className="text-center py-16">
          <Headphones className="w-24 h-24 mx-auto mb-6 opacity-50" style={{ color: theme.textColor }} />
          <h2 className="text-2xl font-bold mb-4" style={{ color: theme.textColor }}>
            再生履歴がありません
          </h2>
          <p className="text-lg" style={{ color: theme.textColor + 'CC' }}>
            音楽を再生すると、ここに履歴が表示されます
          </p>
        </div>
      )}
    </div>
  )
}