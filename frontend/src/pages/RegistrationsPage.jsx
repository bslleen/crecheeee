import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout, { P } from '../components/Layout.jsx'
import NewRegistrationModal from '../components/NewRegistrationModal.jsx'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function ageLabel(dob) {
  const diff   = Date.now() - new Date(dob).getTime()
  const years  = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((diff % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  return years > 0 ? `${years}y ${months}m` : `${months}m`
}
function initials(f, l) { return `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase() }
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ─── Status metadata ─────────────────────────────────────────────────────── */
const STATUS_META = {
  pending:  { label: 'Pending Review', color: P.sun,    bg: 'rgba(251,185,42,0.15)',  txt: '#92400e' },
  approved: { label: 'Approved',       color: P.sky,    bg: 'rgba(130,179,225,0.18)', txt: '#1e3a5f' },
  enrolled: { label: 'Enrolled',       color: P.grass,  bg: 'rgba(43,179,155,0.15)',  txt: '#0a4a3e' },
  rejected: { label: 'Rejected',       color: P.crayon, bg: 'rgba(235,94,90,0.12)',   txt: '#7f1d1d' },
}
const sm = s => STATUS_META[s] ?? STATUS_META.pending

/* ─── Shared form styles (match AddChildModal exactly) ───────────────────── */
const labelSt  = { fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }
const inputSt  = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const selectSt = { ...inputSt, background: '#fff' }

/* ─── Page Hero ───────────────────────────────────────────────────────────── */
function PageHero({ summary }) {
  const { pending = 0, approved = 0, enrolled = 0, rejected = 0 } = summary ?? {}
  return (
    <section style={{
      background: `linear-gradient(135deg, #0a2e26 0%, #162844 50%, #1a0f2e 100%)`,
      padding: '52px 24px 40px',
      position: 'relative', overflow: 'hidden',
    }}>
      {[[P.sun,  260, -60, -60], [P.sky, 200, 'auto', -40]].map(([c, s, t, b], i) => (
        <div key={i} style={{
          position: 'absolute', width: s, height: s, borderRadius: '50%',
          background: c, opacity: 0.07,
          top: t !== 'auto' ? t : undefined,
          bottom: b !== 'auto' ? b : undefined,
          right: i === 1 ? -40 : undefined,
          filter: 'blur(36px)', pointerEvents: 'none',
        }} />
      ))}

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: P.sun, fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>
            Module 2 — Admissions
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: 8 }}>
            Child{' '}
            <span style={{ background: `linear-gradient(90deg,${P.sun},${P.grass})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Registrations
            </span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {summary && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Pending Review', value: pending,  bg: 'rgba(251,185,42,0.2)',  color: P.sun    },
              { label: 'Approved',       value: approved, bg: 'rgba(130,179,225,0.2)', color: P.sky    },
              { label: 'Enrolled',       value: enrolled, bg: 'rgba(43,179,155,0.2)',  color: P.grass  },
              { label: 'Rejected',       value: rejected, bg: 'rgba(235,94,90,0.2)',   color: P.crayon },
            ].map(({ label, value, bg, color }) => (
              <div key={label} style={{ background: bg, borderRadius: 12, padding: '10px 20px', textAlign: 'center', minWidth: 90 }}>
                <div style={{ color, fontSize: 24, fontWeight: 900 }}>{value}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ─── Controls bar ────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'in-progress', label: 'In Progress', color: P.grass },
  { key: 'pending',     label: 'Pending',     color: P.sun   },
  { key: 'approved',    label: 'Approved',    color: P.sky   },
  { key: 'enrolled',    label: 'Enrolled',    color: P.grass },
  { key: 'rejected',    label: 'Rejected',    color: P.crayon},
]

function ControlsBar({ activeTab, setActiveTab, search, setSearch, onNew, canNew }) {
  return (
    <section style={{
      background: '#fff', borderBottom: '1px solid #e2e8f0',
      padding: '16px 24px', position: 'sticky', top: 64, zIndex: 50,
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {TABS.map(({ key, label, color }) => {
            const active = activeTab === key
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  border: '1px solid',
                  borderColor: active ? color : '#e2e8f0',
                  background:  active ? color : '#fff',
                  color:       active ? (color === P.sun ? '#1a1a2e' : '#fff') : '#334155',
                  borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                {key !== 'in-progress' && (
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                    background: active ? (color === P.sun ? '#1a1a2e' : '#fff') : color,
                  }} />
                )}
                {label}
              </button>
            )
          })}
        </div>

        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', fontSize: 14, outline: 'none', width: 200 }}
        />

        {canNew && (
          <button onClick={onNew}
            style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            + New Registration
          </button>
        )}
      </div>
    </section>
  )
}

/* ─── Registration card (mirrors ChildCard structure exactly) ─────────────── */
function RegistrationCard({ reg, onAction, isDirector, classrooms }) {
  const meta = sm(reg.enrollment_status)
  const [showReject, setShowReject] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [busy,       setBusy]       = useState(false)

  async function act(action, body = {}) {
    setBusy(true)
    try { await onAction(reg.child_id, action, body) }
    finally { setBusy(false) }
  }

  return (
    <>
      <div style={{
        background: '#fff', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        transition: 'transform .18s, box-shadow .18s', cursor: 'default',
        display: 'flex', flexDirection: 'column',
        opacity: busy ? 0.7 : 1,
        pointerEvents: busy ? 'none' : 'auto',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)' }}>

        {/* Status colour band — top strip (same as ChildCard classroom band) */}
        <div style={{ height: 6, background: meta.color }} />

        <div style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Status badge + submitted date */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: meta.bg, color: meta.txt,
            }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(reg.created_at)}</span>
          </div>

          {/* Avatar + name row (mirrors ChildCard) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `${meta.color}30`, border: `2px solid ${meta.color}`,
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

          {/* Info chips (mirrors ChildCard classroom badge) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {reg.classroom_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: reg.color_tag ?? P.grass, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{reg.classroom_name}</span>
              </div>
            )}
            {reg.emergency_contact && (
              <p style={{ fontSize: 13, color: '#475569' }}>
                📞 {reg.emergency_contact}
              </p>
            )}
            {reg.parents?.length > 0 && (
              <p style={{ fontSize: 13, color: '#475569' }}>
                👤 {reg.parents[0].full_name}{reg.parents.length > 1 ? ` +${reg.parents.length - 1}` : ''}
              </p>
            )}
            {(reg.medical_notes || reg.dietary_notes) && (
              <span title={reg.medical_notes || reg.dietary_notes}
                style={{ alignSelf: 'flex-start', fontSize: 11, background: '#fef9ec', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontWeight: 600, border: '1px solid #fde68a', cursor: 'help' }}>
                ⚕ Health notes
              </span>
            )}
            {reg.rejection_reason && (
              <p style={{ fontSize: 12, color: P.crayon, fontStyle: 'italic' }}>
                "{reg.rejection_reason}"
              </p>
            )}
          </div>

          {/* Action buttons (Director only) — same grid layout as attendance buttons */}
          {isDirector && reg.enrollment_status !== 'rejected' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {reg.enrollment_status === 'pending' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button onClick={() => act('approve')}
                    style={{ border: `1px solid ${P.grass}`, background: '#f0fdf9', color: P.grass, borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✓ Approve
                  </button>
                  <button onClick={() => setShowReject(true)}
                    style={{ border: `1px solid ${P.crayon}`, background: 'rgba(235,94,90,0.06)', color: P.crayon, borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✕ Reject
                  </button>
                </div>
              )}
              {reg.enrollment_status === 'approved' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button onClick={() => setShowEnroll(true)}
                    style={{ border: `1px solid ${P.sky}`, background: 'rgba(130,179,225,0.1)', color: '#1e3a5f', borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    🏫 Assign Class
                  </button>
                  <button onClick={() => setShowReject(true)}
                    style={{ border: `1px solid ${P.crayon}`, background: 'rgba(235,94,90,0.06)', color: P.crayon, borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    ✕ Reject
                  </button>
                </div>
              )}
              {reg.enrollment_status === 'enrolled' && (
                <button onClick={() => act('activate')}
                  style={{ border: 'none', background: `linear-gradient(90deg,${P.grass},${P.sky})`, color: '#fff', borderRadius: 8, padding: '9px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  ⚡ Activate Child
                </button>
              )}
              <button onClick={() => setShowDetail(true)}
                style={{ border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                View Details
              </button>
            </div>
          )}

          {!isDirector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {reg.enrollment_status === 'pending' && (
                <button
                  onClick={() => {
                    if (window.confirm('Withdraw this pending request? The director will be notified.')) {
                      act('withdraw')
                    }
                  }}
                  style={{ border: `1px solid ${P.crayon}`, background: 'rgba(235,94,90,0.06)', color: P.crayon, borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  ↩ Withdraw Request
                </button>
              )}
              {reg.enrollment_status === 'rejected' && (
                <button
                  onClick={() => act('resubmit')}
                  style={{ border: 'none', background: `linear-gradient(90deg,${P.sun},${P.grass})`, color: '#fff', borderRadius: 8, padding: '8px 4px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  🔁 Resubmit for Review
                </button>
              )}
              <button onClick={() => setShowDetail(true)}
                style={{ border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', borderRadius: 8, padding: '7px 4px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                View Details
              </button>
            </div>
          )}
        </div>
      </div>

      {showReject && (
        <RejectModal
          childId={reg.child_id}
          name={`${reg.first_name} ${reg.last_name}`}
          onClose={() => setShowReject(false)}
          onDone={(_id, reason) => { act('reject', { reason }); setShowReject(false) }}
        />
      )}
      {showEnroll && (
        <EnrollModal
          childId={reg.child_id}
          name={`${reg.first_name} ${reg.last_name}`}
          classrooms={classrooms}
          onClose={() => setShowEnroll(false)}
          onDone={(_id, cid) => { act('enroll', { classroomId: cid }); setShowEnroll(false) }}
        />
      )}
      {showDetail && <DetailModal reg={reg} onClose={() => setShowDetail(false)} />}
    </>
  )
}

/* ─── Reject modal ────────────────────────────────────────────────────────── */
function RejectModal({ childId, name, onClose, onDone }) {
  const [reason, setReason] = useState('')
  return (
    <ModalOverlay onClose={onClose}>
      <ModalCard title="Reject Registration" subtitle={`Rejecting: ${name}`} onClose={onClose} maxWidth={460}>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Optionally provide a reason — it will be stored on the record.
        </p>
        <label style={labelSt}>Rejection Reason (optional)</label>
        <textarea
          value={reason} onChange={e => setReason(e.target.value)}
          placeholder="e.g. Age group not available, documents missing…"
          rows={3}
          style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <BtnCancel onClick={onClose} />
          <button onClick={() => onDone(childId, reason.trim() || null)}
            style={{ background: P.crayon, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Confirm Reject
          </button>
        </div>
      </ModalCard>
    </ModalOverlay>
  )
}

/* ─── Enroll (assign classroom) modal ────────────────────────────────────── */
function EnrollModal({ childId, name, classrooms, onClose, onDone }) {
  const [classroomId, setClassroomId] = useState('')
  const available = classrooms.filter(c => Number(c.enrolled_count ?? 0) < Number(c.max_capacity ?? 10))

  return (
    <ModalOverlay onClose={onClose}>
      <ModalCard title="Assign to Classroom" subtitle={`Enrolling: ${name}`} onClose={onClose} maxWidth={480}>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Select a classroom with available capacity to complete enrollment.
        </p>
        <label style={labelSt}>Classroom *</label>
        <select style={selectSt} value={classroomId} onChange={e => setClassroomId(e.target.value)}>
          <option value="">— Select classroom —</option>
          {available.map(cl => (
            <option key={cl.classroom_id} value={cl.classroom_id}>
              {cl.name} ({cl.enrolled_count ?? 0} / {cl.max_capacity} enrolled)
            </option>
          ))}
        </select>
        {available.length === 0 && (
          <p style={{ fontSize: 13, color: P.crayon, marginTop: 8 }}>All classrooms are at full capacity.</p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
          <BtnCancel onClick={onClose} />
          <button
            disabled={!classroomId}
            onClick={() => onDone(childId, Number(classroomId))}
            style={{ background: classroomId ? P.grass : '#cbd5e1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: classroomId ? 'pointer' : 'not-allowed' }}>
            Confirm Enrollment
          </button>
        </div>
      </ModalCard>
    </ModalOverlay>
  )
}

/* ─── Detail modal ────────────────────────────────────────────────────────── */
function DetailModal({ reg, onClose }) {
  const meta = sm(reg.enrollment_status)
  function Row({ lbl, val }) {
    if (!val) return null
    return (
      <div style={{ display: 'flex', gap: 12, fontSize: 14, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ color: '#94a3b8', minWidth: 150, flexShrink: 0, fontSize: 13 }}>{lbl}</span>
        <span style={{ color: '#1e293b', fontWeight: 500 }}>{val}</span>
      </div>
    )
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalCard title={`${reg.first_name} ${reg.last_name}`} subtitle="Full Registration Detail" onClose={onClose} maxWidth={580}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: meta.bg, color: meta.txt }}>
            {meta.label}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
          <p style={{ color: P.grass, fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Child Information</p>
          <Row lbl="Full Name"     val={`${reg.first_name} ${reg.last_name}`} />
          <Row lbl="Date of Birth" val={`${fmtDate(reg.date_of_birth)} (${ageLabel(reg.date_of_birth)})`} />
          <Row lbl="Gender"        val={reg.gender === 'M' ? 'Male' : reg.gender === 'F' ? 'Female' : 'Other'} />
          <Row lbl="Registered On" val={fmtDate(reg.created_at)} />
          <Row lbl="Classroom"     val={reg.classroom_name} />
        </div>

        {(reg.medical_notes || reg.dietary_notes) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
            <p style={{ color: P.sky, fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Health & Dietary</p>
            <Row lbl="Medical Notes"  val={reg.medical_notes} />
            <Row lbl="Dietary Notes"  val={reg.dietary_notes} />
          </div>
        )}

        {(reg.emergency_contact || reg.emergency_phone) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
            <p style={{ color: P.sun, fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Emergency Contact</p>
            <Row lbl="Contact Name" val={reg.emergency_contact} />
            <Row lbl="Phone"        val={reg.emergency_phone} />
          </div>
        )}

        {reg.parents?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
            <p style={{ color: P.candy, fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Linked Guardians</p>
            {reg.parents.map(p => (
              <Row key={p.user_id} lbl={p.relationship} val={`${p.full_name} · ${p.email}`} />
            ))}
          </div>
        )}

        {reg.rejection_reason && (
          <div style={{ background: 'rgba(235,94,90,0.08)', border: '1px solid rgba(235,94,90,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: P.crayon, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Rejection Reason</p>
            <p style={{ fontSize: 14, color: P.crayon, fontStyle: 'italic' }}>"{reg.rejection_reason}"</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <BtnCancel onClick={onClose}>Close</BtnCancel>
        </div>
      </ModalCard>
    </ModalOverlay>
  )
}

/* ─── Shared modal primitives (match AddChildModal exactly) ───────────────── */
function ModalOverlay({ children, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

function ModalCard({ title, subtitle, onClose, maxWidth = 540, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 24, padding: '36px 36px 28px', width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{subtitle}</p>}
        </div>
        <button onClick={onClose}
          style={{ border: 'none', background: '#f1f5f9', borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ×
        </button>
      </div>
      {children}
    </div>
  )
}

function BtnCancel({ onClick, children = 'Cancel' }) {
  return (
    <button onClick={onClick}
      style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ activeTab, canNew, onNew }) {
  const msgs = {
    'in-progress': 'No active registrations in the pipeline.',
    pending:  'No registrations are pending review.',
    approved: 'No approved registrations waiting for enrollment.',
    enrolled: 'No children waiting to be activated.',
    rejected: 'No rejected registrations.',
  }
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
        {msgs[activeTab] ?? 'No registrations found.'}
      </h3>
      <p style={{ fontSize: 15, maxWidth: 360, margin: '0 auto 24px' }}>
        Submit a registration to begin the admissions workflow.
      </p>
      {canNew && (
        <button onClick={onNew}
          style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + New Registration
        </button>
      )}
    </div>
  )
}

/* ─── Toast notification ──────────────────────────────────────────────────── */
function Toast({ msg, ok }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 999,
      background: ok ? '#0a2e26' : '#3b0a0a',
      border: `1px solid ${ok ? P.grass : P.crayon}`,
      borderRadius: 14, padding: '14px 22px',
      color: ok ? P.grass : P.crayon,
      fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span>{ok ? '✓' : '✕'}</span>
      {msg}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function RegistrationsPage() {
  const { token, user } = useAuth()
  const role       = user?.role ?? ''
  const isDirector = role === 'Director'
  const canNew     = isDirector || role === 'Parent'

  const [registrations, setRegistrations] = useState([])
  const [classrooms,    setClassrooms]    = useState([])
  const [summary,       setSummary]       = useState(null)
  const [activeTab,     setActiveTab]     = useState('in-progress')
  const [search,        setSearch]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [showNew,       setShowNew]       = useState(false)
  const [toast,         setToast]         = useState({ msg: '', ok: true })

  const authHdr = { Authorization: `Bearer ${token}` }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast({ msg: '', ok: true }), 3000)
  }

  /* ── Load data ── */
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [regRes, clsRes] = await Promise.all([
        fetch(`/api/registrations?status=${activeTab}`, { headers: authHdr }),
        isDirector ? fetch('/api/classrooms', { headers: authHdr }) : Promise.resolve(null),
      ])
      const regData = await regRes.json()
      if (regData.success) {
        setRegistrations(regData.registrations ?? [])
        setSummary(regData.summary)
      } else {
        setError(regData.message ?? 'Failed to load registrations.')
      }
      if (clsRes) {
        const clsData = await clsRes.json()
        if (clsData.success) setClassrooms(clsData.classrooms ?? [])
      }
    } catch {
      setError('Could not load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [token, activeTab, isDirector])

  useEffect(() => { loadData() }, [loadData])

  /* ── Handle status transitions ── */
  async function handleAction(childId, action, body = {}) {
    try {
      const res  = await fetch(`/api/registrations/${childId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHdr },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message ?? 'Done.')
        await loadData()
      } else {
        showToast(data.message ?? `Action failed.`, false)
      }
    } catch {
      showToast('Network error.', false)
    }
  }

  /* ── Filtered list ── */
  const visible = registrations.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q)  ||
      (r.classroom_name ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <Layout>
      <PageHero summary={summary} />

      <ControlsBar
        activeTab={activeTab} setActiveTab={setActiveTab}
        search={search} setSearch={setSearch}
        onNew={() => setShowNew(true)} canNew={canNew}
      />

      <section style={{ padding: '40px 24px 72px', maxWidth: 1200, margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p style={{ fontSize: 16 }}>Loading registrations…</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ background: 'rgba(235,94,90,0.08)', border: '1px solid rgba(235,94,90,0.3)', borderRadius: 16, padding: '20px 24px', color: P.crayon, fontSize: 15, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState activeTab={activeTab} canNew={canNew} onNew={() => setShowNew(true)} />
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <p style={{ color: P.grass, fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                  {TABS.find(t => t.key === activeTab)?.label ?? 'All'}
                </p>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>
                  {visible.length} {visible.length === 1 ? 'Registration' : 'Registrations'}
                </h2>
              </div>
              {canNew && (
                <button onClick={() => setShowNew(true)}
                  style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  + New Registration
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {visible.map(reg => (
                <RegistrationCard
                  key={reg.child_id}
                  reg={reg}
                  onAction={handleAction}
                  isDirector={isDirector}
                  classrooms={classrooms}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {showNew && (
        <NewRegistrationModal
          token={token}
          onClose={() => setShowNew(false)}
          onSaved={loadData}
        />
      )}

      <Toast msg={toast.msg} ok={toast.ok} />
    </Layout>
  )
}
