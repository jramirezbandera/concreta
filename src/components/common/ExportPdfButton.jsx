import { FileDown, Loader2 } from 'lucide-react'

export default function ExportPdfButton({ onClick, disabled = false, loading = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.45rem',
        padding: '0.55rem 1.25rem',
        background: 'transparent',
        color: (disabled || loading) ? 'var(--text-3)' : 'var(--accent)',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.82rem',
        fontWeight: 500,
        border: `1px solid ${(disabled || loading) ? 'var(--border)' : 'var(--accent-border)'}`,
        borderRadius: 8,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        opacity: (disabled || loading) ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled || loading) return
        e.currentTarget.style.background = 'var(--accent-subtle)'
        e.currentTarget.style.borderColor = 'var(--accent-border-hover)'
      }}
      onMouseLeave={(e) => {
        if (disabled || loading) return
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'var(--accent-border)'
      }}
    >
      {loading
        ? <Loader2 size={15} strokeWidth={1.75} style={{ animation: 'spin 1s linear infinite' }} />
        : <FileDown size={15} strokeWidth={1.75} />
      }
      {loading ? 'Generando…' : 'Exportar PDF'}
    </button>
  )
}
