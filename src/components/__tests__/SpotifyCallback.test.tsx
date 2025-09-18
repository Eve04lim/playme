import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { SpotifyCallback } from '../auth/SpotifyCallback'

// モック
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    setSpotifyTokens: vi.fn(),
    updateUser: vi.fn()
  }))
}))

vi.mock('../../api/spotify', () => ({
  spotifyAPI: {
    exchangeCodeForToken: vi.fn()
  },
  SpotifyAuthError: class extends Error {
    constructor(message: string, public cause?: unknown, public statusCode?: number) {
      super(message)
      this.name = 'SpotifyAuthError'
    }
  }
}))

const renderWithRouter = (initialEntries = ['/']) => {
  return render(
    <BrowserRouter>
      <SpotifyCallback />
    </BrowserRouter>
  )
}

describe('SpotifyCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // URLSearchParams のモック
    Object.defineProperty(window, 'location', {
      value: {
        search: '?code=test-code&state=test-state'
      }
    })
  })

  it('should show loading state initially', () => {
    renderWithRouter()
    expect(screen.getByText('Spotify連携中...')).toBeInTheDocument()
  })

  it('should show success state after successful authentication', async () => {
    const mockTokens = {
      access_token: 'test-token',
      token_type: 'Bearer' as const,
      expires_in: 3600,
      scope: 'user-read-private'
    }

    const { spotifyAPI } = await import('../../api/spotify')
    vi.mocked(spotifyAPI.exchangeCodeForToken).mockResolvedValue(mockTokens)

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('連携完了！')).toBeInTheDocument()
    })
  })

  it('should show error state on authentication failure', async () => {
    const { spotifyAPI } = await import('../../api/spotify')
    vi.mocked(spotifyAPI.exchangeCodeForToken).mockRejectedValue(
      new Error('Authentication failed')
    )

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('連携エラー')).toBeInTheDocument()
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })
  })
})