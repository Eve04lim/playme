// src/utils/debugHelpers.ts
import { spotifyAPI } from '../api/spotify'
import { useAuthStore } from '../stores/authStore'

interface DebugInfo {
  spotifyTokens: any
  userProfile?: any
  searchTest?: any
  playlistsTest?: any
  error?: string
}

// グローバルデバッグ関数
export const createPlaymeDebug = () => {
  const playmeDebug = async (): Promise<DebugInfo> => {
    const debugInfo: DebugInfo = {
      spotifyTokens: useAuthStore.getState().spotifyTokens
    }

    console.log('🔍 [Playme Debug] Starting diagnostics...')

    try {
      // トークンチェック
      if (!debugInfo.spotifyTokens.accessToken) {
        throw new Error('No Spotify access token available. Please connect your Spotify account.')
      }

      console.log('✅ [Token] Access token exists')
      console.table({
        hasAccessToken: !!debugInfo.spotifyTokens.accessToken,
        hasRefreshToken: !!debugInfo.spotifyTokens.refreshToken,
        grantedScope: debugInfo.spotifyTokens.grantedScope || 'not saved',
        tokenType: debugInfo.spotifyTokens.tokenType || 'Bearer (default)',
        expiresAt: debugInfo.spotifyTokens.expiresAt 
          ? new Date(debugInfo.spotifyTokens.expiresAt).toISOString() 
          : 'unknown',
        timeToExpiry: debugInfo.spotifyTokens.expiresAt 
          ? Math.floor((debugInfo.spotifyTokens.expiresAt - Date.now()) / 1000) + 's' 
          : 'unknown'
      })

      // 有効なトークン取得
      const validToken = await useAuthStore.getState().getValidSpotifyToken()
      console.log('✅ [Token] Valid token retrieved:', validToken.substring(0, 20) + '...')

      // ユーザープロフィール取得
      try {
        debugInfo.userProfile = await spotifyAPI.getCurrentUser(validToken)
        console.log('✅ [User Profile] Retrieved successfully')
        console.table({
          id: debugInfo.userProfile.id,
          displayName: debugInfo.userProfile.display_name,
          email: debugInfo.userProfile.email,
          country: debugInfo.userProfile.country,
          followers: debugInfo.userProfile.followers?.total || 0
        })
      } catch (error) {
        console.error('❌ [User Profile] Failed:', error)
        debugInfo.userProfile = { error: error instanceof Error ? error.message : String(error) }
      }

      // 検索テスト
      try {
        debugInfo.searchTest = await spotifyAPI.searchTracks({
          query: 'taylor swift',
          type: 'track',
          limit: 3,
          market: debugInfo.userProfile?.country
        }, validToken)
        
        console.log('✅ [Search] Test successful')
        console.table({
          total: debugInfo.searchTest.tracks.total,
          returned: debugInfo.searchTest.tracks.items.length,
          market: debugInfo.userProfile?.country || 'none'
        })
        
        if (debugInfo.searchTest.tracks.items.length > 0) {
          console.log('🎵 [Search Results]')
          debugInfo.searchTest.tracks.items.forEach((track: any, index: number) => {
            console.log(`  ${index + 1}. ${track.name} - ${track.artists[0]?.name}`)
          })
        }
      } catch (error) {
        console.error('❌ [Search] Failed:', error)
        debugInfo.searchTest = { error: error instanceof Error ? error.message : String(error) }
      }

      // プレイリストテスト
      try {
        debugInfo.playlistsTest = await spotifyAPI.getUserPlaylists(validToken, 5, 0)
        
        console.log('✅ [Playlists] Test successful')
        console.table({
          total: debugInfo.playlistsTest.total,
          returned: debugInfo.playlistsTest.items?.length || 0
        })

        if (debugInfo.playlistsTest.items && debugInfo.playlistsTest.items.length > 0) {
          console.log('📚 [User Playlists]')
          debugInfo.playlistsTest.items.slice(0, 3).forEach((playlist: any, index: number) => {
            console.log(`  ${index + 1}. ${playlist.name} (${playlist.tracks?.total || 0} tracks) - by ${playlist.owner?.display_name}`)
          })
        } else {
          console.warn('⚠️ [Playlists] No playlists found. Check:')
          console.warn('  - User has playlists in Spotify')
          console.warn('  - playlist-read-private scope granted')
          console.warn('  - Development mode user access')
        }
      } catch (error) {
        console.error('❌ [Playlists] Failed:', error)
        debugInfo.playlistsTest = { error: error instanceof Error ? error.message : String(error) }
      }

    } catch (error) {
      console.error('❌ [Debug] General error:', error)
      debugInfo.error = error instanceof Error ? error.message : String(error)
    }

    console.log('🎯 [Playme Debug] Complete. Full debug info:', debugInfo)
    return debugInfo
  }

  // windowオブジェクトに追加（開発環境のみ）
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).playmeDebug = playmeDebug
    console.log('🛠️ [Playme Debug] Global debug function available: window.playmeDebug()')
  }

  return playmeDebug
}