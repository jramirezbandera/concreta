import { CheckCircle2, XCircle } from 'lucide-react'
import AprovechamientoBar from './AprovechamientoBar'

export default function ResultsTable({ results = [] }) {
  if (!results.length) return null

  return (
    <div
      style={{
        background: 'var(--bg-muted)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div className="rt-wrap">
        {/* Header — visible solo en escritorio */}
        <div className="rt-grid-head">
          {['Comprobación', 'Calculado', 'Límite', 'Aprovechamiento', 'Estado', 'Norma'].map((h) => (
            <span
              key={h}
              style={{
                fontSize: '0.62rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Filas escritorio */}
        {results.map((r, i) => (
          <div
            key={i}
            className="rt-grid-row"
            style={{
              alignItems: 'center',
              borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              background: i % 2 === 1 ? 'var(--row-alt)' : 'transparent',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: 'var(--text-1)', fontWeight: 500 }}>
              {r.nombre}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-1)' }}>
              {typeof r.valorCalculado === 'number' ? r.valorCalculado.toFixed(2) : r.valorCalculado}
              {r.unidad && <span style={{ color: 'var(--text-3)', marginLeft: '0.2rem', fontSize: '0.7rem' }}>{r.unidad}</span>}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-2)' }}>
              {typeof r.valorLimite === 'number' ? r.valorLimite.toFixed(2) : r.valorLimite}
              {r.unidad && <span style={{ color: 'var(--text-3)', marginLeft: '0.2rem', fontSize: '0.7rem' }}>{r.unidad}</span>}
            </span>
            <AprovechamientoBar value={r.aprovechamiento} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {r.cumple
                ? <CheckCircle2 size={16} strokeWidth={1.75} style={{ color: 'var(--ok)' }} />
                : <XCircle      size={16} strokeWidth={1.75} style={{ color: 'var(--fail)' }} />
              }
              <span style={{ marginLeft: '0.35rem', fontSize: '0.72rem', fontWeight: 500, color: r.cumple ? 'var(--ok)' : 'var(--fail)' }}>
                {r.cumple ? 'OK' : 'NO'}
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              {r.articuloNorma}
            </span>
          </div>
        ))}
      </div>

      {/* Tarjetas móvil — visibles solo en pantalla estrecha */}
      {results.map((r, i) => (
        <div key={`m${i}`} className="rt-card">
          <span className="rt-card-name">{r.nombre}</span>
          <StatusChip cumple={r.cumple} />
          <span className="rt-card-vals">
            {typeof r.valorCalculado === 'number' ? r.valorCalculado.toFixed(2) : r.valorCalculado}
            {r.unidad && <span style={{ color: 'var(--text-3)', marginLeft: '0.2rem' }}>{r.unidad}</span>}
            <span style={{ color: 'var(--text-3)', margin: '0 0.3rem' }}>vs</span>
            {typeof r.valorLimite === 'number' ? r.valorLimite.toFixed(2) : r.valorLimite}
            {r.unidad && <span style={{ color: 'var(--text-3)', marginLeft: '0.2rem' }}>{r.unidad}</span>}
          </span>
          <div className="rt-card-bar">
            <AprovechamientoBar value={r.aprovechamiento} />
          </div>
        </div>
      ))}
    </div>
  )
}

function StatusChip({ cumple }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      {cumple
        ? <CheckCircle2 size={14} strokeWidth={1.75} style={{ color: 'var(--ok)' }} />
        : <XCircle      size={14} strokeWidth={1.75} style={{ color: 'var(--fail)' }} />
      }
      <span style={{ fontSize: '0.72rem', fontWeight: 500, color: cumple ? 'var(--ok)' : 'var(--fail)' }}>
        {cumple ? 'OK' : 'NO'}
      </span>
    </div>
  )
}
