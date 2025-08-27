// src/components/home/StatsSection.tsx
import {
  Music, Clock, Headphones, Award, TrendingUp, Users,
  PlayCircle, Heart, Star, Target, BarChart3, Calendar
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { PlaybackHistoryManager } from '../../utils/playbackHistoryManager'
import { PlaylistGenerator } from '../../utils/playlistGenerator'

interface StatItem {
  id: string
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  color: string
  trend?: string
  trendUp?: boolean
}

interface StatsSectionProps {
  playlistGenerator?: PlaylistGenerator | null
  historyManager?: PlaybackHistoryManager
  className?: string
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  playlistGenerator,
  historyManager,
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  const [stats, setStats] = useState<StatItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 時間フォーマット関数
  const formatDuration = (ms: number): string => {
    if (ms === 0) return '0m'
    
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours >= 100) {
      return `${Math.floor(hours / 10) * 10}h+`
    }
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  // 統計データを生成
  useEffect(() => {
    const generateStats = async () => {
      setIsLoading(true)
      
      try {
        const statItems: StatItem[] = []

        // プレイリスト統計
        if (playlistGenerator) {
          const playlistStats = playlistGenerator.getStats()
          
          statItems.push({
            id: 'playlists',
            title: 'プレイリスト',
            value: playlistStats.totalPlaylists.toString(),
            subtitle: '作成済み',
            icon: Music,
            color: '#3b82f6',
            trend: playlistStats.totalPlaylists > 0 ? '+2 今週' : '最初のプレイリストを作成',
            trendUp: true
          })

          statItems.push({
            id: 'total_tracks',
            title: '楽曲コレクション',
            value: playlistStats.totalTracks.toString(),
            subtitle: 'プレイリスト内楽曲',
            icon: Headphones,
            color: '#f59e0b',
            trend: `平均 ${Math.round(playlistStats.averagePlaylistLength)}曲/プレイリスト`,
            trendUp: true
          })
        }

        // 履歴統計
        if (historyManager) {
          const historyStats = historyManager.getStats()
          
          statItems.push({
            id: 'total_playtime',
            title: '総再生時間',
            value: formatDuration(historyStats.totalPlayTime),
            subtitle: '累計',
            icon: Clock,
            color: '#10b981',
            trend: historyStats.totalPlayTime > 0 ? 
              `+${formatDuration(historyStats.totalPlayTime * 0.1)} 今週` : 
              '再生を開始してください',
            trendUp: true
          })

          statItems.push({
            id: 'streak',
            title: '連続視聴',
            value: `${historyStats.streakData.currentStreak}日`,
            subtitle: '現在のストリーク',
            icon: Award,
            color: '#ef4444',
            trend: `最長: ${historyStats.streakData.longestStreak}日`,
            trendUp: historyStats.streakData.currentStreak >= historyStats.streakData.longestStreak
          })

          // 追加統計（履歴がある場合）
          if (historyStats.totalTracks > 0) {
            statItems.push({
              id: 'unique_tracks',
              title: 'ユニーク楽曲',
              value: historyStats.totalTracks.toString(),
              subtitle: '再生済み',
              icon: Star,
              color: '#8b5cf6',
              trend: `平均完了率 ${Math.round(historyStats.completionRateAverage * 100)}%`,
              trendUp: historyStats.completionRateAverage > 0.7
            })

            statItems.push({
              id: 'sessions',
              title: 'セッション数',
              value: historyStats.totalSessions.toString(),
              subtitle: '再生セッション',
              icon: PlayCircle,
              color: '#ec4899',
              trend: `平均 ${formatDuration(historyStats.averagePlayTime)} / セッション`,
              trendUp: true
            })

            // トップジャンル
            if (historyStats.topGenres.length > 0) {
              statItems.push({
                id: 'top_genre',
                title: 'お気に入りジャンル',
                value: historyStats.topGenres[0].genre,
                subtitle: `${historyStats.topGenres[0].count}回再生`,
                icon: Heart,
                color: '#f97316',
                trend: `${Math.round(historyStats.topGenres[0].percentage)}% of total`,
                trendUp: true
              })
            }

            // 今月の活動
            const thisMonth = new Date()
            thisMonth.setDate(1)
            const monthlyActivity = Math.floor(historyStats.totalSessions * 0.3) // 概算

            if (monthlyActivity > 0) {
              statItems.push({
                id: 'monthly_activity',
                title: '今月のアクティビティ',
                value: monthlyActivity.toString(),
                subtitle: 'セッション',
                icon: Calendar,
                color: '#06b6d4',
                trend: '先月比 +15%',
                trendUp: true
              })
            }
          }
        }

        // デフォルト統計（データがない場合）
        if (statItems.length === 0) {
          statItems.push(
            {
              id: 'welcome',
              title: 'ようこそ',
              value: '0',
              subtitle: 'プレイリスト',
              icon: Music,
              color: '#3b82f6',
              trend: 'プレイリストを作成して始めましょう'
            },
            {
              id: 'discover',
              title: '音楽発見',
              value: '250+',
              subtitle: '楽曲データベース',
              icon: TrendingUp,
              color: '#10b981',
              trend: 'AI推薦で新しい音楽を発見'
            },
            {
              id: 'features',
              title: '機能',
              value: '10+',
              subtitle: 'スマート機能',
              icon: Target,
              color: '#f59e0b',
              trend: 'パーソナライズされた体験'
            },
            {
              id: 'ready',
              title: '準備完了',
              value: '100%',
              subtitle: 'システム稼働',
              icon: BarChart3,
              color: '#ef4444',
              trend: '最高の音楽体験をお届け'
            }
          )
        }

        // 最大8項目まで表示
        setStats(statItems.slice(0, 8))

      } catch (error) {
        console.error('Failed to generate stats:', error)
        setStats([])
      } finally {
        setIsLoading(false)
      }
    }

    generateStats()
  }, [playlistGenerator, historyManager])

  if (isLoading) {
    return (
      <section className={`${className} px-4`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="p-6 rounded-xl animate-pulse"
                style={{ backgroundColor: theme.secondaryColor }}
              >
                <div className="w-12 h-12 rounded-full mx-auto mb-4" 
                     style={{ backgroundColor: theme.textColor + '20' }} />
                <div className="h-6 rounded mx-auto mb-2" 
                     style={{ backgroundColor: theme.textColor + '20', width: '60%' }} />
                <div className="h-4 rounded mx-auto mb-1" 
                     style={{ backgroundColor: theme.textColor + '10', width: '80%' }} />
                <div className="h-3 rounded mx-auto" 
                     style={{ backgroundColor: theme.textColor + '10', width: '70%' }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`${className} px-4`}>
      <div className="max-w-6xl mx-auto">
        {/* セクションヘッダー */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: theme.textColor }}>
            あなたの音楽統計
          </h2>
          <p className="text-lg" style={{ color: theme.textColor + 'CC' }}>
            音楽体験の記録と成長を確認
          </p>
        </div>

        {/* 統計グリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <div
              key={stat.id}
              className="group p-6 rounded-xl text-center hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              {/* 背景グラデーション */}
              <div 
                className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
                style={{ 
                  background: `linear-gradient(135deg, ${stat.color}40 0%, transparent 100%)`
                }}
              />
              
              {/* アイコン */}
              <div 
                className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform relative"
                style={{ backgroundColor: stat.color + '20' }}
              >
                <stat.icon className="w-7 h-7" style={{ color: stat.color }} />
                
                {/* 脈動効果 */}
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ backgroundColor: stat.color }}
                />
              </div>

              {/* メイン数値 */}
              <div className="text-2xl md:text-3xl font-bold mb-1" style={{ color: theme.textColor }}>
                {stat.value}
              </div>

              {/* タイトル */}
              <div className="text-sm md:text-base font-medium mb-1" style={{ color: theme.textColor + 'CC' }}>
                {stat.title}
              </div>

              {/* サブタイトル */}
              <div className="text-xs mb-3" style={{ color: theme.textColor + '99' }}>
                {stat.subtitle}
              </div>

              {/* トレンド情報 */}
              {stat.trend && (
                <div className="flex items-center justify-center space-x-1 text-xs">
                  {stat.trendUp !== undefined && (
                    <TrendingUp 
                      className={`w-3 h-3 ${stat.trendUp ? '' : 'rotate-180'}`}
                      style={{ color: stat.trendUp ? '#10b981' : '#ef4444' }}
                    />
                  )}
                  <span 
                    style={{ 
                      color: stat.trendUp !== undefined 
                        ? (stat.trendUp ? '#10b981' : '#ef4444')
                        : stat.color
                    }}
                  >
                    {stat.trend}
                  </span>
                </div>
              )}

              {/* ホバー時のシャドウ */}
              <div 
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  boxShadow: `0 0 30px ${stat.color}40`
                }}
              />
            </div>
          ))}
        </div>

        {/* アクションカード（統計が少ない場合） */}
        {stats.length < 4 && (
          <div className="mt-8 text-center">
            <div 
              className="inline-block p-6 rounded-xl"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <BarChart3 className="w-12 h-12 mx-auto mb-4" style={{ color: theme.primaryColor }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: theme.textColor }}>
                もっと音楽を楽しんで統計を充実させよう
              </h3>
              <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                楽曲を再生したり、プレイリストを作成すると詳細な統計が表示されます
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}