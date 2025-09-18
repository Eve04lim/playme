// src/components/debug/SpotifyDebugPanel.tsx
import { AlertTriangle, Bug, CheckCircle, Info, X } from 'lucide-react'
import React, { useState } from 'react'
import { spotifyAPI } from '../../api/spotify'
import { useAuthStore } from '../../stores/authStore'

interface DebugResult {
  section: string
  success: boolean
  message: string
  data?: any
  error?: string
}

export const SpotifyDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<DebugResult[]>([])
  const { spotifyTokens, getValidSpotifyToken } = useAuthStore()

  // デバッグが開発環境でのみ表示されるようにする
  if (!import.meta.env.DEV) {
    return null
  }

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, result])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    try {
      // 1. トークン確認
      addResult({
        section: 'Token Check',
        success: !!spotifyTokens.accessToken,
        message: spotifyTokens.accessToken 
          ? 'Access token exists' 
          : 'No access token found',
        data: {
          hasToken: !!spotifyTokens.accessToken,
          hasRefreshToken: !!spotifyTokens.refreshToken,
          grantedScope: spotifyTokens.grantedScope,
          tokenType: spotifyTokens.tokenType,
          expiresAt: spotifyTokens.expiresAt ? new Date(spotifyTokens.expiresAt).toISOString() : null,
          timeToExpiry: spotifyTokens.expiresAt ? Math.floor((spotifyTokens.expiresAt - Date.now()) / 1000) + 's' : null
        }
      })

      if (!spotifyTokens.accessToken) {
        addResult({
          section: 'Token Check',
          success: false,
          message: '🔄 Please connect your Spotify account first',
          error: 'No access token available'
        })
        setIsRunning(false)
        return
      }

      // 2. 有効なトークン取得テスト
      try {
        const validToken = await getValidSpotifyToken()
        addResult({
          section: 'Token Validation',
          success: true,
          message: 'Successfully retrieved valid token',
          data: { tokenPreview: validToken.substring(0, 20) + '...' }
        })
      } catch (error) {
        addResult({
          section: 'Token Validation',
          success: false,
          message: 'Failed to get valid token',
          error: error instanceof Error ? error.message : String(error)
        })
        setIsRunning(false)
        return
      }

      // 3. ユーザープロフィール取得テスト
      try {
        const token = await getValidSpotifyToken()
        const userProfile = await spotifyAPI.getCurrentUser(token)
        addResult({
          section: 'User Profile',
          success: true,
          message: `Successfully retrieved user profile: ${userProfile.display_name}`,
          data: {
            id: userProfile.id,
            displayName: userProfile.display_name,
            country: userProfile.country,
            followers: userProfile.followers?.total,
            email: userProfile.email
          }
        })
      } catch (error) {
        addResult({
          section: 'User Profile',
          success: false,
          message: 'Failed to get user profile',
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // 4. 検索テスト
      try {
        const token = await getValidSpotifyToken()
        const userProfile = await spotifyAPI.getCurrentUser(token)
        const searchResult = await spotifyAPI.searchTracks({
          query: 'taylor swift',
          type: 'track',
          limit: 5,
          market: userProfile.country
        }, token)
        
        addResult({
          section: 'Search Test',
          success: true,
          message: `Search returned ${searchResult.tracks.items.length} tracks`,
          data: {
            total: searchResult.tracks.total,
            items: searchResult.tracks.items.length,
            firstResult: searchResult.tracks.items[0] ? {
              name: searchResult.tracks.items[0].name,
              artist: searchResult.tracks.items[0].artists[0]?.name
            } : null,
            market: userProfile.country
          }
        })
      } catch (error) {
        addResult({
          section: 'Search Test',
          success: false,
          message: 'Search test failed',
          error: error instanceof Error ? error.message : String(error)
        })
      }

      // 5. プレイリスト取得テスト  
      try {
        const token = await getValidSpotifyToken()
        const playlistsResult = await spotifyAPI.getUserPlaylists(token, 10, 0)
        
        addResult({
          section: 'Playlists Test',
          success: true,
          message: `Found ${playlistsResult.items?.length || 0} playlists (total: ${playlistsResult.total})`,
          data: {
            total: playlistsResult.total,
            itemsReturned: playlistsResult.items?.length || 0,
            firstThreePlaylists: playlistsResult.items?.slice(0, 3).map((item: any) => ({
              name: item.name,
              owner: item.owner?.display_name,
              tracks: item.tracks?.total,
              public: item.public
            })) || []
          }
        })
        
        if (playlistsResult.total === 0) {
          addResult({
            section: 'Playlists Analysis',
            success: false,
            message: '⚠️ No playlists found - this could indicate a permission or access issue',
            error: 'No playlists returned from Spotify API'
          })
        }
      } catch (error) {
        addResult({
          section: 'Playlists Test',
          success: false,
          message: 'Failed to get playlists',
          error: error instanceof Error ? error.message : String(error)
        })
      }

    } catch (error) {
      addResult({
        section: 'General Error',
        success: false,
        message: 'Unexpected error during diagnostics',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    setIsRunning(false)
  }

  const getIconForResult = (result: DebugResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    } else if (result.error) {
      return <AlertTriangle className="w-4 h-4 text-red-400" />
    } else {
      return <Info className="w-4 h-4 text-yellow-400" />
    }
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
        >
          <Bug className="w-4 h-4" />
          Spotify Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white rounded-lg shadow-2xl w-96 max-h-96 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="font-medium">Spotify Diagnostics</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg mb-4"
        >
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-700 rounded p-3">
              <div className="flex items-center gap-2 mb-1">
                {getIconForResult(result)}
                <span className="font-medium text-sm">{result.section}</span>
              </div>
              <p className="text-xs text-gray-300 mb-1">{result.message}</p>
              
              {result.data && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-blue-400">Show Data</summary>
                  <pre className="mt-1 p-2 bg-gray-800 rounded text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              )}
              
              {result.error && (
                <p className="text-xs text-red-300 mt-1">
                  Error: {result.error}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}