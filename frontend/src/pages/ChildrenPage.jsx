import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import Layout, { P } from '../components/Layout.jsx'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function ageLabel(dob) {
  const diff = Date.now() - new Date(dob).getTime()
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  const months = Math.floor((diff % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000))
  return years > 0 ? `${years}y ${months}m` : `${months} months`
}

function initials(first, last) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

const STATUS_META = {
  present: { label: 'Present', bg: 'rgba(43,179,155,0.15)', color: P.grass, dot: P.grass },
  absent:  { label: 'Absent',  bg: 'rgba(235,94,90,0.15)',  color: P.crayon, dot: P.crayon },
  late:    { label: 'Late',    bg: 'rgba(251,185,42,0.15)', color: '#92400e', dot: P.sun },
  excused: { label: 'Excused', bg: 'rgba(130,179,225,0.2)', color: '#1e3a5f', dot: P.sky },
  null:    { label: 'Not marked', bg: '#f1f5f9',            color: '#64748b', dot: '#cbd5e1' },
}
function statusMeta(s) { return STATUS_META[s] ?? STATUS_META.null }

/* ─── Hero (compact) ──────────────────────────────────────────────────────── */
function PageHero({ summary, role }) {
  const { present = 0, absent = 0, late = 0, excused = 0, unmarked = 0, total = 0 } = summary ?? {}
  return (
    <section style={{
      background: `linear-gradient(135deg, #0a2e26 0%, #162844 50%, #1a0f2e 100%)`,
      padding: '52px 24px 40px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* decorative blobs */}
      {[[P.grass, 260, -60, -60], [P.sky, 200, 'auto', -40]].map(([c, s, t, b], i) => (
        <div key={i} style={{ position: 'absolute', width: s, height: s, borderRadius: '50%', background: c, opacity: 0.07, top: t !== 'auto' ? t : undefined, bottom: b !== 'auto' ? b : undefined, right: i === 1 ? -40 : undefined, filter: 'blur(36px)', pointerEvents: 'none' }} />
      ))}
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ color: P.grass, fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Module 2</p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, marginBottom: 8 }}>
            Children &amp; <span style={{ background: `linear-gradient(90deg,${P.grass},${P.sky})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Attendance</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 16 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Stats strip — only shown when role can see today's summary */}
        {summary && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Enrolled', value: total,    bg: 'rgba(255,255,255,0.08)', color: '#e2e8f0' },
              { label: 'Present',        value: present,  bg: 'rgba(43,179,155,0.2)',   color: P.grass   },
              { label: 'Absent',         value: absent,   bg: 'rgba(235,94,90,0.2)',    color: P.crayon  },
              { label: 'Late',           value: late,     bg: 'rgba(251,185,42,0.2)',   color: P.sun     },
              { label: 'Excused',        value: excused,  bg: 'rgba(130,179,225,0.2)', color: P.sky     },
              { label: 'Not Marked',     value: unmarked, bg: 'rgba(255,255,255,0.06)', color: '#64748b' },
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
function ControlsBar({ classrooms, activeClassroom, setActiveClassroom, search, setSearch, onAddChild, canAdd }) {
  return (
    <section style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', position: 'sticky', top: 64, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

        {/* Classroom filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <button onClick={() => setActiveClassroom(null)}
            style={{
              border: '1px solid',
              borderColor: activeClassroom === null ? P.grass : '#e2e8f0',
              background: activeClassroom === null ? P.grass : '#fff',
              color: activeClassroom === null ? '#fff' : '#334155',
              borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
            All Classes
          </button>
          {classrooms.map(cl => (
            <button key={cl.classroom_id} onClick={() => setActiveClassroom(cl.classroom_id)}
              style={{
                border: '1px solid',
                borderColor: activeClassroom === cl.classroom_id ? cl.color_tag : '#e2e8f0',
                background: activeClassroom === cl.classroom_id ? cl.color_tag : '#fff',
                color: activeClassroom === cl.classroom_id ? '#fff' : '#334155',
                borderRadius: 99, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeClassroom === cl.classroom_id ? '#fff' : cl.color_tag, display: 'inline-block' }} />
              {cl.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px', fontSize: 14, outline: 'none', width: 200 }}
        />

        {/* Add child button */}
        {canAdd && (
          <button onClick={onAddChild}
            style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            + Enrol Child
          </button>
        )}
      </div>
    </section>
  )
}

/* ─── Child card ──────────────────────────────────────────────────────────── */
function ChildCard({ child, onMark, canMark, markingId }) {
  const sm = statusMeta(child.status)
  const classColor = child.color_tag ?? '#e2e8f0'
  const isBusy = markingId === child.child_id

  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
      transition: 'transform .18s, box-shadow .18s', cursor: 'default',
      display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)' }}>

      {/* Classroom color band */}
      <div style={{ height: 6, background: classColor }} />

      <div style={{ padding: '20px 20px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `${classColor}30`, border: `2px solid ${classColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: classColor, fontSize: 16, flexShrink: 0 }}>
            {initials(child.first_name, child.last_name)}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', lineHeight: 1.2 }}>{child.first_name} {child.last_name}</p>
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{ageLabel(child.date_of_birth)}</p>
          </div>
        </div>

        {/* Classroom badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: classColor, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{child.classroom_name ?? '—'}</span>
          {child.dietary_notes && (
            <span title={child.dietary_notes} style={{ marginLeft: 'auto', fontSize: 11, background: '#fef9ec', color: '#92400e', padding: '2px 8px', borderRadius: 99, fontWeight: 600, border: '1px solid #fde68a', cursor: 'help' }}>⚠ Diet</span>
          )}
        </div>

        {/* Today's attendance badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sm.dot, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: sm.bg, color: sm.color }}>{sm.label}</span>
          {child.check_in_time && (
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>in {child.check_in_time.slice(0,5)}</span>
          )}
        </div>

        {/* Attendance action buttons — Educator / Director only */}
        {canMark && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
            {[
              { s: 'present', label: '✓ Present', active: P.grass,  txt: '#fff'   },
              { s: 'absent',  label: '✕ Absent',  active: P.crayon, txt: '#fff'   },
              { s: 'late',    label: '⏱ Late',    active: P.sun,    txt: '#1a1a2e' },
              { s: 'excused', label: '✉ Excused', active: P.sky,    txt: '#fff'   },
            ].map(({ s, label, active, txt }) => {
              const isActive = child.status === s
              return (
                <button key={s}
                  disabled={isBusy}
                  onClick={() => onMark(child.child_id, s)}
                  style={{
                    border: `1px solid ${isActive ? active : '#e2e8f0'}`,
                    background: isActive ? active : '#f8fafc',
                    color: isActive ? txt : '#64748b',
                    borderRadius: 8, padding: '6px 4px', fontSize: 12, fontWeight: 700,
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    opacity: isBusy ? 0.6 : 1,
                    transition: 'all .15s',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Add-child modal ─────────────────────────────────────────────────────── */
function AddChildModal({ classrooms, token, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'Other',
    classroomId: '', dietaryNotes: '', medicalNotes: '',
    emergencyContact: '', emergencyPhone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function field(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.dateOfBirth) {
      setError('First name, last name, and date of birth are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName: form.firstName, lastName: form.lastName,
          dateOfBirth: form.dateOfBirth, gender: form.gender,
          classroomId: form.classroomId ? Number(form.classroomId) : null,
          dietaryNotes: form.dietaryNotes || null,
          medicalNotes: form.medicalNotes || null,
          emergencyContact: form.emergencyContact || null,
          emergencyPhone: form.emergencyPhone || null,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message ?? 'Failed to enrol child.'); return }
      onSaved()
      onClose()
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle  = { fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }
  const inputStyle  = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
  const selectStyle = { ...inputStyle, background: '#fff' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 36px 28px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>Enrol a New Child</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Fill in the details below. Fields marked * are required.</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 10, width: 36, height: 36, fontSize: 18, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(235,94,90,0.08)', border: '1px solid rgba(235,94,90,0.3)', borderRadius: 10, padding: '10px 14px', color: P.crayon, fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} value={form.firstName} onChange={e => field('firstName', e.target.value)} placeholder="Lena" required />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} value={form.lastName} onChange={e => field('lastName', e.target.value)} placeholder="Farah" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Date of Birth *</label>
              <input type="date" style={inputStyle} value={form.dateOfBirth} onChange={e => field('dateOfBirth', e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <select style={selectStyle} value={form.gender} onChange={e => field('gender', e.target.value)}>
                <option value="F">Female</option>
                <option value="M">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Classroom</label>
            <select style={selectStyle} value={form.classroomId} onChange={e => field('classroomId', e.target.value)}>
              <option value="">— Select classroom —</option>
              {classrooms.map(cl => (
                <option key={cl.classroom_id} value={cl.classroom_id}>{cl.name} ({cl.enrolled_count ?? 0}/{cl.max_capacity})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Dietary Notes</label>
            <input style={inputStyle} value={form.dietaryNotes} onChange={e => field('dietaryNotes', e.target.value)} placeholder="e.g. Nut allergy, lactose intolerant…" />
          </div>

          <div>
            <label style={labelStyle}>Medical Notes</label>
            <input style={inputStyle} value={form.medicalNotes} onChange={e => field('medicalNotes', e.target.value)} placeholder="e.g. Asthma, medication…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Emergency Contact</label>
              <input style={inputStyle} value={form.emergencyContact} onChange={e => field('emergencyContact', e.target.value)} placeholder="Parent / Guardian name" />
            </div>
            <div>
              <label style={labelStyle}>Emergency Phone</label>
              <input style={inputStyle} value={form.emergencyPhone} onChange={e => field('emergencyPhone', e.target.value)} placeholder="+213 550 …" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Saving…' : 'Enrol Child'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ search, canAdd, onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>👧</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#334155', marginBottom: 8 }}>
        {search ? 'No children match your search' : 'No children found'}
      </h3>
      <p style={{ fontSize: 15, maxWidth: 360, margin: '0 auto 24px' }}>
        {search ? `Try a different name or clear the filter.` : `No children are enrolled in this classroom yet.`}
      </p>
      {!search && canAdd && (
        <button onClick={onAdd} style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + Enrol First Child
        </button>
      )}
    </div>
  )
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function ChildrenPage() {
  const { token, user } = useAuth()
  const role = user?.role ?? ''

  const canMark = role === 'Director' || role === 'Educator'
  const canAdd  = role === 'Director' || role === 'Educator'

  const [children,       setChildren]       = useState([])
  const [classrooms,     setClassrooms]     = useState([])
  const [summary,        setSummary]        = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [activeClassroom, setActiveClassroom] = useState(null)
  const [search,         setSearch]         = useState('')
  const [markingId,      setMarkingId]      = useState(null)
  const [showModal,      setShowModal]      = useState(false)

  const authHeader = { Authorization: `Bearer ${token}` }

  /* ── Fetch attendance + classrooms ── */
  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (canMark) {
        // Director / Educator — use attendance/today which bundles everything
        const [attRes, clsRes] = await Promise.all([
          fetch('/api/attendance/today', { headers: authHeader }),
          fetch('/api/classrooms',       { headers: authHeader }),
        ])
        const attData = await attRes.json()
        const clsData = await clsRes.json()

        if (attData.success) {
          const kids = attData.children ?? []
          setChildren(kids)
          setSummary(attData.summary)

          // For educators: only show the chips for classrooms present in their data.
          // For directors: show all classrooms from the full list.
          if (clsData.success) {
            if (role === 'Director') {
              setClassrooms(clsData.classrooms ?? [])
            } else {
              // Build the chip list from the unique classrooms the educator's children belong to
              const seen = new Map()
              for (const c of kids) {
                if (c.classroom_id && !seen.has(c.classroom_id)) {
                  seen.set(c.classroom_id, { classroom_id: c.classroom_id, name: c.classroom_name, color_tag: c.color_tag })
                }
              }
              setClassrooms([...seen.values()])
            }
          }
        }
      } else {
        // Parent — fetch their linked children list
        const res  = await fetch('/api/children', { headers: authHeader })
        const data = await res.json()
        if (data.success) setChildren(data.children ?? [])
      }
    } catch {
      setError('Could not load data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [token, canMark])

  useEffect(() => { loadData() }, [loadData])

  /* ── Mark attendance ── */
  async function markAttendance(childId, status) {
    setMarkingId(childId)
    try {
      const res  = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ childId, status }),
      })
      const data = await res.json()
      if (data.success) {
        // Optimistic update — avoid a full reload
        setChildren(prev => prev.map(c =>
          c.child_id === childId ? { ...c, status } : c
        ))
        setSummary(prev => {
          if (!prev) return prev
          const oldStatus = children.find(c => c.child_id === childId)?.status ?? null
          const next = { ...prev }
          if (oldStatus && next[oldStatus] !== undefined) next[oldStatus]--
          else if (!oldStatus && next.unmarked > 0) next.unmarked--
          next[status] = (next[status] ?? 0) + 1
          return next
        })
      }
    } finally {
      setMarkingId(null)
    }
  }

  /* ── Filtered list ── */
  const visible = children.filter(c => {
    const matchClass = activeClassroom === null || c.classroom_id === activeClassroom
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      (c.classroom_name ?? '').toLowerCase().includes(q)
    return matchClass && matchSearch
  })

  return (
    <Layout>
      <PageHero summary={canMark ? summary : null} role={role} />

      {canMark && (
        <ControlsBar
          classrooms={classrooms}
          activeClassroom={activeClassroom}
          setActiveClassroom={setActiveClassroom}
          search={search}
          setSearch={setSearch}
          onAddChild={() => setShowModal(true)}
          canAdd={canAdd}
        />
      )}

      <section style={{ padding: '40px 24px 72px', maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p style={{ fontSize: 16 }}>Loading children…</p>
          </div>
        )}

        {!loading && error && (
          <div style={{ background: 'rgba(235,94,90,0.08)', border: '1px solid rgba(235,94,90,0.3)', borderRadius: 16, padding: '20px 24px', color: P.crayon, fontSize: 15, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState search={search} canAdd={canAdd} onAdd={() => setShowModal(true)} />
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <p style={{ color: P.grass, fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                  {activeClassroom ? classrooms.find(c => c.classroom_id === activeClassroom)?.name : 'All Classrooms'}
                </p>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>
                  {visible.length} {visible.length === 1 ? 'Child' : 'Children'}
                </h2>
              </div>
              {canAdd && (
                <button onClick={() => setShowModal(true)}
                  style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  + Enrol Child
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {visible.map(child => (
                <ChildCard
                  key={child.child_id}
                  child={child}
                  onMark={markAttendance}
                  canMark={canMark}
                  markingId={markingId}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {showModal && (
        <AddChildModal
          classrooms={classrooms}
          token={token}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}
    </Layout>
  )
}
