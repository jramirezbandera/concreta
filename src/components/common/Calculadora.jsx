import { useState, useRef, useEffect, useCallback } from 'react'
import { Sigma, X, Delete } from 'lucide-react'

function fmt(v) {
  if (!isFinite(v) || isNaN(v)) return 'Error'
  // Evitar notación científica para números razonables
  if (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-8 && v !== 0)) return v.toExponential(6)
  // Limitar decimales
  const s = parseFloat(v.toPrecision(12)).toString()
  return s
}

const BUTTONS = [
  { label: 'AC',  type: 'clear',   wide: false },
  { label: '±',   type: 'negate',  wide: false },
  { label: '√',   type: 'sqrt',    wide: false },
  { label: '÷',   type: 'op',      op: '/',    wide: false },

  { label: '7',   type: 'digit',   wide: false },
  { label: '8',   type: 'digit',   wide: false },
  { label: '9',   type: 'digit',   wide: false },
  { label: '×',   type: 'op',      op: '*',    wide: false },

  { label: '4',   type: 'digit',   wide: false },
  { label: '5',   type: 'digit',   wide: false },
  { label: '6',   type: 'digit',   wide: false },
  { label: '−',   type: 'op',      op: '-',    wide: false },

  { label: '1',   type: 'digit',   wide: false },
  { label: '2',   type: 'digit',   wide: false },
  { label: '3',   type: 'digit',   wide: false },
  { label: '+',   type: 'op',      op: '+',    wide: false },

  { label: '0',   type: 'digit',   wide: true  },
  { label: '.',   type: 'decimal', wide: false },
  { label: '=',   type: 'equals',  wide: false },
]

export default function Calculadora({ open, onToggle }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  const [pos, setPos]     = useState(null)

  /* Estado de la calculadora */
  const [display, setDisplay]       = useState('0')
  const [prevVal, setPrevVal]       = useState(null)
  const [operator, setOperator]     = useState(null)
  const [waitNext, setWaitNext]     = useState(false)  // siguiente dígito empieza nuevo número
  const [expression, setExpression] = useState('')     // línea superior de expresión

  const panelRef = useRef(null)
  const dragging = useRef(false)
  const dragOff  = useRef({ x: 0, y: 0 })

  /* Resize */
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  /* Mouse drag */
  const onMouseDown = useCallback((e) => {
    if (isMobile) return
    dragging.current = true
    const r = panelRef.current.getBoundingClientRect()
    dragOff.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    e.preventDefault()
  }, [isMobile])

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - dragOff.current.x, y: e.clientY - dragOff.current.y })
    }
    const up = () => { dragging.current = false }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up) }
  }, [])

  /* Touch drag */
  const onTouchStart = useCallback((e) => {
    if (isMobile) return
    dragging.current = true
    const t = e.touches[0]
    const r = panelRef.current.getBoundingClientRect()
    dragOff.current = { x: t.clientX - r.left, y: t.clientY - r.top }
  }, [isMobile])

  useEffect(() => {
    const move = (e) => {
      if (!dragging.current) return
      const t = e.touches[0]
      setPos({ x: t.clientX - dragOff.current.x, y: t.clientY - dragOff.current.y })
    }
    const end = () => { dragging.current = false }
    document.addEventListener('touchmove', move, { passive: true })
    document.addEventListener('touchend', end)
    return () => { document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end) }
  }, [])

  /* ── Lógica de la calculadora ─────────────────────────── */
  const compute = (a, b, op) => {
    switch (op) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b === 0 ? NaN : a / b
      default:  return b
    }
  }

  const handleDigit = (d) => {
    if (waitNext) {
      setDisplay(d === '0' ? '0' : d)
      setWaitNext(false)
    } else {
      setDisplay(prev =>
        prev === '0' && d !== '.' ? d
        : prev.length >= 14 ? prev
        : prev + d
      )
    }
  }

  const handleDecimal = () => {
    if (waitNext) { setDisplay('0.'); setWaitNext(false); return }
    if (!display.includes('.')) setDisplay(d => d + '.')
  }

  const handleOp = (op) => {
    const cur = parseFloat(display)
    if (prevVal !== null && !waitNext) {
      const result = compute(prevVal, cur, operator)
      const res = fmt(result)
      setExpression(`${fmt(prevVal)} ${operator === '*' ? '×' : operator === '/' ? '÷' : operator} ${fmt(cur)} =`)
      setDisplay(res)
      setPrevVal(parseFloat(res))
    } else {
      setPrevVal(cur)
      setExpression('')
    }
    setOperator(op)
    setWaitNext(true)
  }

  const handleEquals = () => {
    if (operator === null || prevVal === null) return
    const cur    = parseFloat(display)
    const result = compute(prevVal, cur, operator)
    const opSym  = operator === '*' ? '×' : operator === '/' ? '÷' : operator
    setExpression(`${fmt(prevVal)} ${opSym} ${fmt(cur)} =`)
    setDisplay(fmt(result))
    setPrevVal(null)
    setOperator(null)
    setWaitNext(true)
  }

  const handleClear = () => {
    setDisplay('0')
    setPrevVal(null)
    setOperator(null)
    setWaitNext(false)
    setExpression('')
  }

  const handleNegate = () => {
    setDisplay(d => {
      const n = parseFloat(d)
      if (n === 0) return '0'
      return fmt(-n)
    })
  }

  const handleSqrt = () => {
    const n = parseFloat(display)
    const result = n < 0 ? NaN : Math.sqrt(n)
    setExpression(`√(${fmt(n)}) =`)
    setDisplay(fmt(result))
    setWaitNext(true)
    setPrevVal(null)
    setOperator(null)
  }

  const handleBackspace = () => {
    if (waitNext) return
    setDisplay(d => d.length <= 1 ? '0' : d.slice(0, -1))
  }

  const handleButton = (btn) => {
    switch (btn.type) {
      case 'digit':   handleDigit(btn.label); break
      case 'decimal': handleDecimal(); break
      case 'op':      handleOp(btn.op); break
      case 'equals':  handleEquals(); break
      case 'clear':   handleClear(); break
      case 'negate':  handleNegate(); break
      case 'sqrt':    handleSqrt(); break
    }
  }

  /* Color de botón según tipo */
  const btnStyle = (btn, pressed) => {
    const base = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: 'none', cursor: 'pointer', borderRadius: 6,
      fontSize: '0.9rem', fontWeight: 500, fontFamily: 'var(--font-mono)',
      transition: 'all 0.1s', height: 46,
      gridColumn: btn.wide ? 'span 2' : undefined,
    }
    if (btn.type === 'equals') return { ...base, background: 'var(--accent)', color: 'var(--btn-on-accent)' }
    if (btn.type === 'op')     return { ...base, background: 'var(--accent-subtle)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
    if (btn.type === 'clear' || btn.type === 'negate' || btn.type === 'sqrt')
      return { ...base, background: 'var(--bg-hover)', color: 'var(--text-2)', border: '1px solid var(--border)' }
    return { ...base, background: 'var(--bg-input)', color: 'var(--text-1)', border: '1px solid var(--border)' }
  }

  const panelPos = isMobile
    ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(300px, 92vw)' }
    : pos
      ? { top: pos.y, left: pos.x }
      : { top: 56, right: 16 }

  return (
    <>
      {/* ── Botón disparador ─────────────────────────────── */}
      <button
        onClick={onToggle}
        title="Calculadora"
        className={open ? 'cv-btn cv-btn-active' : 'cv-btn'}
        style={{ right: 130 }}
      >
        <Sigma size={12} strokeWidth={2} />
        <span>Calc</span>
      </button>

      {/* ── Panel ────────────────────────────────────────── */}
      {open && (
        <>
          {isMobile && (
            <div className="cv-backdrop" onClick={onToggle} />
          )}

          <div ref={panelRef} className="cv-panel" style={{ ...panelPos, width: isMobile ? undefined : 272 }}>

            {/* Header / drag handle */}
            <div
              className="cv-header"
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              style={{ cursor: isMobile ? 'default' : 'grab' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Sigma size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span className="cv-header-title">Calculadora</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="cv-close"
                  onClick={handleBackspace}
                  title="Borrar último dígito"
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <Delete size={12} />
                </button>
                <button
                  className="cv-close"
                  onClick={onToggle}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Display */}
            <div style={{
              padding: '0.5rem 0.85rem 0.65rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
              textAlign: 'right',
            }}>
              <div style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-3)',
                minHeight: '1rem',
                marginBottom: '0.2rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {expression || '\u00a0'}
              </div>
              <div style={{
                fontSize: display.length > 10 ? '1.2rem' : '1.75rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                color: display === 'Error' ? 'var(--fail)' : 'var(--text-1)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {display}
              </div>
              {operator && (
                <div style={{ fontSize: '0.65rem', color: 'var(--accent)', marginTop: '0.15rem' }}>
                  {operator === '*' ? '×' : operator === '/' ? '÷' : operator}
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 5,
              padding: '0.7rem 0.7rem 0.75rem',
              background: 'var(--bg-subtle)',
            }}>
              {BUTTONS.map((btn, i) => (
                <button
                  key={i}
                  style={btnStyle(btn)}
                  onClick={() => handleButton(btn)}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
