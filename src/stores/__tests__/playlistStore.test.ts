// src/stores/__tests__/playlistStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { usePlaylistStore } from '../playlistStore'

describe('playlistStore', () => {
  beforeEach(() => {
    // テスト前にストアをクリア
    usePlaylistStore.getState().clear()
  })

  describe('basic playlist operations', () => {
    it('should set playlists', () => {
      const mockPlaylists = [
        {
          id: 'playlist1',
          name: 'Test Playlist',
          tracks: { total: 5 },
          owner: { id: 'user1', display_name: 'Test User' },
          public: true,
          collaborative: false
        }
      ]

      usePlaylistStore.getState().setPlaylists(mockPlaylists)
      
      expect(usePlaylistStore.getState().playlists).toEqual(mockPlaylists)
    })

    it('should set selected playlist', () => {
      usePlaylistStore.getState().setSelectedPlaylist('playlist1')
      expect(usePlaylistStore.getState().selectedPlaylistId).toBe('playlist1')
    })

    it('should get playlist by id', () => {
      const mockPlaylists = [
        {
          id: 'playlist1',
          name: 'Playlist 1',
          tracks: { total: 3 },
          owner: { id: 'user1', display_name: 'User 1' },
          public: true,
          collaborative: false
        },
        {
          id: 'playlist2', 
          name: 'Playlist 2',
          tracks: { total: 7 },
          owner: { id: 'user1', display_name: 'User 1' },
          public: false,
          collaborative: true
        }
      ]

      usePlaylistStore.getState().setPlaylists(mockPlaylists)
      
      const playlist = usePlaylistStore.getState().getPlaylistById('playlist2')
      expect(playlist?.name).toBe('Playlist 2')
      expect(playlist?.tracks.total).toBe(7)
    })
  })

  describe('track count operations (optimistic updates)', () => {
    beforeEach(() => {
      const mockPlaylists = [
        {
          id: 'playlist1',
          name: 'Test Playlist',
          tracks: { total: 10 },
          owner: { id: 'user1', display_name: 'Test User' },
          public: true,
          collaborative: false
        },
        {
          id: 'playlist2',
          name: 'Another Playlist',
          tracks: { total: 5 },
          owner: { id: 'user1', display_name: 'Test User' },
          public: false,
          collaborative: false
        }
      ]

      usePlaylistStore.getState().setPlaylists(mockPlaylists)
    })

    it('should increment track count', () => {
      usePlaylistStore.getState().incrementTrackCount('playlist1', 2)
      
      const playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(12)
      
      // 他のプレイリストは変更されない
      const otherPlaylist = usePlaylistStore.getState().getPlaylistById('playlist2')
      expect(otherPlaylist?.tracks.total).toBe(5)
    })

    it('should increment by 1 as default', () => {
      usePlaylistStore.getState().incrementTrackCount('playlist1')
      
      const playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(11)
    })

    it('should handle negative increment (decrement)', () => {
      usePlaylistStore.getState().incrementTrackCount('playlist1', -3)
      
      const playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(7)
    })

    it('should not go below zero', () => {
      usePlaylistStore.getState().incrementTrackCount('playlist2', -10) // 5 - 10 = -5, but should be 0
      
      const playlist = usePlaylistStore.getState().getPlaylistById('playlist2')
      expect(playlist?.tracks.total).toBe(0)
    })

    it('should rollback track count', () => {
      // 楽観更新で増加
      usePlaylistStore.getState().incrementTrackCount('playlist1', 3)
      let playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(13)

      // rollback
      usePlaylistStore.getState().rollbackTrackCount('playlist1', 3)
      playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(10) // 元の値に戻る
    })

    it('should rollback by 1 as default', () => {
      usePlaylistStore.getState().incrementTrackCount('playlist1')
      usePlaylistStore.getState().rollbackTrackCount('playlist1')
      
      const playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(10) // 元の値
    })

    it('should handle rollback that would go below zero', () => {
      // 初期値5のプレイリストで10をrollback
      usePlaylistStore.getState().rollbackTrackCount('playlist2', 10)
      
      const playlist = usePlaylistStore.getState().getPlaylistById('playlist2')
      expect(playlist?.tracks.total).toBe(0)
    })

    it('should handle non-existent playlist gracefully', () => {
      expect(() => {
        usePlaylistStore.getState().incrementTrackCount('nonexistent', 1)
      }).not.toThrow()

      expect(() => {
        usePlaylistStore.getState().rollbackTrackCount('nonexistent', 1)
      }).not.toThrow()
    })
  })

  describe('optimistic update + rollback scenario', () => {
    it('should simulate successful add-to-playlist flow', () => {
      const mockPlaylists = [
        {
          id: 'playlist1',
          name: 'My Playlist',
          tracks: { total: 20 },
          owner: { id: 'user1', display_name: 'Me' },
          public: true,
          collaborative: false
        }
      ]

      usePlaylistStore.getState().setPlaylists(mockPlaylists)

      // 楽観更新: 楽曲追加前にUIを更新
      usePlaylistStore.getState().incrementTrackCount('playlist1', 1)
      
      let playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(21) // 楽観更新で+1

      // API呼び出しが成功した場合（特に追加処理なし、楽観更新が正しかった）
      playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(21)
    })

    it('should simulate failed add-to-playlist flow with rollback', () => {
      const mockPlaylists = [
        {
          id: 'playlist1',
          name: 'My Playlist',
          tracks: { total: 20 },
          owner: { id: 'user1', display_name: 'Me' },
          public: true,
          collaborative: false
        }
      ]

      usePlaylistStore.getState().setPlaylists(mockPlaylists)

      // 楽観更新: 楽曲追加前にUIを更新
      usePlaylistStore.getState().incrementTrackCount('playlist1', 1)
      
      let playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(21) // 楽観更新で+1

      // API呼び出しが失敗した場合 -> rollback
      usePlaylistStore.getState().rollbackTrackCount('playlist1', 1)
      
      playlist = usePlaylistStore.getState().getPlaylistById('playlist1')
      expect(playlist?.tracks.total).toBe(20) // 元の値に戻る
    })
  })

  describe('clear operation', () => {
    it('should clear all data', () => {
      const mockPlaylists = [
        {
          id: 'playlist1',
          name: 'Test',
          tracks: { total: 1 },
          owner: { id: 'user1', display_name: 'User' },
          public: true,
          collaborative: false
        }
      ]

      usePlaylistStore.getState().setPlaylists(mockPlaylists)
      usePlaylistStore.getState().setSelectedPlaylist('playlist1')

      expect(usePlaylistStore.getState().playlists).toHaveLength(1)
      expect(usePlaylistStore.getState().selectedPlaylistId).toBe('playlist1')

      usePlaylistStore.getState().clear()

      expect(usePlaylistStore.getState().playlists).toEqual([])
      expect(usePlaylistStore.getState().selectedPlaylistId).toBeNull()
    })
  })
})