import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

export default function InputField({
  label,
  value,
  onChange,
  unit,
  type = 'number',
  min,
  max,
  step,
  tooltip,
  error = false,
  errorMessage,
  name,
}) {
  const [showTip, setShowTip] = useState(false)

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-2)', letterSpacing: '0.02em' }}>
          {label}
        </label>
        {tooltip && (
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <HelpCircle
              size={12}
              strokeWidth={1.75}
              style={{ color: 'var(--text-3)', cursor: 'help' }}
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
            />
            {showTip && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 100,
                  background: '#1a2130',
                  border: '1px solid var(--border-md)',
                  borderRadius: 6,
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-2)',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input with unit suffix */}
      <div style={{ position: 'relative' }}>
        <input
          className="inp"
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
          style={{
            paddingRight: unit ? '3rem' : '0.65rem',
            borderColor: error ? 'var(--fail)' : undefined,
          }}
        />
        {unit && (
          <span
            style={{
              position: 'absolute',
              right: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-3)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && errorMessage && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--fail)' }}>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
