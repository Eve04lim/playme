// src/utils/spotifyHelpers.ts

// Debounce関数 - 連続した関数呼び出しを制限
export function debounce<
  T extends (this: any, ...args: any[]) => any
>(fn: T, delay = 300) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  } as (...args: Parameters<T>) => void;
}

// HTTPステータスをユーザー向けメッセージに変換
export function translateStatus(status: number): string {
  switch (status) {
    case 401:
      return 'Spotify認証が切れました。再ログインしてください。'
    case 403:
      return 'この操作を実行する権限がありません。アプリの権限を確認してください。'
    case 429:
      return 'リクエストが多すぎます。しばらく待ってから再試行してください。'
    case 500:
    case 502:
    case 503:
      return 'Spotifyサーバーに問題が発生しています。しばらく待ってから再試行してください。'
    default:
      return '予期しないエラーが発生しました。再試行してください。'
  }
}

// Rate limit対応のリトライ処理
export async function handleRateLimitAndRetry(
  response: Response,
  retryFn: () => Promise<Response>,
  onNotify?: (message: string, type: 'info' | 'warn' | 'error') => void
): Promise<Response> {
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('retry-after') || '1')
    const waitTime = retryAfter * 1000
    
    onNotify?.(`リクエスト制限に達しました。${retryAfter}秒後に自動で再試行します...`, 'warn')
    
    await new Promise(resolve => setTimeout(resolve, waitTime))
    
    onNotify?.('再試行中...', 'info')
    return await retryFn()
  }
  
  return response
}

// エラーレスポンスからメッセージを抽出
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = await response.json()
    return errorData.error?.message || translateStatus(response.status)
  } catch {
    return translateStatus(response.status)
  }
}

// SpotifyのAPIレスポンスが成功かチェック
export function isSpotifyApiSuccess(response: Response): boolean {
  return response.ok && response.status >= 200 && response.status < 300
}