// src/components/home/HeroSection.tsx
import { Search, Sparkles, TrendingUp, Music, Star } from 'lucide-react'
import React, { useState } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'

interface HeroSectionProps {
  onSearchSubmit?: (query: string) => void
  onSearchFocus?: () => void
  className?: string
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearchSubmit,
  onSearchFocus,
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearchSubmit?.(searchQuery)
    }
  }

  const handleFocus = () => {
    onSearchFocus?.()
  }

  const suggestions = [
    { text: 'トレンド楽曲', icon: TrendingUp },
    { text: 'J-Pop ヒッツ', icon: Star },
    { text: 'ワークアウト', icon: Music },
    { text: 'リラックス', icon: Sparkles }
  ]

  return (
    <section className={`${className} relative overflow-hidden`}>
      {/* 背景グラデーション */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor}20 0%, ${theme.primaryColor}05 50%, transparent 100%)`
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 text-center">
        {/* メインタイトル */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight">
            <span style={{ color: theme.textColor }}>あなたの音楽体験を</span>
            <br />
            <span 
              className="relative inline-block"
              style={{ color: theme.primaryColor }}
            >
              次のレベルへ
              {/* アクセント装飾 */}
              <div 
                className="absolute -bottom-2 left-0 w-full h-1 rounded-full opacity-50"
                style={{ backgroundColor: theme.primaryColor }}
              />
            </span>
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed" 
             style={{ color: theme.textColor + 'CC' }}>
            AI推薦、スマートプレイリスト、パーソナライズされた音楽発見で
            <br className="hidden md:block" />
            毎日の音楽体験をより豊かに
          </p>
        </div>

        {/* 検索バー */}
        <div className="max-w-3xl mx-auto mb-8">
          <form onSubmit={handleSubmit} className="relative group">
            {/* 検索入力 */}
            <div className="relative">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-6 h-6 transition-colors" 
                      style={{ color: searchQuery ? theme.primaryColor : theme.textColor + '99' }} />
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleFocus}
                placeholder="楽曲、アーティスト、アルバムを検索..."
                className="w-full pl-16 pr-32 py-6 text-lg md:text-xl rounded-2xl border-0 focus:outline-none focus:ring-4 shadow-xl hover:shadow-2xl transition-all duration-300"
                style={{
                  backgroundColor: theme.secondaryColor,
                  color: theme.textColor,
                  focusRingColor: theme.primaryColor + '40'
                }}
              />
              
              {/* 検索ボタン */}
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: 'white'
                }}
              >
                検索
              </button>
            </div>

            {/* フォーカス時のグロー効果 */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryColor}20, ${theme.primaryColor}10)`,
                filter: 'blur(20px)',
                transform: 'scale(1.05)'
              }}
            />
          </form>

          {/* 検索候補 */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-6">
            <span className="text-sm" style={{ color: theme.textColor + '99' }}>
              人気の検索:
            </span>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(suggestion.text)
                  onSearchSubmit?.(suggestion.text)
                }}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: theme.primaryColor + '15',
                  color: theme.primaryColor,
                  border: `1px solid ${theme.primaryColor}40`
                }}
              >
                <suggestion.icon className="w-3 h-3" />
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 特徴的な数値 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: theme.primaryColor }}>
              250+
            </div>
            <div className="text-sm md:text-base" style={{ color: theme.textColor + 'CC' }}>
              精選された楽曲
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: theme.primaryColor }}>
              AI推薦
            </div>
            <div className="text-sm md:text-base" style={{ color: theme.textColor + 'CC' }}>
              パーソナライズされた発見
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2" style={{ color: theme.primaryColor }}>
              10+
            </div>
            <div className="text-sm md:text-base" style={{ color: theme.textColor + 'CC' }}>
              音楽ジャンル
            </div>
          </div>
        </div>
      </div>

      {/* 装飾的な背景要素 */}
      <div className="absolute top-20 left-10 w-32 h-32 opacity-5 animate-float">
        <Music className="w-full h-full" style={{ color: theme.primaryColor }} />
      </div>
      
      <div className="absolute bottom-20 right-10 w-24 h-24 opacity-5 animate-float-delayed">
        <Star className="w-full h-full" style={{ color: theme.primaryColor }} />
      </div>
    </section>
  )
}