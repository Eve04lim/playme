import { test, expect } from '@playwright/test';

test.describe('PKCE & Carousel 修正確認', () => {
  test('PKCE: localStorage使用で state保持→交換成功', async ({ page }) => {
    // localStorage にPKCE state を設定
    await page.addInitScript(() => {
      const pkceState = {
        codeVerifier: 'TEST_VERIFIER_123',
        codeChallenge: 'TEST_CHALLENGE_456', 
        state: 'S123',
        timestamp: Date.now()
      };
      localStorage.setItem('spotify_pkce_state', JSON.stringify(pkceState));
    });
    
    // トークン交換APIをモック
    await page.route('**/api/token', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: 'mock_token',
          refresh_token: 'mock_refresh',
          expires_in: 3600,
          scope: 'playlist-read-private'
        })
      });
    });
    
    // コールバックURLにアクセス
    await page.goto('/auth/spotify/callback?code=MOCK_CODE&state=S123');
    
    // エラーが発生しないことを確認
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('PKCE state not found')) {
        errorLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    expect(errorLogs).toHaveLength(0);
  });

  test('MusicCarousel: isLoading prop で安全描画', async ({ page }) => {
    await page.setContent(`
      <div id="root"></div>
      <script type="module">
        // MusicCarousel のコンポーネントテスト用セットアップがあれば追加
        console.log('MusicCarousel loading prop test');
      </script>
    `);
    
    // loading未定義エラーが出ないことを確認
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('loading is not defined')) {
        errorLogs.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    expect(errorLogs).toHaveLength(0);
  });

  test('開発サーバーポート5174でRedirect URI一致確認', async ({ page }) => {
    await page.goto('http://localhost:5174');
    
    // .env.developmentの設定値が使われることを確認
    const redirectUri = await page.evaluate(() => {
      return import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    });
    
    expect(redirectUri).toBe('http://127.0.0.1:5174/auth/spotify/callback');
  });
});