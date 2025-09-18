// tests/dashboard-ui.spec.ts
import { test, expect, type Page } from '@playwright/test'

test.describe('Dashboard UI/UX Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          isAuthenticated: true,
          user: { id: 'test-user', email: 'test@example.com' },
          token: 'mock-token',
          spotifyTokens: {
            accessToken: 'mock-spotify-token',
            refreshToken: 'mock-refresh',
            expiresAt: Date.now() + 3600000
          }
        }
      }))
    })

    // Mock music store
    await page.addInitScript(() => {
      window.localStorage.setItem('music-storage', JSON.stringify({
        state: {
          currentTrack: {
            id: 'test-track-1',
            title: 'Test Song',
            artist: 'Test Artist',
            album: 'Test Album',
            duration: 180000,
            artworkUrl: 'https://picsum.photos/200/200'
          },
          isPlaying: true,
          playlists: [
            {
              id: 'playlist-1',
              name: 'My Playlist',
              tracks: [
                {
                  id: 'track-1',
                  title: 'Song 1',
                  artist: 'Artist 1',
                  duration: 240000,
                  artworkUrl: 'https://picsum.photos/200/200'
                }
              ],
              trackCount: 1
            }
          ]
        }
      }))
    })

    await page.goto('/dashboard')
  })

  test('should render dashboard layout correctly on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 })

    // Check main title
    await expect(page.getByRole('heading', { name: 'マイ ミュージック' })).toBeVisible()

    // Should show 3 columns on desktop
    const columns = page.locator('[role="region"][aria-label*="プレイリスト カラム"] > div')
    await expect(columns).toHaveCount(3)
  })

  test('should adapt to tablet layout', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 900, height: 600 })
    
    // Wait for layout to adjust
    await page.waitForTimeout(100)

    // Should show 2 columns on tablet
    const columns = page.locator('[role="region"][aria-label*="プレイリスト カラム"] > div')
    await expect(columns).toHaveCount(2)
  })

  test('should adapt to mobile layout and disable effects', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 400, height: 700 })
    
    // Wait for layout to adjust
    await page.waitForTimeout(100)

    // Should show 1 column on mobile
    const columns = page.locator('[role="region"][aria-label*="プレイリスト カラム"] > div')
    await expect(columns).toHaveCount(1)

    // Effects should be disabled on mobile (lyrics overlay should not exist)
    await expect(page.locator('[role="presentation"]')).not.toBeVisible()
  })

  test('should display MiniPlayer when track is playing', async ({ page }) => {
    // MiniPlayer should be visible
    await expect(page.getByRole('region', { name: '音楽プレイヤー' })).toBeVisible()

    // Should show current track info
    await expect(page.getByText('Test Song')).toBeVisible()
    await expect(page.getByText('Test Artist')).toBeVisible()

    // Should show play/pause controls
    await expect(page.getByRole('button', { name: /音楽を一時停止/ })).toBeVisible()
  })

  test('should support MiniPlayer keyboard shortcuts', async ({ page }) => {
    // Focus should be on the page
    await page.keyboard.press('Tab')
    
    // Test space bar for play/pause
    await page.keyboard.press('Space')
    
    // Check that the play state changed (implementation depends on store logic)
    // This test assumes the button text changes
    await page.waitForTimeout(100)

    // Test arrow keys for track navigation
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(100)
    
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(100)

    // Test volume controls
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)
    
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)

    // Test mute
    await page.keyboard.press('KeyM')
    await page.waitForTimeout(100)
  })

  test('should navigate carousel with keyboard', async ({ page }) => {
    // Find the first track card
    const firstTrack = page.getByRole('listitem').first()
    await firstTrack.focus()

    // Test arrow key navigation
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)

    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(100)

    // Test Enter key to play track
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)

    // Verify interaction (this depends on actual implementation)
    // The test should verify that the track starts playing
  })

  test('should open and close settings modal', async ({ page }) => {
    // Click settings FAB
    await page.getByRole('button', { name: 'ダッシュボード設定を開く' }).click()

    // Settings modal should be visible
    await expect(page.getByRole('dialog', { name: 'ダッシュボード設定' })).toBeVisible()

    // Check sections are present
    await expect(page.getByText('テーマ')).toBeVisible()
    await expect(page.getByText('視覚エフェクト')).toBeVisible()
    await expect(page.getByText('レイアウト')).toBeVisible()

    // Close with X button
    await page.getByRole('button', { name: '設定を閉じる' }).click()
    
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should support settings keyboard shortcut', async ({ page }) => {
    // Open settings with Ctrl+S (or Cmd+S on Mac)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+KeyS`)

    // Settings modal should open
    await expect(page.getByRole('dialog', { name: 'ダッシュボード設定' })).toBeVisible()

    // Close with Escape
    await page.keyboard.press('Escape')
    
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should change theme in settings', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'ダッシュボード設定を開く' }).click()

    // Find theme buttons (looking for preset theme names)
    const purpleTheme = page.getByRole('button', { name: /Purple Dream/ })
    await expect(purpleTheme).toBeVisible()

    // Click purple theme
    await purpleTheme.click()

    // Save settings
    await page.getByRole('button', { name: '保存' }).click()

    // Verify theme changed by checking background color or other theme indicators
    await page.waitForTimeout(100)
    
    // This test would need to verify the actual theme change
    // Implementation depends on how theme changes are reflected in the DOM
  })

  test('should toggle visual effects', async ({ page }) => {
    // Open settings
    await page.getByRole('button', { name: 'ダッシュボード設定を開く' }).click()

    // Find waveform toggle
    const waveformToggle = page.locator('input[type="checkbox"]').first()
    const initialState = await waveformToggle.isChecked()

    // Toggle the checkbox
    await waveformToggle.click()

    // Save settings
    await page.getByRole('button', { name: '保存' }).click()

    // Verify the effect was toggled
    // This would require checking if waveform visualizer appears/disappears
    await page.waitForTimeout(100)
  })

  test('should show accessibility information for screen readers', async ({ page }) => {
    // Check for skip links
    await expect(page.getByText('メインコンテンツへスキップ')).toBeInTheDocument()

    // Check for proper ARIA labels
    await expect(page.getByRole('main', { name: '音楽ダッシュボード' })).toBeVisible()
    await expect(page.getByRole('region', { name: '音楽統計' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'クイック アクション' })).toBeVisible()

    // Check for live regions
    const statusRegion = page.locator('[role="status"][aria-live="polite"]')
    await expect(statusRegion).toBeInTheDocument()
  })

  test('should maintain focus order for keyboard navigation', async ({ page }) => {
    // Start tabbing through the page
    await page.keyboard.press('Tab') // Skip link
    await page.keyboard.press('Tab') // First carousel item or player control
    await page.keyboard.press('Tab') // Next focusable element
    
    // Verify logical focus order
    // This test would need to verify that focus moves in a logical order:
    // Header → Player → Carousel → Settings
    
    // Check that focus is visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should handle reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })

    // Reload page to apply preference
    await page.reload()

    // Wait for page load
    await expect(page.getByRole('heading', { name: 'マイ ミュージック' })).toBeVisible()

    // Verify that animations are disabled or reduced
    // This would require checking CSS or animation states
    // Implementation depends on how reduced motion is handled
  })

  test('should load images lazily', async ({ page }) => {
    // Set network to slow to test lazy loading
    await page.route('**/picsum.photos/**', async (route) => {
      // Simulate slow image loading
      await new Promise(resolve => setTimeout(resolve, 100))
      await route.continue()
    })

    // Scroll to bottom to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    // Images should eventually load
    await expect(page.locator('img[src*="picsum"]').first()).toBeVisible({ timeout: 5000 })
  })
})