// src/components/player/MiniPlayer.tsx
import React from 'react'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'

export const MiniPlayer: React.FC = () => {
  const { currentTrack, isPlaying } = useMusicStore()
  const theme = useMyPageStore(state => state.theme)

  // 現在再生中の楽曲がない場合は表示しない
  if (!currentTrack) {
    return null
  }

  return (
    <div 
      className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 backdrop-blur-md rounded-2xl shadow-2xl p-4 max-w-md w-full mx-4 animate-slide-up"
      style={{ 
        backgroundColor: theme.backgroundColor + 'F0', // 94% opacity
        border: `1px solid ${theme.primaryColor}40`
      }}
    >
      <div className="flex items-center space-x-4">
        {/* アルバムアート */}
        <div className="flex-shrink-0">
          <img
            src={currentTrack.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-lg object-cover shadow-md"
          />
        </div>

        {/* 楽曲情報 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate text-sm" style={{ color: theme.textColor }}>
            {currentTrack.title}
          </h4>
          <p className="text-xs truncate" style={{ color: theme.textColor + 'CC' }}>
            {currentTrack.artist}
          </p>
        </div>

        {/* 再生状態表示 */}
        <div className="flex-shrink-0">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <span className="text-white text-xs">
              {isPlaying ? '⏸️' : '▶️'}
            </span>
          </div>
        </div>
      </div>

      {/* 進行バー（プレースホルダー） */}
      <div className="mt-3">
        <div className="w-full bg-gray-600 bg-opacity-30 rounded-full h-1">
          <div 
            className="h-1 rounded-full transition-all duration-300"
            style={{ 
              backgroundColor: theme.primaryColor,
              width: isPlaying ? '45%' : '0%'
            }}
          />
        </div>
      </div>

      {/* 開発中メッセージ */}
      <div className="mt-2 text-center">
        <p className="text-xs opacity-60" style={{ color: theme.textColor }}>
          🚧 フル機能は次のステップで実装
        </p>
      </div>
    </div>
  )
}