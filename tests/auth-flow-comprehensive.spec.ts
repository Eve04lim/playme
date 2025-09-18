// tests/auth-flow-comprehensive.spec.ts
/**
 * Comprehensive E2E tests for Spotify auth flow
 * Tests the complete flow: connect → callback → dashboard with single fetch verification
 */
import { test, expect } from '@playwright/test'

test.describe('Spotify Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Spotify API responses to avoid real OAuth flow
    await page.route('**/api.spotify.com/**', (route) => {
      const url = route.request().url()
      
      if (url.includes('/me')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-user',
            display_name: 'Test User',
            email: 'test@example.com'
          })
        })
      } else if (url.includes('/me/playlists')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'playlist-1',
                name: 'Test Playlist 1',
                tracks: { total: 5 },
                owner: { id: 'test-user', display_name: 'Test User' },
                public: true,
                collaborative: false,
                images: [{ url: 'https://via.placeholder.com/300x300' }]
              },
              {
                id: 'playlist-2', 
                name: 'Test Playlist 2',
                tracks: { total: 3 },
                owner: { id: 'test-user', display_name: 'Test User' },
                public: false,
                collaborative: false,
                images: [{ url: 'https://via.placeholder.com/300x300' }]
              }
            ]
          })
        })
      } else if (url.includes('/playlists/playlist-1/tracks')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                track: {
                  id: 'track-1',
                  name: 'Test Track 1',
                  artists: [{ name: 'Test Artist 1' }],
                  album: { 
                    name: 'Test Album', 
                    images: [{ url: 'https://via.placeholder.com/300x300' }] 
                  },
                  uri: 'spotify:track:track-1'
                }
              },
              {
                track: {
                  id: 'track-2',
                  name: 'Test Track 2', 
                  artists: [{ name: 'Test Artist 2' }],
                  album: { 
                    name: 'Test Album 2', 
                    images: [{ url: 'https://via.placeholder.com/300x300' }] 
                  },
                  uri: 'spotify:track:track-2'
                }
              }
            ]
          })
        })
      } else {
        route.continue()
      }
    })

    // Mock token exchange endpoint
    await page.route('**/accounts.spotify.com/api/token', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          scope: 'user-read-private user-read-email playlist-read-private playlist-modify-public'
        })
      })
    })

    await page.goto('http://127.0.0.1:5174')
  })

  test('should complete full auth flow with single playlist and track fetch', async ({ page }) => {
    // Track network requests to verify single fetch
    const playlistRequests: string[] = []
    const trackRequests: string[] = []
    
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/me/playlists')) {
        playlistRequests.push(url)
      }
      if (url.includes('/tracks')) {
        trackRequests.push(url)
      }
    })

    // 1. Start at login page
    await expect(page.locator('text=ログイン')).toBeVisible()
    
    // 2. Click Spotify connect button
    const spotifyButton = page.locator('button:has-text("Spotify")')
    await expect(spotifyButton).toBeVisible()
    
    // Mock PKCE state creation
    await page.evaluate(() => {
      localStorage.setItem('playme_spotify_pkce_state', JSON.stringify({
        codeVerifier: 'mock-verifier',
        codeChallenge: 'mock-challenge',
        state: 'mock-state',
        timestamp: Date.now()
      }))
    })
    
    // 3. Simulate OAuth callback
    await page.goto('http://127.0.0.1:5174/auth/spotify/callback?code=mock-code&state=mock-state')
    
    // 4. Should redirect to dashboard after successful auth
    await page.waitForURL('http://127.0.0.1:5174/')
    await expect(page.locator('[data-testid="dashboard-page"], .dashboard, h1:has-text("マイ ミュージック")')).toBeVisible({ timeout: 10000 })
    
    // 5. Wait for playlists to load
    await expect(page.locator('text=Test Playlist')).toBeVisible({ timeout: 5000 })
    
    // 6. Click on first playlist to trigger track fetch
    await page.locator('text=Test Playlist 1').first().click()
    
    // 7. Wait for tracks to load
    await expect(page.locator('text=Test Track')).toBeVisible({ timeout: 5000 })
    
    // 8. Verify single fetch behavior
    // Should only have 1 playlist request
    expect(playlistRequests.length).toBeLessThanOrEqual(1)
    
    // Should only have 1 track request for the selected playlist
    expect(trackRequests.filter(url => url.includes('playlist-1')).length).toBeLessThanOrEqual(1)
    
    console.log('Playlist requests:', playlistRequests.length)
    console.log('Track requests:', trackRequests.filter(url => url.includes('playlist-1')).length)
  })

  test('should not refetch on page reload', async ({ page }) => {
    // Complete initial auth flow
    await page.evaluate(() => {
      localStorage.setItem('playme_spotify_pkce_state', JSON.stringify({
        codeVerifier: 'mock-verifier',
        codeChallenge: 'mock-challenge', 
        state: 'mock-state',
        timestamp: Date.now()
      }))
    })
    
    await page.goto('http://127.0.0.1:5174/auth/spotify/callback?code=mock-code&state=mock-state')
    await page.waitForURL('http://127.0.0.1:5174/')
    await expect(page.locator('text=Test Playlist')).toBeVisible()
    
    // Track requests after reload
    const requestsAfterReload: string[] = []
    
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/me/playlists') || url.includes('/tracks')) {
        requestsAfterReload.push(url)
      }
    })
    
    // Reload page
    await page.reload()
    await expect(page.locator('text=Test Playlist')).toBeVisible()
    
    // Should not have made new requests (data cached)
    expect(requestsAfterReload.length).toBe(0)
  })

  test('should handle PKCE state not found error gracefully', async ({ page }) => {
    // Don't set PKCE state in localStorage
    
    // Go directly to callback without PKCE state
    await page.goto('http://127.0.0.1:5174/auth/spotify/callback?code=mock-code&state=mock-state')
    
    // Should show error message
    await expect(page.locator('text=PKCE state not found')).toBeVisible({ timeout: 5000 })
    
    // Should have retry or home button
    await expect(page.locator('button:has-text("ホームに戻る")')).toBeVisible()
  })

  test('should handle expired PKCE state', async ({ page }) => {
    // Set expired PKCE state
    await page.evaluate(() => {
      localStorage.setItem('playme_spotify_pkce_state', JSON.stringify({
        codeVerifier: 'mock-verifier',
        codeChallenge: 'mock-challenge',
        state: 'mock-state', 
        timestamp: Date.now() - (11 * 60 * 1000) // 11 minutes ago (expired)
      }))
    })
    
    await page.goto('http://127.0.0.1:5174/auth/spotify/callback?code=mock-code&state=mock-state')
    
    // Should show expired error
    await expect(page.locator('text=expired')).toBeVisible({ timeout: 5000 })
  })

  test('should handle state mismatch error', async ({ page }) => {
    // Set PKCE state with different state value
    await page.evaluate(() => {
      localStorage.setItem('playme_spotify_pkce_state', JSON.stringify({
        codeVerifier: 'mock-verifier',
        codeChallenge: 'mock-challenge',
        state: 'different-state',
        timestamp: Date.now()
      }))
    })
    
    await page.goto('http://127.0.0.1:5174/auth/spotify/callback?code=mock-code&state=mock-state')
    
    // Should show state mismatch error
    await expect(page.locator('text=State mismatch')).toBeVisible({ timeout: 5000 })
  })
})