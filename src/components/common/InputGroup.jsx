export default function InputGroup({ title, children }) {
  return (
    <div
      style={{
        background: 'var(--bg-muted)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      {title && (
        <p
          style={{
            margin: '0 0 0.9rem',
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent-dim)',
            paddingBottom: '0.6rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
