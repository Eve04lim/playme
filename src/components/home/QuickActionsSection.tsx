// src/components/home/QuickActionsSection.tsx
import {
  Shuffle, Plus, Star, Zap, Music, Heart,
  Clock, TrendingUp, Users, PlayCircle,
  BarChart3, Target
} from 'lucide-react'
import React from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { useMusicStore } from '../../stores/musicStore'
import type { Track } from '../../types'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ElementType
  color: string
  gradient: string
  action: () => void
  badge?: string
  isPopular?: boolean
}

interface QuickActionsSectionProps {
  onNavigate?: (path: string) => void
  onQuickPlaylist?: (type: string) => void
  availableTracks?: Track[]
  className?: string
}

export const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onNavigate,
  onQuickPlaylist,
  availableTracks = [],
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack } = useMusicStore()

  // クイックアクション定義
  const quickActions: QuickAction[] = [
    {
      id: 'shuffle_all',
      title: 'シャッフル再生',
      description: '全ライブラリからランダム再生',
      icon: Shuffle,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      badge: 'おすすめ',
      isPopular: true,
      action: () => {
        if (availableTracks.length > 0) {
          const randomTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)]
          playTrack(randomTrack)
        } else {
          onNavigate?.('/search')
        }
      }
    },
    {
      id: 'create_playlist',
      title: 'プレイリスト作成',
      description: 'ワンクリックで最適プレイリスト',
      icon: Plus,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      badge: '人気',
      isPopular: true,
      action: () => onNavigate?.('/playlists/create')
    },
    {
      id: 'discover_music',
      title: '音楽発見',
      description: '新しいお気に入りを発見',
      icon: Star,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      action: () => onNavigate?.('/recommendations')
    },
    {
      id: 'workout_mode',
      title: 'ワークアウト',
      description: 'エネルギッシュな運動用楽曲',
      icon: Zap,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      action: () => onQuickPlaylist?.('workout')
    },
    {
      id: 'focus_mode',
      title: '集中モード',
      description: '仕事・勉強に最適な楽曲',
      icon: Target,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      action: () => onQuickPlaylist?.('study')
    },
    {
      id: 'relax_mode',
      title: 'リラックス',
      description: '癒しとくつろぎの時間',
      icon: Heart,
      color: '#ec4899',
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      action: () => onQuickPlaylist?.('relax')
    },
    {
      id: 'trending_now',
      title: 'トレンド楽曲',
      description: '今話題の人気楽曲をチェック',
      icon: TrendingUp,
      color: '#f97316',
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      action: () => onNavigate?.('/trending')
    },
    {
      id: 'my_stats',
      title: '視聴統計',
      description: '詳細な再生履歴と分析',
      icon: BarChart3,
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      action: () => onNavigate?.('/history')
    }
  ]

  return (
    <section className={`${className} px-4`}>
      <div className="max-w-6xl mx-auto">
        {/* セクションヘッダー */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: theme.textColor }}>
            クイックアクション
          </h2>
          <p className="text-lg" style={{ color: theme.textColor + 'CC' }}>
            ワンタップで音楽体験を開始
          </p>
        </div>

        {/* アクションカードグリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {quickActions.map((action) => (
            <div
              key={action.id}
              onClick={action.action}
              className={`group relative p-6 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden ${
                action.isPopular ? 'ring-2 ring-opacity-50' : ''
              }`}
              style={{ 
                backgroundColor: theme.secondaryColor,
                ringColor: action.isPopular ? action.color : 'transparent'
              }}
            >
              {/* 背景グラデーション */}
              <div 
                className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
                style={{ background: action.gradient }}
              />

              {/* 人気バッジ */}
              {action.badge && (
                <div className="absolute top-3 right-3 px-2 py-1 text-xs font-bold text-white rounded-full z-10"
                     style={{ backgroundColor: action.color }}>
                  {action.badge}
                </div>
              )}

              {/* アイコン */}
              <div 
                className="relative w-14 h-14 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                style={{ background: action.gradient }}
              >
                <action.icon className="w-7 h-7 text-white" />
                
                {/* 脈動リング */}
                <div 
                  className="absolute inset-0 rounded-full animate-pulse opacity-30 group-hover:animate-ping"
                  style={{ backgroundColor: action.color }}
                />
              </div>

              {/* コンテンツ */}
              <div className="relative z-10">
                <h3 className="text-lg font-semibold mb-2 group-hover:text-opacity-90 transition-colors" 
                    style={{ color: theme.textColor }}>
                  {action.title}
                </h3>
                
                <p className="text-sm leading-relaxed" 
                   style={{ color: theme.textColor + 'CC' }}>
                  {action.description}
                </p>
              </div>

              {/* ホバーエフェクト */}
              <div 
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${action.color}20 0%, transparent 70%)`,
                  filter: 'blur(10px)'
                }}
              />

              {/* クリック波紋エフェクト */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div 
                  className="absolute inset-0 scale-0 group-active:scale-100 transition-transform duration-200 rounded-xl"
                  style={{ backgroundColor: action.color + '30' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 追加のアクションヒント */}
        <div className="mt-8 md:mt-12 text-center">
          <div 
            className="inline-flex items-center space-x-3 px-6 py-3 rounded-xl"
            style={{ backgroundColor: theme.primaryColor + '15', color: theme.primaryColor }}
          >
            <PlayCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              より多くの機能は検索やナビゲーションからアクセスできます
            </span>
          </div>
        </div>

        {/* 統計付きアクションカード（レスポンシブ対応） */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* 今日のおすすめ */}
          <div 
            className="p-6 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: theme.secondaryColor }}
            onClick={() => onNavigate?.('/recommendations')}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: theme.primaryColor + '20' }}>
              <Music className="w-6 h-6" style={{ color: theme.primaryColor }} />
            </div>
            <h3 className="font-semibold mb-2" style={{ color: theme.textColor }}>
              今日のおすすめ
            </h3>
            <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
              あなた向けの新しい発見
            </p>
            <div className="mt-3 text-xs" style={{ color: theme.primaryColor }}>
              20曲 準備完了 →
            </div>
          </div>

          {/* 最近の活動 */}
          <div 
            className="p-6 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: theme.secondaryColor }}
            onClick={() => onNavigate?.('/history')}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: '#10b981' + '20' }}>
              <Clock className="w-6 h-6" style={{ color: '#10b981' }} />
            </div>
            <h3 className="font-semibold mb-2" style={{ color: theme.textColor }}>
              最近の活動
            </h3>
            <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
              再生履歴と統計
            </p>
            <div className="mt-3 text-xs" style={{ color: '#10b981' }}>
              詳細を見る →
            </div>
          </div>

          {/* 友達と共有 */}
          <div 
            className="p-6 rounded-xl text-center cursor-pointer hover:scale-105 transition-transform"
            style={{ backgroundColor: theme.secondaryColor }}
            onClick={() => onNavigate?.('/social')}
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: '#ec4899' + '20' }}>
              <Users className="w-6 h-6" style={{ color: '#ec4899' }} />
            </div>
            <h3 className="font-semibold mb-2" style={{ color: theme.textColor }}>
              友達と共有
            </h3>
            <p className="text-sm" style={{ color: theme.textColor + 'CC' }}>
              お気に入りをシェア
            </p>
            <div className="mt-3 text-xs" style={{ color: '#ec4899' }}>
              近日公開 →
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}