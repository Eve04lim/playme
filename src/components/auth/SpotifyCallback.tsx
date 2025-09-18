import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { handleSpotifyCallback } from '../../utils/handleSpotifyCallback'

// グローバルデバッグ関数を登録（開発環境のみ）
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).debugPKCE = () => {
    const params = new URLSearchParams(window.location.search)
    const urlState = params.get('state')
    
    // 新PKCEシステムデータを取得
    const newState = sessionStorage.getItem('spotify:pkce:state')
    const newVerifier = sessionStorage.getItem('spotify:pkce:verifier')
    
    console.log('🔍 PKCE Debug Report (Unified):', {
      url: {
        state: urlState,
        stateLength: urlState?.length || 0,
        allParams: Object.fromEntries(params.entries())
      },
      unifiedStorage: {
        state: newState,
        stateLength: newState?.length || 0,
        verifier: newVerifier,
        verifierLength: newVerifier?.length || 0
      },
      match: {
        urlVsUnified: urlState === newState,
        hasUnifiedVerifier: !!newVerifier
      }
    })
  }
}

export const SpotifyCallback: React.FC = () => {
  const once = useRef(false)
  const navigate = useNavigate()
  const { setSpotifyTokens, setSpotifyConnected, spotifyTokens } = useAuthStore()
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Check if already have access token
  const hasAccessToken = spotifyTokens?.accessToken != null

  const processCallback = async () => {
    if (once.current) {
      console.log('🔄 [Callback] Already processing, skipping...')
      return
    }
    once.current = true
    setIsProcessing(true)
    
    try {
      // すでにトークンがあるなら、このコールバックは無視してダッシュボードへ
      if (hasAccessToken) {
        console.info('🔐 Token already present, skip callback')
        navigate('/dashboard', { replace: true })
        return
      }

      console.log('🚀 [Callback] Processing Spotify callback...')
      const tokens = await handleSpotifyCallback()
      
      console.log('✅ [Callback] Token exchange successful:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in
      })

      // トークン保存
      const tokensToSave = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        grantedScope: tokens.scope || null,
        tokenType: tokens.token_type || 'Bearer'
      }
      
      setSpotifyTokens(tokensToSave)
      setSpotifyConnected(true)
      
      console.log('💾 [Callback] Tokens saved to store')
      navigate('/dashboard', { replace: true })
      
    } catch (error: any) {
      console.error('❌ [Callback] Failed:', error)
      setErrorMsg(error.message || 'Spotify認証に失敗しました')
      
      // エラー時は最初のページに戻る
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    processCallback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center space-y-4">
        {isProcessing ? (
          <>
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-medium text-white">Spotify認証を処理中...</h2>
            <p className="text-gray-400">しばらくお待ちください</p>
          </>
        ) : errorMsg ? (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-medium text-red-400">認証エラー</h2>
            <p className="text-gray-400 max-w-md">{errorMsg}</p>
            <p className="text-sm text-gray-500">3秒後にホームページに戻ります...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-xl font-medium text-white">認証完了</h2>
            <p className="text-gray-400">ダッシュボードにリダイレクト中...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default SpotifyCallback