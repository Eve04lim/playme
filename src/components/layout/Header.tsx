// src/components/layout/Header.tsx
import React, { useState, useCallback, useRef, useLayoutEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Music2, Home, History, Target, ListMusic, Search as SearchIcon, 
  Radio, User, Menu, X, LogOut, Settings
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useMyPageStore } from '../../stores/myPageStore'

export const Header: React.FC = () => {
  const headerRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // ヘッダー高さをCSS変数に設定（動的対応 + RAF batching）
  useLayoutEffect(() => {
    const element = headerRef.current
    if (!element) return
    
    let rafId: number | null = null
    let lastHeight = 0
    
    const updateHeight = () => {
      // Cancel previous RAF if still pending
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      
      rafId = requestAnimationFrame(() => {
        const height = element.offsetHeight
        
        // Only update if height actually changed to prevent micro-updates
        if (Math.abs(height - lastHeight) < 1) {
          rafId = null
          return
        }
        
        lastHeight = height
        const currentHeight = getComputedStyle(document.documentElement).getPropertyValue('--header-height')
        const newHeight = `${height}px`
        
        // Only update DOM if value actually changed to prevent ResizeObserver loops
        if (currentHeight.trim() !== newHeight) {
          document.documentElement.style.setProperty('--header-height', newHeight)
        }
        
        rafId = null
      })
    }
    
    // Initial height update
    updateHeight()
    
    // ResizeObserver with RAF batching
    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })
    resizeObserver.observe(element)
    
    // Fallback for window resize
    const handleWindowResize = () => {
      updateHeight()
    }
    window.addEventListener('resize', handleWindowResize, { passive: true })
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])
  
  const { user, logout, spotifyTokens, spotifyConnected, connectSpotify } = useAuthStore()
  const theme = useMyPageStore(state => state.theme)
  
  // Spotify接続状態の判定
  const isSpotifyConnected = spotifyConnected || !!(spotifyTokens?.accessToken)
  
  // Spotify連携ハンドラー
  const handleSpotifyConnect = useCallback(async () => {
    try {
      if (connectSpotify) {
        await connectSpotify()
      } else {
        // フォールバック：直接認証URL遷移
        window.location.href = '/auth/spotify'
      }
    } catch (error) {
      console.error('Spotify connection failed:', error)
    }
  }, [connectSpotify])

  const handleLogout = () => {
    logout()
    navigate('/login')
    setShowUserMenu(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const isActive = (path: string) => location.pathname === path

  const navigationItems = [
    { path: '/', label: 'ホーム', icon: Home },
    { path: '/dashboard', label: 'ダッシュボード', icon: Radio },
    { path: '/recommendations', label: 'おすすめ', icon: Target },
    { path: '/playlists', label: 'プレイリスト', icon: ListMusic },
    { path: '/history', label: '履歴', icon: History },
  ]

  return (
    <header 
      ref={headerRef}
      data-testid="app-header"
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
      style={{ 
        backgroundColor: theme.backgroundColor + 'E6', // 90% opacity
        borderBottomColor: theme.secondaryColor 
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link 
              to="/"
              className="flex items-center space-x-2 text-xl font-bold hover:opacity-80 transition-opacity"
              style={{ color: theme.primaryColor }}
            >
              <Music2 size={24} />
              <span>PlayMe</span>
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(path)
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{
                  backgroundColor: isActive(path) ? theme.primaryColor : 'transparent'
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* 検索バー - デスクトップ */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative">
              <SearchIcon 
                size={20} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
              />
              <input
                type="text"
                placeholder="楽曲、アーティスト、アルバムを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </form>
          </div>

          {/* Spotify連携ボタン - デスクトップ */}
          <div className="hidden md:flex items-center space-x-4">
            {!isSpotifyConnected ? (
              <button
                data-testid="btn-connect-spotify"
                onClick={handleSpotifyConnect}
                className="px-4 py-2 rounded-lg bg-[#1db954] text-black text-sm font-semibold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1db954] transition-all"
                aria-label="Spotifyと連携する"
              >
                Spotify 連携
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center gap-1 text-sm text-white/80">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#1db954]" aria-hidden />
                  接続済み
                </span>
              </div>
            )}
            
            {/* ユーザーメニュー */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/10 transition-colors"
                style={{ color: theme.textColor }}
              >
                <User size={20} />
                <span>{user?.username || 'User'}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg py-1 border border-gray-700">
                  <Link
                    to="/mypage"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User size={16} className="mr-2" />
                    マイページ
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Settings size={16} className="mr-2" />
                    設定
                  </Link>
                  {isSpotifyConnected && (
                    <>
                      <hr className="border-gray-700 my-1" />
                      <button
                        data-testid="btn-logout-spotify"
                        onClick={() => {
                          // Spotify連携解除処理
                          useAuthStore.setState({ spotifyConnected: false, spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null } })
                          setShowUserMenu(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                        aria-label="Spotify連携を解除する"
                      >
                        <Music2 size={16} className="mr-2" />
                        Spotify連携解除
                      </button>
                    </>
                  )}
                  <hr className="border-gray-700 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    <LogOut size={16} className="mr-2" />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: theme.textColor }}
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {showMobileMenu && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-800/95 backdrop-blur-sm rounded-lg mt-2">
              {/* モバイル検索 */}
              <div className="px-3 py-2">
                <form onSubmit={handleSearch} className="relative">
                  <SearchIcon 
                    size={20} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                  />
                  <input
                    type="text"
                    placeholder="検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  />
                </form>
              </div>

              {/* モバイルナビゲーション */}
              {navigationItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(path)
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: isActive(path) ? theme.primaryColor : 'transparent'
                  }}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}

              <hr className="border-gray-700 my-2" />
              
              {/* Spotify連携 - モバイル */}
              {!isSpotifyConnected ? (
                <button
                  data-testid="btn-connect-spotify-mobile"
                  onClick={() => {
                    handleSpotifyConnect()
                    setShowMobileMenu(false)
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-base font-medium bg-[#1db954] text-black hover:brightness-110 rounded-md transition-all"
                >
                  <Music2 size={20} />
                  <span>Spotify 連携</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2 px-3 py-2 text-base font-medium text-green-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#1db954]" />
                  <span>Spotify 接続済み</span>
                </div>
              )}
              
              {/* モバイルユーザーメニュー */}
              <Link
                to="/mypage"
                className="flex items-center space-x-2 px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
                onClick={() => setShowMobileMenu(false)}
              >
                <User size={20} />
                <span>マイページ</span>
              </Link>
              
              {isSpotifyConnected && (
                <button
                  data-testid="btn-logout-spotify-mobile"
                  onClick={() => {
                    useAuthStore.setState({ spotifyConnected: false, spotifyTokens: { accessToken: null, refreshToken: null, expiresAt: null } })
                    setShowMobileMenu(false)
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
                >
                  <Music2 size={20} />
                  <span>Spotify連携解除</span>
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md"
              >
                <LogOut size={20} />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}