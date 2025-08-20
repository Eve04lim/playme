// src/components/auth/RegisterForm.tsx
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react'
import React, { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import type { RegisterRequest } from '../../types'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  const { register, loading, error, clearError } = useAuthStore()

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // メールアドレスの検証
    if (!formData.email) {
      errors.email = 'メールアドレスは必須です'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください'
    }

    // ユーザー名の検証
    if (!formData.username) {
      errors.username = 'ユーザー名は必須です'
    } else if (formData.username.length < 2) {
      errors.username = 'ユーザー名は2文字以上で入力してください'
    } else if (formData.username.length > 20) {
      errors.username = 'ユーザー名は20文字以下で入力してください'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'ユーザー名は英数字とアンダースコアのみ使用できます'
    }

    // パスワードの検証
    if (!formData.password) {
      errors.password = 'パスワードは必須です'
    } else if (formData.password.length < 8) {
      errors.password = 'パスワードは8文字以上で入力してください'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'パスワードは大文字、小文字、数字を含む必要があります'
    }

    // パスワード確認の検証
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'パスワードの確認は必須です'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません'
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
      await register(formData)
      // 登録成功時はProtectedRouteが自動的にリダイレクト
    } catch (error) {
      // エラーはstoreで管理される
      console.error('Registration failed:', error)
    }
  }

  const handleInputChange = (field: keyof RegisterRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // エラーをクリア
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
    if (error) {
      clearError()
    }
  }

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++

    if (strength < 2) return { strength, label: '弱い', color: 'text-red-400' }
    if (strength < 4) return { strength, label: '普通', color: 'text-yellow-400' }
    return { strength, label: '強い', color: 'text-green-400' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

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

        {/* ユーザー名 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            ユーザー名
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                validationErrors.username ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="ユーザー名"
              disabled={loading}
              autoComplete="username"
            />
          </div>
          {validationErrors.username && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.username}</p>
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
              autoComplete="new-password"
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
          
          {/* パスワード強度インジケーター */}
          {formData.password && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">パスワード強度:</span>
                <span className={`text-xs ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passwordStrength.strength < 2 ? 'bg-red-500' :
                    passwordStrength.strength < 4 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {validationErrors.password && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
          )}
        </div>

        {/* パスワード確認 */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
            パスワード確認
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="パスワードを再入力"
              disabled={loading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {validationErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
          )}
        </div>

        {/* 利用規約 */}
        <div className="text-sm text-gray-400">
          <p>
            アカウントを作成することで、
            <a href="#" className="text-blue-400 hover:text-blue-300 underline">利用規約</a>
            および
            <a href="#" className="text-blue-400 hover:text-blue-300 underline">プライバシーポリシー</a>
            に同意したものとみなされます。
          </p>
        </div>

        {/* 登録ボタン */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>アカウント作成中...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              <span>アカウントを作成</span>
            </>
          )}
        </button>

        {/* ログインへのリンク */}
        <div className="text-center">
          <p className="text-gray-300">
            すでにアカウントをお持ちの場合は{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              disabled={loading}
            >
              ログイン
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}