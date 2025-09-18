// src/utils/beginSpotifyAuth.ts
import { savePkce, acquirePkceLock, releasePkceLock } from './pkceStorage'

export async function beginSpotifyAuth() {
  try {
    if (!acquirePkceLock()) {
      // 二重起動防止
      if (import.meta.env.DEV) {
        console.warn('🔒 [Auth] Another auth process is running')
      }
    }

    // state とcode_verifier を生成
    const state = crypto.getRandomValues(new Uint8Array(12)).reduce((s,b)=>s+('0'+b.toString(16)).slice(-2), '').slice(0,16)
    const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b=>'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~'[b%66]).join('')
    
    // code_challenge を生成
    const enc = new TextEncoder().encode(verifier)
    const digest = await crypto.subtle.digest('SHA-256', enc)
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')

    // 🔴 リダイレクト前に必ず保存（sessionStorage）
    savePkce(state, verifier)

    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
      redirect_uri: redirectUri,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
      scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state'
    })
    const url = `https://accounts.spotify.com/authorize?${params.toString()}`

    if (import.meta.env.DEV) {
      console.log('🚀 [Auth] Starting Spotify authorization flow:', {
        state: state.substring(0, 8) + '...',
        redirectUri,
        url: url.substring(0, 100) + '...'
      })
    }

    // 同一タブ遷移（別タブ禁止）
    window.location.assign(url)
  } catch (error) {
    // 例外時にのみ lock を解放
    setTimeout(() => releasePkceLock(), 0)
    throw error
  }
}