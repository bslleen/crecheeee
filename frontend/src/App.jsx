import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import AuthPage        from './pages/AuthPage.jsx'
import BentoDashboard  from './pages/BentoDashboard.jsx'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"     element={<AuthPage initialTab="login" />} />
      <Route path="/register"  element={<AuthPage initialTab="register" />} />
      <Route path="/dashboard" element={<PrivateRoute><BentoDashboard /></PrivateRoute>} />
      <Route path="*"          element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
