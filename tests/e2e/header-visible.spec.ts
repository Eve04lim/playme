import { test, expect } from '@playwright/test';

test.describe('ヘッダー可視性', () => {
  test('ヘッダーが常に描画される', async ({ page }) => {
    // 認証済み状態を設定
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
    
    // ヘッダーが可視であることを確認
    const header = page.getByTestId('app-header');
    await expect(header).toBeVisible();
    
    // 固定配置であることを確認
    await expect(header).toHaveClass(/fixed/);
    
    // z-index が十分高いことを確認
    await expect(header).toHaveClass(/z-50/);
    
    // ロゴが表示されることを確認
    await expect(page.getByText('PlayMe')).toBeVisible();
  });

  test('ルート遷移してもヘッダーは表示され続ける', async ({ page }) => {
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
    
    // 初期状態でヘッダーが表示される
    await expect(page.getByTestId('app-header')).toBeVisible();
    
    // ダッシュボードリンクをクリック（既に/にいるが念のため）
    await page.getByText('ダッシュボード').click();
    
    // ヘッダーが引き続き表示される
    await expect(page.getByTestId('app-header')).toBeVisible();
  });

  test('Spotify連携ボタンがヘッダーに表示される', async ({ page }) => {
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
    
    // ヘッダー内のSpotify連携ボタンが表示される
    const header = page.getByTestId('app-header');
    const connectButton = header.getByTestId('btn-connect-spotify');
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toHaveText('Spotify 連携');
  });

  test('モバイル表示でもヘッダーが機能する', async ({ page }) => {
    // モバイルビューポート
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
    
    // ヘッダーが表示される
    await expect(page.getByTestId('app-header')).toBeVisible();
    
    // モバイルメニューボタンが表示される
    const menuButton = page.getByRole('button', { name: /menu|メニュー/i });
    await expect(menuButton).toBeVisible();
    
    // モバイルメニューを開く
    await menuButton.click();
    
    // モバイル版Spotify連携ボタンが表示される
    await expect(page.getByTestId('btn-connect-spotify-mobile')).toBeVisible();
  });
});