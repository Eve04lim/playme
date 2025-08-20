// src/pages/HomePage.tsx
import React, { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useMusicStore } from '../stores/musicStore'
import { useMyPageStore } from '../stores/myPageStore'
import type { Track } from '../types'

export const HomePage: React.FC = () => {
  const { playlists, loadPlaylists, playlistsLoading, playTrack } = useMusicStore()
  const theme = useMyPageStore(state => state.theme)
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  const handleTrackPlay = (track: Track) => {
    playTrack(track)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: theme.textColor }}>
          おかえりなさい{user?.username ? `, ${user.username}さん` : ''}
        </h1>
        <p className="text-lg opacity-80" style={{ color: theme.textColor }}>
          あなたの音楽の世界を探索しましょう
        </p>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => handleTrackPlay({
            id: 'demo-1',
            title: 'デモ楽曲 1',
            artist: 'テストアーティスト',
            album: 'デモアルバム',
            duration: 180000,
            artworkUrl: 'https://picsum.photos/300/300?random=10'
          })}
          className="p-4 rounded-lg border-2 border-dashed transition-all hover:scale-105"
          style={{ 
            borderColor: theme.primaryColor + '40',
            backgroundColor: theme.primaryColor + '10'
          }}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">🎵</div>
            <p className="font-medium" style={{ color: theme.textColor }}>
              デモ楽曲を再生
            </p>
          </div>
        </button>

        <button
          className="p-4 rounded-lg border-2 border-dashed transition-all hover:scale-105"
          style={{ 
            borderColor: theme.primaryColor + '40',
            backgroundColor: theme.primaryColor + '10'
          }}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-medium" style={{ color: theme.textColor }}>
              音楽を検索
            </p>
          </div>
        </button>

        <button
          className="p-4 rounded-lg border-2 border-dashed transition-all hover:scale-105"
          style={{ 
            borderColor: theme.primaryColor + '40',
            backgroundColor: theme.primaryColor + '10'
          }}
        >
          <div className="text-center">
            <div className="text-3xl mb-2">➕</div>
            <p className="font-medium" style={{ color: theme.textColor }}>
              プレイリスト作成
            </p>
          </div>
        </button>
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
                
                <p className="text-sm mb-2 opacity-80" style={{ color: theme.textColor }}>
                  {playlist.description || 'プレイリストの説明はありません'}
                </p>
                
                <p className="text-xs opacity-60" style={{ color: theme.textColor }}>
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

      {/* 統計情報 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6" style={{ color: theme.textColor }}>
          アカウント統計
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: theme.secondaryColor }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-60" style={{ color: theme.textColor }}>
                  プレイリスト数
                </p>
                <p className="text-2xl font-bold" style={{ color: theme.primaryColor }}>
                  {playlists.length}
                </p>
              </div>
              <div className="text-3xl">📚</div>
            </div>
          </div>

          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: theme.secondaryColor }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-60" style={{ color: theme.textColor }}>
                  Spotify
                </p>
                <p className="text-sm font-medium" style={{ color: theme.textColor }}>
                  {user?.spotifyConnected ? '✅ 連携済み' : '❌ 未連携'}
                </p>
              </div>
              <div className="text-3xl">🎵</div>
            </div>
          </div>

          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: theme.secondaryColor }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-60" style={{ color: theme.textColor }}>
                  Apple Music
                </p>
                <p className="text-sm font-medium" style={{ color: theme.textColor }}>
                  {user?.appleMusicConnected ? '✅ 連携済み' : '❌ 未連携'}
                </p>
              </div>
              <div className="text-3xl">🍎</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}