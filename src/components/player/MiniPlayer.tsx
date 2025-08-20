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
      className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 backdrop-blur-md rounded-2xl shadow-2xl p-4 max-w-md w-full mx-4"
      style={{ 
        backgroundColor: theme.backgroundColor + 'E6', // 90% opacity
        border: `1px solid ${theme.primaryColor}40`
      }}
    >
      <div className="flex items-center space-x-4">
        {/* アルバムアート */}
        <div className="flex-shrink-0">
          <img
            src={currentTrack.artworkUrl || 'https://via.placeholder.com/48x48?text=♪'}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
        </div>

        {/* 楽曲情報 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate" style={{ color: theme.textColor }}>
            {currentTrack.title}
          </h4>
          <p className="text-sm truncate" style={{ color: theme.textColor + '80' }}>
            {currentTrack.artist}
          </p>
        </div>

        {/* 再生状態表示 */}
        <div className="flex-shrink-0">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: theme.primaryColor }}
          >
            <span className="text-white text-sm">
              {isPlaying ? '⏸️' : '▶️'}
            </span>
          </div>
        </div>
      </div>

      {/* プレースホルダーメッセージ */}
      <div className="mt-2 text-center">
        <p className="text-xs" style={{ color: theme.textColor + '60' }}>
          🚧 開発中: フル機能は次のステップで実装
        </p>
      </div>
    </div>
  )
}