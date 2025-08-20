// src/components/auth/ProtectedRoute.tsx
import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, token, refreshToken } = useAuthStore()

  useEffect(() => {
    // トークンが存在するが認証状態でない場合、トークンの有効性を確認
    if (token && !isAuthenticated && refreshToken) {
      refreshToken().catch(() => {
        // リフレッシュに失敗した場合はログアウト
        useAuthStore.getState().logout()
      })
    }
  }, [token, isAuthenticated, refreshToken])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}