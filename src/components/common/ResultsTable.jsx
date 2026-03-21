import { CheckCircle2, XCircle } from 'lucide-react'
import AprovechamientoBar from './AprovechamientoBar'

/*
  results: Array<{
    nombre:          string
    valorCalculado:  number | string
    valorLimite:     number | string
    unidad:          string
    aprovechamiento: number   (0–200+, porcentaje)
    cumple:          boolean
    articuloNorma:   string   (ej. "EHE Art. 42.1")
  }>
*/
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
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr 1fr 1.8fr 80px 100px',
          gap: '0.5rem',
          padding: '0.6rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
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

      {/* Rows */}
      {results.map((r, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr 1.8fr 80px 100px',
            gap: '0.5rem',
            padding: '0.7rem 1rem',
            alignItems: 'center',
            borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
            background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent',
          }}
        >
          {/* Nombre */}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-1)', fontWeight: 500 }}>
            {r.nombre}
          </span>

          {/* Valor calculado */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-1)' }}>
            {typeof r.valorCalculado === 'number' ? r.valorCalculado.toFixed(2) : r.valorCalculado}
            {r.unidad && (
              <span style={{ color: 'var(--text-3)', marginLeft: '0.2rem', fontSize: '0.7rem' }}>
                {r.unidad}
              </span>
            )}
          </span>

          {/* Valor límite */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-2)' }}>
            {typeof r.valorLimite === 'number' ? r.valorLimite.toFixed(2) : r.valorLimite}
            {r.unidad && (
              <span style={{ color: 'var(--text-3)', marginLeft: '0.2rem', fontSize: '0.7rem' }}>
                {r.unidad}
              </span>
            )}
          </span>

          {/* Aprovechamiento */}
          <AprovechamientoBar value={r.aprovechamiento} />

          {/* Estado */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {r.cumple
              ? <CheckCircle2 size={16} strokeWidth={1.75} style={{ color: 'var(--ok)' }} />
              : <XCircle      size={16} strokeWidth={1.75} style={{ color: 'var(--fail)' }} />
            }
            <span
              style={{
                marginLeft: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 500,
                color: r.cumple ? 'var(--ok)' : 'var(--fail)',
              }}
            >
              {r.cumple ? 'OK' : 'NO'}
            </span>
          </div>

          {/* Artículo norma */}
          <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {r.articuloNorma}
          </span>
        </div>
      ))}
    </div>
  )
}
