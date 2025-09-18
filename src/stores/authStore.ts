// src/stores/authStore.ts
import { releasePkceLock, setPKCEForState, acquirePkceLock, validateState, validateVerifier } from '@/utils/pkceStorage'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'
import { spotifyAPI } from '../api/spotify'
import type { LoginRequest, RegisterRequest, User } from '../types'
import { generateCodeChallenge, generateCodeVerifier, generateRandomString } from '../utils/authHelpers'
import { getErrorMessage, logError } from '../utils/errorHandler'
import { pkceSave } from '../utils/pkce'

interface SpotifyTokens {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  grantedScope?: string | null
  tokenType?: string | null
}

interface AuthState {
  // 基本状態
  user: User | null
  token: string | null
  refreshTokenValue: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  lastActivity: number | null
  hasHydrated?: boolean
  
  // Spotify関連
  spotifyTokens: SpotifyTokens
  spotifyConnected?: boolean

  // 基本アクション
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  refreshToken: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  loadUserProfile: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerificationEmail: () => Promise<void>
  checkAuthStatus: () => Promise<boolean>
  updateLastActivity: () => void

  // Spotify関連アクション
  connectSpotify: () => Promise<void>
  connectAppleMusic: () => Promise<void>
  disconnectService: (service: 'spotify' | 'apple-music') => Promise<void>
  setSpotifyTokens: (tokens: SpotifyTokens) => void
  setSpotifyConnected: (connected: boolean) => void
  refreshSpotifyToken: () => Promise<void>
  getValidSpotifyToken: () => Promise<string>
  clearSpotifyTokens: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初期状態
      user: null,
      token: null,
      refreshTokenValue: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      lastActivity: null,
      hasHydrated: false,
      spotifyTokens: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        grantedScope: null,
        tokenType: null
      },
      spotifyConnected: false,

      // ログイン
      login: async (credentials: LoginRequest) => {
        set({ loading: true, error: null })
        try {
          const response = await authApi.login(credentials)
          
          set({
            user: response.user,
            token: response.token,
            refreshTokenValue: response.refreshToken || null,
            isAuthenticated: true,
            loading: false,
            error: null,
            lastActivity: Date.now()
          })

          // ログイン成功のログ
          if (import.meta.env.DEV) {
            console.log('✅ Login successful:', response.user.email)
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Login')
          
          set({
            user: null,
            token: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // 新規登録
      register: async (userData: RegisterRequest) => {
        set({ loading: true, error: null })
        try {
          const response = await authApi.register(userData)
          
          set({
            user: response.user,
            token: response.token,
            refreshTokenValue: response.refreshToken || null,
            isAuthenticated: true,
            loading: false,
            error: null,
            lastActivity: Date.now()
          })

          if (import.meta.env.DEV) {
            console.log('✅ Registration successful:', response.user.email)
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Register')
          
          set({
            user: null,
            token: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // ログアウト
      logout: async () => {
        set({ loading: true })
        try {
          // APIログアウト呼び出し（トークン無効化）
          await authApi.logout()
          
          if (import.meta.env.DEV) {
            console.log('✅ Logout successful')
          }
        } catch (error) {
          logError(error, 'Logout')
          console.warn('Logout API call failed, proceeding with local logout')
        } finally {
          // ローカル状態をクリア
          set({
            user: null,
            token: null,
            refreshTokenValue: null,
            isAuthenticated: false,
            loading: false,
            error: null,
            lastActivity: null,
            spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null, grantedScope: null, tokenType: null },
            spotifyConnected: false
          })
          
          // playlistStore and tracksStore もクリア（ユーザー切り替え時のデータ混在防止）
          try {
            const { usePlaylistStore } = await import('./playlistStore')
            const { useTracksStore } = await import('./tracksStore')
            usePlaylistStore.getState().clear()
            useTracksStore.getState().clear()
          } catch (error) {
            console.warn('Failed to clear playlist/tracks stores:', error)
          }
        }
      },

      // エラークリア
      clearError: () => {
        set({ error: null })
      },

      // Spotify連携（認証URLにリダイレクト）
      connectSpotify: async () => {
        const { user } = get()
        if (!user) {
          throw new Error('ログインが必要です')
        }

        set({ loading: true, error: null })
        try {
          // 多重開始ロック取得
          if (!acquirePkceLock()) {
            console.warn('🔒 [Auth] Another auth flow is in flight. Abort new start.')
            set({ loading: false, error: 'すでに連携を開始しています。しばらく待ってから再試行してください。' })
            return
          }

          // PKCE生成とバリデーション
          const state = generateRandomString(16)
          const codeVerifier = generateCodeVerifier()
          const codeChallenge = await generateCodeChallenge(codeVerifier)
          
          // 生成された値のバリデーション
          if (!validateState(state)) {
            throw new Error('Invalid state generated')
          }
          if (!validateVerifier(codeVerifier)) {
            throw new Error('Invalid code verifier generated')
          }
          
          const origin = import.meta.env.VITE_PUBLIC_ORIGIN || window.location.origin
          const redirectUri = new URL('/auth/spotify/callback', origin).toString()

          // 1) レガシーシステム保存（後方互換）
          pkceSave({ state, verifier: codeVerifier, redirectUri })
          
          // 2) 新PKCEストレージシステム（stateネームスペース）
          setPKCEForState(state, codeVerifier, true)

          const scopes = [
            'user-read-private',
            'user-read-email',
            'user-library-read',
            'user-library-modify',
            'playlist-read-private',
            'playlist-modify-public',
            'playlist-modify-private',
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing'
          ].join(' ')

          const authUrl = new URL('https://accounts.spotify.com/authorize')
          authUrl.searchParams.set('response_type', 'code')
          authUrl.searchParams.set('client_id', import.meta.env.VITE_SPOTIFY_CLIENT_ID || '')
          authUrl.searchParams.set('redirect_uri', redirectUri)
          authUrl.searchParams.set('state', state)
          authUrl.searchParams.set('code_challenge_method', 'S256')
          authUrl.searchParams.set('code_challenge', codeChallenge)
          authUrl.searchParams.set('scope', scopes)

          console.log('🔐 [Spotify Auth] Starting authorization flow:', {
            state: state.substring(0, 8) + '...',
            scopes: scopes.split(' ').length + ' scopes',
            redirectUri
          })

          // 2) 保存完了を次フレームまで待つ（レース回避）
          await new Promise(resolve => requestAnimationFrame(resolve))
          
          // 3) 遷移実行
          window.location.assign(authUrl.toString())
        } catch (error) {
          releasePkceLock()
          const errorMessage = getErrorMessage(error)
          logError(error, 'Spotify Connection')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        } finally {
          // 遷移に成功すれば実質不要だが、保険で解放（失敗時の確実解放）
          setTimeout(() => {
            try {
              releasePkceLock()
            } catch (e) {
              console.warn('[PKCE] releasePkceLock failed (safe to ignore)', e)
            }
          }, 3000)
        }
      },

      // Apple Music連携
      connectAppleMusic: async () => {
        const { user } = get()
        if (!user) {
          throw new Error('User not authenticated')
        }

        set({ loading: true, error: null })
        try {
          const updatedUser = await authApi.connectAppleMusic()
          
          set({
            user: updatedUser,
            loading: false,
            error: null
          })

          if (import.meta.env.DEV) {
            console.log('✅ Apple Music connected successfully')
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Apple Music Connection')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // サービス連携解除
      disconnectService: async (service: 'spotify' | 'apple-music') => {
        const { user } = get()
        if (!user) {
          throw new Error('User not authenticated')
        }

        set({ loading: true, error: null })
        try {
          const updatedUser = await authApi.disconnectService(service)
          
          // Spotify連携解除時はトークンもクリア
          if (service === 'spotify') {
            set({
              user: updatedUser,
              loading: false,
              error: null,
              spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null, grantedScope: null, tokenType: null }
            })
          } else {
            set({
              user: updatedUser,
              loading: false,
              error: null
            })
          }

          if (import.meta.env.DEV) {
            console.log(`✅ ${service} disconnected successfully`)
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, `${service} Disconnection`)
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // Spotifyトークン設定
      setSpotifyTokens: (tokens: SpotifyTokens) => {
        console.log('💾 [Auth Store] Setting Spotify tokens:', {
          hasAccessToken: Boolean(tokens.accessToken),
          hasRefreshToken: Boolean(tokens.refreshToken),
          expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
          expiresIn: tokens.expiresAt ? Math.floor((tokens.expiresAt - Date.now()) / 1000) + 's' : null,
          grantedScope: tokens.grantedScope,
          tokenType: tokens.tokenType || 'Bearer'
        })
        
        set(state => ({
          spotifyTokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken ?? null,
            expiresAt: tokens.expiresAt ?? (Date.now() + 3600 * 1000), // デフォルト1時間
            grantedScope: tokens.grantedScope ?? null,
            tokenType: tokens.tokenType ?? 'Bearer',
          },
          spotifyConnected: Boolean(tokens.accessToken) // トークンがあれば接続状態にする
        }))
      },

      // Spotify接続状態設定
      setSpotifyConnected: (connected: boolean) => {
        set({ spotifyConnected: connected })
      },

      // Spotifyトークンリフレッシュ
      refreshSpotifyToken: async () => {
        const { spotifyTokens } = get()
        if (!spotifyTokens.refreshToken) {
          throw new Error('Spotify refresh token not available')
        }

        try {
          console.log('🔄 Refreshing Spotify token...')
          const newTokens = await spotifyAPI.refreshAccessToken(spotifyTokens.refreshToken)
          
          const updatedTokens: SpotifyTokens = {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || spotifyTokens.refreshToken,
            expiresAt: Date.now() + (newTokens.expires_in * 1000),
            grantedScope: newTokens.scope ?? spotifyTokens.grantedScope ?? null,
            tokenType: newTokens.token_type || spotifyTokens.tokenType || 'Bearer'
          }
          
          set({ spotifyTokens: updatedTokens })
          console.log('✅ Spotify token refreshed successfully')
          
        } catch (error) {
          console.error('❌ Spotify token refresh failed:', error)
          
          // リフレッシュ失敗時はSpotify連携を無効化
          set(state => ({
            spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null, grantedScope: null, tokenType: null },
            user: state.user ? { ...state.user, spotifyConnected: false } : null
          }))
          
          throw error
        }
      },

      // 有効なSpotifyトークン取得（自動リフレッシュ）
      getValidSpotifyToken: async () => {
        const { spotifyTokens, refreshSpotifyToken } = get()
        
        if (!spotifyTokens.accessToken) {
          throw new Error('Spotify access token not available. Please connect your Spotify account.')
        }

        // 有効期限チェック（5分のマージン）
        if (spotifyTokens.expiresAt && Date.now() > spotifyTokens.expiresAt - 300000) {
          await refreshSpotifyToken()
          return get().spotifyTokens.accessToken!
        }

        return spotifyTokens.accessToken
      },

      // Spotifyトークンクリア
      clearSpotifyTokens: () => {
        set({ spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null, grantedScope: null, tokenType: null } })
      },

      // Spotify スコープ確認（開発用）
      getSpotifyTokenInfo: () => {
        const { spotifyTokens } = get()
        if (import.meta.env.DEV && spotifyTokens.accessToken) {
          console.log('🔍 [Spotify Token Info]', {
            hasAccessToken: !!spotifyTokens.accessToken,
            tokenPreview: spotifyTokens.accessToken.substring(0, 20) + '...',
            hasRefreshToken: !!spotifyTokens.refreshToken,
            expiresAt: spotifyTokens.expiresAt ? new Date(spotifyTokens.expiresAt).toISOString() : null,
            expiresIn: spotifyTokens.expiresAt ? Math.floor((spotifyTokens.expiresAt - Date.now()) / 1000) + 's' : null,
            grantedScope: spotifyTokens.grantedScope,
            tokenType: spotifyTokens.tokenType || 'Bearer'
          })
        }
        return spotifyTokens
      },

      // トークンリフレッシュ
      refreshToken: async () => {
        const { refreshTokenValue: currentRefreshToken } = get()
        if (!currentRefreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await authApi.refreshToken(currentRefreshToken)
          
          set({ 
            token: response.token,
            lastActivity: Date.now()
          })

          if (import.meta.env.DEV) {
            console.log('✅ Token refreshed successfully')
          }
        } catch (error) {
          logError(error, 'Token Refresh')
          
          // リフレッシュ失敗時はログアウト
          await get().logout()
          throw error
        }
      },

      // ユーザー情報更新
      updateUser: (updates: Partial<User>) => {
        const { user } = get()
        if (!user) return

        const updatedUser = {
          ...user,
          ...updates,
          updatedAt: new Date().toISOString()
        }

        set({ 
          user: updatedUser,
          lastActivity: Date.now()
        })

        if (import.meta.env.DEV) {
          console.log('✅ User updated locally:', Object.keys(updates))
        }
      },

      // ユーザープロフィール読み込み
      loadUserProfile: async () => {
        const { token } = get()
        if (!token) {
          throw new Error('No authentication token')
        }

        set({ loading: true, error: null })
        try {
          const user = await authApi.getProfile()
          
          set({
            user,
            loading: false,
            error: null,
            lastActivity: Date.now()
          })

          if (import.meta.env.DEV) {
            console.log('✅ Profile loaded successfully:', user.email)
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Load Profile')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // パスワード変更
      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ loading: true, error: null })
        try {
          await authApi.changePassword(currentPassword, newPassword)
          
          set({
            loading: false,
            error: null
          })

          if (import.meta.env.DEV) {
            console.log('✅ Password changed successfully')
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Change Password')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // パスワードリセット要求
      requestPasswordReset: async (email: string) => {
        set({ loading: true, error: null })
        try {
          await authApi.requestPasswordReset(email)
          
          set({
            loading: false,
            error: null
          })

          if (import.meta.env.DEV) {
            console.log('✅ Password reset requested for:', email)
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Request Password Reset')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // パスワードリセット実行
      resetPassword: async (token: string, newPassword: string) => {
        set({ loading: true, error: null })
        try {
          await authApi.resetPassword(token, newPassword)
          
          set({
            loading: false,
            error: null
          })

          if (import.meta.env.DEV) {
            console.log('✅ Password reset successfully')
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Reset Password')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // メールアドレス確認
      verifyEmail: async (token: string) => {
        set({ loading: true, error: null })
        try {
          await authApi.verifyEmail(token)
          
          // ユーザー情報を再読み込み（確認済み状態を反映）
          await get().loadUserProfile()
          
          set({
            loading: false,
            error: null
          })

          if (import.meta.env.DEV) {
            console.log('✅ Email verified successfully')
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Verify Email')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // メールアドレス確認の再送信
      resendVerificationEmail: async () => {
        set({ loading: true, error: null })
        try {
          await authApi.resendVerificationEmail()
          
          set({
            loading: false,
            error: null
          })

          if (import.meta.env.DEV) {
            console.log('✅ Verification email resent')
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Resend Verification Email')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
        }
      },

      // 認証状態確認
      checkAuthStatus: async (): Promise<boolean> => {
        const { token, isAuthenticated } = get()
        
        if (!token || !isAuthenticated) {
          return false
        }

        try {
          // プロフィールを読み込んで認証状態を確認
          await get().loadUserProfile()
          return true
        } catch (error) {
          logError(error, 'Check Auth Status')
          
          // 認証確認に失敗した場合はログアウト
          await get().logout()
          return false
        }
      },

      // 最終活動時刻更新
      updateLastActivity: () => {
        set({ lastActivity: Date.now() })
      }
    }),
    {
      name: 'auth-storage',
      // 永続化する項目を指定
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshTokenValue: state.refreshTokenValue,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
        spotifyTokens: state.spotifyTokens
      }),
      // ストレージからの復元時の処理
      onRehydrateStorage: () => (state, _error) => {
        // rehydrate状態のログ出力
        console.log('🔄 [Auth Rehydrate] State loaded:', {
          hasToken: Boolean(state?.token),
          hasSpotifyToken: Boolean(state?.spotifyTokens?.accessToken),
          spotifyConnected: state?.spotifyConnected,
          isAuthenticated: state?.isAuthenticated
        })
        
        // Spotify接続状態の再計算
        if (state && state.spotifyTokens) {
          const hasToken = !!(state.spotifyTokens.accessToken)
          const isExpired = state.spotifyTokens.expiresAt && state.spotifyTokens.expiresAt <= Date.now()
          const shouldBeConnected = hasToken && !isExpired
          
          if (state.spotifyConnected !== shouldBeConnected) {
            console.log('🔄 [Auth Rehydrate] Correcting Spotify connection state:', shouldBeConnected)
            state.setSpotifyConnected(shouldBeConnected)
          }
        }
        
        if (state?.token && state?.user && state?.isAuthenticated) {
          // アプリ起動時に認証状態を確認
          state.checkAuthStatus().catch(() => {
            console.warn('Auth status check failed on app startup')
          })
        }
        
        // Mark rehydration as completed to prevent double initialization
        queueMicrotask(() => {
          useAuthStore.setState({ hasHydrated: true })
        })
      }
    }
  )
)

// 認証状態監視用のヘルパー関数
export const useAuthUser = () => useAuthStore(state => state.user)
export const useAuthToken = () => useAuthStore(state => state.token)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore(state => state.loading)
export const useAuthError = () => useAuthStore(state => state.error)
export const useSpotifyTokens = () => useAuthStore(state => state.spotifyTokens)

// セッション管理用のヘルパー
export const initializeAuthSession = () => {
  const store = useAuthStore.getState()
  
  // 30分ごとに認証状態を確認
  const checkInterval = setInterval(() => {
    if (store.isAuthenticated) {
      store.checkAuthStatus()
    }
  }, 30 * 60 * 1000) // 30分

  // アクティビティ監視
  const updateActivity = () => {
    if (store.isAuthenticated) {
      store.updateLastActivity()
    }
  }

  // マウス・キーボードイベントでアクティビティを更新
  document.addEventListener('mousedown', updateActivity)
  document.addEventListener('keydown', updateActivity)
  document.addEventListener('scroll', updateActivity)

  // クリーンアップ関数を返す
  return () => {
    clearInterval(checkInterval)
    document.removeEventListener('mousedown', updateActivity)
    document.removeEventListener('keydown', updateActivity)
    document.removeEventListener('scroll', updateActivity)
  }
}

// 開発時にストアをwindowに公開（デバッグ用）
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).authStore = useAuthStore
}