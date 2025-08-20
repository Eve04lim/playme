// src/components/layout/Layout.tsx
import React from 'react'
import { useMyPageStore } from '../../stores/myPageStore'
import { MiniPlayer } from '../player/MiniPlayer'
import { Header } from './Header'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useMyPageStore(state => state.theme)

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: theme.backgroundColor,
        color: theme.textColor 
      }}
    >
      <Header />
      <MiniPlayer />
      <main className="pt-16"> {/* ヘッダーの高さ分のパディング */}
        {children}
      </main>
    </div>
  )
}