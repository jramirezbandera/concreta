import { Calculator } from 'lucide-react'

export default function CalculateButton({ onClick, loading = false }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
        padding: '0.65rem 1.5rem',
        background: loading ? 'rgba(56,189,248,0.5)' : 'var(--accent)',
        color: '#050a12',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.88rem',
        fontWeight: 700,
        border: 'none',
        borderRadius: 8,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s, transform 0.1s',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.99)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {loading ? (
        <>
          <Spinner />
          Calculando…
        </>
      ) : (
        <>
          <Calculator size={16} strokeWidth={2} />
          Calcular
        </>
      )}
    </button>
  )
}

function Spinner() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
    </svg>
  )
}
