// src/components/carousel/MusicCarousel.tsx
/**
 * MusicCarousel - 3カラム音楽カルーセル
 * 
 * 機能:
 * - 200×200カード、Hover時1.05x拡大
 * - グラデーションオーバーレイ、縦スクロール
 * - フェードイン0.3s、カードローテーション3-5s、Hover 0.2s
 * - アクセシビリティ対応（ARIA、キーボード操作）
 * - 遅延読込とIntersectionObserver
 */
import React from 'react'

interface MusicCarouselProps {
  playlistId?: string
  title?: string
  className?: string
  columnIndex: number
  maxItems?: number
  isLoading?: boolean
  items?: any[]
}

// 未使用の型定義を削除

export const MusicCarousel: React.FC<MusicCarouselProps> = ({
  className = '',
  isLoading = false,
  items = []
}) => {
  // 実データ（items）を優先使用、モック/デモは使用しない
  const actualTracks = items || []

  // 未使用機能削除

  // ローディング状態
  if (isLoading) {
    return (
      <div className={`p-4 text-white/70 text-sm ${className}`}>
        読み込み中…
      </div>
    )
  }

  // 空の状態（実データがない場合）
  if (!actualTracks || actualTracks.length === 0) {
    return (
      <div className={`rounded-md border border-white/10 p-4 text-sm text-white/70 ${className}`}>
        プレイリストを選択すると、ここに曲が表示されます。
      </div>
    )
  }

  // ここからカード描画（artwork/artist/album の安全なフォールバック）
  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '800px' }}
    >
      {actualTracks.map((it, i) => {
        if (!it) return null // undefined項目をスキップ
        
        const title = it.name ?? it.title ?? '(名称不明)'
        const artist =
          Array.isArray(it.artists) ? it.artists.map((a:any)=>a?.name).filter(Boolean).join(', ')
          : (it.artist ?? '')
        const albumName = it.album?.name ?? it.albumName ?? ''
        const artwork = it.album?.images?.[0]?.url ?? it.artworkUrl ?? ''
        return (
          <div key={it.id ?? i} className="group relative bg-white/5 rounded-xl p-4">
            <div className="relative w-full aspect-square mb-4 overflow-hidden rounded-lg">
              {artwork ? (
                <img
                  src={artwork}
                  alt={`${title} アートワーク`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-2xl bg-black/30">🎵</div>
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm truncate text-white">{title}</h3>
              {artist && <p className="text-xs text-white/70 truncate">{artist}</p>}
              {albumName && <p className="text-xs text-white/60 truncate">{albumName}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(MusicCarousel)