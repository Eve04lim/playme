// src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/auth'
import type { LoginRequest, RegisterRequest, User } from '../types'
import { getErrorMessage, logError } from '../utils/errorHandler'

interface AuthState {
  // 状態
  user: User | null
  token: string | null
  refreshTokenValue: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  lastActivity: number | null

  // アクション
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  connectSpotify: () => Promise<void>
  connectAppleMusic: () => Promise<void>
  disconnectService: (service: 'spotify' | 'apple-music') => Promise<void>
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
            lastActivity: null
          })
        }
      },

      // エラークリア
      clearError: () => {
        set({ error: null })
      },

      // Spotify連携
      connectSpotify: async () => {
        const { user } = get()
        if (!user) {
          throw new Error('User not authenticated')
        }

        set({ loading: true, error: null })
        try {
          const updatedUser = await authApi.connectSpotify()
          
          set({
            user: updatedUser,
            loading: false,
            error: null
          })

          if (import.meta.env.DEV) {
            console.log('✅ Spotify connected successfully')
          }
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          logError(error, 'Spotify Connection')
          
          set({
            loading: false,
            error: errorMessage
          })
          throw error
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
          
          set({
            user: updatedUser,
            loading: false,
            error: null
          })

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
        lastActivity: state.lastActivity
      }),
      // ストレージからの復元時の処理
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user && state?.isAuthenticated) {
          // アプリ起動時に認証状態を確認
          state.checkAuthStatus().catch(() => {
            console.warn('Auth status check failed on app startup')
          })
        }
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