// src/components/layout/Layout.tsx
import React from 'react'
import { useMusicStore } from '../../stores/musicStore'
import { useMyPageStore } from '../../stores/myPageStore'
import { MiniPlayer } from '../player/MiniPlayer'
import { Header } from './Header'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useMyPageStore(state => state.theme)
  const currentTrack = useMusicStore(state => state.currentTrack)

  return (
    <div 
      className="min-h-screen w-full"
      style={{ 
        backgroundColor: theme.backgroundColor,
        color: theme.textColor 
      }}
    >
      <Header />
      {currentTrack && <MiniPlayer />}
      <main 
        className={`w-full ${currentTrack ? 'pt-32' : 'pt-16'} transition-all duration-300`}
      >
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  )
}