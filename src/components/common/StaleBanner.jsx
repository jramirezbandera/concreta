import { RefreshCw } from 'lucide-react'

/**
 * StaleBanner — aviso de que los resultados mostrados corresponden a datos anteriores.
 * Se muestra cuando el usuario cambia algún input después de haber calculado.
 */
export default function StaleBanner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.55rem 1rem',
      background: 'rgba(210,153,34,0.06)',
      border: '1px solid rgba(210,153,34,0.22)',
      borderRadius: 8,
      fontSize: '0.78rem',
      color: 'var(--warn)',
    }}>
      <RefreshCw size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
      Los datos han cambiado — pulsa{' '}
      <strong style={{ margin: '0 0.15rem' }}>Calcular</strong>
      {' '}para actualizar los resultados.
    </div>
  )
}
