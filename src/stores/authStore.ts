// src/stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types'

interface AuthState {
  // 状態
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null

  // アクション
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
  connectSpotify: () => Promise<void>
  connectAppleMusic: () => Promise<void>
  refreshToken: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

// APIモック関数（後でバックエンド実装時に置き換え）
const mockLoginApi = async (credentials: LoginRequest): Promise<AuthResponse> => {
  // 開発用のモック実装
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (credentials.email === 'user@example.com' && credentials.password === 'password') {
        resolve({
          user: {
            id: '1',
            email: credentials.email,
            username: 'testuser',
            spotifyConnected: false,
            appleMusicConnected: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          token: 'mock-jwt-token',
          expiresIn: 3600
        })
      } else {
        reject(new Error('Invalid credentials'))
      }
    }, 1000)
  })
}

const mockRegisterApi = async (userData: RegisterRequest): Promise<AuthResponse> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userData.password !== userData.confirmPassword) {
        reject(new Error('Passwords do not match'))
        return
      }
      resolve({
        user: {
          id: Date.now().toString(),
          email: userData.email,
          username: userData.username,
          spotifyConnected: false,
          appleMusicConnected: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        token: 'mock-jwt-token',
        expiresIn: 3600
      })
    }, 1000)
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初期状態
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // ログイン
      login: async (credentials: LoginRequest) => {
        set({ loading: true, error: null })
        try {
          const response = await mockLoginApi(credentials)
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            loading: false,
            error: null
          })
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: error instanceof Error ? error.message : 'Login failed'
          })
          throw error
        }
      },

      // 新規登録
      register: async (userData: RegisterRequest) => {
        set({ loading: true, error: null })
        try {
          const response = await mockRegisterApi(userData)
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            loading: false,
            error: null
          })
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: error instanceof Error ? error.message : 'Registration failed'
          })
          throw error
        }
      },

      // ログアウト
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
          error: null
        })
      },

      // エラークリア
      clearError: () => {
        set({ error: null })
      },

      // Spotify連携
      connectSpotify: async () => {
        const { user } = get()
        if (!user) return

        set({ loading: true, error: null })
        try {
          // Spotify OAuth フローの実装（モック）
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          const updatedUser = {
            ...user,
            spotifyConnected: true,
            updatedAt: new Date().toISOString()
          }
          
          set({
            user: updatedUser,
            loading: false,
            error: null
          })
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Spotify connection failed'
          })
          throw error
        }
      },

      // Apple Music連携
      connectAppleMusic: async () => {
        const { user } = get()
        if (!user) return

        set({ loading: true, error: null })
        try {
          // Apple Music連携の実装（モック）
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          const updatedUser = {
            ...user,
            appleMusicConnected: true,
            updatedAt: new Date().toISOString()
          }
          
          set({
            user: updatedUser,
            loading: false,
            error: null
          })
        } catch (error) {
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Apple Music connection failed'
          })
          throw error
        }
      },

      // トークンリフレッシュ
      refreshToken: async () => {
        const { token } = get()
        if (!token) return

        try {
          // トークンリフレッシュAPI呼び出し（モック）
          await new Promise(resolve => setTimeout(resolve, 500))
          // 新しいトークンを取得
          // set({ token: newToken })
        } catch (error) {
          // リフレッシュ失敗時はログアウト
          get().logout()
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

        set({ user: updatedUser })
      }
    }),
    {
      name: 'auth-storage',
      // トークンのみ永続化し、センシティブな情報は含めない
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)