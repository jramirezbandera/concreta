import { useState } from 'react'
import { HormigonIcon } from '../components/svg/ModuleIcons'
import Vigas    from '../modules/hormigon/Vigas'
import Pilares  from '../modules/hormigon/Pilares'

const TABS = [
  { id: 'vigas',   label: 'Vigas'   },
  { id: 'pilares', label: 'Pilares' },
]

export default function Hormigon() {
  const [tab, setTab] = useState('vigas')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh' }}>
      {/* ── Module header + tabs ─────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {/* Title row */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '1rem 1.75rem 0.75rem',
          }}
        >
          <HormigonIcon size={16} strokeWidth={1.5} style={{ color: 'var(--accent-dim)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            Hormigón Armado
          </span>
          <span className="badge" style={{ marginLeft: '0.25rem' }}>CE</span>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, padding: '0 1.5rem' }}>
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: active ? 500 : 400,
                  fontFamily: 'var(--font-sans)',
                  color: active ? 'var(--text-1)' : 'var(--text-2)',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: -1,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-1)' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-2)' }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'vigas'   && <Vigas />}
        {tab === 'pilares' && <Pilares />}
      </div>
    </div>
  )
}

