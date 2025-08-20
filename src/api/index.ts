// src/api/index.ts
// すべてのAPI関数を一つのファイルからエクスポート

export { default as auth, authApi } from './auth'
export { apiClient, default as client } from './client'
export { default as music, musicApi } from './music'
export { default as mypage, myPageApi } from './mypage'

// 便利な型をエクスポート
export type {
    AddTrackToPlaylistRequest, AuthResponse, CreatePlaylistRequest, FavoriteLyric, LoginRequest, MyPageSettings,
    MyPageTheme, RegisterRequest, SearchRequest,
    SearchResponse, UpdatePlaylistRequest
} from '../types'

// エラーハンドリング用のユーティリティ
export const isApiError = (error: unknown): error is Error => {
  return error instanceof Error
}

export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// API設定用の定数
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1秒
} as const

// 開発環境用のモック設定
export const MOCK_CONFIG = {
  ENABLED: import.meta.env.DEV,
  DELAY_MIN: 500,
  DELAY_MAX: 2000,
  ERROR_RATE: 0.05, // 5%の確率でエラー
} as const