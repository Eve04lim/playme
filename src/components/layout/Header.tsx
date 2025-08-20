// src/components/layout/Header.tsx
import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useMyPageStore } from '../../stores/myPageStore'

export const Header: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const { user, logout } = useAuthStore()
  const theme = useMyPageStore(state => state.theme)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
      style={{ 
        backgroundColor: theme.backgroundColor + 'E6', // 90% opacity
        borderBottomColor: theme.secondaryColor 
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴとナビゲーション */}
          <div className="flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-2xl font-bold"
              style={{ color: theme.primaryColor }}
            >
              Playme
            </Link>
            
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/') 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                style={{ 
                  backgroundColor: isActive('/') ? theme.primaryColor : 'transparent' 
                }}
              >
                <span className="text-lg">🏠</span>
                <span>ホーム</span>
              </Link>
              
              <Link
                to="/mypage"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/mypage') 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
                style={{ 
                  backgroundColor: isActive('/mypage') ? theme.primaryColor : 'transparent' 
                }}
              >
                <span className="text-lg">🎵</span>
                <span>マイページ</span>
              </Link>
            </nav>
          </div>

          {/* 検索バー */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="音楽を検索..."
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* ユーザーメニュー */}
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-gray-700 transition-colors">
              <span className="text-lg">⚙️</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                  <span className="text-white">👤</span>
                </div>
                <span className="hidden md:block text-sm text-gray-300">
                  {user?.username || 'User'}
                </span>
              </button>

              {/* ドロップダウンメニュー */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-gray-800 border border-gray-600">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-600">
                      <p className="text-sm text-white font-medium">
                        {user?.username}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                    
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <span className="mr-2">⚙️</span>
                      設定
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      <span className="mr-2">🚪</span>
                      ログアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* モバイルナビゲーション */}
      <div className="md:hidden border-t border-gray-600">
        <div className="flex justify-around py-2">
          <Link
            to="/"
            className={`flex flex-col items-center py-2 px-3 ${
              isActive('/') ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">🏠</span>
            <span className="text-xs mt-1">ホーム</span>
          </Link>
          
          <Link
            to="/mypage"
            className={`flex flex-col items-center py-2 px-3 ${
              isActive('/mypage') ? 'text-blue-500' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">🎵</span>
            <span className="text-xs mt-1">マイページ</span>
          </Link>
        </div>
      </div>
    </header>
  )
}