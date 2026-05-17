import { useNavigate, useLocation } from 'react-router-dom'
import Layout, { P } from '../components/Layout.jsx'

const MODULE_META = {
  '/schedule': {
    icon: '📅',
    color: P.sky,
    title: 'Schedule & Events',
    subtitle: 'Module 3',
    description: 'Class timetables, daily schedules, recurring events, parent notifications, and holiday calendar — all in one place.',
    features: ['Weekly class timetables', 'Event & activity planner', 'Holiday & closure calendar', 'Automated parent notifications'],
  },
  '/transport': {
    icon: '🚌',
    color: P.sun,
    title: 'Transport Management',
    subtitle: 'Module 4',
    description: 'Live bus route tracking, driver assignments, pick-up & drop-off confirmations, and route optimisation for every enrolled child.',
    features: ['Live GPS route tracking', 'Driver & vehicle management', 'Pick-up / drop-off logs', 'Route optimisation'],
  },
  '/catering': {
    icon: '🍽️',
    color: P.candy,
    title: 'Catering & Meals',
    subtitle: 'Module 5',
    description: 'Weekly menu planning, allergen management, meal counts synced with attendance, and supplier order tracking.',
    features: ['Weekly menu builder', 'Allergen & dietary flags', 'Meal count from attendance', 'Supplier order tracking'],
  },
}

const DEFAULT_META = {
  icon: '🚧',
  color: P.grass,
  title: 'Coming Soon',
  subtitle: 'Module',
  description: 'This module is currently under development.',
  features: [],
}

export default function ComingSoonPage() {
  const navigate  = useNavigate()
  const { pathname } = useLocation()
  const meta = MODULE_META[pathname] ?? DEFAULT_META
  const accent = meta.color

  return (
    <Layout>
      {/* Hero */}
      <section style={{
        background: `linear-gradient(135deg, #0a2e26 0%, #162844 50%, #1a0f2e 100%)`,
        padding: '80px 24px 72px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: accent, opacity: 0.07, top: -80, right: -60, filter: 'blur(48px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: P.grass, opacity: 0.06, bottom: -40, left: '30%', filter: 'blur(36px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${accent}20`, border: `1px solid ${accent}50`, borderRadius: 99, padding: '6px 18px', marginBottom: 28 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block' }} />
            <span style={{ color: accent, fontSize: 13, fontWeight: 700 }}>{meta.subtitle} — Under Development</span>
          </div>

          {/* Icon */}
          <div style={{ fontSize: 72, marginBottom: 24, lineHeight: 1 }}>{meta.icon}</div>

          {/* Title */}
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: 20 }}>
            {meta.title} <br />
            <span style={{ background: `linear-gradient(90deg, ${accent}, ${P.sky})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              is Coming Soon
            </span>
          </h1>

          <p style={{ color: '#94a3b8', fontSize: 17, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 36px' }}>
            {meta.description}
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: accent, color: accent === P.sun ? '#1a1a2e' : '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              ← Back to Dashboard
            </button>
            <button onClick={() => navigate('/children')}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              View Children
            </button>
          </div>
        </div>
      </section>

      {/* Colored band */}
      <div style={{ background: accent, height: 6 }} />

      {/* Features preview */}
      {meta.features.length > 0 && (
        <section style={{ padding: '72px 24px', background: '#fff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: accent, fontWeight: 700, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>What's planned</p>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', marginBottom: 12 }}>Features in this module</h2>
              <p style={{ color: '#64748b', maxWidth: 480, margin: '0 auto' }}>Here's a preview of what will be available once this module ships.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
              {meta.features.map((feat, i) => (
                <div key={feat} style={{
                  background: '#f8fafc', borderRadius: 20, padding: '28px 24px',
                  border: `1px solid ${accent}30`,
                  borderTop: `4px solid ${accent}`,
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {['📋', '🗓️', '🔔', '📦'][i] ?? '✦'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>{feat}</p>
                    <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Planned for this module</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dark progress banner */}
      <section style={{ background: `linear-gradient(120deg, #0f172a 0%, #1e293b 100%)`, padding: '56px 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: accent, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Development Progress</p>
          <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 24 }}>Module 2 (Children &amp; Attendance) is live — this one is next.</h3>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ width: '15%', height: '100%', background: `linear-gradient(90deg, ${accent}, ${P.grass})`, borderRadius: 99, transition: 'width 1s' }} />
          </div>
          <p style={{ color: '#64748b', fontSize: 13 }}>15% complete · Design phase</p>
        </div>
      </section>
    </Layout>
  )
}
