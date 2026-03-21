import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Eye, Shield, Building2, Wrench, Layers, ArrowRight } from 'lucide-react'

/* ── Scroll reveal ────────────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.sr')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const delay = Number(e.target.dataset.delay ?? 0)
            setTimeout(() => e.target.classList.add('in'), delay)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ── Data ─────────────────────────────────────────────────── */
const features = [
  { icon: Zap,    title: 'Rápido',              desc: 'Resultados instantáneos. Sin esperas ni instalación.' },
  { icon: Eye,    title: 'Legible',              desc: 'Salida con unidades y nomenclatura técnica estándar.' },
  { icon: Shield, title: 'Normativa española',   desc: 'Basado en el Código Estructural y CTE.' },
]

const modules = [
  { icon: Building2, title: 'Hormigón Armado',  desc: 'Flexión, cortante y dimensionado de secciones según EHE.', path: '/app/hormigon' },
  { icon: Wrench,    title: 'Acero',             desc: 'Perfiles laminados y comprobaciones según CTE SE-A.',       path: '/app/acero'     },
  { icon: Layers,    title: 'Cimentaciones',     desc: 'Zapatas y cálculo geotécnico básico.',                     path: '/app/cimentaciones' },
]

/* ── Styles (local vars for brevity) ─────────────────────── */
const S = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
    height: 56,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 2rem',
    background: 'rgba(6,9,15,0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logo: {
    fontSize: '0.95rem', fontWeight: 600, color: '#e6edf3',
    textDecoration: 'none', letterSpacing: '-0.01em',
  },
  navLink: {
    fontSize: '0.82rem', color: 'var(--text-2)',
    textDecoration: 'none', transition: 'color 0.15s',
  },
  ctaBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.4rem 0.9rem',
    background: 'var(--text-1)', color: '#06090f',
    fontSize: '0.8rem', fontWeight: 600,
    border: 'none', borderRadius: 6, cursor: 'pointer',
    textDecoration: 'none',
    transition: 'opacity 0.15s',
  },
}

/* ── Component ────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate()
  useScrollReveal()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav style={S.nav}>
        <Link to="/" style={S.logo}>Concreta</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link
            to="/app/hormigon"
            style={S.navLink}
            onMouseEnter={e => e.target.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.target.style.color = 'var(--text-2)'}
          >
            Módulos
          </Link>
          <Link
            to="/app/hormigon"
            style={S.ctaBtn}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Abrir app <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          paddingTop: 'calc(56px + 7rem)',
          paddingBottom: '7rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Dot grid */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.065) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)',
          }}
        />

        {/* Top spotlight */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: 800, height: 400,
            background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(56,189,248,0.07), transparent)',
            pointerEvents: 'none', zIndex: 0,
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
          {/* Eyebrow */}
          <div className="anim-in d1" style={{ marginBottom: '1.5rem' }}>
            <span className="badge">v0.1 · Cálculo estructural</span>
          </div>

          {/* Title */}
          <h1
            className="anim-up d2"
            style={{
              margin: '0 0 1.25rem',
              fontSize: 'clamp(3rem, 8vw, 5.5rem)',
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: '-0.035em',
              color: 'var(--text-1)',
            }}
          >
            El cálculo estructural<br />
            <span style={{ color: 'var(--text-2)' }}>que no te frena.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="anim-up d3"
            style={{
              margin: '0 auto 2.5rem',
              maxWidth: 480,
              fontSize: '1.05rem',
              lineHeight: 1.65,
              color: 'var(--text-2)',
            }}
          >
            Hormigón, acero y cimentaciones según normativa española.
            Directo al navegador, sin instalación.
          </p>

          {/* CTAs */}
          <div
            className="anim-up d4"
            style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button
              onClick={() => navigate('/app/hormigon')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.65rem 1.5rem',
                background: 'var(--text-1)', color: '#06090f',
                fontSize: '0.88rem', fontWeight: 600,
                border: 'none', borderRadius: 7, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.87'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Empezar a calcular <ArrowRight size={15} />
            </button>

            <button
              onClick={() => document.getElementById('modulos').scrollIntoView({ behavior: 'smooth' })}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '0.65rem 1.5rem',
                background: 'transparent',
                color: 'var(--text-2)',
                fontSize: '0.88rem', fontWeight: 500,
                border: '1px solid var(--border)',
                borderRadius: 7, cursor: 'pointer',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              Ver módulos
            </button>
          </div>
        </div>
      </section>

      {/* ── Feature strip ───────────────────────────────────── */}
      <div className="div-h" />
      <section style={{ padding: '4rem 1.5rem' }}>
        <div
          style={{
            maxWidth: 860, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className={`sr sr-d${i + 1}`}
              style={{
                padding: '2rem 2.5rem',
                borderRight: i < features.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <Icon
                size={22}
                strokeWidth={1.5}
                style={{ color: 'var(--accent-dim)', marginBottom: '0.9rem' }}
              />
              <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)' }}>
                {title}
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>
      <div className="div-h" />

      {/* ── Módulos ─────────────────────────────────────────── */}
      <section id="modulos" style={{ padding: '5rem 1.5rem 7rem' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          {/* Section heading */}
          <div className="sr" style={{ marginBottom: '2.5rem' }}>
            <p style={{
              margin: '0 0 0.5rem',
              fontSize: '0.65rem', fontWeight: 600,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}>
              Módulos disponibles
            </p>
            <h2 style={{
              margin: 0,
              fontSize: 'clamp(1.4rem, 3vw, 2rem)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--text-1)',
            }}>
              Tres herramientas, todo lo esencial.
            </h2>
          </div>

          {/* Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1px',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {modules.map(({ icon: Icon, title, desc, path }, i) => (
              <div
                key={title}
                className={`sr sr-d${i + 1}`}
                onClick={() => navigate(path)}
                style={{
                  padding: '2rem',
                  background: 'var(--bg-muted)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  borderRight: i < modules.length - 1 ? '1px solid var(--border)' : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-muted)'}
              >
                <Icon
                  size={28}
                  strokeWidth={1.2}
                  style={{ color: 'var(--accent-dim)', marginBottom: '1.25rem', display: 'block' }}
                />
                <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-1)' }}>
                  {title}
                </p>
                <p style={{ margin: '0 0 1.5rem', fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {desc}
                </p>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.78rem', fontWeight: 500,
                    color: 'var(--accent)', textDecoration: 'none',
                  }}
                >
                  Abrir módulo
                  <ArrowRight size={13} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div
        style={{
          height: 1,
          background: 'linear-gradient(to right, transparent, var(--border), transparent)',
        }}
      />
      <footer style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
          Concreta © 2025
        </p>
      </footer>
    </div>
  )
}
