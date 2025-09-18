import { create } from 'zustand'

export type Track = {
  id: string
  name: string
  uri: string
  artists?: { name: string }[]
  album?: { images?: { url: string }[] }
}

type TracksState = {
  tracksByPlaylist: Record<string, Track[]>
  loading: boolean
  error: string | null
  setTracksFor: (playlistId: string, tracks: Track[]) => void
  setLoading: (v: boolean) => void
  setError: (m: string | null) => void
  clear: () => void
}

export const useTracksStore = create<TracksState>((set) => ({
  tracksByPlaylist: {},
  loading: false,
  error: null,
  setTracksFor: (pid, tracks) =>
    set((s) => {
      const prev = s.tracksByPlaylist[pid]
      // 件数と先頭/末尾のIDで軽量な同値判定（頻繁な再レンダーを抑止）
      const same =
        Array.isArray(prev) &&
        prev.length === tracks.length &&
        (prev.length === 0 ||
          (prev[0]?.id === tracks[0]?.id && prev[prev.length - 1]?.id === tracks[tracks.length - 1]?.id))
      if (same) {
        // 既に同じなら loading だけ落とす
        return { ...s, loading: false }
      }
      return { tracksByPlaylist: { ...s.tracksByPlaylist, [pid]: tracks }, loading: false }
    }),
  setLoading: (v) => set({ loading: v }),
  setError: (m) => set({ error: m }),
  clear: () => set({ 
    tracksByPlaylist: {}, 
    loading: false, 
    error: null 
  }),
}))