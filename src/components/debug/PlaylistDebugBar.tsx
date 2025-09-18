// src/components/debug/PlaylistDebugBar.tsx
import React from 'react'
import { usePlaylistStore } from '../../stores/playlistStore'

export const PlaylistDebugBar: React.FC = () => {
  const { playlists } = usePlaylistStore()
  
  return (
    <div className="fixed top-16 right-4 z-40 bg-blue-600/90 text-white px-3 py-2 rounded-md text-sm font-mono">
      🎵 Playlists: {playlists.length}
    </div>
  )
}