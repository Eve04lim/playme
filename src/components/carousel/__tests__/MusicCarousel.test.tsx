// src/components/carousel/__tests__/MusicCarousel.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useMusicStore } from '../../../stores/musicStore'
import { usePlaylistStore } from '../../../stores/playlistStore'
import { useMyPageStore } from '../../../stores/myPageStore'
import { useSpotify } from '../../../hooks/useSpotify'
import MusicCarousel from '../MusicCarousel'

// Mock stores and hooks
vi.mock('../../../stores/musicStore')
vi.mock('../../../stores/playlistStore')
vi.mock('../../../stores/myPageStore')
vi.mock('../../../hooks/useSpotify')

const mockTrack = {
  id: '1',
  title: 'Test Track',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 180000,
  artworkUrl: 'https://example.com/artwork.jpg'
}

const mockPlaylist = {
  id: 'playlist1',
  name: 'Test Playlist',
  tracks: [mockTrack],
  trackCount: 1,
  userId: 'user1',
  isPublic: true,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01'
}

const mockTheme = {
  primaryColor: '#1db954',
  textColor: '#ffffff'
}

const mockSpotify = {
  addToPlaylist: vi.fn().mockResolvedValue(undefined)
}

describe('MusicCarousel', () => {
  beforeEach(() => {
    vi.mocked(useMusicStore).mockReturnValue({
      playlists: [mockPlaylist],
      playTrack: vi.fn()
    } as any)
    
    vi.mocked(usePlaylistStore).mockReturnValue({
      selectedPlaylistId: 'playlist1'
    } as any)
    
    vi.mocked(useMyPageStore).mockReturnValue({
      theme: mockTheme
    } as any)
    
    vi.mocked(useSpotify).mockReturnValue(mockSpotify as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render playlist with tracks', () => {
    render(<MusicCarousel columnIndex={0} />)
    
    expect(screen.getByText('Test Playlist')).toBeInTheDocument()
    expect(screen.getByText('1 tracks')).toBeInTheDocument()
    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
  })

  it('should show empty state when no playlist', () => {
    vi.mocked(useMusicStore).mockReturnValue({
      playlists: [],
      playTrack: vi.fn()
    } as any)

    render(<MusicCarousel columnIndex={0} />)
    
    expect(screen.getByText('プレイリストが空です')).toBeInTheDocument()
    expect(screen.getByText('楽曲を追加して音楽を楽しみましょう')).toBeInTheDocument()
  })

  it('should play track when clicked', async () => {
    const mockPlayTrack = vi.fn()
    vi.mocked(useMusicStore).mockReturnValue({
      playlists: [mockPlaylist],
      playTrack: mockPlayTrack
    } as any)

    render(<MusicCarousel columnIndex={0} />)
    
    const trackCard = screen.getByRole('listitem')
    fireEvent.click(trackCard)
    
    expect(mockPlayTrack).toHaveBeenCalledWith(mockTrack, mockPlaylist)
  })

  it('should support keyboard navigation', async () => {
    const mockPlayTrack = vi.fn()
    vi.mocked(useMusicStore).mockReturnValue({
      playlists: [mockPlaylist],
      playTrack: mockPlayTrack
    } as any)

    render(<MusicCarousel columnIndex={0} />)
    
    const trackCard = screen.getByRole('listitem')
    
    // Test Enter key
    fireEvent.keyDown(trackCard, { key: 'Enter' })
    expect(mockPlayTrack).toHaveBeenCalledWith(mockTrack, mockPlaylist)
    
    // Test Space key
    fireEvent.keyDown(trackCard, { key: ' ' })
    expect(mockPlayTrack).toHaveBeenCalledTimes(2)
  })

  it('should show hover actions on track cards', async () => {
    render(<MusicCarousel columnIndex={0} />)
    
    const trackCard = screen.getByRole('listitem')
    fireEvent.mouseEnter(trackCard)
    
    // Action buttons should be visible on hover
    expect(screen.getByTitle('プレイリストに追加')).toBeInTheDocument()
    expect(screen.getByTitle('お気に入り')).toBeInTheDocument()
  })

  it('should add track to playlist when add button clicked', async () => {
    render(<MusicCarousel columnIndex={0} />)
    
    const trackCard = screen.getByRole('listitem')
    fireEvent.mouseEnter(trackCard)
    
    const addButton = screen.getByTitle('プレイリストに追加')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(mockSpotify.addToPlaylist).toHaveBeenCalledWith(
        'playlist1',
        '1',
        'Test Track'
      )
    })
  })

  it('should handle lazy loading of images', async () => {
    render(<MusicCarousel columnIndex={0} />)
    
    const image = screen.getByRole('img', { name: /Test Track アートワーク/ })
    expect(image).toHaveAttribute('loading', 'lazy')
    
    // Simulate image load
    fireEvent.load(image)
    
    await waitFor(() => {
      expect(image).toHaveClass('opacity-100')
    })
  })

  it('should show track duration', () => {
    render(<MusicCarousel columnIndex={0} />)
    
    // 180000ms = 3:00
    expect(screen.getByText('3:00')).toBeInTheDocument()
  })

  it('should be accessible with proper ARIA labels', () => {
    render(<MusicCarousel columnIndex={0} />)
    
    expect(screen.getByRole('region', { name: 'Test Playlist の楽曲一覧' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '楽曲リスト' })).toBeInTheDocument()
    
    const trackCard = screen.getByRole('listitem')
    expect(trackCard).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Test Track by Test Artist from Test Playlist')
    )
  })

  it('should limit displayed items based on maxItems prop', () => {
    const manyTracks = Array.from({ length: 10 }, (_, i) => ({
      ...mockTrack,
      id: `track-${i}`,
      title: `Track ${i}`
    }))

    const playlistWithManyTracks = {
      ...mockPlaylist,
      tracks: manyTracks,
      trackCount: manyTracks.length
    }

    vi.mocked(useMusicStore).mockReturnValue({
      playlists: [playlistWithManyTracks],
      playTrack: vi.fn()
    } as any)

    render(<MusicCarousel columnIndex={0} maxItems={5} />)
    
    // Should only show 5 tracks despite having 10
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })

  it('should handle missing artwork gracefully', () => {
    const trackWithoutArt = { ...mockTrack, artworkUrl: undefined }
    const playlistWithoutArt = {
      ...mockPlaylist,
      tracks: [trackWithoutArt]
    }

    vi.mocked(useMusicStore).mockReturnValue({
      playlists: [playlistWithoutArt],
      playTrack: vi.fn()
    } as any)

    render(<MusicCarousel columnIndex={0} />)
    
    const image = screen.getByRole('img', { name: /Test Track アートワーク/ })
    // Should have a fallback placeholder image
    expect(image).toHaveAttribute('data-src', expect.stringContaining('picsum'))
  })
})