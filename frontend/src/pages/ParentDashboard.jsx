import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout, { P } from '../components/Layout.jsx'
import NewRegistrationModal from '../components/NewRegistrationModal.jsx'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function ageLabel(dob) {
  const diff   = Date.now() - new Date(dob).getTime()
  const years  = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((diff % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  return years > 0 ? `${years}y ${months}m` : `${months} months`
}
function initials(f, l) { return `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase() }
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Registration status metadata ───────────────────────────────────────── */
const STATUS_META = {
  pending:  {
    label:   'Pending Review',
    color:   P.sun,
    bg:      'rgba(251,185,42,0.12)',
    txt:     '#92400e',
    message: 'Your request has been submitted. The director will review it shortly.',
    icon:    '🕐',
  },
  approved: {
    label:   'Approved',
    color:   P.sky,
    bg:      'rgba(130,179,225,0.15)',
    txt:     '#1e3a5f',
    message: 'Great news — your registration was approved! Waiting for classroom assignment.',
    icon:    '✅',
  },
  enrolled: {
    label:   'Enrolled',
    color:   P.grass,
    bg:      'rgba(43,179,155,0.12)',
    txt:     '#0a4a3e',
    message: 'A classroom has been assigned. Your child will be activated very soon.',
    icon:    '🏫',
  },
  rejected: {
    label:   'Not Approved',
    color:   P.crayon,
    bg:      'rgba(235,94,90,0.1)',
    txt:     '#7f1d1d',
    message: 'This registration was not approved.',
    icon:    '✕',
  },
}
const sm = s => STATUS_META[s] ?? STATUS_META.pending

/* ─── Pipeline steps ──────────────────────────────────────────────────────── */
const PIPELINE = ['pending', 'approved', 'enrolled', 'active']

function StatusPipeline({ status }) {
  const currentIdx = PIPELINE.indexOf(status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
      {PIPELINE.map((s, i) => {
        const done    = i < currentIdx
        const current = i === currentIdx
        const meta    = sm(s)
        const dotColor = (done || current) ? meta.color : '#e2e8f0'
        const label    = s === 'active' ? 'Active' : meta.label.split(' ')[0]
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: dotColor,
                boxShadow: current ? `0 0 0 3px ${meta.color}33` : 'none',
              }} />
              <span style={{ fontSize: 9, fontWeight: current ? 800 : 500, color: current ? meta.txt : '#cbd5e1', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? sm(PIPELINE[i]).color : '#e2e8f0', margin: '0 4px', marginBottom: 14 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Hero ────────────────────────────────────────────────────────────────── */
function Hero({ user, activeCount, pendingCount }) {
  const hour   = new Date().getHours()
  const greet  = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  const first  = (user?.fullName ?? user?.full_name ?? 'there').split(' ')[0]

  return (
    <section style={{
      background: `linear-gradient(135deg, #0a2e26 0%, #162844 50%, #1a0f2e 100%)`,
      padding: '64px 24px 48px',
      position: 'relative', overflow: 'hidden',
    }}>
      {[[P.candy, 280, -70, -70], [P.grass, 200, 'auto', -50]].map(([c, s, t, b], i) => (
        <div key={i} style={{
          position: 'absolute', width: s, height: s, borderRadius: '50%',
          background: c, opacity: 0.07,
          top: t !== 'auto' ? t : undefined,
          bottom: b !== 'auto' ? b : undefined,
          right: i === 1 ? -40 : undefined,
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />
      ))}

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Role badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(43,179,155,0.15)', border: `1px solid rgba(43,179,155,0.3)`, borderRadius: 99, padding: '5px 16px', marginBottom: 20 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: P.grass, display: 'inline-block' }} />
          <span style={{ color: P.grass, fontSize: 12, fontWeight: 700 }}>Parent Portal</span>
        </div>

        <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: 8 }}>
          {greet},{' '}
          <span style={{ background: `linear-gradient(90deg,${P.candy},${P.grass})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {first}
          </span>{' '}👋
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, marginBottom: 32 }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(43,179,155,0.2)', borderRadius: 12, padding: '10px 20px', textAlign: 'center', minWidth: 90 }}>
            <div style={{ color: P.grass, fontSize: 24, fontWeight: 900 }}>{activeCount}</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
              {activeCount === 1 ? 'Child Enrolled' : 'Children Enrolled'}
            </div>
          </div>
          {pendingCount > 0 && (
            <div style={{ background: 'rgba(251,185,42,0.2)', borderRadius: 12, padding: '10px 20px', textAlign: 'center', minWidth: 90 }}>
              <div style={{ color: P.sun, fontSize: 24, fontWeight: 900 }}>{pendingCount}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                {pendingCount === 1 ? 'Request Pending' : 'Requests Pending'}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ─── Active / approved / enrolled child card ────────────────────────────── */
function ChildCard({ child }) {
  const status = child.enrollment_status ?? 'active'
  const isActive = status === 'active'
  const color = child.color_tag ?? (isActive ? P.grass : sm(status).color)
  const statusMeta = sm(status)
  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
      transition: 'transform .18s, box-shadow .18s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)' }}>

      <div style={{ height: 6, background: color }} />

      <div style={{ padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${color}30`, border: `2px solid ${color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color, fontSize: 16, flexShrink: 0,
          }}>
            {initials(child.first_name, child.last_name)}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', lineHeight: 1.2 }}>
              {child.first_name} {child.last_name}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {ageLabel(child.date_of_birth)} · {child.gender === 'M' ? 'Male' : child.gender === 'F' ? 'Female' : 'Other'}
            </p>
          </div>
        </div>

        {/* Classroom (when assigned) */}
        {child.classroom_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{child.classroom_name}</span>
          </div>
        )}

        {/* Enrolled since — only when actually enrolled */}
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 10 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Enrolled since</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{fmtDate(child.enrolled_at)}</span>
          </div>
        )}

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isActive ? P.grass : statusMeta.color,
            display: 'inline-block',
            boxShadow: isActive ? `0 0 0 3px rgba(43,179,155,0.2)` : 'none',
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? P.grass : statusMeta.txt }}>
            {isActive ? 'Active' : statusMeta.label}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Registration status card ────────────────────────────────────────────── */
function RegCard({ reg, onAction }) {
  const meta = sm(reg.enrollment_status)
  const [busy, setBusy] = useState(false)
  const canWithdraw = reg.enrollment_status === 'pending'
  const canResubmit = reg.enrollment_status === 'rejected'

  async function act(action) {
    setBusy(true)
    try { await onAction(reg.child_id, action) }
    finally { setBusy(false) }
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
      transition: 'transform .18s, box-shadow .18s',
      opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)' }}>

      <div style={{ height: 6, background: meta.color }} />

      <div style={{ padding: '20px 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: meta.bg, color: meta.txt }}>
            {meta.label}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(reg.created_at)}</span>
        </div>

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${meta.color}20`, border: `2px solid ${meta.color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: meta.color, fontSize: 16, flexShrink: 0,
          }}>
            {initials(reg.first_name, reg.last_name)}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', lineHeight: 1.2 }}>
              {reg.first_name} {reg.last_name}
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {ageLabel(reg.date_of_birth)} · {reg.gender === 'M' ? 'Male' : reg.gender === 'F' ? 'Female' : 'Other'}
            </p>
          </div>
        </div>

        {/* Status message */}
        <div style={{ background: meta.bg, borderRadius: 10, padding: '10px 12px' }}>
          <p style={{ fontSize: 12, color: meta.txt, lineHeight: 1.5 }}>
            {meta.icon} {meta.message}
          </p>
          {reg.rejection_reason && (
            <p style={{ fontSize: 12, color: meta.txt, fontStyle: 'italic', marginTop: 4 }}>
              "{reg.rejection_reason}"
            </p>
          )}
        </div>

        {/* Pipeline (hidden for rejected) */}
        {reg.enrollment_status !== 'rejected' && (
          <StatusPipeline status={reg.enrollment_status} />
        )}

        {/* Parent actions */}
        {canWithdraw && (
          <button
            onClick={() => {
              if (window.confirm('Withdraw this pending request? The director will be notified.')) act('withdraw')
            }}
            style={{
              border: `1px solid ${P.crayon}`, background: 'rgba(235,94,90,0.06)',
              color: P.crayon, borderRadius: 8, padding: '7px 4px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4,
            }}>
            ↩ Withdraw Request
          </button>
        )}
        {canResubmit && (
          <button
            onClick={() => act('resubmit')}
            style={{
              border: 'none', background: `linear-gradient(90deg,${P.sun},${P.grass})`,
              color: '#fff', borderRadius: 8, padding: '8px 4px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 4,
            }}>
            🔁 Resubmit for Review
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Register CTA banner ─────────────────────────────────────────────────── */
function RegisterCTA({ onRegister }) {
  return (
    <section style={{ padding: '0 24px 72px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        border: `2px dashed ${P.grass}60`,
        borderRadius: 24, padding: '40px 32px',
        background: `rgba(43,179,155,0.04)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: P.grass, fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Admissions</p>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', marginBottom: 6 }}>Register another child?</h3>
          <p style={{ fontSize: 14, color: '#64748b', maxWidth: 420 }}>
            Submit a registration request and the director will review, approve, and assign a classroom — you'll see the status update here in real time.
          </p>
        </div>
        <button
          onClick={onRegister}
          style={{
            background: P.grass, color: '#fff', border: 'none',
            borderRadius: 14, padding: '14px 32px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 20px ${P.grass}40`,
            transition: 'transform .15s, box-shadow .15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${P.grass}50` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 20px ${P.grass}40` }}>
          + Register a Child
        </button>
      </div>
    </section>
  )
}

/* ─── Section header (matches ChildrenPage count header) ─────────────────── */
function SectionHeader({ label, title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <div>
        <p style={{ color: P.grass, fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{label}</p>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>{title}</h2>
      </div>
      {action}
    </div>
  )
}

/* ─── Toast ───────────────────────────────────────────────────────────────── */
function Toast({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 999,
      background: '#0a2e26', border: `1px solid ${P.grass}`,
      borderRadius: 14, padding: '14px 22px',
      color: P.grass, fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      ✓ {msg}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function ParentDashboard() {
  const { token, user } = useAuth()

  const [children,  setChildren]  = useState([])
  const [regs,      setRegs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast,     setToast]     = useState('')

  const authHdr = { Authorization: `Bearer ${token}` }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [childRes, regRes] = await Promise.all([
        fetch('/api/children',                    { headers: authHdr }),
        fetch('/api/registrations?status=all',    { headers: authHdr }),
      ])
      const childData = await childRes.json()
      const regData   = await regRes.json()

      if (childData.success) setChildren(childData.children ?? [])
      if (regData.success)   setRegs(regData.registrations ?? [])
    } catch {
      setError('Could not load your data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  function onSaved() {
    loadData()
    setToast('Registration submitted! The director will review it shortly.')
    setTimeout(() => setToast(''), 4000)
  }

  async function handleRegAction(childId, action) {
    try {
      const res = await fetch(`/api/registrations/${childId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHdr },
      })
      const data = await res.json()
      if (data.success) {
        setToast(data.message ?? 'Done.')
        setTimeout(() => setToast(''), 4000)
        await loadData()
      } else {
        setToast(data.message ?? 'Action failed.')
        setTimeout(() => setToast(''), 4000)
      }
    } catch {
      setToast('Network error. Please try again.')
      setTimeout(() => setToast(''), 4000)
    }
  }

  // In-progress registrations (pending / approved / enrolled)
  const inProgress = regs.filter(r => ['pending', 'approved', 'enrolled'].includes(r.enrollment_status))
  // Rejected ones shown separately
  const rejected   = regs.filter(r => r.enrollment_status === 'rejected')

  return (
    <Layout>
      <Hero
        user={user}
        activeCount={children.length}
        pendingCount={inProgress.length}
      />

      <section style={{ padding: '48px 24px 0', maxWidth: 1200, margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p style={{ fontSize: 16 }}>Loading your dashboard…</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ background: 'rgba(235,94,90,0.08)', border: '1px solid rgba(235,94,90,0.3)', borderRadius: 16, padding: '20px 24px', color: P.crayon, fontSize: 15, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── My Children ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: 56 }}>
              <SectionHeader
                label="My Children"
                title={children.length === 0 ? 'No active children yet' : `${children.length} ${children.length === 1 ? 'Child' : 'Children'} Enrolled`}
                action={
                  <button
                    onClick={() => setShowModal(true)}
                    style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    + Register a Child
                  </button>
                }
              />

              {children.length === 0 ? (
                <div style={{ background: '#f8fafc', borderRadius: 20, padding: '40px 32px', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👶</div>
                  <p style={{ fontSize: 16, color: '#334155', fontWeight: 700, marginBottom: 6 }}>No active children yet</p>
                  <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
                    Once a registration is approved and activated by the director, your child will appear here.
                  </p>
                  <button onClick={() => setShowModal(true)}
                    style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    + Register a Child
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                  {children.map(c => <ChildCard key={c.child_id} child={c} />)}
                </div>
              )}
            </div>

            {/* ── In-Progress Registrations ───────────────────────────────── */}
            {inProgress.length > 0 && (
              <div style={{ marginBottom: 56 }}>
                <SectionHeader
                  label="Registration Requests"
                  title={`${inProgress.length} In Progress`}
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                  {inProgress.map(r => <RegCard key={r.child_id} reg={r} onAction={handleRegAction} />)}
                </div>
              </div>
            )}

            {/* ── Rejected (collapsed, less prominent) ────────────────────── */}
            {rejected.length > 0 && (
              <div style={{ marginBottom: 56 }}>
                <SectionHeader label="Past Requests" title={`${rejected.length} Not Approved`} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                  {rejected.map(r => <RegCard key={r.child_id} reg={r} onAction={handleRegAction} />)}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <RegisterCTA onRegister={() => setShowModal(true)} />

      {showModal && (
        <NewRegistrationModal
          token={token}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
        />
      )}

      <Toast msg={toast} />
    </Layout>
  )
}
