// src/utils/errorHandler.ts
import type { AxiosError } from 'axios'

// エラータイプの定義
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  status?: number
}

// エラーコードの定数
export const ERROR_CODES = {
  // 認証関連
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // バリデーション関連
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // リソース関連
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // サーバー関連
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  
  // ネットワーク関連
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // 外部API関連
  SPOTIFY_API_ERROR: 'SPOTIFY_API_ERROR',
  APPLE_MUSIC_API_ERROR: 'APPLE_MUSIC_API_ERROR',
} as const

// 型定義
type ErrorCodeValues = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// ユーザーフレンドリーなエラーメッセージ
const ERROR_MESSAGES: Record<ErrorCodeValues, string> = {
  [ERROR_CODES.UNAUTHORIZED]: 'ログインが必要です',
  [ERROR_CODES.FORBIDDEN]: 'この操作を実行する権限がありません',
  [ERROR_CODES.TOKEN_EXPIRED]: 'セッションが期限切れです。再度ログインしてください',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'メールアドレスまたはパスワードが正しくありません',
  [ERROR_CODES.VALIDATION_ERROR]: '入力内容に不備があります',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: '必須項目が入力されていません',
  [ERROR_CODES.INVALID_FORMAT]: '入力形式が正しくありません',
  [ERROR_CODES.NOT_FOUND]: '指定されたリソースが見つかりません',
  [ERROR_CODES.ALREADY_EXISTS]: '既に存在しています',
  [ERROR_CODES.CONFLICT]: '競合が発生しました。しばらく後にお試しください',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'サーバーエラーが発生しました',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'サービスが一時的に利用できません',
  [ERROR_CODES.TIMEOUT]: 'リクエストがタイムアウトしました',
  [ERROR_CODES.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
  [ERROR_CODES.CONNECTION_ERROR]: '接続エラーが発生しました',
  [ERROR_CODES.SPOTIFY_API_ERROR]: 'Spotify API でエラーが発生しました',
  [ERROR_CODES.APPLE_MUSIC_API_ERROR]: 'Apple Music API でエラーが発生しました',
}

// Axiosエラーを正規化
export const normalizeAxiosError = (error: AxiosError): ApiError => {
  // レスポンスデータがある場合
  if (error.response?.data) {
    const data = error.response.data as {
      code?: string
      error?: string
      message?: string
      details?: Record<string, unknown>
    }
    
    const errorCode = data.code || getErrorCodeFromStatus(error.response.status)
    
    return {
      code: errorCode,
      message: data.error || data.message || ERROR_MESSAGES[errorCode as ErrorCodeValues] || 'エラーが発生しました',
      ...(data.details !== undefined && { details: data.details }),
      status: error.response.status
    }
  }

  // ネットワークエラーの場合
  if (error.code === 'ECONNABORTED') {
    return {
      code: ERROR_CODES.TIMEOUT,
      message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT],
      status: 408
    }
  }

  // レスポンスがない場合（ネットワークエラー）
  if (!error.response) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
      status: 0
    }
  }

  // その他のエラー
  const errorCode = getErrorCodeFromStatus(error.response.status)
  return {
    code: errorCode,
    message: error.message || ERROR_MESSAGES[errorCode as ErrorCodeValues] || 'エラーが発生しました',
    status: error.response.status
  }
}

// HTTPステータスコードからエラーコードを取得
const getErrorCodeFromStatus = (status: number): string => {
  switch (status) {
    case 400:
      return ERROR_CODES.VALIDATION_ERROR
    case 401:
      return ERROR_CODES.UNAUTHORIZED
    case 403:
      return ERROR_CODES.FORBIDDEN
    case 404:
      return ERROR_CODES.NOT_FOUND
    case 409:
      return ERROR_CODES.CONFLICT
    case 429:
      return ERROR_CODES.SERVICE_UNAVAILABLE
    case 500:
      return ERROR_CODES.INTERNAL_SERVER_ERROR
    case 502:
    case 503:
    case 504:
      return ERROR_CODES.SERVICE_UNAVAILABLE
    default:
      return ERROR_CODES.INTERNAL_SERVER_ERROR
  }
}

// エラー表示用のユーティリティ
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  if (typeof error === 'object' && error !== null) {
    const apiError = error as {
      message?: string
      code?: string
    }
    if (apiError.message) {
      return apiError.message
    }
    if (apiError.code && apiError.code in ERROR_MESSAGES) {
      return ERROR_MESSAGES[apiError.code as ErrorCodeValues]
    }
  }
  
  return 'エラーが発生しました'
}

// エラーログ用のユーティリティ
export const logError = (error: unknown, context?: string) => {
  if (import.meta.env.DEV) {
    console.error(`[${context || 'API Error'}]:`, error)
  }
  
  // 本番環境では外部ログサービス（Sentry等）に送信
  if (import.meta.env.PROD) {
    // TODO: 外部ログサービスへの送信実装
    // Sentry.captureException(error, { extra: { context } })
  }
}

// リトライ可能なエラーかどうかを判定
export const isRetryableError = (error: ApiError): boolean => {
  const retryableErrorCodes: ErrorCodeValues[] = [
    ERROR_CODES.TIMEOUT,
    ERROR_CODES.NETWORK_ERROR,
    ERROR_CODES.CONNECTION_ERROR,
    ERROR_CODES.SERVICE_UNAVAILABLE,
    ERROR_CODES.INTERNAL_SERVER_ERROR
  ]
  
  return retryableErrorCodes.includes(error.code as ErrorCodeValues) || 
         (error.status !== undefined && error.status >= 500)
}

// 認証エラーかどうかを判定
export const isAuthError = (error: ApiError): boolean => {
  const authErrorCodes: ErrorCodeValues[] = [
    ERROR_CODES.UNAUTHORIZED,
    ERROR_CODES.FORBIDDEN,
    ERROR_CODES.TOKEN_EXPIRED
  ]
  
  return authErrorCodes.includes(error.code as ErrorCodeValues) || error.status === 401
}

// バリデーションエラーかどうかを判定
export const isValidationError = (error: ApiError): boolean => {
  return error.code === ERROR_CODES.VALIDATION_ERROR || error.status === 400
}

// エラー通知用のクラス
export class ErrorNotifier {
  private static notifications: Set<string> = new Set()
  
  static notify(error: ApiError, options?: {
    dismissible?: boolean
    duration?: number
    context?: string
  }) {
    const errorKey = `${error.code}-${error.message}`
    
    // 重複通知を防ぐ
    if (this.notifications.has(errorKey)) {
      return
    }
    
    this.notifications.add(errorKey)
    
    // 通知の実装（実際のトースト通知ライブラリを使用）
    console.error('Error notification:', {
      code: error.code,
      message: error.message,
      context: options?.context
    })
    
    // 一定時間後に通知履歴をクリア
    setTimeout(() => {
      this.notifications.delete(errorKey)
    }, options?.duration || 5000)
  }
  
  static clear() {
    this.notifications.clear()
  }
}

// デフォルトエクスポート
export default {
  normalizeAxiosError,
  getErrorMessage,
  logError,
  isRetryableError,
  isAuthError,
  isValidationError,
  ErrorNotifier,
  ERROR_CODES,
  ERROR_MESSAGES
}