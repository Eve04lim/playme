// src/components/playlist/SpotifyPlaylists.tsx
import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import { spotifyAPI } from '../../api/spotify'
import { Play, ListMusic, Users } from 'lucide-react'

// 既存の型名と衝突しない別名に変更
type _SPPlaylist = { 
  id: string; 
  name: string; 
  tracks?: { total?: number };
  owner?: any;
  public?: boolean;
  collaborative?: boolean;
  [k: string]: any;
};
const isSPPlaylist = (x: any): x is _SPPlaylist =>
  !!x && typeof x.id === 'string' && typeof x.name === 'string';

interface SpotifyPlaylistsProps {
  refreshTrigger?: number
}

export const SpotifyPlaylists: React.FC<SpotifyPlaylistsProps> = ({ refreshTrigger }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // playlistStoreから状態を取得
  const { playlists, selectedPlaylistId, setSelectedPlaylist } = usePlaylistStore()
  
  const loadPlaylists = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await useAuthStore.getState().getValidSpotifyToken()
      const res = await spotifyAPI.getUserPlaylists(token, 20, 0)
      
      console.log('📋 [SpotifyPlaylists] API Response:', res)
      
      const items = res.items ?? []
      
      // playlistStoreに設定（型安全な配列に絞り込み）
      const typedPlaylists = ((items.filter(isSPPlaylist) as _SPPlaylist[]) as unknown as any[])
      usePlaylistStore.getState().setPlaylists(typedPlaylists)
      
      if (items.length === 0) {
        setError('プレイリストが見つかりません。Spotify でプレイリストを作成するか、playlist-read-private スコープが不足している可能性があります。')
        console.warn('⚠️ [SpotifyPlaylists] No playlists found:', {
          totalFromAPI: res.total,
          itemsLength: items.length,
          hasItems: !!res.items
        })
      } else {
        console.log(`✅ [SpotifyPlaylists] Loaded ${typedPlaylists.length} playlists:`, 
          typedPlaylists.map((p: _SPPlaylist) => ({ id: p.id, name: p.name, tracks: p.tracks?.total }))
        )
      }
      
    } catch (error: any) {
      console.error('❌ [SpotifyPlaylists] Failed to load playlists:', error)
      setError('Spotify プレイリストの読み込みに失敗しました。認証状態をご確認ください。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlaylists()
  }, [])
  
  useEffect(() => {
    if (refreshTrigger) {
      loadPlaylists()
    }
  }, [refreshTrigger])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-300">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
        <p className="text-red-300 text-sm">{error}</p>
        <button 
          onClick={loadPlaylists}
          className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!playlists.length) {
    return (
      <div className="text-center p-8 bg-gray-800/50 rounded-lg" data-testid="playlists-empty">
        <ListMusic className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-300 mb-2">プレイリストがありません</p>
        <p className="text-gray-500 text-sm mb-4">
          Spotify でプレイリストを作成するか、playlist-read-private スコープが不足している可能性があります
        </p>
        <button 
          onClick={loadPlaylists}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm"
        >
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="spotify-playlists">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <ListMusic className="w-5 h-5" />
        プレイリスト ({playlists.length})
      </h3>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((playlist: any) => {
          const isSelected = playlist.id === selectedPlaylistId
          return (
          <div
            key={playlist.id}
            className={`border rounded-lg p-4 transition-colors cursor-pointer ${
              isSelected 
                ? 'border-[#1db954] bg-[#1db954]/10' 
                : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
            onClick={() => setSelectedPlaylist(playlist.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-white truncate flex-1">
                {playlist.name}
              </h4>
              <button 
                className="ml-2 p-1 text-green-400 hover:text-green-300 transition-colors"
                title="再生"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <ListMusic className="w-3 h-3" />
                <span>{playlist.tracks?.total || 0} 曲</span>
              </div>
              
              {playlist.collaborative && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>共同</span>
                </div>
              )}
            </div>
            
            {playlist.description && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                {playlist.description}
              </p>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}