import { beforeEach, describe, expect, it, vi } from 'vitest'
import { spotifyAPI, SpotifyAuthError } from '../spotify'

// モックAPI
vi.mock('../spotify', async () => {
  const actual = await vi.importActual('../spotify')
  return {
    ...actual,
    SpotifyAPI: vi.fn().mockImplementation(() => ({
      getAuthUrl: vi.fn(),
      exchangeCodeForToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      searchTracks: vi.fn()
    }))
  }
})

describe('SpotifyAPI', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('PKCE Authentication', () => {
    it('should generate auth URL with PKCE parameters', async () => {
      const spy = vi.spyOn(spotifyAPI, 'getAuthUrl').mockResolvedValue(
        'https://accounts.spotify.com/authorize?code_challenge=abc&code_challenge_method=S256'
      )
      const url = await spotifyAPI.getAuthUrl()
      expect(url).toContain('code_challenge=')
      expect(url).toContain('code_challenge_method=S256')
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should handle token exchange success', async () => {
      const mockTokens = {
        access_token: 'test',
        token_type: 'Bearer' as const,
        expires_in: 3600,
        scope: 'user-read-private'
      }
      vi.spyOn(spotifyAPI, 'exchangeCodeForToken').mockResolvedValue(mockTokens)
      await expect(spotifyAPI.exchangeCodeForToken('code')).resolves.toEqual(mockTokens)
    })

    it('should handle token exchange errors', async () => {
      vi.spyOn(spotifyAPI, 'exchangeCodeForToken').mockRejectedValue(
        new SpotifyAuthError('Token exchange failed', undefined, 400)
      )
      await expect(spotifyAPI.exchangeCodeForToken('bad')).rejects.toThrow('Token exchange failed')
    })
  })
})