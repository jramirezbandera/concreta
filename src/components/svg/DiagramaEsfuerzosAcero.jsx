/**
 * DiagramaEsfuerzosAcero.jsx
 * Diagrama de esfuerzos (M, V, f) para vigas de acero laminado.
 *
 * Props:
 *   tipoViga  'biapoyada' | 'voladizo' | 'emp-art' | 'biempotr'
 *   L         [m]      — longitud del vano
 *   qd        [kN/m]   — carga de diseño ELU (modo cargas)
 *   q_ser     [kN/m]   — carga de servicio ELS = g+q (siempre)
 *   Iy        [mm⁴]    — momento de inercia del perfil
 *   Med       [kN·m]   — momento de diseño (modo directo)
 *   Ved       [kN]     — cortante de diseño (modo directo)
 *   flecha    [mm]     — flecha máxima calculada (modo directo, post-Calcular)
 *   modo      'cargas' | 'directo'
 */

const E_STEEL  = 210000   // MPa
const N_PTS    = 60

const M_COLOR  = '#38bdf8'
const V_COLOR  = '#a78bfa'
const F_COLOR  = '#4ade80'
const ZERO_COLOR = 'rgba(255,255,255,0.12)'
const TEXT_COLOR = '#64748b'
const FONT       = "'JetBrains Mono', monospace"

/* ── SVG layout ────────────────────────────────────────────────────────── */
const SVG_W    = 310
const ML       = 46       // left margin (y-axis labels)
const MR       = 8
const PW       = SVG_W - ML - MR   // plot width = 256
const PANEL_H  = 68       // height of each plot area
const TITLE_H  = 14       // height of panel title row
const PANEL_SP = 10       // vertical gap between panels
const MT       = 6        // top margin
const XAXIS_H  = 16       // bottom margin for x-axis labels
const SVG_H    = MT + 3 * (TITLE_H + PANEL_H) + 2 * PANEL_SP + XAXIS_H  // = 288

/* ── Analytical curves for UDL ─────────────────────────────────────────── */
function computeUDLCurves(tipoViga, L_m, q_ult_kNm, q_ser_kNm, Iy_mm4) {
  const L  = L_m * 1000
  const qu = q_ult_kNm / 1000   // N/mm
  const qs = q_ser_kNm / 1000   // N/mm
  const EI = E_STEEL * Iy_mm4   // N·mm²

  return Array.from({ length: N_PTS + 1 }, (_, i) => {
    const t = i / N_PTS
    const x = t * L
    let M_kNm, V_kN, f_mm

    switch (tipoViga) {
      case 'biapoyada':
        M_kNm = qu * x * (L - x) / 2 / 1e6
        V_kN  = qu * (L / 2 - x) / 1e3
        f_mm  = EI > 0 ? qs * x * (L ** 3 - 2 * L * x ** 2 + x ** 3) / (24 * EI) : 0
        break

      case 'voladizo':
        M_kNm = -qu * (L - x) ** 2 / 2 / 1e6
        V_kN  =  qu * (L - x) / 1e3
        f_mm  = EI > 0 ? qs * x ** 2 * (6 * L ** 2 - 4 * L * x + x ** 2) / (24 * EI) : 0
        break

      case 'emp-art':   // empotrada en x=0, articulada en x=L
        M_kNm = (5 * qu * L * x / 8 - qu * x ** 2 / 2 - qu * L ** 2 / 8) / 1e6
        V_kN  = (5 * qu * L / 8 - qu * x) / 1e3
        f_mm  = EI > 0 ? qs * (L ** 2 * x ** 2 / 16 - 5 * L * x ** 3 / 48 + x ** 4 / 24) / EI : 0
        break

      case 'biempotr':
        M_kNm = (qu * L * x / 2 - qu * x ** 2 / 2 - qu * L ** 2 / 12) / 1e6
        V_kN  = (qu * L / 2 - qu * x) / 1e3
        f_mm  = EI > 0 ? qs * (L ** 2 * x ** 2 / 24 - L * x ** 3 / 12 + x ** 4 / 24) / EI : 0
        break

      default:
        M_kNm = 0; V_kN = 0; f_mm = 0
    }

    return {
      t,
      M_kNm: isFinite(M_kNm) ? M_kNm : 0,
      V_kN:  isFinite(V_kN)  ? V_kN  : 0,
      f_mm:  isFinite(f_mm)  ? Math.max(0, f_mm) : 0,
    }
  })
}

/* ── Schematic curves for directo mode ─────────────────────────────────── */
function computeSchematicCurves(tipoViga, Med, Ved, flecha) {
  return Array.from({ length: N_PTS + 1 }, (_, i) => {
    const t = i / N_PTS
    let M_kNm, V_kN, f_mm

    switch (tipoViga) {
      case 'biapoyada':
        M_kNm = Med   * 4 * t * (1 - t)
        V_kN  = Ved   * (1 - 2 * t)
        f_mm  = flecha * Math.sin(Math.PI * t)
        break

      case 'voladizo':
        M_kNm = -Med   * (1 - t) ** 2
        V_kN  =  Ved   * (1 - t)
        f_mm  =  flecha * t ** 2 * (3 - 2 * t)
        break

      case 'emp-art': {
        M_kNm = Med * (5 * t - 4 * t * t - 1)
        V_kN  = Ved * (1 - 8 * t / 5)
        const h  = t * t / 16 - 5 * t * t * t / 48 + t * t * t * t / 24
        f_mm  = flecha > 0 ? flecha * Math.max(0, h) / 0.0054 : 0
        break
      }

      case 'biempotr': {
        M_kNm = Med * (6 * t - 6 * t * t - 1)
        V_kN  = Ved * (1 - 2 * t)
        const h  = t * t / 24 - t * t * t / 12 + t * t * t * t / 24
        f_mm  = flecha > 0 ? flecha * Math.max(0, h) / 0.002604 : 0
        break
      }

      default:
        M_kNm = 0; V_kN = 0; f_mm = 0
    }

    return {
      t,
      M_kNm: isFinite(M_kNm) ? M_kNm : 0,
      V_kN:  isFinite(V_kN)  ? V_kN  : 0,
      f_mm:  isFinite(f_mm)  ? Math.max(0, f_mm) : 0,
    }
  })
}

/* ── Formatting ─────────────────────────────────────────────────────────── */
function fmtDist(v) {
  if (v === 0) return '0'
  if (v === Math.round(v)) return v.toFixed(1)
  if ((v * 10) === Math.round(v * 10)) return v.toFixed(1)
  return v.toFixed(2)
}

function fmt(v) {
  const a = Math.abs(v)
  if (a === 0) return '0'
  if (a >= 100) return Math.round(v).toString()
  if (a >= 10)  return v.toFixed(1)
  if (a >= 1)   return v.toFixed(2)
  return v.toFixed(3)
}

/* ── Panel renderer ─────────────────────────────────────────────────────── */
function PanelSVG({ pts, accessor, color, title, unit, yTop, positiveOnly = false, invert = false }) {
  const vals = pts.map(accessor)
  let vmin = positiveOnly ? 0 : Math.min(0, ...vals)
  let vmax = Math.max(0, ...vals)
  const span = vmax - vmin || 1e-9

  // Add padding
  vmin -= span * 0.08
  vmax += span * 0.08
  const totalSpan = vmax - vmin

  // invert=true → positive values render downward (structural convention for M and f)
  const toY = invert
    ? (v) => yTop + TITLE_H + ((v - vmin) / totalSpan) * PANEL_H
    : (v) => yTop + TITLE_H + (1 - (v - vmin) / totalSpan) * PANEL_H
  const yZero = toY(0)

  // Build curve points
  const curvePts = pts.map(p => `${(ML + p.t * PW).toFixed(2)},${toY(accessor(p)).toFixed(2)}`).join(' ')

  // Build filled polygon (curve + return along zero baseline)
  const polyPts = [
    `${ML.toFixed(2)},${yZero.toFixed(2)}`,
    ...pts.map(p => `${(ML + p.t * PW).toFixed(2)},${toY(accessor(p)).toFixed(2)}`),
    `${(ML + PW).toFixed(2)},${yZero.toFixed(2)}`,
  ].join(' ')

  // Peak label
  const maxAbsVal  = Math.max(...vals.map(Math.abs))
  const peakLabel  = maxAbsVal > 1e-6 ? fmt(maxAbsVal) : '—'

  return (
    <g>
      {/* Panel background */}
      <rect x={ML} y={yTop + TITLE_H} width={PW} height={PANEL_H}
        fill="rgba(0,0,0,0)" />

      {/* Title */}
      <text x={ML} y={yTop + 10} fill={color} fontSize={8.5}
        fontFamily={FONT} fontWeight="600">{title}</text>

      {/* Peak value label */}
      <text x={SVG_W - MR} y={yTop + 10} fill={TEXT_COLOR} fontSize={7.5}
        fontFamily={FONT} textAnchor="end">
        {peakLabel} {unit}
      </text>

      {/* Clip path per panel */}
      <clipPath id={`clip-${title.replace(/\s/g,'')}`}>
        <rect x={ML} y={yTop + TITLE_H} width={PW} height={PANEL_H} />
      </clipPath>

      {/* Zero line */}
      <line x1={ML} y1={yZero} x2={ML + PW} y2={yZero}
        stroke={ZERO_COLOR} strokeWidth={0.8} />

      {/* Filled area */}
      <polygon points={polyPts}
        fill={`${color}18`} stroke="none"
        clipPath={`url(#clip-${title.replace(/\s/g,'')})`} />

      {/* Curve */}
      <polyline points={curvePts}
        fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round"
        clipPath={`url(#clip-${title.replace(/\s/g,'')})`} />

      {/* Y-axis labels at actual data extremes */}
      {Math.max(...vals) > 1e-6 && (
        <text x={ML - 3} y={toY(Math.max(...vals)) + 3}
          fill={TEXT_COLOR} fontSize={6.5} fontFamily={FONT} textAnchor="end">
          {fmt(Math.max(...vals))}
        </text>
      )}
      {Math.min(...vals) < -1e-6 && (
        <text x={ML - 3} y={toY(Math.min(...vals)) + 3}
          fill={TEXT_COLOR} fontSize={6.5} fontFamily={FONT} textAnchor="end">
          {fmt(Math.min(...vals))}
        </text>
      )}

      {/* Border lines for plot area */}
      <line x1={ML} y1={yTop + TITLE_H} x2={ML} y2={yTop + TITLE_H + PANEL_H}
        stroke="rgba(255,255,255,0.06)" strokeWidth={0.7} />
    </g>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function DiagramaEsfuerzosAcero({
  tipoViga = 'biapoyada',
  L        = 6,
  qd       = 0,
  q_ser    = 0,
  Iy       = 0,
  Med      = 0,
  Ved      = 0,
  flecha   = 0,
  modo     = 'cargas',
}) {
  const hasCargas = modo === 'cargas' && qd > 0 && L > 0
  const hasDirecto = modo === 'directo' && (Med > 0 || Ved > 0)

  let pts
  if (hasCargas) {
    pts = computeUDLCurves(tipoViga, L, qd, q_ser, Iy)
  } else if (hasDirecto) {
    pts = computeSchematicCurves(tipoViga, Med, Ved, flecha)
  } else {
    // Placeholder: flat lines
    pts = Array.from({ length: N_PTS + 1 }, (_, i) => ({
      t: i / N_PTS, M_kNm: 0, V_kN: 0, f_mm: 0,
    }))
  }

  const yPanel     = (idx) => MT + idx * (TITLE_H + PANEL_H + PANEL_SP)
  const yPlotsEnd  = yPanel(2) + TITLE_H + PANEL_H   // bottom of last plot area
  const yXAxis     = yPlotsEnd + 3                    // y of tick marks
  const yXLabel    = yPlotsEnd + 12                   // y of text labels

  // X positions for the 3 ticks: 0, L/2, L
  const xTicks = [
    { t: 0,   label: '0',                    anchor: 'start'  },
    { t: 0.5, label: fmtDist(L / 2),         anchor: 'middle' },
    { t: 1,   label: `${fmtDist(L)} m`,      anchor: 'end'    },
  ]

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: '100%', display: 'block', overflow: 'hidden' }}
    >
      {/* ── Vertical guide lines at 0, L/2, L ───────────── */}
      {xTicks.map(({ t }) => (
        <line key={t}
          x1={ML + t * PW} y1={MT + TITLE_H}
          x2={ML + t * PW} y2={yPlotsEnd}
          stroke="rgba(255,255,255,0.05)" strokeWidth={0.8}
          strokeDasharray={t === 0 || t === 1 ? 'none' : '3 3'}
        />
      ))}

      {/* ── Momento flector M ────────────────────────────── */}
      <PanelSVG
        pts={pts}
        accessor={p => p.M_kNm}
        color={M_COLOR}
        title="Momento M"
        unit="kN·m"
        yTop={yPanel(0)}
        invert={true}
      />

      {/* ── Esfuerzo cortante V ──────────────────────────── */}
      <PanelSVG
        pts={pts}
        accessor={p => p.V_kN}
        color={V_COLOR}
        title="Cortante V"
        unit="kN"
        yTop={yPanel(1)}
      />

      {/* ── Flecha f ─────────────────────────────────────── */}
      <PanelSVG
        pts={pts}
        accessor={p => p.f_mm}
        color={F_COLOR}
        title="Flecha f"
        unit="mm"
        yTop={yPanel(2)}
        positiveOnly={true}
        invert={true}
      />

      {/* ── Separators between panels ────────────────────── */}
      <line x1={ML} y1={yPanel(1) - 3} x2={ML + PW} y2={yPanel(1) - 3}
        stroke="rgba(255,255,255,0.04)" strokeWidth={0.7} />
      <line x1={ML} y1={yPanel(2) - 3} x2={ML + PW} y2={yPanel(2) - 3}
        stroke="rgba(255,255,255,0.04)" strokeWidth={0.7} />

      {/* ── X-axis: baseline + ticks + labels ────────────── */}
      <line x1={ML} y1={yPlotsEnd} x2={ML + PW} y2={yPlotsEnd}
        stroke="rgba(255,255,255,0.10)" strokeWidth={0.8} />
      {xTicks.map(({ t, label, anchor }) => (
        <g key={t}>
          <line
            x1={ML + t * PW} y1={yPlotsEnd}
            x2={ML + t * PW} y2={yXAxis}
            stroke={TEXT_COLOR} strokeWidth={0.8}
          />
          <text
            x={ML + t * PW} y={yXLabel}
            fill={TEXT_COLOR} fontSize={7.5} fontFamily={FONT}
            textAnchor={anchor}
          >
            {label}
          </text>
        </g>
      ))}

      {/* ── Placeholder label ─────────────────────────────── */}
      {!hasCargas && !hasDirecto && (
        <text
          x={SVG_W / 2} y={MT + (SVG_H - XAXIS_H) / 2}
          fill={TEXT_COLOR} fontSize={8} fontFamily={FONT}
          textAnchor="middle"
        >
          Introduce cargas para ver los diagramas
        </text>
      )}
    </svg>
  )
}
