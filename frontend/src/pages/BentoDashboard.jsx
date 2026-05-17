import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const P = {
  grass:  '#2BB39B',
  sky:    '#82B3E1',
  candy:  '#F5B5CC',
  crayon: '#EB5E5A',
  sun:    '#FBB92A',
  dark:   '#1a1a2e',
  darker: '#12121f',
}

/* ─── Static dashboard data ───────────────────────────────────────────────── */
const DAILY_OPS = [
  { icon: '👧', label: 'Children Present',  value: 38, total: 42, color: P.sky    },
  { icon: '🚌', label: 'Routes Active',     value: 5,  total: 6,  color: P.sun    },
  { icon: '🍽️', label: 'Meals Served',      value: 76, total: 80, color: P.candy  },
  { icon: '📅', label: 'Events Today',      value: 3,  total: 3,  color: P.grass  },
]

const SYS_METRICS = [
  { label: 'API Latency',    value: '48 ms',  bar: 0.15, color: P.grass  },
  { label: 'DB Connections', value: '4 / 10', bar: 0.40, color: P.sky    },
  { label: 'Uptime',         value: '99.8 %', bar: 0.998,color: P.grass  },
  { label: 'Memory Usage',   value: '312 MB', bar: 0.61, color: P.sun    },
]

const SYS_SERVICES = [
  { label: 'Auth Service',       ok: true  },
  { label: 'Database',           ok: true  },
  { label: 'Transport API',      ok: true  },
  { label: 'Catering Module',    ok: true  },
  { label: 'Notification Queue', ok: false },
]

const ACTIVITY_FEED = [
  { color: P.grass,  text: 'Amina Khoury signed in',            time: '2 min ago'  },
  { color: P.sun,    text: 'Transport route B updated',          time: '18 min ago' },
  { color: P.sky,    text: 'Lunch menu approved for week 21',    time: '1 hr ago'   },
  { color: P.candy,  text: 'New child enrollment: Lena Farah',  time: '2 hr ago'   },
  { color: P.crayon, text: 'Failed login attempt — 192.168.1.4',time: '3 hr ago'   },
  { color: P.grass,  text: 'Weekly attendance report generated', time: '4 hr ago'   },
]

const ADMIN_STATS = [
  { label: 'Total Staff',   value: 14, trend: '+2 this week',  color: P.grass  },
  { label: 'Active Today',  value: 12, trend: '85% present',   color: P.sky    },
  { label: 'Open Alerts',   value: 3,  trend: '+1 since yday', color: P.crayon },
  { label: 'Pending Tasks', value: 7,  trend: '-3 resolved',   color: P.sun    },
]

const CLASSROOMS = [
  { name: 'Sunflower',  enrolled: 9,  cap: 10, educator: 'Ms. Amina'   },
  { name: 'Rainbow',    enrolled: 8,  cap: 10, educator: 'Ms. Layla'   },
  { name: 'Butterfly',  enrolled: 10, cap: 10, educator: 'Ms. Fatima'  },
  { name: 'Starfish',   enrolled: 7,  cap: 10, educator: 'Mr. Youssef' },
]

const BUS_ROUTES = [
  { route: 'Route A', status: 'On Time', eta: '07:45', color: P.grass  },
  { route: 'Route B', status: 'Delayed', eta: '08:12', color: P.sun    },
  { route: 'Route C', status: 'On Time', eta: '07:50', color: P.grass  },
]

/* ─── Small helpers ───────────────────────────────────────────────────────── */
function pct(n, t) { return Math.round((n / t) * 100) }

function ProgressBar({ value, max = 1, color }) {
  const w = typeof max === 'number' && max <= 1
    ? Math.round(value * 100)
    : pct(value, max)
  return (
    <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .7s' }} />
    </div>
  )
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

/* ─── Navbar ──────────────────────────────────────────────────────────────── */
function Navbar({ active, setActive, onLogout }) {
  const links = ['Home', 'Children', 'Schedule', 'Transport', 'Catering']
  return (
    <nav style={{ background: P.dark, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: P.grass, borderRadius: 10, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 15, letterSpacing: 1 }}>ID</div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 0.5 }}>IDMS</span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {links.map(l => (
            <button key={l} onClick={() => setActive(l.toLowerCase())}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: active === l.toLowerCase() ? P.sun : '#c8d6e5',
                fontWeight: active === l.toLowerCase() ? 700 : 500,
                fontSize: 14, padding: '8px 14px', borderRadius: 8,
                borderBottom: active === l.toLowerCase() ? `2px solid ${P.sun}` : '2px solid transparent',
                transition: 'all .2s',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* Logout */}
        <button onClick={onLogout}
          style={{ background: 'rgba(235,94,90,0.15)', border: '1px solid rgba(235,94,90,0.4)', color: P.crayon, borderRadius: 10, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          ↩ Sign Out
        </button>
      </div>
    </nav>
  )
}

/* ─── Hero section ────────────────────────────────────────────────────────── */
function Hero({ user }) {
  const hour   = new Date().getHours()
  const greet  = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  const first  = user?.fullName?.split(' ')[0] ?? 'there'
  return (
    <section style={{
      background: `linear-gradient(135deg, #0a2e26 0%, #162844 50%, #2e0f0f 100%)`,
      padding: '80px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* decorative circles */}
      {[[P.grass, 300, -80, -80], [P.sky, 250, 'auto', -60], [P.candy, 180, '40%', -40]].map(([c, s, t, b], i) => (
        <div key={i} style={{ position: 'absolute', width: s, height: s, borderRadius: '50%', background: c, opacity: 0.07, top: t !== 'auto' ? t : undefined, bottom: b !== 'auto' ? b : undefined, right: i === 1 ? -60 : undefined, left: i === 2 ? '40%' : undefined, filter: 'blur(40px)', pointerEvents: 'none' }} />
      ))}
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(43,179,155,0.15)', border: `1px solid rgba(43,179,155,0.3)`, borderRadius: 99, padding: '6px 18px', marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: P.grass, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ color: P.grass, fontSize: 13, fontWeight: 600 }}>System Operational</span>
        </div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: 16 }}>
          {greet}, <span style={{ background: `linear-gradient(90deg, ${P.grass}, ${P.sky})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{first}</span> 👋
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 18, marginBottom: 32 }}>
          {user?.role} · IDMS Daycare Management Platform
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: P.grass, color: '#fff', borderRadius: 99, padding: '10px 28px', fontWeight: 700, fontSize: 15 }}>Dashboard Overview</span>
          <span style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', borderRadius: 99, padding: '10px 28px', fontWeight: 600, fontSize: 15, border: '1px solid rgba(255,255,255,0.12)' }}>
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
    </section>
  )
}

/* ─── 4 colored service blocks ────────────────────────────────────────────── */
function ServiceBlocks() {
  const blocks = [
    { color: P.grass,  icon: '⚡', title: 'System Status',      body: 'All core services are running. Notification queue is degraded — 4 of 5 services online.' },
    { color: P.sky,    icon: '👧', title: 'Attendance Today',   body: `${pct(38,42)}% present — 38 of 42 enrolled children checked in. 4 absences recorded.` },
    { color: P.sun,    icon: '🚌', title: 'Transport Routing',  body: '5 of 6 bus routes active. Route B is running 15 min late. All other routes on schedule.' },
    { color: P.candy,  icon: '🍽️', title: 'Catering Module',   body: '76 of 80 meals served this session. Weekly menu approved. Next delivery: Monday.' },
  ]
  return (
    <section style={{ background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0 }}>
        {blocks.map(({ color, icon, title, body }) => (
          <div key={title} style={{ background: color, padding: '40px 28px', color: '#fff' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{title}</h3>
            <p style={{ opacity: 0.88, fontSize: 14, lineHeight: 1.6 }}>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── System performance + operations (2-col about-style section) ─────────── */
function PerformanceSection() {
  return (
    <section style={{ padding: '72px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>

        {/* Left: system perf */}
        <div>
          <p style={{ color: P.grass, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Live Telemetry</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1e293b', marginBottom: 16 }}>System Performance</h2>
          <p style={{ color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
            Real-time infrastructure metrics for the IDMS platform. All values refresh on each page load from the monitoring service.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SYS_METRICS.map(m => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: '#334155', fontWeight: 600 }}>{m.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</span>
                </div>
                <ProgressBar value={m.bar} color={m.color} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: service status */}
        <div style={{ background: '#f8fafc', borderRadius: 24, padding: 32 }}>
          <p style={{ color: P.sky, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Health Check</p>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', marginBottom: 24 }}>Service Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {SYS_SERVICES.map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: ok ? P.grass : P.sun, display: 'inline-block', boxShadow: `0 0 0 3px ${ok ? 'rgba(43,179,155,0.2)' : 'rgba(251,185,42,0.2)'}` }} />
                  <span style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: ok ? 'rgba(43,179,155,0.1)' : 'rgba(251,185,42,0.15)', color: ok ? P.grass : '#92400e' }}>
                  {ok ? '● Online' : '⚠ Degraded'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── CTA banner (dark section like kiddos intro) ─────────────────────────── */
function CtaBanner() {
  return (
    <section style={{ background: `linear-gradient(120deg, ${P.dark} 0%, #0f3460 100%)`, padding: '56px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Managing Your Daycare, Smarter Every Day</h2>
          <p style={{ color: '#94a3b8', fontSize: 15 }}>All attendance, transport, catering and staff data — unified in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ background: P.sun, color: '#1a1a2e', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 14 }}>View Reports</span>
          <span style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', borderRadius: 10, padding: '12px 28px', fontWeight: 600, fontSize: 14, border: '1px solid rgba(255,255,255,0.15)' }}>Schedule Review</span>
        </div>
      </div>
    </section>
  )
}

/* ─── Daily Ops cards (teacher-card style) ────────────────────────────────── */
function DailyOpsSection() {
  return (
    <section style={{ padding: '72px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: P.sky, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Today's Snapshot</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>Daily Operations</h2>
          <p style={{ color: '#64748b', maxWidth: 520, margin: '0 auto' }}>Live operational metrics across all four core daycare modules for today's session.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {DAILY_OPS.map(({ icon, label, value, total, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', transition: 'transform .2s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              {/* colored top strip */}
              <div style={{ background: color, height: 6 }} />
              <div style={{ padding: '28px 24px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
                <p style={{ color: '#64748b', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 16 }}>
                  <span style={{ fontSize: 40, fontWeight: 900, color: '#1e293b' }}>{value}</span>
                  <span style={{ fontSize: 16, color: '#94a3b8' }}>/ {total}</span>
                </div>
                <ProgressBar value={value} max={total} color={color} />
                <p style={{ marginTop: 8, fontSize: 13, color: color, fontWeight: 700 }}>{pct(value, total)}% capacity</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Big counter section ─────────────────────────────────────────────────── */
function CounterSection() {
  const counters = [
    { icon: '🏫', number: 5,   label: 'Active Classrooms' },
    { icon: '👧', number: 38,  label: 'Children Present'  },
    { icon: '👩‍🏫', number: 14, label: 'Staff Members'    },
    { icon: '🚌', number: 5,   label: 'Routes Running'    },
  ]
  return (
    <section style={{ background: `linear-gradient(135deg, #0a2e26, #0f2744)`, padding: '72px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ color: '#fff', fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
            <span style={{ color: P.sun }}>Today</span> at a Glance
          </h2>
          <p style={{ color: '#94a3b8' }}>Live figures updated from the IDMS database.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, textAlign: 'center' }}>
          {counters.map(({ icon, number, label }) => (
            <div key={label}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontSize: 56, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{number}</div>
              <div style={{ color: '#94a3b8', marginTop: 8, fontSize: 15, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Activity feed (testimonial style) ───────────────────────────────────── */
function ActivitySection() {
  return (
    <section style={{ padding: '72px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: P.candy, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Live Updates</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>Activity Feed</h2>
          <p style={{ color: '#64748b', maxWidth: 480, margin: '0 auto' }}>Real-time log of staff actions, system events, and operational changes across all modules.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {ACTIVITY_FEED.map(({ color, text, time }, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: 16, padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start', border: '1px solid #e2e8f0' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {color === P.crayon ? '⚠️' : color === P.grass ? '✅' : color === P.sun ? '🚌' : color === P.sky ? '📋' : '👶'}
              </div>
              <div>
                <p style={{ color: '#334155', fontSize: 14, fontWeight: 500, lineHeight: 1.5, marginBottom: 6 }}>{text}</p>
                <p style={{ color: '#94a3b8', fontSize: 12 }}>{time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Bus routes section ──────────────────────────────────────────────────── */
function TransportSection() {
  return (
    <section style={{ padding: '72px 24px', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ color: P.sun, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Transport Module</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>Bus Route Status</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {BUS_ROUTES.map(({ route, status, eta, color }) => (
            <div key={route} style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{route}</h3>
                <span style={{ background: `${color}18`, color, fontWeight: 700, fontSize: 12, padding: '4px 12px', borderRadius: 99 }}>{status}</span>
              </div>
              <p style={{ color: '#64748b', fontSize: 14 }}>Estimated Arrival</p>
              <p style={{ fontSize: 32, fontWeight: 900, color, marginTop: 4 }}>{eta}</p>
              <div style={{ marginTop: 16, height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: status === 'On Time' ? '95%' : '60%', background: color, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Admin control panel — Director only ─────────────────────────────────── */
function AdminSection() {
  return (
    <section style={{ padding: '72px 24px', background: `linear-gradient(120deg, #fffbeb 0%, #fef9ec 100%)`, borderTop: `4px solid ${P.sun}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: P.sun, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚙️</div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b' }}>Admin Control Center</h2>
            <p style={{ color: '#92400e', fontSize: 13 }}>Director-only workspace</p>
          </div>
        </div>

        {/* stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
          {ADMIN_STATS.map(({ label, value, trend, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', borderTop: `4px solid ${color}` }}>
              <p style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{label}</p>
              <p style={{ fontSize: 40, fontWeight: 900, color: '#1e293b', margin: '8px 0' }}>{value}</p>
              <span style={{ fontSize: 12, fontWeight: 700, color, background: `${color}18`, padding: '3px 10px', borderRadius: 99 }}>{trend}</span>
            </div>
          ))}
        </div>

        {/* classrooms */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 24 }}>🏫 Classroom Watch</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {CLASSROOMS.map(c => {
              const p = pct(c.enrolled, c.cap)
              const near = p >= 90
              return (
                <div key={c.name} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{c.name}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: near ? P.sun : P.grass }}>{c.enrolled}/{c.cap}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{c.educator}</p>
                  <ProgressBar value={c.enrolled} max={c.cap} color={near ? P.sun : P.grass} />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── JWT sandbox (collapsible) ───────────────────────────────────────────── */
function JwtSection({ token }) {
  const [open, setOpen] = useState(false)
  const decode = s => { try { return JSON.parse(atob((s||'').replace(/-/g,'+').replace(/_/g,'/'))) } catch { return null } }
  const parts   = (token||'').split('.')
  const payload = decode(parts[1])

  return (
    <section style={{ padding: '40px 24px', background: '#0f172a' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 24px', color: '#e2e8f0', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🔑 JWT Token Inspector — expand to verify your session</span>
          <span style={{ fontSize: 18 }}>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Raw Token</p>
              <div style={{ background: '#020617', borderRadius: 12, padding: 16, overflowX: 'auto' }}>
                <code style={{ color: P.grass, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>{token}</code>
              </div>
            </div>
            <div>
              <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Decoded Payload</p>
              <div style={{ background: '#020617', borderRadius: 12, padding: 16, overflowX: 'auto' }}>
                <pre style={{ color: P.sun, fontSize: 11, fontFamily: 'monospace' }}>{payload ? JSON.stringify(payload, null, 2) : 'Could not decode'}</pre>
              </div>
            </div>
            {payload?.exp && (
              <p style={{ color: '#475569', fontSize: 12, gridColumn: '1/-1' }}>
                ⏱ Expires: {new Date(payload.exp * 1000).toLocaleString()}
                {payload.exp * 1000 < Date.now() && <span style={{ color: P.crayon, fontWeight: 700, marginLeft: 8 }}>⚠ EXPIRED</span>}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { title: 'IDMS Platform', items: ['Home', 'Children', 'Schedule', 'Transport', 'Catering'] },
    { title: 'Modules',       items: ['Attendance Tracking', 'Bus Routing', 'Meal Planning', 'Staff Management'] },
    { title: 'Support',       items: ['Documentation', 'Contact Admin', 'System Logs', 'Help Centre'] },
  ]
  return (
    <footer style={{ background: P.darker, color: '#94a3b8', padding: '56px 24px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48, flexWrap: 'wrap' }}>
          {/* brand */}
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
          {/* link cols */}
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

/* ─── Root dashboard ──────────────────────────────────────────────────────── */
export default function BentoDashboard() {
  const { user, token, logout } = useAuth()
  const [active, setActive]     = useState('home')
  const isDirector              = user?.role === 'Director'

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f8fafc' }}>
      <TopBar    user={user} />
      <Navbar    active={active} setActive={setActive} onLogout={logout} />
      <Hero      user={user} />
      <ServiceBlocks />
      <PerformanceSection />
      <CtaBanner />
      <DailyOpsSection />
      <CounterSection />
      <ActivitySection />
      <TransportSection />
      {isDirector && <AdminSection />}
      <JwtSection token={token} />
      <Footer />
    </div>
  )
}
