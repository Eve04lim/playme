// src/pages/HomePage.tsx
import React, { useEffect } from 'react'
import { useMusicStore } from '../stores/musicStore'
import { useMyPageStore } from '../stores/myPageStore'

export const HomePage: React.FC = () => {
  const { playlists, loadPlaylists, playlistsLoading } = useMusicStore()
  const theme = useMyPageStore(state => state.theme)

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: theme.textColor }}>
          おかえりなさい
        </h1>
        <p className="text-lg" style={{ color: theme.textColor + '80' }}>
          あなたの音楽の世界を探索しましょう
        </p>
      </div>

      {/* プレイリスト一覧 */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6" style={{ color: theme.textColor }}>
          あなたのプレイリスト
        </h2>
        
        {playlistsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-700 rounded-lg h-48 mb-4"></div>
                <div className="bg-gray-700 rounded h-4 mb-2"></div>
                <div className="bg-gray-700 rounded h-3 w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="group cursor-pointer rounded-lg p-4 transition-all duration-300 hover:scale-105"
                style={{ 
                  backgroundColor: theme.secondaryColor,
                  border: `1px solid ${theme.primaryColor}20`
                }}
              >
                <div 
                  className="w-full h-48 rounded-lg mb-4 bg-gradient-to-br flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.primaryColor}40, ${theme.secondaryColor})` 
                  }}
                >
                  {playlist.coverImageUrl ? (
                    <img
                      src={playlist.coverImageUrl}
                      alt={playlist.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-6xl" style={{ color: theme.primaryColor }}>
                      🎵
                    </div>
                  )}
                </div>
                
                <h3 className="font-semibold text-lg mb-2" style={{ color: theme.textColor }}>
                  {playlist.name}
                </h3>
                
                <p className="text-sm mb-2" style={{ color: theme.textColor + '80' }}>
                  {playlist.description || 'プレイリストの説明はありません'}
                </p>
                
                <p className="text-xs" style={{ color: theme.textColor + '60' }}>
                  {playlist.trackCount} 曲
                </p>
              </div>
            ))}
            
            {/* 新しいプレイリストを作成 */}
            <div
              className="group cursor-pointer rounded-lg p-4 border-2 border-dashed transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center h-64"
              style={{ borderColor: theme.primaryColor + '40' }}
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: theme.primaryColor + '20' }}
              >
                <span className="text-2xl" style={{ color: theme.primaryColor }}>+</span>
              </div>
              <span className="font-medium" style={{ color: theme.textColor }}>
                新しいプレイリスト
              </span>
            </div>
          </div>
        )}
      </section>

      {/* おすすめセクション */}
      <section>
        <h2 className="text-2xl font-semibold mb-6" style={{ color: theme.textColor }}>
          おすすめの音楽
        </h2>
        <div className="text-center py-12">
          <p style={{ color: theme.textColor + '60' }}>
            Spotify または Apple Music に接続して、おすすめの音楽を表示します
          </p>
        </div>
      </section>
    </div>
  )
}
