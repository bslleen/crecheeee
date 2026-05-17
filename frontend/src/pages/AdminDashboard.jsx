import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// ═══════════════════════════════════════════════════════════════════════════════
// Kindergarten Design Palette
// ═══════════════════════════════════════════════════════════════════════════════
const P = {
  grass:  '#2BB39B',
  sky:    '#82B3E1',
  candy:  '#F5B5CC',
  crayon: '#EB5E5A',
  sun:    '#FBB92A',
  star:   '#FAF5EE',
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const STATS = [
  {
    id:        1,
    icon:      '🧒',
    label:     'Total Enrolled Children',
    value:     148,
    subtext:   '/ 150 capacity  ·  2 spots remaining',
    badge:     '99% Full',
    badgeBg:   P.sky,
    badgeFg:   '#fff',
    iconBg:    '#EBF4FF',
    trend:     '+3 this week',
    trendUp:   true,
  },
  {
    id:        2,
    icon:      '👩‍🏫',
    label:     'Active Teachers on Duty',
    value:     14,
    subtext:   '2 on scheduled leave  ·  1 : 11 child ratio',
    badge:     'Ratio OK',
    badgeBg:   P.grass,
    badgeFg:   '#fff',
    iconBg:    '#E6F7F4',
    trend:     'Within guidelines',
    trendUp:   true,
  },
  {
    id:        3,
    icon:      '🚌',
    label:     'Buses En Route',
    value:     4,
    subtext:   '2 inbound  ·  2 outbound  ·  all on schedule',
    badge:     'On Time',
    badgeBg:   P.sun,
    badgeFg:   '#1a1a2e',
    iconBg:    '#FFF8E6',
    trend:     'Next arrival 07:55',
    trendUp:   true,
  },
  {
    id:        4,
    icon:      '🎫',
    label:     'Open Support Tickets',
    value:     0,
    subtext:   'No active alerts  ·  system operating normally',
    badge:     'All Clear',
    badgeBg:   P.grass,
    badgeFg:   '#fff',
    iconBg:    '#E6F7F4',
    trend:     'Last resolved: 2 days ago',
    trendUp:   true,
  },
]

const CLASSROOMS = [
  { id: 1, name: 'Infant Room',      ageRange: '6 wks – 12 mo', current: 8,  capacity: 10, barColor: P.candy },
  { id: 2, name: 'Toddler Room A',   ageRange: '1 – 2 years',   current: 12, capacity: 15, barColor: P.sky   },
  { id: 3, name: 'Toddler Room B',   ageRange: '2 – 3 years',   current: 14, capacity: 15, barColor: P.sky   },
  { id: 4, name: 'Preschool Room A', ageRange: '3 – 4 years',   current: 18, capacity: 20, barColor: P.grass },
  { id: 5, name: 'Preschool Room B', ageRange: '4 – 5 years',   current: 16, capacity: 20, barColor: P.grass },
]

const ACTION_META = {
  USER_LOGIN:          { bg: P.grass,  fg: '#fff',      label: 'USER_LOGIN'          },
  USER_LOGOUT:         { bg: P.sky,    fg: '#fff',      label: 'USER_LOGOUT'         },
  USER_REGISTERED:     { bg: P.grass,  fg: '#fff',      label: 'USER_REGISTERED'     },
  USER_LOGIN_FAILED:   { bg: P.crayon, fg: '#fff',      label: 'USER_LOGIN_FAILED'   },
  UNAUTHORIZED_ACCESS: { bg: P.crayon, fg: '#fff',      label: 'UNAUTHORIZED_ACCESS' },
  RESOURCE_ACCESSED:   { bg: P.sky,    fg: '#fff',      label: 'RESOURCE_ACCESSED'   },
  RESOURCE_MODIFIED:   { bg: P.sun,    fg: '#1a1a2e',   label: 'RESOURCE_MODIFIED'   },
  USER_ROLE_CHANGED:   { bg: P.sun,    fg: '#1a1a2e',   label: 'USER_ROLE_CHANGED'   },
  USER_SUSPENDED:      { bg: P.crayon, fg: '#fff',      label: 'USER_SUSPENDED'      },
  USER_ACTIVATED:      { bg: P.grass,  fg: '#fff',      label: 'USER_ACTIVATED'      },
}

const AUDIT_LOGS = [
  { id: 10, ts: '2026-05-17  09:14:52', actor: 'Test Director', action: 'RESOURCE_ACCESSED',   module: 'M1 – Auth',      ip: '192.168.1.101' },
  { id:  9, ts: '2026-05-17  09:11:30', actor: 'Sara Belkacem', action: 'USER_LOGIN',           module: 'M1 – Auth',      ip: '192.168.1.88'  },
  { id:  8, ts: '2026-05-17  08:58:04', actor: '—',             action: 'USER_LOGIN_FAILED',    module: 'M1 – Auth',      ip: '203.0.113.99'  },
  { id:  7, ts: '2026-05-17  08:47:19', actor: 'Amina Khelil',  action: 'RESOURCE_ACCESSED',   module: 'M3 – Transport', ip: '10.0.0.42'     },
  { id:  6, ts: '2026-05-17  08:42:11', actor: 'Amina Khelil',  action: 'USER_LOGIN',           module: 'M1 – Auth',      ip: '10.0.0.42'     },
  { id:  5, ts: '2026-05-17  08:35:00', actor: 'Test Director', action: 'USER_ROLE_CHANGED',    module: 'M1 – Admin',     ip: '192.168.1.101' },
  { id:  4, ts: '2026-05-17  08:30:22', actor: 'Test Director', action: 'USER_REGISTERED',      module: 'M1 – Auth',      ip: '192.168.1.101' },
  { id:  3, ts: '2026-05-17  08:28:14', actor: 'Test Director', action: 'USER_LOGIN',           module: 'M1 – Auth',      ip: '192.168.1.101' },
  { id:  2, ts: '2026-05-16  17:55:33', actor: '—',             action: 'UNAUTHORIZED_ACCESS',  module: 'M2 – Classroom', ip: '198.51.100.7'  },
  { id:  1, ts: '2026-05-16  17:44:08', actor: 'Sara Belkacem', action: 'USER_LOGOUT',          module: 'M1 – Auth',      ip: '192.168.1.88'  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// Reusable sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function ActionPill({ action }) {
  const meta = ACTION_META[action] ?? { bg: '#9ca3af', fg: '#fff', label: action }
  return (
    <span
      style={{ backgroundColor: meta.bg, color: meta.fg }}
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide whitespace-nowrap"
    >
      {meta.label}
    </span>
  )
}

function StatCard({ s }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between gap-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl select-none"
          style={{ backgroundColor: s.iconBg }}
        >
          {s.icon}
        </div>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: s.badgeBg, color: s.badgeFg }}
        >
          {s.badge}
        </span>
      </div>

      <div>
        <p className="text-4xl font-extrabold text-gray-800 leading-none tabular-nums">{s.value}</p>
        <p className="text-sm font-semibold text-gray-700 mt-1.5">{s.label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{s.subtext}</p>
      </div>

      <p className="text-xs font-medium" style={{ color: s.trendUp ? P.grass : P.crayon }}>
        {s.trendUp ? '↑' : '↓'} {s.trend}
      </p>
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
      {children}
    </h2>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AdminDashboard
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [jwtOpen, setJwtOpen] = useState(false)

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const initials = (user?.fullName ?? 'D')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const firstName = user?.fullName?.split(' ')[0] ?? 'Director'

  const totalEnrolled  = CLASSROOMS.reduce((n, r) => n + r.current, 0)
  const totalCapacity  = CLASSROOMS.reduce((n, r) => n + r.capacity, 0)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function handleRegisterStaff() {
    console.log('[Action] Register New Staff Profile clicked')
    alert('➕  Register New Staff Profile\n\nThis will open the staff registration form.\n(Module 1 — User Management)')
  }

  function handleBroadcast() {
    console.log('[Action] Broadcast Announcement clicked')
    alert('📢  Broadcast Announcement to Parents\n\nCompose and send a push/SMS notification to all enrolled families.\n(Module 5 — Communications — coming soon)')
  }

  function handleEmergencyAlert() {
    console.log('[Action] Emergency Alert triggered')
    const confirmed = window.confirm(
      '🚨  EMERGENCY BROADCAST\n\n' +
      'This will immediately notify ALL registered parents and on-duty staff.\n\n' +
      'This action is logged in the audit trail.\n\nProceed?'
    )
    if (confirmed) {
      console.log('[Audit] Emergency broadcast dispatched by', user?.email)
      alert('🚨  Emergency broadcast dispatched.\n\nAll contacts have been notified. The event has been recorded in the audit log.')
    }
  }

  // ── JWT decode helper ───────────────────────────────────────────────────────
  let jwtHeader  = null
  let jwtPayload = null
  let jwtSig     = ''
  if (token) {
    try {
      const parts  = token.split('.')
      jwtHeader    = JSON.parse(atob(parts[0]))
      jwtPayload   = JSON.parse(atob(parts[1]))
      jwtSig       = parts[2] ?? ''
    } catch (_) {}
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: P.star }}>

      {/* ════════════════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm"
              style={{ background: `linear-gradient(135deg, ${P.grass}, ${P.sky})` }}
            >
              ID
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight text-gray-800">IDMS</p>
              <p className="text-xs text-gray-400">Director Portal</p>
            </div>
          </div>

          {/* Date pill — hidden on small screens */}
          <div
            className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: '#F0FDF8', color: P.grass }}
          >
            <span>📅</span>
            <span>{today}</span>
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ background: `linear-gradient(135deg, ${P.grass}, ${P.sky})` }}
              >
                {initials}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-semibold text-gray-800">{user?.fullName ?? 'Director'}</p>
                <p className="text-xs font-medium" style={{ color: P.grass }}>Daycare Director</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border-2 transition-all duration-150 hover:text-white"
              style={{ borderColor: P.crayon, color: P.crayon }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = P.crayon; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = P.crayon }}
            >
              Sign out
            </button>
          </div>

        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Page title */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">
              Good morning, {firstName} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Live operational snapshot for your facility — {today}
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold self-start sm:self-auto"
            style={{ backgroundColor: '#E6F7F4', color: P.grass }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: P.grass }} />
            Systems nominal
          </div>
        </div>

        {/* ── 1. ANALYTICS SUMMARY GRID ─────────────────────────────────── */}
        <section>
          <SectionHeading>Analytics Overview</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map(s => <StatCard key={s.id} s={s} />)}
          </div>
        </section>

        {/* ── 2. SYSTEM HEALTH & RAPID OPERATIONS ───────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: Action Matrix ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
            <div>
              <SectionHeading>Rapid Operations Board</SectionHeading>
              <p className="text-xs text-gray-400 -mt-3">Director-level management actions</p>
            </div>

            <div className="flex flex-col gap-3">

              {/* Register New Staff */}
              <button
                onClick={handleRegisterStaff}
                className="group flex items-center gap-4 w-full text-left p-4 rounded-xl border-2 transition-all duration-150 hover:shadow-md"
                style={{ borderColor: P.sky }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF4FF'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: '#EBF4FF' }}
                >
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">Register New Staff Profile</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Add educator, transport coordinator, or catering staff to the system
                  </p>
                </div>
                <span className="text-gray-300 text-xl font-light group-hover:translate-x-0.5 transition-transform">›</span>
              </button>

              {/* Broadcast Announcement */}
              <button
                onClick={handleBroadcast}
                className="group flex items-center gap-4 w-full text-left p-4 rounded-xl border-2 transition-all duration-150 hover:shadow-md"
                style={{ borderColor: P.grass }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E6F7F4'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: '#E6F7F4' }}
                >
                  📢
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">Broadcast Announcement to Parents</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                    Send a push notification or SMS to all enrolled families at once
                  </p>
                </div>
                <span className="text-gray-300 text-xl font-light group-hover:translate-x-0.5 transition-transform">›</span>
              </button>

              {/* Emergency Broadcast — loud styling */}
              <button
                onClick={handleEmergencyAlert}
                className="group flex items-center gap-4 w-full text-left p-4 rounded-xl border-2 transition-all duration-150 hover:shadow-lg"
                style={{ borderColor: P.crayon, backgroundColor: '#FFF0EF' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = P.crayon }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FFF0EF' }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: P.crayon }}
                >
                  🚨
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-extrabold group-hover:text-white transition-colors"
                    style={{ color: P.crayon }}
                  >
                    Emergency Broadcast Alert
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed group-hover:text-red-100 transition-colors" style={{ color: '#b03030' }}>
                    Immediately notify ALL parents and on-duty staff — logged in audit trail
                  </p>
                </div>
                <span
                  className="text-lg font-extrabold group-hover:text-white transition-colors"
                  style={{ color: P.crayon }}
                >
                  !
                </span>
              </button>

            </div>
          </div>

          {/* ── RIGHT: Classroom Status Watch ───────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionHeading>Classroom Capacity Watch</SectionHeading>
                <p className="text-xs text-gray-400 -mt-3">Live room occupancy vs. licensed capacity</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">⏱ {time}</span>
            </div>

            <div className="flex flex-col gap-5">
              {CLASSROOMS.map(room => {
                const pct       = Math.round((room.current / room.capacity) * 100)
                const nearFull  = pct >= 90
                const barColor  = nearFull ? P.sun : room.barColor
                return (
                  <div key={room.id}>
                    <div className="flex items-baseline justify-between mb-2">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{room.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{room.ageRange}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {nearFull && (
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#FFF8E6', color: P.sun }}
                          >
                            Near full
                          </span>
                        )}
                        <span className="text-xs font-bold text-gray-700 tabular-nums">
                          {room.current}
                          <span className="text-gray-300 font-normal"> / {room.capacity}</span>
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">{pct}% occupied</p>
                  </div>
                )
              })}
            </div>

            {/* Totals footer */}
            <div
              className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center"
            >
              <div>
                <p className="text-lg font-extrabold text-gray-800">{CLASSROOMS.length}</p>
                <p className="text-xs text-gray-400">Rooms</p>
              </div>
              <div>
                <p className="text-lg font-extrabold" style={{ color: P.grass }}>{totalEnrolled}</p>
                <p className="text-xs text-gray-400">Enrolled</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-gray-800">{totalCapacity}</p>
                <p className="text-xs text-gray-400">Capacity</p>
              </div>
            </div>
          </div>

        </section>

        {/* ── 3. TECHNICAL AUDIT LOG REGISTRY ───────────────────────────── */}
        <section>
          <SectionHeading>Technical Audit Log Registry</SectionHeading>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Table header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-800">System Event Feed</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  10 most recent rows from{' '}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-600">
                    audit_logs
                  </code>
                  {' '}·  auto-refreshes every 60 s
                </p>
              </div>
              <span
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#E6F7F4', color: P.grass }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: P.grass }} />
                Live Feed
              </span>
            </div>

            {/* Scrollable table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#', 'Timestamp', 'Performing Actor', 'System Action Code', 'Target Module', 'IP Metadata'].map(col => (
                      <th
                        key={col}
                        className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-6 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AUDIT_LOGS.map((log, idx) => {
                    const isThreat = log.action === 'USER_LOGIN_FAILED' || log.action === 'UNAUTHORIZED_ACCESS'
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-gray-50 transition-colors hover:bg-gray-50"
                        style={isThreat ? { backgroundColor: '#FFF5F5' } : {}}
                      >
                        {/* ID */}
                        <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{log.id}</td>

                        {/* Timestamp */}
                        <td className="px-6 py-3.5 text-xs text-gray-500 font-mono whitespace-nowrap">
                          {log.ts}
                        </td>

                        {/* Actor */}
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2.5 whitespace-nowrap">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{
                                background: log.actor === '—'
                                  ? '#d1d5db'
                                  : `linear-gradient(135deg, ${P.grass}, ${P.sky})`,
                              }}
                            >
                              {log.actor === '—' ? '?' : log.actor.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-gray-700">{log.actor}</span>
                          </div>
                        </td>

                        {/* Action Code pill */}
                        <td className="px-6 py-3.5">
                          <ActionPill action={log.action} />
                        </td>

                        {/* Module */}
                        <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {log.module}
                        </td>

                        {/* IP */}
                        <td className="px-6 py-3.5 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {isThreat
                            ? <span style={{ color: P.crayon }} className="font-bold">{log.ip}</span>
                            : log.ip
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing <strong className="text-gray-600">10</strong> of{' '}
                <strong className="text-gray-600">{AUDIT_LOGS.length}</strong> most recent entries
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P.grass }} /> Success
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P.sky }} /> Info
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P.sun }} /> Warning
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P.crayon }} /> Critical
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ── 4. JWT DEBUGGER TOGGLE ────────────────────────────────────── */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Accordion trigger */}
            <button
              onClick={() => setJwtOpen(o => !o)}
              className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black bg-gray-600">
                  JWT
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-gray-700">Developer JWT Debugger</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Inspect the active session token — click to {jwtOpen ? 'collapse ▴' : 'expand ▾'}
                  </p>
                </div>
              </div>
              <span
                className="text-gray-400 text-xl transition-transform duration-300 select-none"
                style={{ transform: jwtOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▾
              </span>
            </button>

            {/* Accordion body */}
            {jwtOpen && (
              <div className="px-6 pb-6 border-t border-gray-100">

                <p className="text-xs text-gray-400 mt-4 mb-3">
                  Raw Base64-encoded JWT string for the current session. For developer verification only —
                  never share or expose this token.
                </p>

                {/* Raw token block */}
                <pre
                  className="rounded-xl p-4 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all font-mono mb-4"
                  style={{ backgroundColor: '#1e2433', color: P.sky }}
                >
                  {token ?? 'No active token found in session.'}
                </pre>

                {/* Decoded sections */}
                {jwtHeader && jwtPayload && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    {/* Header */}
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: '#E6F7F4', borderColor: '#b3e8df' }}>
                      <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: P.grass }}>
                        Header
                      </p>
                      <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(jwtHeader, null, 2)}
                      </pre>
                    </div>

                    {/* Payload */}
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: '#EBF4FF', borderColor: '#b3d4f5' }}>
                      <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: P.sky }}>
                        Payload
                      </p>
                      <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(jwtPayload, null, 2)}
                      </pre>
                      <div className="mt-3 pt-3 border-t border-blue-100 space-y-1">
                        <p className="text-xs text-gray-500">
                          <span className="font-semibold text-gray-600">Issued: </span>
                          {new Date(jwtPayload.iat * 1000).toLocaleString('en-GB')}
                        </p>
                        <p className="text-xs" style={{ color: P.crayon }}>
                          <span className="font-semibold">Expires: </span>
                          {new Date(jwtPayload.exp * 1000).toLocaleString('en-GB')}
                        </p>
                      </div>
                    </div>

                    {/* Signature */}
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: '#FFF0EF', borderColor: '#f5bcb9' }}>
                      <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: P.crayon }}>
                        Signature
                      </p>
                      <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">
                        {jwtSig}
                      </p>
                      <p className="text-xs text-gray-400 mt-3">
                        Algorithm: <span className="font-semibold text-gray-600">{jwtHeader.alg}</span>
                        {' · '}
                        Type: <span className="font-semibold text-gray-600">{jwtHeader.typ}</span>
                      </p>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer
        className="mt-8 border-t border-gray-200 py-6"
        style={{ backgroundColor: P.star }}
      >
        <p className="text-xs text-center text-gray-400">
          IDMS Module 1 — User &amp; Access Management &nbsp;·&nbsp; Director Portal &nbsp;·&nbsp;
          Secured with JWT + RBAC &nbsp;·&nbsp; v1.0.0
        </p>
      </footer>

    </div>
  )
}
