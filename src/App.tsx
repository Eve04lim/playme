// src/App.tsx
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MyPage } from './pages/MyPage'
import { useAuthStore } from './stores/authStore'
import './styles/globals.css'

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* パブリックルート */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/mypage" replace /> : <LoginPage />
            } 
          />
          
          {/* プロテクトされたルート */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* 未認証時のリダイレクト */}
          <Route 
            path="*" 
            element={
              <Navigate 
                to={isAuthenticated ? "/" : "/login"} 
                replace 
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App