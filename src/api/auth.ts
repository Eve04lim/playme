// src/api/auth.ts
import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    User
} from '../types'
import { apiClient } from './client'

// 認証API関数
export const authApi = {
  // ログイン
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
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
              token: 'mock-jwt-token-' + Date.now(),
              expiresIn: 3600
            })
          } else {
            reject(new Error('Invalid credentials'))
          }
        }, 1000)
      })
    }

    // 本番環境用のAPI呼び出し
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Login failed')
    }
    return response.data
  },

  // 新規登録
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    // パスワード確認のバリデーション
    if (userData.password !== userData.confirmPassword) {
      throw new Error('Passwords do not match')
    }

    // 開発環境でのモック実装
    if (import.meta.env.DEV) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // 既存ユーザーのシミュレーション
          if (userData.email === 'existing@example.com') {
            reject(new Error('Email already exists'))
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
            token: 'mock-jwt-token-' + Date.now(),
            expiresIn: 3600
          })
        }, 1500)
      })
    }

    // 本番環境用のAPI呼び出し
    const response = await apiClient.post<AuthResponse>('/auth/register', userData)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Registration failed')
    }
    return response.data
  },

  // ログアウト
  logout: async (): Promise<void> => {
    // 開発環境でのモック
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, 500)
      })
    }

    const response = await apiClient.post('/auth/logout')
    if (!response.success) {
      throw new Error(response.error || 'Logout failed')
    }
  },

  // トークンリフレッシュ
  refreshToken: async (refreshToken: string): Promise<{ token: string; expiresIn: number }> => {
    const response = await apiClient.post<{ token: string; expiresIn: number }>('/auth/refresh', {
      refreshToken
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Token refresh failed')
    }
    
    return response.data
  },

  // ユーザー情報取得
  getProfile: async (): Promise<User> => {
    // 開発環境でのモック
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: '1',
            email: 'user@example.com',
            username: 'testuser',
            spotifyConnected: Math.random() > 0.5,
            appleMusicConnected: Math.random() > 0.5,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString()
          })
        }, 800)
      })
    }

    const response = await apiClient.get<User>('/auth/profile')
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get profile')
    }
    return response.data
  },

  // ユーザー情報更新
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/profile', updates)
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update profile')
    }
    return response.data
  },

  // パスワード変更
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to change password')
    }
  },

  // Spotify連携
  connectSpotify: async (authCode?: string): Promise<User> => {
    // 開発環境でのモック
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: '1',
            email: 'user@example.com',
            username: 'testuser',
            spotifyConnected: true,
            appleMusicConnected: false,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString()
          })
        }, 2000)
      })
    }

    const response = await apiClient.post<User>('/auth/connect/spotify', {
      code: authCode
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Spotify connection failed')
    }
    
    return response.data
  },

  // Apple Music連携
  connectAppleMusic: async (userToken?: string): Promise<User> => {
    // 開発環境でのモック
    if (import.meta.env.DEV) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: '1',
            email: 'user@example.com',
            username: 'testuser',
            spotifyConnected: false,
            appleMusicConnected: true,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: new Date().toISOString()
          })
        }, 2000)
      })
    }

    const response = await apiClient.post<User>('/auth/connect/apple-music', {
      userToken
    })
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Apple Music connection failed')
    }
    
    return response.data
  },

  // OAuth連携解除
  disconnectService: async (service: 'spotify' | 'apple-music'): Promise<User> => {
    const response = await apiClient.delete<User>(`/auth/disconnect/${service}`)
    
    if (!response.success || !response.data) {
      throw new Error(response.error || `Failed to disconnect ${service}`)
    }
    
    return response.data
  },

  // パスワードリセット要求
  requestPasswordReset: async (email: string): Promise<void> => {
    const response = await apiClient.post('/auth/password-reset/request', { email })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to request password reset')
    }
  },

  // パスワードリセット実行
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const response = await apiClient.post('/auth/password-reset/confirm', {
      token,
      newPassword
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to reset password')
    }
  },

  // メールアドレス確認
  verifyEmail: async (token: string): Promise<void> => {
    const response = await apiClient.post('/auth/verify-email', { token })
    
    if (!response.success) {
      throw new Error(response.error || 'Email verification failed')
    }
  },

  // メールアドレス確認の再送信
  resendVerificationEmail: async (): Promise<void> => {
    const response = await apiClient.post('/auth/resend-verification')
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to resend verification email')
    }
  }
}

export default authApi