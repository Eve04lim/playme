// src/pages/MyPage.tsx - Redirects to DashboardPage
/**
 * MyPage - DashboardPage へのリダイレクト
 * 
 * 後方互換性のため、既存の /mypage ルートを新しい DashboardPage にリダイレクト
 */
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardPage from './DashboardPage'

export const MyPage: React.FC = () => {
  const navigate = useNavigate()

  // Optional: redirect to /dashboard instead of rendering DashboardPage directly
   useEffect(() => {
     navigate('/dashboard', { replace: true })
   }, [navigate])

  // For now, render DashboardPage directly to maintain existing routing
  return <DashboardPage />
}