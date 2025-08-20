// src/pages/LoginPage.tsx
import React from 'react'

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Playme</h1>
            <p className="text-gray-300">音楽と共に、新しい体験を</p>
          </div>

          {/* ログインフォームは次のステップで実装 */}
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-300 mb-4">
                ログインフォームは次のステップで実装します
              </p>
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
                <p className="text-green-300 text-sm">
                  🚧 開発中: 認証UIコンポーネント
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}