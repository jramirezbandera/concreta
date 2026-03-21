import { useState, useEffect } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { Building2, Wrench, Layers, ChevronLeft } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Building2, label: 'Hormigón Armado', sub: 'EHE-08 / CE',  to: '/app/hormigon'      },
  { icon: Wrench,    label: 'Acero',            sub: 'CTE SE-A',     to: '/app/acero'         },
  { icon: Layers,    label: 'Cimentaciones',    sub: 'CTE SE-C',     to: '/app/cimentaciones' },
]

export default function AppLayout() {
  /* Sidebar collapses to icon-only below 900 px */
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false
  )

  useEffect(() => {
    const handle = () => setNarrow(window.innerWidth < 900)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const W = narrow ? 56 : 240

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside style={{
        width: W,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-subtle)',
        borderRight: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
      }}>

        {/* Brand */}
        <div style={{
          padding: narrow ? '0 0.5rem' : '0 1rem',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: narrow ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {!narrow && (
            <Link to="/" style={{
              fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)',
              textDecoration: 'none', letterSpacing: '-0.01em',
            }}>
              Concreta
            </Link>
          )}
          <Link
            to="/"
            title="Volver al inicio"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26,
              color: 'var(--text-3)',
              borderRadius: 5,
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent' }}
          >
            <ChevronLeft size={15} />
          </Link>
        </div>

        {/* Section label */}
        {!narrow && (
          <div style={{ padding: '1.25rem 1rem 0.5rem' }}>
            <span style={{
              fontSize: '0.6rem', fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}>
              Módulos
            </span>
          </div>
        )}

        {/* Nav items */}
        <nav style={{
          padding: narrow ? '0.75rem 0' : '0 0.5rem',
          display: 'flex', flexDirection: 'column', gap: 2,
          alignItems: narrow ? 'center' : 'stretch',
          marginTop: narrow ? '0.25rem' : 0,
        }}>
          {NAV_ITEMS.map(({ icon: Icon, label, sub, to }) => (
            <NavLink
              key={to}
              to={to}
              title={narrow ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: narrow ? 'center' : 'flex-start',
                gap: narrow ? 0 : '0.65rem',
                padding: narrow ? '0.6rem' : '0.55rem 0.7rem',
                borderRadius: 7,
                textDecoration: 'none',
                transition: 'background 0.15s',
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                borderLeft: narrow ? 'none' : (isActive ? '2px solid var(--accent)' : '2px solid transparent'),
                width: narrow ? 38 : 'auto',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={1.75}
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }}
                  />
                  {!narrow && (
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontSize: '0.8rem',
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? 'var(--text-1)' : 'var(--text-2)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {label}
                      </p>
                      <p style={{
                        margin: 0, fontSize: '0.65rem',
                        color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                      }}>
                        {sub}
                      </p>
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!narrow && (
          <div style={{
            marginTop: 'auto',
            padding: '1rem',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-3)' }}>
              Concreta v0.1
            </p>
          </div>
        )}
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
