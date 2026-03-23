import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeftRight, X } from 'lucide-react'

/* ── Categorías y factores de conversión ──────────────────────────────────
   factor = cuántas unidades base equivalen a 1 unidad de esta fila
   base → multiplicar por factor para llegar a la unidad base
   resultado = baseVal / factor
──────────────────────────────────────────────────────────────────────── */
const CATS = [
  {
    id: 'longitud', label: 'Longitud',
    unidades: [
      { id: 'm',  label: 'm',  factor: 1         },
      { id: 'cm', label: 'cm', factor: 0.01      },
      { id: 'mm', label: 'mm', factor: 0.001     },
      { id: 'ft', label: 'ft', factor: 0.3048    },
      { id: 'in', label: 'in', factor: 0.0254    },
    ],
  },
  {
    id: 'area', label: 'Superficie',
    unidades: [
      { id: 'm2',  label: 'm²',  factor: 1       },
      { id: 'cm2', label: 'cm²', factor: 1e-4    },
      { id: 'mm2', label: 'mm²', factor: 1e-6    },
      { id: 'ft2', label: 'ft²', factor: 0.0929  },
      { id: 'in2', label: 'in²', factor: 6.452e-4},
    ],
  },
  {
    id: 'fuerza', label: 'Fuerza',
    unidades: [
      { id: 'kN',  label: 'kN',  factor: 1        },
      { id: 'N',   label: 'N',   factor: 0.001    },
      { id: 'MN',  label: 'MN',  factor: 1000     },
      { id: 'kgf', label: 'kgf', factor: 0.009807 },
      { id: 'tf',  label: 'tf',  factor: 9.807    },
    ],
  },
  {
    id: 'presion', label: 'Tensión / Presión',
    unidades: [
      { id: 'MPa',    label: 'MPa = N/mm²', factor: 1       },
      { id: 'kNm2',   label: 'kN/m²',       factor: 0.001   },
      { id: 'kNcm2',  label: 'kN/cm²',      factor: 10      },
      { id: 'kgfcm2', label: 'kgf/cm²',     factor: 0.09807 },
      { id: 'GPa',    label: 'GPa',         factor: 1000    },
    ],
  },
  {
    id: 'modYoung', label: 'Mód. Young (E)',
    unidades: [
      { id: 'GPa',    label: 'GPa',      factor: 1        },
      { id: 'MPa',    label: 'MPa',      factor: 0.001    },
      { id: 'kNmm2',  label: 'kN/mm²',   factor: 1        },
      { id: 'kNcm2',  label: 'kN/cm²',   factor: 0.01     },
      { id: 'kNm2',   label: 'kN/m²',    factor: 1e-6     },
      { id: 'kgfcm2', label: 'kgf/cm²',  factor: 9.807e-5 },
    ],
  },
  {
    id: 'balasto', label: 'Mód. balasto',
    unidades: [
      { id: 'kNm3',   label: 'kN/m³',   factor: 1      },
      { id: 'MNm3',   label: 'MN/m³',   factor: 1000   },
      { id: 'Nmm3',   label: 'N/mm³',   factor: 1e6    },
      { id: 'kgfcm3', label: 'kgf/cm³', factor: 9806.6 },
    ],
  },
  {
    id: 'pesoEsp', label: 'Peso específico',
    unidades: [
      { id: 'kNm3',  label: 'kN/m³',  factor: 1        },
      { id: 'Nm3',   label: 'N/m³',   factor: 0.001    },
      { id: 'kgfm3', label: 'kgf/m³', factor: 0.009807 },
      { id: 'tm3',   label: 't/m³',   factor: 9.807    },
    ],
  },
  {
    id: 'momento', label: 'Momento',
    unidades: [
      { id: 'kNm',   label: 'kN·m',   factor: 1       },
      { id: 'Nm',    label: 'N·m',    factor: 0.001   },
      { id: 'kNcm',  label: 'kN·cm',  factor: 0.01    },
      { id: 'kNmm',  label: 'kN·mm',  factor: 0.001   },
      { id: 'Nmm',   label: 'N·mm',   factor: 1e-6    },
      { id: 'tfm',   label: 'tf·m',   factor: 9.807   },
    ],
  },
]

function fmt(v) {
  if (!isFinite(v) || isNaN(v)) return '—'
  const abs = Math.abs(v)
  if (abs === 0) return '0'
  if (abs >= 1e6 || abs < 1e-4) return v.toExponential(4)
  return parseFloat(v.toPrecision(6)).toString()
}

export default function ConversorUnidades({ open, onToggle }) {
  const [catIdx, setCatIdx] = useState(0)
  const [fromIdx, setFromIdx] = useState(0)
  const [valor, setValor]   = useState('1')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)
  const [pos, setPos]       = useState(null)   // null = posición CSS por defecto

  const panelRef  = useRef(null)
  const dragging  = useRef(false)
  const dragOff   = useRef({ x: 0, y: 0 })

  /* Detectar móvil en resize */
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

  /* Touch drag (iPad) */
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

  const cat      = CATS[catIdx]
  const fromUnit = cat.unidades[fromIdx]
  const numVal   = parseFloat(valor)
  const baseVal  = isNaN(numVal) ? NaN : numVal * fromUnit.factor

  const handleCat = (i) => { setCatIdx(i); setFromIdx(0) }

  /* Posición del panel */
  const panelPos = isMobile
    ? { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(360px, 94vw)' }
    : pos
      ? { top: pos.y, left: pos.x }
      : { top: 56, right: 16 }

  return (
    <>
      {/* ── Botón disparador ───────────────────────────────────────── */}
      <button
        onClick={onToggle}
        title="Conversor de unidades"
        className={open ? 'cv-btn cv-btn-active' : 'cv-btn'}
      >
        <ArrowLeftRight size={12} strokeWidth={2} />
        <span>Conversor</span>
      </button>

      {/* ── Panel ─────────────────────────────────────────────────── */}
      {open && (
        <>
          {isMobile && (
            <div className="cv-backdrop" onClick={onToggle} />
          )}

          <div ref={panelRef} className="cv-panel" style={{ ...panelPos, width: isMobile ? undefined : 340 }}>

            {/* Header / drag handle */}
            <div
              className="cv-header"
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              style={{ cursor: isMobile ? 'default' : 'grab' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ArrowLeftRight size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span className="cv-header-title">Conversor de unidades</span>
              </div>
              <button
                className="cv-close"
                onClick={onToggle}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent' }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Categorías */}
            <div className="cv-cats">
              {CATS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => handleCat(i)}
                  className={catIdx === i ? 'cv-cat cv-cat-on' : 'cv-cat'}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="cv-body">
              <div className="cv-inputs">
                <div>
                  <label className="cv-lbl">Valor</label>
                  <input
                    type="number"
                    className="inp"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="cv-lbl">Unidad origen</label>
                  <select
                    className="sel"
                    value={fromIdx}
                    onChange={e => setFromIdx(Number(e.target.value))}
                  >
                    {cat.unidades.map((u, i) => (
                      <option key={u.id} value={i}>{u.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resultados */}
              <div className="cv-results">
                {cat.unidades.map((u, i) => {
                  const result  = isNaN(baseVal) ? '—' : fmt(baseVal / u.factor)
                  const isFrom  = i === fromIdx
                  return (
                    <div
                      key={u.id}
                      className={isFrom ? 'cv-row cv-row-from' : 'cv-row'}
                      onClick={() => setFromIdx(i)}
                      title="Usar como unidad origen"
                    >
                      <span className="cv-row-unit">{u.label}</span>
                      <span className="cv-row-val">{result}</span>
                    </div>
                  )
                })}
              </div>

              <p className="cv-hint">Pulsa cualquier fila para usarla como origen</p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
