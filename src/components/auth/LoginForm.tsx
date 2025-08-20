// src/components/auth/LoginForm.tsx
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react'
import React, { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import type { LoginRequest } from '../../types'

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  const { login, loading, error, clearError } = useAuthStore()

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // メールアドレスの検証
    if (!formData.email) {
      errors.email = 'メールアドレスは必須です'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください'
    }

    // パスワードの検証
    if (!formData.password) {
      errors.password = 'パスワードは必須です'
    } else if (formData.password.length < 6) {
      errors.password = 'パスワードは6文字以上で入力してください'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    try {
      await login(formData)
      // ログイン成功時はProtectedRouteが自動的にリダイレクト
    } catch (error) {
      // エラーはstoreで管理される
      console.error('Login failed:', error)
    }
  }

  const handleInputChange = (field: keyof LoginRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // エラーをクリア
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
    if (error) {
      clearError()
    }
  }

  // テストアカウントでのクイックログイン
  const handleQuickLogin = (email: string, password: string) => {
    setFormData({ email, password })
    // フォームの自動送信は避け、ユーザーが明示的にログインボタンを押すよう促す
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* グローバルエラー表示 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* メールアドレス */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
            メールアドレス
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                validationErrors.email ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="your@email.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          {validationErrors.email && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
          )}
        </div>

        {/* パスワード */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            パスワード
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                validationErrors.password ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="パスワードを入力"
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {validationErrors.password && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
          )}
        </div>

        {/* パスワードを忘れた場合のリンク */}
        <div className="flex justify-end">
          <button
            type="button"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            disabled={loading}
          >
            パスワードを忘れた場合
          </button>
        </div>

        {/* ログインボタン */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>ログイン中...</span>
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              <span>ログイン</span>
            </>
          )}
        </button>

        {/* 開発用のテストアカウント情報 */}
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-300 text-sm font-medium mb-3">🔧 開発用テストアカウント</p>
          <div className="space-y-2">
            <div className="flex flex-col space-y-1">
              <button
                type="button"
                onClick={() => handleQuickLogin('user@example.com', 'password')}
                className="text-left p-2 rounded bg-yellow-400/10 hover:bg-yellow-400/20 transition-colors"
                disabled={loading}
              >
                <div className="text-xs text-yellow-200">
                  <p>📧 user@example.com</p>
                  <p>🔑 password</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('test@test.com', 'test123')}
                className="text-left p-2 rounded bg-yellow-400/10 hover:bg-yellow-400/20 transition-colors"
                disabled={loading}
              >
                <div className="text-xs text-yellow-200">
                  <p>📧 test@test.com</p>
                  <p>🔑 test123</p>
                </div>
              </button>
            </div>
            <p className="text-xs text-yellow-300 mt-2">
              ※ クリックでフォームに自動入力されます
            </p>
          </div>
        </div>

        {/* アカウント作成へのリンク */}
        <div className="text-center">
          <p className="text-gray-300">
            アカウントをお持ちでない場合は{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              disabled={loading}
            >
              新規登録
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}