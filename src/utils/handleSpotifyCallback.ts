// src/utils/handleSpotifyCallback.ts
import { loadPkce, clearPkce, releasePkceLock } from './pkceStorage'

export async function handleSpotifyCallback() {
  const qs = new URLSearchParams(location.search)
  const urlState = qs.get('state')
  const code = qs.get('code')
  const error = qs.get('error')
  
  if (import.meta.env.DEV) {
    console.log('📞 [Callback] Handling Spotify callback:', {
      hasUrlState: !!urlState,
      hasCode: !!code,
      error,
      url: location.href
    })
  }

  // エラーチェック
  if (error) {
    clearPkce()
    releasePkceLock()
    throw new Error(`Spotify認証エラー: ${error}`)
  }

  const { state: savedState, verifier } = loadPkce()

  // オリジン不一致チェック（localhost≠127.0.0.1を防ぐ）
  const expectedOrigin = new URL(import.meta.env.VITE_SPOTIFY_REDIRECT_URI).origin
  if (location.origin !== expectedOrigin) {
    clearPkce()
    releasePkceLock()
    throw new Error(`Redirect origin mismatch. expected=${expectedOrigin}, actual=${location.origin}`)
  }

  // PKCE検証
  if (!urlState || !savedState || !verifier || urlState !== savedState) {
    if (import.meta.env.DEV) {
      console.error('🚨 [Callback] PKCE mismatch:', { 
        urlState: urlState?.substring(0, 8) + '...' || 'null', 
        savedState: savedState?.substring(0, 8) + '...' || 'null', 
        hasVerifier: !!verifier 
      })
    }
    clearPkce()
    releasePkceLock()
    throw new Error('PKCE情報が見つからないか、stateが一致しません。認証をやり直してください。')
  }

  if (!code) {
    clearPkce()
    releasePkceLock()
    throw new Error('認証コードが取得できませんでした。')
  }

  // トークン交換
  const body = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
    code_verifier: verifier
  })

  try {
    if (import.meta.env.DEV) {
      console.log('🔄 [Callback] Exchanging code for tokens...')
    }
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })

    if (!res.ok) {
      const errorText = await res.text()
      if (import.meta.env.DEV) {
        console.error('🚨 [Callback] Token exchange failed:', {
          status: res.status,
          statusText: res.statusText,
          errorText
        })
      }
      throw new Error(`トークン取得に失敗しました: ${res.status} ${res.statusText}`)
    }

    const tokens = await res.json()
    if (import.meta.env.DEV) {
      console.log('✅ [Callback] Token exchange successful:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresIn: tokens.expires_in
      })
    }

    return tokens
  } finally {
    // 必ずクリーンアップ
    clearPkce()
    releasePkceLock()
  }
}