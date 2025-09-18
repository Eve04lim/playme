import { test, expect } from '@playwright/test';

test.describe('Spotify連携ボタン', () => {
  test('未接続時は「Spotify 連携」ボタンが表示される', async ({ page }) => {
    // ローカルストレージをクリア（未接続状態）
    await page.addInitScript(() => {
      localStorage.clear();
    });
    
    await page.goto('/');
    
    // ログインページが表示されるかもしれないので、認証済み状態にする
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null },
          spotifyConnected: false
        },
        version: 0
      }));
    });
    
    await page.reload();
    
    // デスクトップビューでSpotify連携ボタンが表示される
    await expect(page.getByTestId('btn-connect-spotify')).toBeVisible();
    await expect(page.getByText('Spotify 連携')).toBeVisible();
  });

  test('接続済み表示に切り替わる', async ({ page }) => {
    // 接続済み状態のローカルストレージ設定
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { 
            accessToken: 'mock_access_token', 
            refreshToken: 'mock_refresh_token',
            expiresAt: Date.now() + 3600_000 
          },
          spotifyConnected: true
        },
        version: 0
      }));
    });
    
    await page.goto('/');
    
    // 接続済み表示が出る
    await expect(page.getByText('接続済み')).toBeVisible();
    
    // ユーザーメニューを開いて連携解除ボタンを確認
    await page.getByRole('button', { name: /testuser|User/ }).click();
    await expect(page.getByTestId('btn-logout-spotify')).toBeVisible();
    await expect(page.getByText('Spotify連携解除')).toBeVisible();
  });

  test('モバイルビューでも連携ボタンが表示される', async ({ page }) => {
    // モバイルビューポート設定
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null },
          spotifyConnected: false
        },
        version: 0
      }));
    });
    
    await page.goto('/');
    
    // モバイルメニューを開く
    await page.getByRole('button', { name: /menu|メニュー/i }).click();
    
    // モバイル版Spotify連携ボタンが表示される
    await expect(page.getByTestId('btn-connect-spotify-mobile')).toBeVisible();
  });

  test('連携解除ボタンで状態がリセットされる', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { 
            accessToken: 'mock_access_token', 
            refreshToken: 'mock_refresh_token',
            expiresAt: Date.now() + 3600_000 
          },
          spotifyConnected: true
        },
        version: 0
      }));
    });
    
    await page.goto('/');
    
    // ユーザーメニューを開く
    await page.getByRole('button', { name: /testuser|User/ }).click();
    
    // 連携解除ボタンをクリック
    await page.getByTestId('btn-logout-spotify').click();
    
    // 連携ボタンが再び表示される
    await expect(page.getByTestId('btn-connect-spotify')).toBeVisible();
  });
});