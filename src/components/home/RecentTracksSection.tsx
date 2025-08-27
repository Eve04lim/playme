// src/components/home/RecentTracksSection.tsx
import { PlayCircle, Clock, Music, Heart, MoreHorizontal, Shuffle } from 'lucide-react'
import React, { useCallback } from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { useMusicStore } from '../../stores/musicStore'
import type { Track } from '../../types'

interface RecentTracksSectionProps {
  tracks: Track[]
  onNavigate?: (path: string) => void
  onTrackSelect?: (track: Track) => void
  className?: string
}

export const RecentTracksSection: React.FC<RecentTracksSectionProps> = ({
  tracks,
  onNavigate,
  onTrackSelect,
  className = ''
}) => {
  const theme = useMyPageStore(state => state.theme)
  const { playTrack, currentTrack, isPlaying } = useMusicStore()

  const handleTrackPlay = useCallback((track: Track) => {
    playTrack(track)
    onTrackSelect?.(track)
  }, [playTrack, onTrackSelect])

  const handleShuffleAll = useCallback(() => {
    if (tracks.length > 0) {
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
      handleTrackPlay(randomTrack)
    }
  }, [tracks, handleTrackPlay])

  // 時間フォーマット
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (tracks.length === 0) {
    return (
      <section className={`${className} px-4`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <Music className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: theme.textColor }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: theme.textColor }}>
              最近再生した楽曲がありません
            </h3>
            <p className="text-lg mb-6" style={{ color: theme.textColor + 'CC' }}>
              楽曲を再生すると、ここに履歴が表示されます
            </p>
            <button
              onClick={() => onNavigate?.('/search')}
              className="px-6 py-3 rounded-xl font-medium transition-colors"
              style={{
                backgroundColor: theme.primaryColor,
                color: 'white'
              }}
            >
              楽曲を探す
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={`${className} px-4`}>
      <div className="max-w-6xl mx-auto">
        {/* セクションヘッダー */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: theme.textColor }}>
              最近再生した楽曲
            </h2>
            <p className="text-sm md:text-base" style={{ color: theme.textColor + 'CC' }}>
              あなたの音楽履歴から
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleShuffleAll}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: theme.secondaryColor,
                color: theme.textColor
              }}
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden md:inline">シャッフル</span>
            </button>
            
            <button
              onClick={() => onNavigate?.('/history')}
              className="text-sm md:text-base hover:opacity-80 transition-opacity"
              style={{ color: theme.primaryColor }}
            >
              すべて見る →
            </button>
          </div>
        </div>

        {/* 2行グリッドレイアウト */}
        <div className="space-y-4 md:space-y-6">
          {/* 1行目 - 大きなカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {tracks.slice(0, 4).map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id
              const isTrackPlaying = isCurrentTrack && isPlaying

              return (
                <div
                  key={track.id}
                  className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                  onClick={() => handleTrackPlay(track)}
                  style={{
                    boxShadow: isCurrentTrack 
                      ? `0 0 20px ${theme.primaryColor}40` 
                      : '0 4px 20px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* 背景画像 */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${track.artworkUrl || `https://picsum.photos/400/400?random=${track.id}`})`
                    }}
                  />
                  
                  {/* オーバーレイ */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* 再生インジケーター */}
                  {isCurrentTrack && (
                    <div className="absolute top-3 left-3">
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                    </div>
                  )}

                  {/* ホバーオーバーレイ */}
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PlayCircle 
                      className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-lg transform group-hover:scale-110 transition-transform" 
                      fill="white"
                    />
                  </div>

                  {/* 楽曲情報 */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h4 className="text-white text-sm md:text-base font-bold truncate drop-shadow-lg">
                      {track.title}
                    </h4>
                    <p className="text-white/90 text-xs md:text-sm truncate drop-shadow">
                      {track.artist}
                    </p>
                  </div>

                  {/* 順番バッジ */}
                  <div className="absolute top-3 right-3 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {index + 1}
                    </span>
                  </div>

                  {/* 再生中アニメーション */}
                  {isTrackPlaying && (
                    <div className="absolute inset-0">
                      <div 
                        className="absolute inset-0 animate-pulse"
                        style={{ backgroundColor: theme.primaryColor + '20' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 2行目 - より多くのアイテム（小さめ） */}
          {tracks.length > 4 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {tracks.slice(4, 10).map((track, index) => {
                const isCurrentTrack = currentTrack?.id === track.id
                const isTrackPlaying = isCurrentTrack && isPlaying
                const actualIndex = index + 4

                return (
                  <div
                    key={track.id}
                    className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105"
                    onClick={() => handleTrackPlay(track)}
                  >
                    {/* 背景画像 */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${track.artworkUrl || `https://picsum.photos/300/300?random=${track.id}`})`
                      }}
                    />
                    
                    {/* オーバーレイ */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* ホバーオーバーレイ */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-white" fill="white" />
                    </div>

                    {/* 楽曲情報 */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <h4 className="text-white text-xs font-medium truncate drop-shadow">
                        {track.title}
                      </h4>
                    </div>

                    {/* 順番バッジ */}
                    <div className="absolute top-2 right-2 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {actualIndex + 1}
                      </span>
                    </div>

                    {/* 現在再生中インジケーター */}
                    {isCurrentTrack && (
                      <div className="absolute top-2 left-2">
                        <div 
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ backgroundColor: theme.primaryColor }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 詳細情報カード（デスクトップのみ） */}
        {tracks.length > 0 && (
          <div className="hidden md:block mt-8">
            <div 
              className="p-6 rounded-xl"
              style={{ backgroundColor: theme.secondaryColor }}
            >
              <div className="grid grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
                    {tracks.length}
                  </div>
                  <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    最近再生楽曲
                  </div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
                    {Math.floor(tracks.reduce((sum, track) => sum + track.duration, 0) / 60000)}分
                  </div>
                  <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    総再生時間
                  </div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold mb-1" style={{ color: theme.textColor }}>
                    {[...new Set(tracks.map(t => t.artist))].length}
                  </div>
                  <div className="text-sm" style={{ color: theme.textColor + 'CC' }}>
                    アーティスト数
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}