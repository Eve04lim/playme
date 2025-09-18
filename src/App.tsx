// src/App.tsx - Full authentication integration with MiniPlayer
import React, { Suspense, useMemo, useEffect } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ErrorBoundary } from './components/system/ErrorBoundary'
import { useAuthStore } from './stores/authStore'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { Header } from './components/layout/Header'
import { MiniPlayer } from './components/player/MiniPlayer'
import { SpotifyCallback } from './components/auth/SpotifyCallback'
import { SpotifyDebugPanel } from './components/debug/SpotifyDebugPanel'
import './styles/globals.css'

// AuthGate: hasHydrated が完了するまでアプリを待機
function AuthGate({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore(s => s.hasHydrated ?? false)
  
  useEffect(() => {
    console.log('🔄 [App] AuthGate - hasHydrated:', hasHydrated)
    console.log('🌐 [App] Current location:', window.location.href, window.location.search)
  }, [hasHydrated])

  if (!hasHydrated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#121212',
        color: '#fff',
        padding: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #1db954',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading auth...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }
  return <>{children}</>
}


// メインレイアウトコンポーネント with stable auth selector and memoization
const RootLayout = React.memo(() => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  
  // Memoize expensive style object
  const mainStyle = useMemo(() => ({
    paddingTop: 'var(--header-height, 64px)'
  }), [])
  
  // Memoize fallback element to prevent recreation
  const suspenseFallback = useMemo(() => (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/70">読み込み中...</p>
      </div>
    </div>
  ), [])
  
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header - 常に表示（認証状態に関係なく） */}
      <Header />
      
      {/* メインコンテンツエリア - ヘッダー高さに動的対応 */}
      <main style={mainStyle}>
        <Suspense fallback={suspenseFallback}>
          <Outlet />
        </Suspense>
      </main>
      
      {/* Debug Panel - Development only */}
      <SpotifyDebugPanel />
      
      {/* MiniPlayer - 認証済みでのみ */}
      {isAuthenticated && <MiniPlayer />}
    </div>
  )
})

function App() {
  console.log('🔄 Playme App rendering...')
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  
  console.log('📊 Auth State:', { isAuthenticated })

  // Memoize route elements to prevent unnecessary re-creation with stable keys
  const routes = useMemo(() => {
    const loginElement = isAuthenticated ? 
      <Navigate key="login-navigate" to="/" replace /> : 
      <LoginPage key="login-page" />
    const dashboardElement = isAuthenticated ? 
      <DashboardPage key="dashboard-page" /> : 
      <Navigate key="dashboard-navigate" to="/login" replace />
    const fallbackElement = <Navigate key="fallback-navigate" to={isAuthenticated ? "/" : "/login"} replace />
    
    return {
      login: loginElement,
      dashboard: dashboardElement,
      fallback: fallbackElement
    }
  }, [isAuthenticated])

  return (
    <AuthGate>
      <ErrorBoundary key="error-boundary">
        <Routes key="app-routes">
          {/* レイアウトルート with fixed key */}
          <Route key="root-layout" element={<RootLayout />}>
            {/* Public routes */}
            <Route key="login-route" path="/login" element={routes.login} />
            
            {/* Spotify OAuth callback - 環境変数と一致するパスのみ */}
            <Route key="spotify-callback" path="/auth/spotify/callback" element={<SpotifyCallback />} />
            
            {/* Protected routes */}
            <Route key="dashboard-route" path="/" element={routes.dashboard} />
            
            {/* Catch all */}
            <Route key="fallback-route" path="*" element={routes.fallback} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </AuthGate>
  )
}

export default App