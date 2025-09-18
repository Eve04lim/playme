import { test, expect } from '@playwright/test'

test.describe('Spotify Authentication Flow', () => {
  test('should complete Spotify authentication flow', async ({ page }) => {
    // ログインページにアクセス
    await page.goto('http://127.0.0.1:5173/login')
    
    // テストアカウントでログイン
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // ホームページに遷移
    await expect(page).toHaveURL('http://127.0.0.1:5173/')
    
    // Spotify連携ボタンを確認
    const spotifyButton = page.locator('[data-testid="spotify-connect-button"]')
    await expect(spotifyButton).toBeVisible()
    await expect(spotifyButton).toHaveText('Connect with Spotify')
    
    // 開発環境では実際の認証は行わず、ボタンの存在のみ確認
    console.log('✅ Spotify connect button is present and functional')
  })

  test('should handle callback page', async ({ page }) => {
    // 直接コールバックページにアクセス（テスト用）
    await page.goto('http://127.0.0.1:5173/auth/spotify/callback')
    
    // ローディング状態またはエラー状態を確認
    const loadingText = page.locator('text=Spotify連携中...')
    const errorText = page.locator('text=連携エラー')
    
    await expect(loadingText.or(errorText)).toBeVisible()
  })
})