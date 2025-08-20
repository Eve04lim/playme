// src/api/client.ts
import axios, {
    type AxiosError,
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse
} from 'axios'
import type { ApiResponse } from '../types'

// 環境変数からAPIベースURLを取得（開発環境ではモック）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// リクエスト設定
const DEFAULT_TIMEOUT = 10000 // 10秒

interface QueueItem {
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

class ApiClient {
  private client: AxiosInstance
  private isRefreshing = false
  private failedQueue: QueueItem[] = []

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        //認証トークンの自動付与
        const token = this.getStoredToken()
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // リクエストログ（開発環境のみ）
        if (import.meta.env.DEV) {
          console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data)
        }

        return config
      },
      (error: unknown) => {
        if (import.meta.env.DEV) {
          console.error('❌ Request Error:', error)
        }
        return Promise.reject(error)
      }
    )

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        // レスポンスログ（開発環境のみ）
        if (import.meta.env.DEV) {
          console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
        }
        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // 401エラー（認証失敗）の場合のトークンリフレッシュ
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          if (this.isRefreshing) {
            // 既にリフレッシュ中の場合は待機
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            })
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const newToken = await this.refreshToken()
            this.processQueue(null, newToken)
            
            // 元のリクエストを新しいトークンで再実行
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return this.client(originalRequest)
          } catch (refreshError) {
            this.processQueue(refreshError, null)
            this.handleAuthFailure()
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        // エラーログ
        if (import.meta.env.DEV) {
          console.error('❌ Response Error:', error.response?.data || error.message)
        }

        return Promise.reject(this.normalizeError(error))
      }
    )
  }

  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else {
        resolve(token)
      }
    })
    
    this.failedQueue = []
  }

  private getStoredToken(): string | null {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        const parsed = JSON.parse(authStorage) as { state?: { token?: string } }
        return parsed.state?.token || null
      }
    } catch {
      console.error('Failed to get stored token')
    }
    return null
  }

  private async refreshToken(): Promise<string> {
    try {
      // Zustandストアから最新のリフレッシュトークンを取得
      const authStorage = localStorage.getItem('auth-storage')
      if (!authStorage) {
        throw new Error('No auth data found')
      }

      const parsed = JSON.parse(authStorage) as { 
        state?: { 
          refreshTokenValue?: string
          token?: string
          [key: string]: unknown
        } 
      }
      const refreshToken = parsed.state?.refreshTokenValue

      if (!refreshToken) {
        throw new Error('No refresh token found')
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken
      })

      const responseData = response.data as { 
        data: { token: string } 
      }
      const { token } = responseData.data
      
      // 新しいトークンをストレージに保存
      if (parsed.state) {
        parsed.state.token = token
      } else {
        parsed.state = { token }
      }
      localStorage.setItem('auth-storage', JSON.stringify(parsed))

      return token
    } catch {
      throw new Error('Token refresh failed')
    }
  }

  private handleAuthFailure() {
    // 認証失敗時の処理
    localStorage.removeItem('auth-storage')
    
    // ログインページにリダイレクト
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  private normalizeError(error: AxiosError): Error {
    if (error.response?.data) {
      const apiError = error.response.data as { 
        error?: string
        message?: string 
      }
      return new Error(apiError.error || apiError.message || 'API Error')
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('リクエストがタイムアウトしました')
    }
    
    if (!error.response) {
      return new Error('ネットワークエラーが発生しました')
    }
    
    return new Error(error.message)
  }

  // パブリックメソッド
  public async get<T>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, { params })
    return response.data
  }

  public async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data)
    return response.data
  }

  public async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data)
    return response.data
  }

  public async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.patch(url, data)
    return response.data
  }

  public async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url)
    return response.data
  }

  // ファイルアップロード用
  public async uploadFile<T>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  }

  // リクエストキャンセル用
  public createCancelToken() {
    return axios.CancelToken.source()
  }

  public isCancel(error: unknown): boolean {
    return axios.isCancel(error)
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient()

// デフォルトエクスポート
export default apiClient