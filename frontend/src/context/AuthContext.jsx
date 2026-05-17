import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('idms_token') || null)
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('idms_user')) } catch { return null }
  })

  function login(newToken, newUser) {
    localStorage.setItem('idms_token', newToken)
    localStorage.setItem('idms_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  async function logout() {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (_) {}
    }
    localStorage.removeItem('idms_token')
    localStorage.removeItem('idms_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
