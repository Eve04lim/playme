// src/stores/playlistStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SpotifyPlaylist {
  id: string
  name: string
  description?: string
  tracks: {
    total: number
  }
  owner: {
    id: string
    display_name: string
  }
  public: boolean
  collaborative: boolean
  images?: Array<{
    url: string
    height?: number
    width?: number
  }>
}

interface PlaylistState {
  playlists: SpotifyPlaylist[]
  selectedPlaylistId: string | null
  
  // Actions
  setPlaylists: (playlists: SpotifyPlaylist[]) => void
  setSelectedPlaylist: (id: string | null) => void
  incrementTrackCount: (playlistId: string, delta?: number) => void
  rollbackTrackCount: (playlistId: string, delta?: number) => void
  updatePlaylist: (playlistId: string, updates: Partial<SpotifyPlaylist>) => void
  getPlaylistById: (id: string) => SpotifyPlaylist | null
  clear: () => void
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      playlists: [],
      selectedPlaylistId: null,

      setPlaylists: (playlists) => {
        set((state) => {
          const list = Array.isArray(playlists) ? playlists : []
          // 変化が無ければ更新しない
          const same =
            state.playlists.length === list.length &&
            state.playlists.every((p, i) => p.id === list[i]?.id && p.tracks?.total === list[i]?.tracks?.total)
          if (same) return state
          
          let selected = state.selectedPlaylistId
          // 既存の選択IDが新リストに存在しない場合は先頭へ
          if (!selected || !list.some(p => p.id === selected)) {
            selected = list[0]?.id ?? null
          }
          return { playlists: list, selectedPlaylistId: selected }
        })
      },

      setSelectedPlaylist: (id) => {
        set({ selectedPlaylistId: id })
      },

      // 楽観更新でトラック数を増減
      incrementTrackCount: (playlistId, delta = 1) => {
        const { playlists } = get()
        const updatedPlaylists = playlists.map(playlist => {
          if (playlist.id === playlistId) {
            return {
              ...playlist,
              tracks: {
                ...playlist.tracks,
                total: Math.max(0, playlist.tracks.total + delta)
              }
            }
          }
          return playlist
        })
        set({ playlists: updatedPlaylists })
      },

      // rollback用 - 楽観更新を戻す
      rollbackTrackCount: (playlistId, delta = 1) => {
        const { playlists } = get()
        const updatedPlaylists = playlists.map(playlist => {
          if (playlist.id === playlistId) {
            return {
              ...playlist,
              tracks: {
                ...playlist.tracks,
                total: Math.max(0, playlist.tracks.total - delta)
              }
            }
          }
          return playlist
        })
        set({ playlists: updatedPlaylists })
      },

      updatePlaylist: (playlistId, updates) => {
        const { playlists } = get()
        const updatedPlaylists = playlists.map(playlist => {
          if (playlist.id === playlistId) {
            return { ...playlist, ...updates }
          }
          return playlist
        })
        set({ playlists: updatedPlaylists })
      },

      getPlaylistById: (id) => {
        const { playlists } = get()
        return playlists.find(playlist => playlist.id === id) || null
      },

      clear: () => {
        set({
          playlists: [],
          selectedPlaylistId: null
        })
      }
    }),
    {
      name: 'playlist-storage',
      partialize: (state) => ({
        playlists: state.playlists,
        selectedPlaylistId: state.selectedPlaylistId
      })
    }
  )
)