import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import '../App.css'

const ROLES = [
  { id: 1, label: 'Director' },
  { id: 2, label: 'Educator' },
  { id: 3, label: 'Transport Coordinator' },
  { id: 4, label: 'Catering Staff' },
  { id: 5, label: 'Parent' },
]

// Password complexity mirrors the backend validation rules.
function validatePassword(pw) {
  const errs = []
  if (pw.length < 8)           errs.push('At least 8 characters')
  if (!/[A-Z]/.test(pw))       errs.push('At least one uppercase letter')
  if (!/[a-z]/.test(pw))       errs.push('At least one lowercase letter')
  if (!/[0-9]/.test(pw))       errs.push('At least one digit')
  if (!/[^A-Za-z0-9]/.test(pw)) errs.push('At least one special character')
  return errs
}

export default function AuthPage({ initialTab = 'login' }) {
  const [tab, setTab]     = useState(initialTab)
  const { login }         = useAuth()
  const navigate          = useNavigate()

  return (
    <div className="auth-bg">
    <div className="card">
      <div className="logo">
        <h1>IDMS</h1>
        <p>Module 1 — User &amp; Access Management</p>
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'login'    ? ' active' : ''}`} onClick={() => setTab('login')}>
          Sign In
        </button>
        <button className={`tab${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>
          Register
        </button>
      </div>

      {tab === 'login'
        ? <LoginForm    onSuccess={(token, user) => { login(token, user); navigate('/dashboard') }} />
        : <RegisterForm onSuccess={() => setTab('login')} />
      }
    </div>
    </div>
  )
}

// =============================================================================
// LoginForm
// =============================================================================
function LoginForm({ onSuccess }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors]     = useState([])
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors([])
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!data.success) {
        setErrors(data.errors ?? [data.message])
        return
      }
      onSuccess(data.token, data.user)
    } catch {
      setErrors(['Network error — is the server running?'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <ul className="alert error">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      <div className="field">
        <label>Email</label>
        <input
          type="email"
          placeholder="you@idms.dz"
          value={email}
          onChange={ev => setEmail(ev.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={ev => setPassword(ev.target.value)}
          required
        />
      </div>

      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

// =============================================================================
// RegisterForm
// =============================================================================
function RegisterForm({ onSuccess }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId]     = useState(1)
  const [pwErrors, setPwErrors] = useState([])
  const [errors, setErrors]     = useState([])
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  function handlePasswordChange(e) {
    const val = e.target.value
    setPassword(val)
    setPwErrors(val.length > 0 ? validatePassword(val) : [])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const complexityErrs = validatePassword(password)
    if (complexityErrs.length > 0) {
      setPwErrors(complexityErrs)
      return
    }
    setErrors([])
    setSuccess('')
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, roleId: Number(roleId) }),
      })
      const data = await res.json()

      if (!data.success) {
        setErrors(data.errors ?? [data.message])
        return
      }
      setSuccess(`Account created (ID: ${data.userId}). You can now sign in.`)
      setTimeout(onSuccess, 1500)
    } catch {
      setErrors(['Network error — is the server running?'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <ul className="alert error">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {success && <p className="alert success">{success}</p>}

      <div className="field">
        <label>Full Name</label>
        <input
          type="text"
          placeholder="Amina Khelil"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Email</label>
        <input
          type="email"
          placeholder="you@idms.dz"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>Password</label>
        <input
          type="password"
          placeholder="Min 8 chars, uppercase, digit, symbol"
          value={password}
          onChange={handlePasswordChange}
          className={pwErrors.length > 0 ? 'invalid' : ''}
          required
        />
        {pwErrors.length > 0 && (
          <ul className="alert error" style={{ marginTop: '0.4rem' }}>
            {pwErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </div>

      <div className="field">
        <label>Role</label>
        <select value={roleId} onChange={e => setRoleId(Number(e.target.value))}>
          {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      <button className="btn-primary" type="submit" disabled={loading || pwErrors.length > 0}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  )
}
