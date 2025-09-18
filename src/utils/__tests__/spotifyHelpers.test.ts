// src/utils/__tests__/spotifyHelpers.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce, translateStatus, handleRateLimitAndRetry, extractErrorMessage } from '../spotifyHelpers'

describe('spotifyHelpers', () => {
  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce function calls', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 300)

      // 連続で呼び出し
      debouncedFn('test1')
      debouncedFn('test2')
      debouncedFn('test3')

      // まだ呼ばれていない
      expect(mockFn).not.toHaveBeenCalled()

      // 時間を進める
      vi.advanceTimersByTime(300)

      // 最後の呼び出しのみ実行される
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('test3')
    })

    it('should reset timer on new calls', () => {
      const mockFn = vi.fn()
      const debouncedFn = debounce(mockFn, 300)

      debouncedFn('test1')
      vi.advanceTimersByTime(200)
      
      debouncedFn('test2') // タイマーリセット
      vi.advanceTimersByTime(200) // まだ300ms経っていない
      
      expect(mockFn).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100) // 合計300ms
      expect(mockFn).toHaveBeenCalledWith('test2')
    })
  })

  describe('translateStatus', () => {
    it('should translate common HTTP status codes', () => {
      expect(translateStatus(401)).toBe('Spotify認証が切れました。再ログインしてください。')
      expect(translateStatus(403)).toBe('この操作を実行する権限がありません。アプリの権限を確認してください。')
      expect(translateStatus(429)).toBe('リクエストが多すぎます。しばらく待ってから再試行してください。')
      expect(translateStatus(500)).toBe('Spotifyサーバーに問題が発生しています。しばらく待ってから再試行してください.')
      expect(translateStatus(502)).toBe('Spotifyサーバーに問題が発生しています。しばらく待ってから再試行してください.')
      expect(translateStatus(503)).toBe('Spotifyサーバーに問題が発生しています。しばらく待ってから再試行してください.')
    })

    it('should return default message for unknown status codes', () => {
      expect(translateStatus(418)).toBe('予期しないエラーが発生しました。再試行してください。')
      expect(translateStatus(999)).toBe('予期しないエラーが発生しました。再試行してください。')
    })
  })

  describe('handleRateLimitAndRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle rate limit with retry-after header', async () => {
      const mockResponse = {
        status: 429,
        headers: {
          get: (name: string) => name === 'retry-after' ? '2' : null
        }
      } as Response

      const mockRetryFn = vi.fn().mockResolvedValue({
        status: 200,
        ok: true
      } as Response)

      const mockNotify = vi.fn()

      const promise = handleRateLimitAndRetry(mockResponse, mockRetryFn, mockNotify)

      // 通知が呼ばれることを確認
      expect(mockNotify).toHaveBeenCalledWith(
        'リクエスト制限に達しました。2秒後に自動で再試行します...',
        'warn'
      )

      // 時間を進めてリトライ
      vi.advanceTimersByTime(2000)
      await promise

      // 再試行が呼ばれることを確認
      expect(mockNotify).toHaveBeenCalledWith('再試行中...', 'info')
      expect(mockRetryFn).toHaveBeenCalled()
    })

    it('should return original response if not rate limited', async () => {
      const mockResponse = {
        status: 200,
        ok: true
      } as Response

      const mockRetryFn = vi.fn()
      const mockNotify = vi.fn()

      const result = await handleRateLimitAndRetry(mockResponse, mockRetryFn, mockNotify)

      expect(result).toBe(mockResponse)
      expect(mockRetryFn).not.toHaveBeenCalled()
      expect(mockNotify).not.toHaveBeenCalled()
    })
  })

  describe('extractErrorMessage', () => {
    it('should extract error message from response', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          error: { message: 'Custom error message' }
        }),
        status: 400
      } as any

      const result = await extractErrorMessage(mockResponse)
      expect(result).toBe('Custom error message')
    })

    it('should fallback to translated status if no error message', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({}),
        status: 401
      } as any

      const result = await extractErrorMessage(mockResponse)
      expect(result).toBe('Spotify認証が切れました。再ログインしてください。')
    })

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        status: 500
      } as any

      const result = await extractErrorMessage(mockResponse)
      expect(result).toBe('Spotifyサーバーに問題が発生しています。しばらく待ってから再試行してください。')
    })
  })
})