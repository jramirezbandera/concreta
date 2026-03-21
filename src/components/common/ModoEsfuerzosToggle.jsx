const OPTIONS = [
  { value: 'directo', label: 'Esfuerzos directos' },
  { value: 'cargas',  label: 'Desde cargas'       },
]

export default function ModoEsfuerzosToggle({ modo, onChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {OPTIONS.map((opt) => {
        const active = modo === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: active ? 600 : 400,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'background 0.18s, color 0.18s',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? '#050a12' : 'var(--text-2)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
