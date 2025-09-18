// src/components/history/PlaybackStats.tsx
import {
  BarChart3, TrendingUp, Clock, Target,
  Calendar, Music, Heart, Trophy, Star,
  Users, PlayCircle
} from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import type { PlaybackStats as PlaybackStatsType, Achievement } from '../../utils/playbackHistoryManager'

interface PlaybackStatsProps {
  stats: PlaybackStatsType
  className?: string
}

interface ChartData {
  label: string
  value: number
  color: string
  percentage: number
}

export const PlaybackStats: React.FC<PlaybackStatsProps> = ({
  stats,
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  const [activeChart, setActiveChart] = useState<'genres' | 'artists' | 'timeDistribution'>('genres')

  // 時間フォーマット
  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`
    }
    return `${minutes}分`
  }

  // チャートデータの生成
  const chartData = useMemo(() => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e'
    ]

    switch (activeChart) {
      case 'genres':
        return stats.topGenres.map((genre, index) => ({
          label: genre.genre,
          value: genre.count,
          color: colors[index % colors.length],
          percentage: genre.percentage
        }))
      
      case 'artists':
        return stats.topArtists.map((artist, index) => ({
          label: artist.artist,
          value: artist.count,
          color: colors[index % colors.length],
          percentage: artist.percentage
        }))
      
      case 'timeDistribution':
        return stats.playTimeDistribution
          .map((time, index) => ({
            label: `${time.hour.toString().padStart(2, '0')}:00`,
            value: Math.round(time.minutes),
            color: colors[index % colors.length],
            percentage: (time.minutes / Math.max(...stats.playTimeDistribution.map(t => t.minutes))) * 100
          }))
          .filter(item => item.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
      
      default:
        return []
    }
  }, [stats, activeChart])

  // 実績の表示
  const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
    const rarityColors = {
      common: '#6b7280',
      uncommon: '#22c55e',
      rare: '#3b82f6',
      epic: '#8b5cf6',
      legendary: '#f59e0b'
    }

    const isUnlocked = !!achievement.unlockedAt

    return (
      <div
        className={`relative p-4 rounded-xl transition-all duration-300 ${
          isUnlocked ? 'hover:scale-105' : 'opacity-75'
        }`}
        style={{ 
          backgroundColor: theme.secondaryColor,
          border: `2px solid ${rarityColors[achievement.rarity]}${isUnlocked ? '' : '40'}`
        }}
      >
        {/* レア度バッジ */}
        <div 
          className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: rarityColors[achievement.rarity] }}
        >
          {achievement.rarity.toUpperCase()}
        </div>

        {/* アイコン */}
        <div className="text-4xl mb-3 text-center">
          {achievement.icon}
        </div>

        {/* タイトル */}
        <h3 
          className="font-semibold text-center mb-2"
          style={{ color: isUnlocked ? theme.textColor : theme.textColor + '99' }}
        >
          {achievement.title}
        </h3>

        {/* 説明 */}
        <p 
          className="text-xs text-center mb-3"
          style={{ color: theme.textColor + 'CC' }}
        >
          {achievement.description}
        </p>

        {/* プログレス */}
        <div className="space-y-2">
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: rarityColors[achievement.rarity],
                width: `${Math.min(achievement.progress * 100, 100)}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: theme.textColor + '99' }}>
            <span>{Math.round(achievement.progress * achievement.maxProgress)}</span>
            <span>{achievement.maxProgress}</span>
          </div>
        </div>

        {/* アンロック日時 */}
        {isUnlocked && achievement.unlockedAt && (
          <p className="text-xs text-center mt-2" style={{ color: theme.primaryColor }}>
            {achievement.unlockedAt.toLocaleDateString('ja-JP')}にアンロック
          </p>
        )}
      </div>
    )
  }

  // チャート表示
  const ChartDisplay: React.FC<{ data: ChartData[] }> = ({ data }) => (
    <div className="space-y-3">
      {data.slice(0, 8).map((item, index) => (
        <div key={item.label} className="flex items-center space-x-3">
          <div className="w-8 text-right text-sm font-medium" style={{ color: theme.textColor + '99' }}>
            #{index + 1}
          </div>
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span 
                className="font-medium truncate"
                style={{ color: theme.textColor }}
                title={item.label}
              >
                {item.label}
              </span>
              <span className="text-sm ml-2" style={{ color: theme.textColor + 'CC' }}>
                {item.value}
              </span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  backgroundColor: item.color,
                  width: `${Math.min(item.percentage, 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className={`${className} space-y-8`}>
      {/* メイン統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* 総楽曲数 */}
        <div 
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <Music className="w-12 h-12 mx-auto mb-3" style={{ color: theme.primaryColor }} />
          <div className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
            {stats.totalTracks.toLocaleString()}
          </div>
          <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
            総楽曲数
          </div>
        </div>

        {/* 総再生時間 */}
        <div 
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: '#f59e0b' }} />
          <div className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
            {formatDuration(stats.totalPlayTime)}
          </div>
          <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
            総再生時間
          </div>
        </div>

        {/* 平均完了率 */}
        <div 
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <Target className="w-12 h-12 mx-auto mb-3" style={{ color: '#10b981' }} />
          <div className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
            {Math.round(stats.completionRateAverage * 100)}%
          </div>
          <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
            平均完了率
          </div>
        </div>

        {/* 連続視聴日数 */}
        <div 
          className="p-6 rounded-xl text-center"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: '#ef4444' }} />
          <div className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
            {stats.streakData.currentStreak}日
          </div>
          <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
            連続視聴
            <div className="text-xs mt-1">
              最長: {stats.streakData.longestStreak}日
            </div>
          </div>
        </div>
      </div>

      {/* チャート分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ランキングチャート */}
        <div 
          className="p-6 rounded-xl"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ color: theme.textColor }}>
              視聴データ分析
            </h3>
            
            <div className="flex bg-gray-700 rounded-lg p-1">
              {[
                { id: 'genres', label: 'ジャンル', icon: Music },
                { id: 'artists', label: 'アーティスト', icon: Users },
                { id: 'timeDistribution', label: '時間帯', icon: Clock }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveChart(id as 'genres' | 'artists' | 'timeDistribution')}
                  className={`px-3 py-2 rounded-md transition-colors flex items-center space-x-1 ${
                    activeChart === id 
                      ? 'text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: activeChart === id ? theme.primaryColor : 'transparent'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <ChartDisplay data={chartData} />
        </div>

        {/* セッション詳細 */}
        <div 
          className="p-6 rounded-xl"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h3 className="text-lg font-semibold mb-6" style={{ color: theme.textColor }}>
            セッション詳細
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <PlayCircle className="w-5 h-5" style={{ color: theme.primaryColor }} />
                <span style={{ color: theme.textColor }}>総セッション数</span>
              </div>
              <span className="font-semibold" style={{ color: theme.textColor }}>
                {stats.totalSessions.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5" style={{ color: '#f59e0b' }} />
                <span style={{ color: theme.textColor }}>平均セッション時間</span>
              </div>
              <span className="font-semibold" style={{ color: theme.textColor }}>
                {formatDuration(stats.averagePlayTime)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Heart className="w-5 h-5" style={{ color: '#ef4444' }} />
                <span style={{ color: theme.textColor }}>お気に入り楽曲</span>
              </div>
              <span className="font-semibold" style={{ color: theme.textColor }}>
                {stats.topGenres.filter(g => g.count > 5).length}
              </span>
            </div>

            {/* 時間帯別視聴パターン */}
            <div className="pt-4 border-t" style={{ borderColor: theme.textColor + '20' }}>
              <h4 className="text-sm font-medium mb-3" style={{ color: theme.textColor }}>
                よく聞く時間帯
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {stats.playTimeDistribution
                  .map((time, index) => ({ ...time, index }))
                  .sort((a, b) => b.minutes - a.minutes)
                  .slice(0, 4)
                  .map((time) => (
                    <div key={time.index} className="text-center">
                      <div className="text-xs mb-1" style={{ color: theme.textColor + '99' }}>
                        {time.hour.toString().padStart(2, '0')}時
                      </div>
                      <div 
                        className="w-full h-8 rounded flex items-center justify-center"
                        style={{ backgroundColor: theme.primaryColor + '40' }}
                      >
                        <span className="text-xs font-medium" style={{ color: theme.primaryColor }}>
                          {Math.round(time.minutes)}分
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 実績システム */}
      <div 
        className="p-6 rounded-xl"
        style={{ backgroundColor: theme.secondaryColor }}
      >
        <div className="flex items-center space-x-3 mb-6">
          <Trophy className="w-6 h-6" style={{ color: '#fbbf24' }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.textColor }}>
            実績・アチーブメント
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stats.achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>

        {stats.achievements.length === 0 && (
          <div className="text-center py-8">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: theme.textColor }} />
            <p style={{ color: theme.textColor + 'CC' }}>
              音楽を聞いて実績をアンロックしよう！
            </p>
          </div>
        )}
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 平均統計 */}
        <div 
          className="p-6 rounded-xl"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h4 className="font-semibold mb-4 flex items-center space-x-2" style={{ color: theme.textColor }}>
            <BarChart3 className="w-5 h-5" />
            <span>平均データ</span>
          </h4>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span style={{ color: theme.textColor + 'CC' }}>楽曲あたり再生時間</span>
              <span style={{ color: theme.textColor }}>{formatDuration(stats.averagePlayTime)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.textColor + 'CC' }}>完了率</span>
              <span style={{ color: theme.textColor }}>{Math.round(stats.completionRateAverage * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: theme.textColor + 'CC' }}>1日あたりセッション</span>
              <span style={{ color: theme.textColor }}>
                {Math.round(stats.totalSessions / Math.max(stats.streakData.longestStreak, 1))}
              </span>
            </div>
          </div>
        </div>

        {/* トップアーティスト */}
        <div 
          className="p-6 rounded-xl"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h4 className="font-semibold mb-4 flex items-center space-x-2" style={{ color: theme.textColor }}>
            <Users className="w-5 h-5" />
            <span>トップアーティスト</span>
          </h4>
          
          <div className="space-y-2">
            {stats.topArtists.slice(0, 3).map((artist, index) => (
              <div key={artist.artist} className="flex items-center space-x-3">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: ['#fbbf24', '#9ca3af', '#d97706'][index] || theme.primaryColor }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: theme.textColor }}>
                    {artist.artist}
                  </p>
                  <p className="text-xs" style={{ color: theme.textColor + 'CC' }}>
                    {artist.count}回再生
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 視聴パターン */}
        <div 
          className="p-6 rounded-xl"
          style={{ backgroundColor: theme.secondaryColor }}
        >
          <h4 className="font-semibold mb-4 flex items-center space-x-2" style={{ color: theme.textColor }}>
            <TrendingUp className="w-5 h-5" />
            <span>視聴パターン</span>
          </h4>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: theme.textColor + 'CC' }}>最もアクティブな時間</span>
                <span style={{ color: theme.textColor }}>
                  {stats.playTimeDistribution
                    .reduce((max, current) => current.minutes > max.minutes ? current : max, stats.playTimeDistribution[0])
                    ?.hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: theme.textColor + 'CC' }}>連続視聴記録</span>
                <span style={{ color: theme.textColor }}>
                  {stats.streakData.longestStreak}日
                </span>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: theme.textColor + 'CC' }}>お気に入りジャンル</span>
                <span style={{ color: theme.textColor }}>
                  {stats.topGenres[0]?.genre || 'なし'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}