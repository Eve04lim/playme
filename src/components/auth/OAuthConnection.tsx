// src/components/auth/OAuthConnection.tsx
import { AlertCircle, CheckCircle, Music, Smartphone } from 'lucide-react'
import React, { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

export const OAuthConnection: React.FC = () => {
  const { 
    user, 
    connectSpotify, 
    connectAppleMusic, 
    loading, 
    error, 
    clearError 
  } = useAuthStore()

  const [connectingService, setConnectingService] = useState<'spotify' | 'apple' | null>(null)

  const handleSpotifyConnect = async () => {
    setConnectingService('spotify')
    clearError()
    
    try {
      await connectSpotify()
    } catch (error) {
      console.error('Spotify connection failed:', error)
    } finally {
      setConnectingService(null)
    }
  }

  const handleAppleMusicConnect = async () => {
    setConnectingService('apple')
    clearError()
    
    try {
      await connectAppleMusic()
    } catch (error) {
      console.error('Apple Music connection failed:', error)
    } finally {
      setConnectingService(null)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">音楽サービス連携</h2>
        <p className="text-gray-300">
          音楽ストリーミングサービスと連携して、より豊富な音楽体験を楽しみましょう
        </p>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Spotify連携 */}
        <div className="bg-white/5 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Spotify</h3>
                <p className="text-sm text-gray-400">
                  世界最大の音楽ストリーミングサービス
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {user.spotifyConnected ? (
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">連携済み</span>
                </div>
              ) : (
                <button
                  onClick={handleSpotifyConnect}
                  disabled={loading || connectingService === 'spotify'}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  {connectingService === 'spotify' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>接続中...</span>
                    </>
                  ) : (
                    <span>連携する</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {user.spotifyConnected && (
            <div className="mt-4 p-3 bg-green-500/20 rounded-lg">
              <p className="text-green-300 text-sm">
                ✅ Spotifyライブラリから楽曲を検索・追加できます
              </p>
            </div>
          )}
        </div>

        {/* Apple Music連携 */}
        <div className="bg-white/5 rounded-xl p-4 border border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center border border-gray-600">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Apple Music</h3>
                <p className="text-sm text-gray-400">
                  Appleの高音質音楽ストリーミングサービス
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {user.appleMusicConnected ? (
                <div className="flex items-center space-x-2 text-blue-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">連携済み</span>
                </div>
              ) : (
                <button
                  onClick={handleAppleMusicConnect}
                  disabled={loading || connectingService === 'apple'}
                  className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  {connectingService === 'apple' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>接続中...</span>
                    </>
                  ) : (
                    <span>連携する</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {user.appleMusicConnected && (
            <div className="mt-4 p-3 bg-blue-500/20 rounded-lg">
              <p className="text-blue-300 text-sm">
                ✅ Apple Musicライブラリから楽曲を検索・追加できます
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 連携のメリット */}
      <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
        <h4 className="font-medium text-blue-300 mb-2">連携のメリット</h4>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• 数百万曲の楽曲から検索・追加</li>
          <li>• プレイリストの自動同期</li>
          <li>• 高音質でのプレビュー再生</li>
          <li>• お気に入りアーティストからの提案</li>
        </ul>
      </div>

      {/* スキップオプション */}
      {!user.spotifyConnected && !user.appleMusicConnected && (
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm mb-3">
            後で設定することもできます
          </p>
          <button 
            className="text-gray-300 hover:text-white text-sm underline transition-colors"
            onClick={() => window.location.href = '/'}
          >
            スキップして続行
          </button>
        </div>
      )}
    </div>
  )
}