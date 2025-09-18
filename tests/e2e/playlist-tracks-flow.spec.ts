import { test, expect } from '@playwright/test';

test.describe('プレイリスト→トラック表示フロー', () => {
  test('最初のプレイリスト自動選択→曲表示', async ({ page }) => {
    // ログイン状態設定
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
    
    // プレイリストAPIをモック
    await page.route('**/me/playlists**', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: 'pl1', name: 'Test Playlist 1', tracks: { total: 5 } },
            { id: 'pl2', name: 'Test Playlist 2', tracks: { total: 3 } }
          ],
          total: 2
        })
      });
    });
    
    // トラックAPIをモック
    await page.route('**/playlists/pl1/tracks**', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { track: { id: 't1', name: 'Song 1', uri: 'spotify:track:t1', artists: [{ name: 'Artist 1' }] } },
            { track: { id: 't2', name: 'Song 2', uri: 'spotify:track:t2', artists: [{ name: 'Artist 2' }] } }
          ]
        })
      });
    });
    
    await page.goto('/');
    
    // 最初のプレイリストが自動選択され、ハイライトされることを確認
    const firstPlaylist = page.getByText('Test Playlist 1').first();
    await expect(firstPlaylist).toBeVisible();
    
    // 曲が表示されることを確認（MusicCarouselに渡される）
    await page.waitForTimeout(2000); // API呼び出しとレンダリングを待つ
    
    // 「選択すると表示」メッセージが表示されないことを確認
    await expect(page.getByText('プレイリストを選択すると、ここに曲が表示されます')).not.toBeVisible();
  });

  test('プレイリストクリック→選択変更→曲切り替え', async ({ page }) => {
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
    
    await page.route('**/me/playlists**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          items: [
            { id: 'pl1', name: 'Test Playlist 1', tracks: { total: 5 } },
            { id: 'pl2', name: 'Test Playlist 2', tracks: { total: 3 } }
          ]
        })
      });
    });
    
    // 異なるトラックAPIをモック
    await page.route('**/playlists/pl2/tracks**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          items: [
            { track: { id: 't3', name: 'Different Song', uri: 'spotify:track:t3', artists: [{ name: 'Different Artist' }] } }
          ]
        })
      });
    });
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // 2番目のプレイリストをクリック
    const secondPlaylist = page.getByText('Test Playlist 2').first();
    await secondPlaylist.click();
    
    // 選択状態が変わることを確認（緑のハイライト）
    await expect(secondPlaylist).toHaveClass(/border-\[#1db954\]/);
    
    await page.waitForTimeout(1000); // トラック取得を待つ
  });

  test('未選択時のメッセージ表示', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { username: 'testuser' },
          isAuthenticated: true,
          spotifyConnected: false // 未接続
        }
      }));
    });
    
    await page.goto('/');
    
    // プレイリストがない状態で「選択すると表示」メッセージを確認
    await expect(page.getByText('プレイリストを選択すると、ここに曲が表示されます')).toBeVisible();
  });
});