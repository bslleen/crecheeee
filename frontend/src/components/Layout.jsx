import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import NotificationsBell from './NotificationsBell.jsx'

/* ─── Palette (shared across all pages) ───────────────────────────────────── */
export const P = {
  grass:  '#2BB39B',
  sky:    '#82B3E1',
  candy:  '#F5B5CC',
  crayon: '#EB5E5A',
  sun:    '#FBB92A',
  dark:   '#1a1a2e',
  darker: '#12121f',
}

/* ─── Top info bar ────────────────────────────────────────────────────────── */
function TopBar({ user }) {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div style={{ background: P.darker, color: '#c8d6e5', padding: '8px 0', fontSize: 13 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: P.grass, borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>📅</span>
          {today}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: P.sky, borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✉</span>
          {user?.email}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: P.sun, borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🏷</span>
          Role: <strong style={{ color: '#fff', marginLeft: 4 }}>{user?.role}</strong>
        </span>
      </div>
    </div>
  )
}

/* ─── Navbar (navigation-aware) ───────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Home',          path: '/dashboard'     },
  { label: 'Children',      path: '/children'      },
  { label: 'Registrations', path: '/registrations' },
  { label: 'Schedule',      path: '/schedule'      },
  { label: 'Transport',     path: '/transport'     },
  { label: 'Catering',      path: '/catering'      },
]

function Navbar({ onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav style={{ background: P.dark, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <div style={{ background: P.grass, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 15, letterSpacing: 1 }}>ID</div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>IDMS</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {NAV_LINKS.map(({ label, path }) => {
            const isActive = pathname === path || (path !== '/dashboard' && pathname.startsWith(path))
            return (
              <button key={label} onClick={() => navigate(path)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isActive ? P.sun : '#c8d6e5',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 14, padding: '8px 14px', borderRadius: 8,
                  borderBottom: isActive ? `2px solid ${P.sun}` : '2px solid transparent',
                  transition: 'all .2s',
                }}>
                {label}
              </button>
            )
          })}
        </div>

        {/* Notifications + Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NotificationsBell />
          <button onClick={onLogout}
            style={{ background: 'rgba(235,94,90,0.15)', border: '1px solid rgba(235,94,90,0.4)', color: P.crayon, borderRadius: 10, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            ↩ Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}

/* ─── Footer (shared) ─────────────────────────────────────────────────────── */
export function Footer() {
  const cols = [
    { title: 'IDMS Platform', items: ['Home', 'Children', 'Schedule', 'Transport', 'Catering'] },
    { title: 'Modules',       items: ['Attendance Tracking', 'Bus Routing', 'Meal Planning', 'Staff Management'] },
    { title: 'Support',       items: ['Documentation', 'Contact Admin', 'System Logs', 'Help Centre'] },
  ]
  return (
    <footer style={{ background: P.darker, color: '#94a3b8', padding: '56px 24px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ background: P.grass, borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 14 }}>ID</div>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>IDMS</span>
            </div>
            <p style={{ lineHeight: 1.7, fontSize: 14 }}>Integrated Daycare Management System — unifying attendance, transport, catering, and staff management under one platform.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              {[P.grass, P.sky, P.candy, P.sun, P.crayon].map(c => (
                <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
              ))}
            </div>
          </div>
          {cols.map(({ title, items }) => (
            <div key={title}>
              <h4 style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>{title}</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(i => <li key={i} style={{ fontSize: 14, cursor: 'pointer' }}>→ {i}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, textAlign: 'center', fontSize: 13 }}>
          © {new Date().getFullYear()} IDMS · Integrated Daycare Management System · All rights reserved
        </div>
      </div>
    </footer>
  )
}

/* ─── Layout wrapper ──────────────────────────────────────────────────────── */
export default function Layout({ children }) {
  const { user, logout } = useAuth()
  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f8fafc' }}>
      <TopBar user={user} />
      <Navbar onLogout={logout} />
      {children}
      <Footer />
    </div>
  )
}
