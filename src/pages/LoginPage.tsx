// src/pages/LoginPage.tsx
import React, { useState } from 'react'
import { LoginForm } from '../components/auth/LoginForm'
import { RegisterForm } from '../components/auth/RegisterForm'

type AuthMode = 'login' | 'register'

export const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* メインコンテンツ */}
      <div className="relative w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Playmeロゴ */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl mb-4">
              <span className="text-2xl">🎵</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Playme</h1>
            <p className="text-gray-300">音楽と共に、新しい体験を</p>
          </div>

          {/* フォーム切り替えタブ */}
          <div className="flex mb-8 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                authMode === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                authMode === 'register'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              新規登録
            </button>
          </div>

          {/* フォーム表示 */}
          <div className="transition-all duration-300">
            {authMode === 'login' ? (
              <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Playme. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
