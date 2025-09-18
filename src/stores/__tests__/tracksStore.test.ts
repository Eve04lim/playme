// src/stores/__tests__/tracksStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useTracksStore } from '../tracksStore'
import type { Track } from '../tracksStore'

describe('tracksStore', () => {
  const mockTracks: Track[] = [
    {
      id: 'track-1',
      name: 'Test Track 1', 
      uri: 'spotify:track:track-1',
      artists: [{ name: 'Artist 1' }],
      album: { images: [{ url: 'https://example.com/image1.jpg' }] }
    },
    {
      id: 'track-2',
      name: 'Test Track 2',
      uri: 'spotify:track:track-2', 
      artists: [{ name: 'Artist 2' }],
      album: { images: [{ url: 'https://example.com/image2.jpg' }] }
    }
  ]

  beforeEach(() => {
    // Reset store state before each test
    useTracksStore.getState().clear()
  })

  it('should initialize with empty state', () => {
    const state = useTracksStore.getState()
    expect(state.tracksByPlaylist).toEqual({})
    expect(state.loading).toBe(false)
    expect(state.error).toBe(null)
  })

  it('should set tracks for a playlist', () => {
    const { setTracksFor } = useTracksStore.getState()
    
    setTracksFor('playlist-1', mockTracks)
    
    const state = useTracksStore.getState()
    expect(state.tracksByPlaylist['playlist-1']).toEqual(mockTracks)
  })

  it('should not update store if tracks are the same (same-value skip)', () => {
    const { setTracksFor } = useTracksStore.getState()
    
    // Set initial tracks
    setTracksFor('playlist-1', mockTracks)
    const stateAfterFirst = useTracksStore.getState()
    
    // Set same tracks again
    setTracksFor('playlist-1', mockTracks)
    const stateAfterSecond = useTracksStore.getState()
    
    // Should be the same reference (no update occurred)
    expect(stateAfterFirst.tracksByPlaylist).toBe(stateAfterSecond.tracksByPlaylist)
  })

  it('should update store if tracks are different', () => {
    const { setTracksFor } = useTracksStore.getState()
    
    // Set initial tracks
    setTracksFor('playlist-1', mockTracks)
    const stateAfterFirst = useTracksStore.getState()
    
    // Set different tracks
    const differentTracks = [mockTracks[0]] // Only first track
    setTracksFor('playlist-1', differentTracks)
    const stateAfterSecond = useTracksStore.getState()
    
    // Should be different references (update occurred)
    expect(stateAfterFirst.tracksByPlaylist).not.toBe(stateAfterSecond.tracksByPlaylist)
    expect(stateAfterSecond.tracksByPlaylist['playlist-1']).toEqual(differentTracks)
  })

  it('should detect same tracks with different array references', () => {
    const { setTracksFor } = useTracksStore.getState()
    
    // Set initial tracks
    setTracksFor('playlist-1', mockTracks)
    const stateAfterFirst = useTracksStore.getState()
    
    // Create new array with same track objects
    const sameTracks = [...mockTracks]
    setTracksFor('playlist-1', sameTracks)
    const stateAfterSecond = useTracksStore.getState()
    
    // Should not update (same content detected)
    expect(stateAfterFirst.tracksByPlaylist).toBe(stateAfterSecond.tracksByPlaylist)
  })

  it('should handle empty track arrays', () => {
    const { setTracksFor } = useTracksStore.getState()
    
    setTracksFor('playlist-1', [])
    
    const state = useTracksStore.getState()
    expect(state.tracksByPlaylist['playlist-1']).toEqual([])
  })

  it('should detect difference when first/last tracks change', () => {
    const { setTracksFor } = useTracksStore.getState()
    
    // Set initial tracks
    setTracksFor('playlist-1', mockTracks)
    const stateAfterFirst = useTracksStore.getState()
    
    // Change the last track ID
    const modifiedTracks = [
      mockTracks[0],
      { ...mockTracks[1], id: 'track-2-modified' }
    ]
    setTracksFor('playlist-1', modifiedTracks)
    const stateAfterSecond = useTracksStore.getState()
    
    // Should update (last track ID changed)
    expect(stateAfterFirst.tracksByPlaylist).not.toBe(stateAfterSecond.tracksByPlaylist)
    expect(stateAfterSecond.tracksByPlaylist['playlist-1']).toEqual(modifiedTracks)
  })

  it('should set loading state', () => {
    const { setLoading } = useTracksStore.getState()
    
    setLoading(true)
    expect(useTracksStore.getState().loading).toBe(true)
    
    setLoading(false)
    expect(useTracksStore.getState().loading).toBe(false)
  })

  it('should set error state', () => {
    const { setError } = useTracksStore.getState()
    
    setError('Test error message')
    expect(useTracksStore.getState().error).toBe('Test error message')
    
    setError(null)
    expect(useTracksStore.getState().error).toBe(null)
  })

  it('should clear all state', () => {
    const { setTracksFor, setLoading, setError, clear } = useTracksStore.getState()
    
    // Set some state
    setTracksFor('playlist-1', mockTracks)
    setTracksFor('playlist-2', [mockTracks[0]])
    setLoading(true)
    setError('Some error')
    
    // Verify state is set
    let state = useTracksStore.getState()
    expect(Object.keys(state.tracksByPlaylist)).toHaveLength(2)
    expect(state.loading).toBe(true)
    expect(state.error).toBe('Some error')
    
    // Clear all state
    clear()
    
    // Verify state is cleared
    state = useTracksStore.getState()
    expect(state.tracksByPlaylist).toEqual({})
    expect(state.loading).toBe(false)
    expect(state.error).toBe(null)
  })

  it('should handle multiple playlists independently', () => {
    const { setTracksFor } = useTracksStore.getState()
    
    const playlist1Tracks = [mockTracks[0]]
    const playlist2Tracks = [mockTracks[1]]
    
    setTracksFor('playlist-1', playlist1Tracks)
    setTracksFor('playlist-2', playlist2Tracks)
    
    const state = useTracksStore.getState()
    expect(state.tracksByPlaylist['playlist-1']).toEqual(playlist1Tracks)
    expect(state.tracksByPlaylist['playlist-2']).toEqual(playlist2Tracks)
    expect(Object.keys(state.tracksByPlaylist)).toHaveLength(2)
  })
})