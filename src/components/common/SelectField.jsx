import { useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'

export default function SelectField({ label, value, onChange, options = [], tooltip, name }) {
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

      {/* Select with chevron */}
      <div style={{ position: 'relative' }}>
        <select
          className="sel"
          name={name}
          value={value}
          onChange={onChange}
          style={{ paddingRight: '2rem' }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          style={{
            position: 'absolute',
            right: '0.6rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-3)',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}
