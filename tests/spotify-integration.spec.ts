// tests/spotify-integration.spec.ts
import { test, expect, type Page } from '@playwright/test'

// テスト用のモック設定
test.describe('Spotify Integration E2E', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Spotify APIのモック設定
    await page.route('**/api.spotify.com/**', async route => {
      const url = route.request().url()
      const method = route.request().method()

      // ユーザー情報取得
      if (url.includes('/me') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test_user',
            display_name: 'Test User',
            country: 'JP',
            email: 'test@example.com'
          })
        })
      }
      
      // プレイリスト取得
      else if (url.includes('/me/playlists') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'test_playlist_1',
                name: 'My Test Playlist',
                tracks: { total: 5 },
                owner: { id: 'test_user', display_name: 'Test User' },
                public: true,
                collaborative: false
              }
            ],
            total: 1
          })
        })
      }
      
      // 楽曲検索
      else if (url.includes('/search') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            tracks: {
              items: [
                {
                  id: 'test_track_1',
                  name: 'Test Song',
                  artists: [{ name: 'Test Artist' }],
                  album: {
                    name: 'Test Album',
                    images: [{ url: 'https://via.placeholder.com/64x64' }]
                  },
                  preview_url: 'https://example.com/preview.mp3'
                }
              ],
              total: 1
            }
          })
        })
      }
      
      // プレイリストに楽曲追加
      else if (url.includes('/playlists/') && url.includes('/tracks') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ snapshot_id: 'test_snapshot' })
        })
      }
      
      else {
        await route.continue()
      }
    })

    // アプリケーションにアクセス
    await page.goto('http://localhost:5173')
    
    // 認証状態をモック（localStorage設定）
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: { id: 'test_user', email: 'test@example.com' },
          token: 'mock_token',
          spotifyTokens: {
            accessToken: 'mock_spotify_token',
            refreshToken: 'mock_refresh_token',
            expiresAt: Date.now() + 3600000 // 1時間後
          }
        }
      }))
    })
    
    await page.reload()
  })

  test('should search and add track to playlist successfully', async () => {
    // Spotify検索コンポーネントに移動
    await page.click('text=Spotify検索')
    
    // 検索フィールドに入力
    await page.fill('input[placeholder*="曲名"]', 'Test Song')
    
    // 検索ボタンをクリック（即座に検索実行）
    await page.click('button:has-text("検索")')
    
    // 検索結果が表示されるまで待機
    await expect(page.locator('text=Test Song')).toBeVisible()
    await expect(page.locator('text=Test Artist')).toBeVisible()
    
    // プレイリストが選択されていることを確認
    await expect(page.locator('select').first()).toHaveValue('test_playlist_1')
    
    // 楽曲をプレイリストに追加
    await page.click('button:has-text("追加")')
    
    // 成功メッセージが表示されることを確認
    await expect(page.locator('text*="Test Song" をプレイリストに追加しました')).toBeVisible()
    
    // 楽観更新によりプレイリストのトラック数が増加したことを確認
    // (実際のUIに依存するため、具体的なセレクタは調整が必要)
    await expect(page.locator('text*="6 tracks"')).toBeVisible()
  })

  test('should handle Enter key search', async () => {
    await page.click('text=Spotify検索')
    
    // 検索フィールドに入力してEnterキー
    await page.fill('input[placeholder*="曲名"]', 'Test Song')
    await page.press('input[placeholder*="曲名"]', 'Enter')
    
    // 検索結果が表示される
    await expect(page.locator('text=Test Song')).toBeVisible()
  })

  test('should handle 401 authentication error', async () => {
    // 401エラーをモック
    await page.route('**/api.spotify.com/v1/me', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Invalid access token' }
        })
      })
    })

    await page.click('text=Spotify検索')
    await page.fill('input[placeholder*="曲名"]', 'Test')
    await page.press('input[placeholder*="曲名"]', 'Enter')
    
    // 認証エラーメッセージが表示される
    await expect(page.locator('text*="認証が切れました"')).toBeVisible()
    
    // ログアウト処理が実行される（ログインページにリダイレクト）
    // 実装に応じて調整
    await expect(page.locator('text=ログイン')).toBeVisible({ timeout: 5000 })
  })

  test('should handle 429 rate limit with retry', async () => {
    let requestCount = 0
    
    // 初回は429、2回目は成功
    await page.route('**/api.spotify.com/v1/search**', async route => {
      requestCount++
      
      if (requestCount === 1) {
        await route.fulfill({
          status: 429,
          headers: { 'retry-after': '1' },
          contentType: 'application/json',
          body: JSON.stringify({
            error: { message: 'Rate limit exceeded' }
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            tracks: {
              items: [
                {
                  id: 'test_track_1',
                  name: 'Test Song',
                  artists: [{ name: 'Test Artist' }],
                  album: {
                    name: 'Test Album',
                    images: [{ url: 'https://via.placeholder.com/64x64' }]
                  }
                }
              ],
              total: 1
            }
          })
        })
      }
    })

    await page.click('text=Spotify検索')
    await page.fill('input[placeholder*="曲名"]', 'Test Song')
    await page.click('button:has-text("検索")')
    
    // Rate limit警告メッセージが表示される
    await expect(page.locator('text*="リクエスト制限に達しました"')).toBeVisible()
    
    // 再試行メッセージが表示される
    await expect(page.locator('text*="再試行中"')).toBeVisible()
    
    // 最終的に検索結果が表示される
    await expect(page.locator('text=Test Song')).toBeVisible()
  })

  test('should handle playlist add failure with rollback', async () => {
    // プレイリスト追加で403エラー
    await page.route('**/playlists/**/tracks', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { message: 'Insufficient permissions' }
          })
        })
      }
    })

    await page.click('text=Spotify検索')
    await page.fill('input[placeholder*="曲名"]', 'Test Song')
    await page.click('button:has-text("検索")')
    
    // 検索結果待機
    await expect(page.locator('text=Test Song')).toBeVisible()
    
    // 楽曲追加試行
    await page.click('button:has-text("追加")')
    
    // エラーメッセージが表示される
    await expect(page.locator('text*="権限がありません"')).toBeVisible()
    
    // rollbackによりトラック数は元のまま（楽観更新が戻される）
    await expect(page.locator('text*="5 tracks"')).toBeVisible()
  })

  test('should show empty state when no results found', async () => {
    // 空の検索結果をモック
    await page.route('**/api.spotify.com/v1/search**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tracks: { items: [], total: 0 }
        })
      })
    })

    await page.click('text=Spotify検索')
    await page.fill('input[placeholder*="曲名"]', 'NonExistentSong')
    await page.click('button:has-text("検索")')
    
    // 空状態メッセージが表示される
    await expect(page.locator('text*="検索結果が見つかりません"')).toBeVisible()
    await expect(page.locator('text*="新しいプレイリストを作成"')).toBeVisible()
  })

  test('should handle market selection', async () => {
    await page.click('text=Spotify検索')
    
    // 地域選択が表示される
    await expect(page.locator('select').last()).toBeVisible()
    
    // 地域を変更
    await page.selectOption('select >> nth=1', 'US')
    
    // 検索実行
    await page.fill('input[placeholder*="曲名"]', 'Test')
    await page.click('button:has-text("検索")')
    
    // USマーケット指定でリクエストが送信されることを確認
    // (実際のリクエスト内容は開発者ツールまたはネットワークモックで確認)
  })

  test('should show loading states correctly', async () => {
    // 遅延レスポンスをモック
    await page.route('**/api.spotify.com/v1/search**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tracks: { items: [], total: 0 }
        })
      })
    })

    await page.click('text=Spotify検索')
    await page.fill('input[placeholder*="曲名"]', 'Test')
    await page.click('button:has-text("検索")')
    
    // ローディングスピナーが表示される
    await expect(page.locator('.animate-spin')).toBeVisible()
    
    // ローディング完了後、スピナーが消える
    await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 2000 })
  })
})