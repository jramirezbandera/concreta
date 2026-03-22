import { useState } from 'react'
import { CimentacionesIcon } from '../components/svg/ModuleIcons'
import Zapatas      from '../modules/cimentaciones/Zapatas'
import Losa         from '../modules/cimentaciones/Losa'
import MurosHormigon from '../modules/cimentaciones/MurosHormigon'

const TABS = [
  { id: 'zapatas', label: 'Zapatas aisladas' },
  { id: 'losa',    label: 'Losa de cimentación' },
  { id: 'muros',   label: 'Muros de hormigón' },
]

export default function Cimentaciones() {
  const [tab, setTab] = useState('zapatas')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh' }}>
      {/* Header + tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '1rem 1.75rem 0.75rem' }}>
          <CimentacionesIcon size={16} strokeWidth={1.5} style={{ color: 'var(--accent-dim)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            Cimentaciones
          </span>
          <span className="badge" style={{ marginLeft: '0.25rem' }}>CTE SE-C</span>
        </div>

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

      {/* Contenido */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'zapatas' && <Zapatas />}
        {tab === 'losa'    && <Losa />}
        {tab === 'muros'   && <MurosHormigon />}
      </div>
    </div>
  )
}
