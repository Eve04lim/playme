// src/hooks/useApiErrorHandler.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getErrorMessage, isRetryableError, logError } from '../utils/errorHandler'

interface RetryOptions {
  maxAttempts: number
  delay: number
  exponentialBackoff: boolean
}

interface ApiErrorHandlerOptions {
  retry?: Partial<RetryOptions>
  onError?: (error: Error) => void
  onRetry?: (attempt: number, maxAttempts: number) => void
  onSuccess?: () => void
}

interface ApiErrorHandlerState {
  loading: boolean
  error: string | null
  retryCount: number
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delay: 1000,
  exponentialBackoff: true
}

export const useApiErrorHandler = (options: ApiErrorHandlerOptions = {}) => {
  const [state, setState] = useState<ApiErrorHandlerState>({
    loading: false,
    error: null,
    retryCount: 0
  })

  const retryOptions = useMemo(() => ({ 
    ...DEFAULT_RETRY_OPTIONS, 
    ...options.retry 
  }), [options.retry])

  const executeWithRetry = useCallback(async <T>(
    apiCall: () => Promise<T>,
    customRetryOptions?: Partial<RetryOptions>
  ): Promise<T> => {
    const finalRetryOptions = { ...retryOptions, ...customRetryOptions }
    let lastError: Error

    setState(prev => ({ ...prev, loading: true, error: null, retryCount: 0 }))

    for (let attempt = 1; attempt <= finalRetryOptions.maxAttempts; attempt++) {
      try {
        const result = await apiCall()
        setState(prev => ({ ...prev, loading: false, error: null }))
        options.onSuccess?.()
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        setState(prev => ({ ...prev, retryCount: attempt }))
        logError(lastError, `API Call Attempt ${attempt}`)

        // 最後の試行でない、かつリトライ可能なエラーの場合
        const apiError = {
          code: 'UNKNOWN',
          message: lastError.message,
          status: lastError.name === 'AbortError' ? 408 : 
                  lastError.name === 'NetworkError' ? 0 : 500
        }
        
        if (attempt < finalRetryOptions.maxAttempts && isRetryableError(apiError)) {
          options.onRetry?.(attempt, finalRetryOptions.maxAttempts)
          
          // 待機時間計算（指数バックオフ）
          const delay = finalRetryOptions.exponentialBackoff
            ? finalRetryOptions.delay * Math.pow(2, attempt - 1)
            : finalRetryOptions.delay

          await new Promise(resolve => setTimeout(resolve, delay))
        } else {
          break
        }
      }
    }

    // すべての試行が失敗
    const errorMessage = getErrorMessage(lastError!)
    setState(prev => ({ ...prev, loading: false, error: errorMessage }))
    options.onError?.(lastError!)
    throw lastError!
  }, [retryOptions, options])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, error: null, retryCount: 0 })
  }, [])

  return {
    ...state,
    executeWithRetry,
    clearError,
    reset
  }
}

// レート制限対応のフック
export const useRateLimiter = (requestsPerSecond: number = 10) => {
  const [requestQueue, setRequestQueue] = useState<Array<() => Promise<void>>>([])
  const isProcessingRef = useRef(false)
  const queueRef = useRef<Array<() => Promise<void>>>([])

  const addToQueue = useCallback((request: () => Promise<unknown>): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const queueItem = async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      queueRef.current.push(queueItem)
      setRequestQueue(prev => [...prev, queueItem])
    })
  }, [])

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return
    
    isProcessingRef.current = true

    while (queueRef.current.length > 0) {
      const request = queueRef.current.shift()
      if (request) {
        await request()
        setRequestQueue(prev => prev.slice(1))
        
        // レート制限適用
        if (queueRef.current.length > 0) {
          await new Promise(resolve => 
            setTimeout(resolve, 1000 / requestsPerSecond)
          )
        }
      }
    }

    isProcessingRef.current = false
  }, [requestsPerSecond])

  // キュー処理
  useEffect(() => {
    if (queueRef.current.length === 0 || isProcessingRef.current) return
    processQueue()
  }, [requestQueue, processQueue])

  return { addToQueue, queueLength: requestQueue.length }
}

// 接続状態監視フック
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 接続タイプの取得（対応ブラウザのみ）
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection
      if (connection) {
        setConnectionType(connection.effectiveType || 'unknown')
        
        const handleConnectionChange = () => {
          setConnectionType(connection.effectiveType || 'unknown')
        }
        
        connection.addEventListener('change', handleConnectionChange)
        
        return () => {
          window.removeEventListener('online', handleOnline)
          window.removeEventListener('offline', handleOffline)
          connection.removeEventListener('change', handleConnectionChange)
        }
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, connectionType }
}

// Navigator connection type
interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string
    addEventListener: (type: string, listener: () => void) => void
    removeEventListener: (type: string, listener: () => void) => void
  }
}

// APIキャッシュフック
export const useApiCache = <T>(ttl: number = 300000) => { // 5分デフォルト
  const [cache, setCache] = useState<Map<string, { data: T; timestamp: number }>>(new Map())

  const get = useCallback((key: string): T | null => {
    const cached = cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > ttl
    if (isExpired) {
      setCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(key)
        return newCache
      })
      return null
    }

    return cached.data
  }, [cache, ttl])

  const set = useCallback((key: string, data: T) => {
    setCache(prev => {
      const newCache = new Map(prev)
      newCache.set(key, {
        data,
        timestamp: Date.now()
      })
      return newCache
    })
  }, [])

  const clear = useCallback((key?: string) => {
    if (key) {
      setCache(prev => {
        if (!prev.has(key)) return prev
        const newCache = new Map(prev)
        newCache.delete(key)
        return newCache
      })
    } else {
      setCache(prev => prev.size > 0 ? new Map() : prev)
    }
  }, [])

  const invalidateExpired = useCallback(() => {
    const now = Date.now()
    setCache(prev => {
      const newCache = new Map()
      let hasChanges = false
      
      for (const [mapKey, value] of prev.entries()) {
        if (now - value.timestamp <= ttl) {
          newCache.set(mapKey, value)
        } else {
          hasChanges = true
        }
      }
      
      return hasChanges ? newCache : prev
    })
  }, [ttl])

  // 期限切れキャッシュの定期削除（最小5分間隔）
  useEffect(() => {
    const cleanupInterval = Math.max(ttl, 300000) // 最小5分
    const interval = setInterval(invalidateExpired, cleanupInterval)
    return () => clearInterval(interval)
  }, [invalidateExpired, ttl])

  return { get, set, clear, cacheSize: cache.size }
}

// 統合された音楽API操作フック
export const useMusicApiWithErrorHandling = () => {
  const errorHandler = useApiErrorHandler({
    retry: { maxAttempts: 3, delay: 1000 },
    onError: (error) => {
      console.error('Music API Error:', error)
      // トースト通知などの実装
    }
  })
  
  const cache = useApiCache<unknown>(900000) // 15分キャッシュ
  const rateLimiter = useRateLimiter(5) // 秒間5リクエスト
  const { isOnline } = useNetworkStatus()

  const searchTracks = useCallback(async (query: string, useCache = true) => {
    if (!isOnline) {
      throw new Error('インターネット接続を確認してください')
    }

    const cacheKey = `search:${query}`
    
    if (useCache) {
      const cached = cache.get(cacheKey)
      if (cached) return cached
    }

    const result = await errorHandler.executeWithRetry(() =>
      rateLimiter.addToQueue(() => 
        import('../api/music').then(({ musicApi }) => 
          musicApi.searchTracks({ query, limit: 20 })
        )
      )
    )

    if (useCache) {
      cache.set(cacheKey, result)
    }

    return result
  }, [errorHandler, cache, rateLimiter, isOnline])

  const getRecommendations = useCallback(async (params?: Record<string, unknown>) => {
    if (!isOnline) {
      throw new Error('インターネット接続を確認してください')
    }

    const cacheKey = `recommendations:${JSON.stringify(params)}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const result = await errorHandler.executeWithRetry(() =>
      rateLimiter.addToQueue(() =>
        import('../api/music').then(({ musicApi }) =>
          musicApi.getRecommendations(params)
        )
      )
    )

    cache.set(cacheKey, result)
    return result
  }, [errorHandler, cache, rateLimiter, isOnline])

  const getTrendingTracks = useCallback(async (params?: Record<string, unknown>) => {
    if (!isOnline) {
      throw new Error('インターネット接続を確認してください')
    }

    const cacheKey = `trending:${JSON.stringify(params)}`
    const cached = cache.get(cacheKey)
    if (cached) return cached

    const result = await errorHandler.executeWithRetry(() =>
      rateLimiter.addToQueue(() =>
        import('../api/music').then(({ musicApi }) =>
          musicApi.getTrendingTracks(params)
        )
      )
    )

    cache.set(cacheKey, result)
    return result
  }, [errorHandler, cache, rateLimiter, isOnline])

  return {
    ...errorHandler,
    searchTracks,
    getRecommendations,
    getTrendingTracks,
    isOnline,
    cacheSize: cache.cacheSize,
    queueLength: rateLimiter.queueLength
  }
}