import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

/* Palette duplicated locally to avoid a circular import with Layout.jsx
   (Layout imports this component; importing P back would deadlock). */
const C = {
  grass:  '#2BB39B',
  sky:    '#82B3E1',
  crayon: '#EB5E5A',
  sun:    '#FBB92A',
}

/* Notification kind → icon + accent colour */
const KIND_META = {
  registration_submitted:   { icon: '📥', accent: C.sky    },
  registration_approved:    { icon: '✅', accent: C.grass  },
  registration_rejected:    { icon: '✕',  accent: C.crayon },
  registration_enrolled:    { icon: '🏫', accent: C.sky    },
  registration_activated:   { icon: '⚡', accent: C.grass  },
  registration_withdrawn:   { icon: '↩',  accent: C.sun    },
  registration_resubmitted: { icon: '🔁', accent: C.sun    },
}
const km = k => KIND_META[k] ?? { icon: '🔔', accent: C.sky }

function timeAgo(iso) {
  if (!iso) return ''
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60)      return 'just now'
  if (seconds < 3600)    return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400)   return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800)  return `${Math.floor(seconds / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NotificationsBell() {
  const { token } = useAuth()
  const [open,        setOpen]        = useState(false)
  const [unread,      setUnread]      = useState(0)
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(false)
  const panelRef = useRef(null)

  const authHdr = { Authorization: `Bearer ${token}` }

  const loadCount = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/unread-count', { headers: authHdr })
      const d = await r.json()
      if (d.success) setUnread(d.unread)
    } catch { /* swallow — bell can stay at last known count */ }
  }, [token])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/notifications?limit=20', { headers: authHdr })
      const d = await r.json()
      if (d.success) setItems(d.notifications ?? [])
    } finally { setLoading(false) }
  }, [token])

  /* Poll unread-count every 30s so an approval shows up without a refresh */
  useEffect(() => {
    loadCount()
    const id = setInterval(loadCount, 30000)
    return () => clearInterval(id)
  }, [loadCount])

  /* Refetch the list whenever the panel opens */
  useEffect(() => {
    if (open) loadList()
  }, [open, loadList])

  /* Close panel on outside click */
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  async function markRead(id) {
    setItems(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n))
    setUnread(u => Math.max(0, u - 1))
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: authHdr })
    } catch { /* optimistic — server will catch up on next reload */ }
  }

  async function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, is_read: 1 })))
    setUnread(0)
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH', headers: authHdr })
    } catch { /* same */ }
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: open ? 'rgba(251,185,42,0.12)' : 'transparent',
          border: '1px solid', borderColor: open ? `${C.sun}80` : 'rgba(255,255,255,0.12)',
          color: '#e2e8f0', borderRadius: 10,
          width: 38, height: 38, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>
        🔔
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: C.crayon, color: '#fff',
            fontSize: 10, fontWeight: 800,
            borderRadius: 99, padding: '1px 6px',
            minWidth: 18, textAlign: 'center',
            border: '2px solid #1a1a2e',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, maxHeight: 480, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
          border: '1px solid #e2e8f0',
          zIndex: 200,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
            position: 'sticky', top: 0, background: '#fff', zIndex: 1,
          }}>
            <p style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Notifications</p>
            {items.some(n => !n.is_read) && (
              <button onClick={markAllRead}
                style={{ background: 'none', border: 'none', color: C.grass, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>

          {loading && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Loading…
            </div>
          )}

          {!loading && items.length === 0 && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ fontSize: 13 }}>You're all caught up.</p>
            </div>
          )}

          {!loading && items.map(n => {
            const meta = km(n.kind)
            return (
              <div key={n.notification_id}
                onClick={() => { if (!n.is_read) markRead(n.notification_id) }}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f8fafc',
                  background: n.is_read ? '#fff' : 'rgba(43,179,155,0.04)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  display: 'flex', gap: 12,
                }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `${meta.accent}20`, color: meta.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <p style={{ fontWeight: n.is_read ? 600 : 800, fontSize: 13, color: '#1e293b' }}>
                      {n.title}
                    </p>
                    <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                      {n.body}
                    </p>
                  )}
                </div>
                {!n.is_read && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: meta.accent, alignSelf: 'center', flexShrink: 0,
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
