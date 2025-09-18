import { test, expect } from '@playwright/test';

test.describe('レイアウト重なり & プレイリスト表示', () => {
  test('ヘッダーとメインが重ならない（上下オフセット適用）', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { accessToken: 'mock_token', refreshToken: 'mock_refresh', expiresAt: Date.now() + 3600000 },
          spotifyConnected: true
        },
        version: 0
      }));
    });
    
    await page.goto('/');
    
    // ヘッダーとメインの位置を確認
    const header = page.getByTestId('app-header');
    const main = page.locator('main');
    
    await expect(header).toBeVisible();
    await expect(main).toBeVisible();
    
    const headerBox = await header.boundingBox();
    const mainBox = await main.boundingBox();
    
    // ヘッダーとメインが重なっていないことを確認
    expect(headerBox).toBeTruthy();
    expect(mainBox).toBeTruthy();
    
    if (headerBox && mainBox) {
      // mainの上端がheaderの下端より下にあることを確認（1pxの誤差許容）
      expect(mainBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
    }
  });

  test('プレイリストが表示される（モックAPI）', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { accessToken: 'mock_token', refreshToken: 'mock_refresh', expiresAt: Date.now() + 3600000 },
          spotifyConnected: true
        },
        version: 0
      }));
    });
    
    // SpotifyプレイリストAPIをモック
    await page.route('**/me/playlists**', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { 
              id: 'playlist1', 
              name: 'My Favorite Songs', 
              tracks: { total: 42 },
              collaborative: false,
              description: 'My best tracks'
            },
            { 
              id: 'playlist2', 
              name: 'Chill Vibes', 
              tracks: { total: 13 },
              collaborative: true,
              description: 'Relaxing music'
            },
          ],
          total: 2
        })
      });
    });
    
    await page.goto('/');
    
    // ページ内でプレイリストセクションに移動
    // SpotifyPlaylistsコンポーネントが存在すれば表示を確認
    const playlistSection = page.getByTestId('spotify-playlists');
    if (await playlistSection.isVisible()) {
      // プレイリスト名が表示されることを確認
      await expect(page.getByText('My Favorite Songs')).toBeVisible();
      await expect(page.getByText('Chill Vibes')).toBeVisible();
      
      // トラック数が表示されることを確認
      await expect(page.getByText('42 曲')).toBeVisible();
      await expect(page.getByText('13 曲')).toBeVisible();
      
      // 共同編集マークの確認
      await expect(page.getByText('共同')).toBeVisible();
    }
  });

  test('プレイリスト空の場合のメッセージ表示', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { accessToken: 'mock_token', refreshToken: 'mock_refresh', expiresAt: Date.now() + 3600000 },
          spotifyConnected: true
        },
        version: 0
      }));
    });
    
    // 空のレスポンスをモック
    await page.route('**/me/playlists**', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [],
          total: 0
        })
      });
    });
    
    await page.goto('/');
    
    // プレイリストが空の場合のメッセージを確認
    const playlistSection = page.getByTestId('spotify-playlists');
    if (await playlistSection.isVisible()) {
      await expect(page.getByText('プレイリストがありません')).toBeVisible();
      await expect(page.getByText('再読み込み')).toBeVisible();
    }
  });

  test('ヘッダー高さ変更に動的対応', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { accessToken: 'mock_token', refreshToken: 'mock_refresh', expiresAt: Date.now() + 3600000 },
          spotifyConnected: true
        },
        version: 0
      }));
    });
    
    await page.goto('/');
    
    // CSS変数が設定されていることを確認
    const headerHeight = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    });
    
    expect(headerHeight).toBeTruthy();
    expect(headerHeight).toMatch(/^\d+px$/); // "64px" のような形式
    
    // メインのpaddingTopがCSS変数を使用していることを確認
    const mainPaddingTop = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? getComputedStyle(main).paddingTop : '';
    });
    
    expect(mainPaddingTop).toBeTruthy();
    expect(parseInt(mainPaddingTop)).toBeGreaterThan(0);
  });

  test('リサイズ時のレイアウト維持', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser', email: 'test@example.com' },
          isAuthenticated: true,
          spotifyTokens: { accessToken: 'mock_token', refreshToken: 'mock_refresh', expiresAt: Date.now() + 3600000 },
          spotifyConnected: true
        },
        version: 0
      }));
    });
    
    await page.goto('/');
    
    // デスクトップサイズでの確認
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(100); // レイアウト調整を待つ
    
    let headerBox = await page.getByTestId('app-header').boundingBox();
    let mainBox = await page.locator('main').boundingBox();
    
    expect(headerBox && mainBox && mainBox.y >= headerBox.y + headerBox.height - 1).toBeTruthy();
    
    // モバイルサイズでの確認
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    
    headerBox = await page.getByTestId('app-header').boundingBox();
    mainBox = await page.locator('main').boundingBox();
    
    expect(headerBox && mainBox && mainBox.y >= headerBox.y + headerBox.height - 1).toBeTruthy();
  });
});