export default function AprovechamientoBar({ value }) {
  const pct = Math.min(value, 100)     // barra visual máx 100 %
  const display = value.toFixed(1)      // mostrar valor real aunque supere 100

  const color =
    value < 80  ? '#3fb950' :
    value <= 100 ? '#d29922' :
                   '#f85149'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 120 }}>
      {/* Track */}
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 99,
            background: color,
            transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>

      {/* Value */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          fontWeight: 500,
          color,
          minWidth: 42,
          textAlign: 'right',
        }}
      >
        {display} %
      </span>
    </div>
  )
}
