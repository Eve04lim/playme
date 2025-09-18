// src/main.tsx - ストア統合版
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './styles/globals.css'
import { createPlaymeDebug } from './utils/debugHelpers'

// ストア初期化テスト
console.log('🎵 Playme App 初期化開始...')

// 開発環境での追加ログ & デバッグ初期化
if (import.meta.env.DEV) {
  console.log('🛠️ 開発モード有効')
  console.log('📦 環境変数:', import.meta.env)
  
  // オリジン不一致チェック
  const expected = import.meta.env.VITE_PUBLIC_ORIGIN
  if (expected && window.location.origin !== expected) {
    console.warn(
      `⚠️ Origin mismatch: now=${window.location.origin}, expected=${expected}. ` +
      `ブラウザのURLか .env を合わせてください。`
    )
  }
  
  // デバッグ関数を初期化
  createPlaymeDebug()
}

// グローバルエラーハンドリング（Blank Screen原因の可視化）
window.addEventListener('error', (e) => {
  console.error('🚨 GlobalError:', e.error || e.message, e.filename, e.lineno, e.colno)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 UnhandledRejection:', e.reason)
  e.preventDefault() // コンソールスパム防止
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('❌ Root element not found!')
} else {
  console.log('✅ Root element found, mounting Playme...')
  
  const root = createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
  
  console.log('🚀 Playme App マウント完了!')
}