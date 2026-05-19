import { useState } from 'react'
import { P } from './Layout.jsx'

/* ─── Shared form styles ──────────────────────────────────────────────────── */
const labelSt  = { fontSize: 13, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }
const inputSt  = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const selectSt = { ...inputSt, background: '#fff' }

/* ─── Modal primitives ────────────────────────────────────────────────────── */
function Overlay({ children, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

function ModalCard({ title, subtitle, onClose, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 24, padding: '36px 36px 28px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
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

function BtnCancel({ onClick }) {
  return (
    <button onClick={onClick}
      style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
      Cancel
    </button>
  )
}

/* ─── 3-step registration wizard ──────────────────────────────────────────── */
export default function NewRegistrationModal({ token, onClose, onSaved }) {
  const [step,    setStep]    = useState(1)
  const [form,    setForm]    = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'Other',
    medicalNotes: '', dietaryNotes: '',
    emergencyContact: '', emergencyPhone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function field(key, val) { setForm(f => ({ ...f, [key]: val })) }

  const step1Valid = form.firstName.trim() && form.lastName.trim() && form.dateOfBirth

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName:        form.firstName.trim(),
          lastName:         form.lastName.trim(),
          dateOfBirth:      form.dateOfBirth,
          gender:           form.gender,
          medicalNotes:     form.medicalNotes     || null,
          dietaryNotes:     form.dietaryNotes     || null,
          emergencyContact: form.emergencyContact || null,
          emergencyPhone:   form.emergencyPhone   || null,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.message ?? 'Failed to submit.'); return }
      onSaved()
      onClose()
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  const STEPS = ['Child Info', 'Health & Diet', 'Family Info']

  return (
    <Overlay onClose={onClose}>
      <ModalCard
        title="Register a Child"
        subtitle="Fields marked * are required. Health and family details are optional."
        onClose={onClose}
      >
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((lbl, i) => {
            const num    = i + 1
            const active = step === num
            const done   = step > num
            return (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                    background: done ? P.grass : active ? P.sun : '#f1f5f9',
                    color:      done ? '#fff'  : active ? '#1a1a2e' : '#94a3b8',
                    border: `2px solid ${done ? P.grass : active ? P.sun : '#e2e8f0'}`,
                  }}>
                    {done ? '✓' : num}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: active ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap' }}>{lbl}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? P.grass : '#e2e8f0', margin: '0 8px', marginBottom: 18, transition: 'background .3s' }} />
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div style={{ background: 'rgba(235,94,90,0.08)', border: '1px solid rgba(235,94,90,0.3)', borderRadius: 10, padding: '10px 14px', color: P.crayon, fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Step 1 — Child Info */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelSt}>First Name *</label>
                <input style={inputSt} value={form.firstName} onChange={e => field('firstName', e.target.value)} placeholder="e.g. Ali" />
              </div>
              <div>
                <label style={labelSt}>Last Name *</label>
                <input style={inputSt} value={form.lastName}  onChange={e => field('lastName',  e.target.value)} placeholder="e.g. Mansour" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelSt}>Date of Birth *</label>
                <input type="date" style={inputSt} value={form.dateOfBirth} onChange={e => field('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label style={labelSt}>Gender</label>
                <select style={selectSt} value={form.gender} onChange={e => field('gender', e.target.value)}>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="Other">Other / Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Health & Diet */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(43,179,155,0.06)', border: '1px solid rgba(43,179,155,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#0a4a3e' }}>
              This information helps staff keep your child safe. Both fields are optional.
            </div>
            <div>
              <label style={labelSt}>Medical Notes</label>
              <textarea
                value={form.medicalNotes} onChange={e => field('medicalNotes', e.target.value)}
                placeholder="Allergies, chronic conditions, regular medication…"
                rows={3} style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={labelSt}>Dietary Notes</label>
              <textarea
                value={form.dietaryNotes} onChange={e => field('dietaryNotes', e.target.value)}
                placeholder="Food restrictions, intolerances, preferences…"
                rows={3} style={{ ...inputSt, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        )}

        {/* Step 3 — Family Info */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(130,179,225,0.1)', border: '1px solid rgba(130,179,225,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e3a5f' }}>
              Provide an emergency contact who can be reached immediately if needed.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelSt}>Emergency Contact Name</label>
                <input style={inputSt} value={form.emergencyContact} onChange={e => field('emergencyContact', e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label style={labelSt}>Emergency Phone</label>
                <input style={inputSt} value={form.emergencyPhone} onChange={e => field('emergencyPhone', e.target.value)} placeholder="+213 550 …" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
          <div>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <BtnCancel onClick={onClose} />
            {step < 3 ? (
              <button
                disabled={step === 1 && !step1Valid}
                onClick={() => setStep(s => s + 1)}
                style={{
                  background: (step === 1 && !step1Valid) ? '#cbd5e1' : P.grass,
                  color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px',
                  fontSize: 14, fontWeight: 700,
                  cursor: (step === 1 && !step1Valid) ? 'not-allowed' : 'pointer',
                }}>
                Next →
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={handleSubmit}
                style={{ background: P.grass, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Submitting…' : 'Submit Registration'}
              </button>
            )}
          </div>
        </div>
      </ModalCard>
    </Overlay>
  )
}
