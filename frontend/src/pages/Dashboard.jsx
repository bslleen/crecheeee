import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import '../App.css'

export default function Dashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="card fade-in">
      <div className="logo">
        <h1>IDMS</h1>
        <p>Module 1 — User &amp; Access Management</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div className="info-row">
          <span>Name</span>
          <span>{user?.fullName}</span>
        </div>
        <div className="info-row">
          <span>Email</span>
          <span>{user?.email}</span>
        </div>
        <div className="info-row">
          <span>Role</span>
          <span><span className="badge">{user?.role}</span></span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>JWT Token</span>
          <div className="token-box">{token}</div>
        </div>
        <button className="btn-danger" onClick={handleLogout}>Sign out</button>
      </div>
    </div>
  )
}
