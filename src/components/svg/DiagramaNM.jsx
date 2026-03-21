/**
 * DiagramaNM.jsx
 * Diagrama de interacción N-M para pilares de hormigón armado.
 *
 * Props:
 *   puntos  [{N [kN], M [kN·m]}]  — rama M ≥ 0 del diagrama
 *   punto   {N, M}                — punto de solicitación de cálculo (con pandeo)
 *   cumple  boolean
 */

const ACCENT     = '#38bdf8'
const OK_COLOR   = '#22c55e'
const FAIL_COLOR = '#ef4444'
const GRID_COLOR = 'rgba(255,255,255,0.04)'
const AXIS_COLOR = '#334155'
const TEXT_COLOR = '#64748b'
const FONT       = "'JetBrains Mono', monospace"

/* ── Ticks "bonitos" ─────────────────────────────────────────────────────── */
function niceTicks(min, max, count = 5) {
  const range = max - min
  if (range <= 0) return [min, max]
  const rawStep = range / count
  const pow  = Math.pow(10, Math.floor(Math.log10(rawStep)))
  for (const mult of [1, 2, 2.5, 5, 10]) {
    if (mult * pow >= rawStep * 0.9) {
      const step  = mult * pow
      const first = Math.ceil(min / step) * step
      const ticks = []
      for (let t = first; t <= max + step * 0.01; t += step) {
        ticks.push(+t.toFixed(10))
      }
      return ticks
    }
  }
  return [min, max]
}

function fmtTick(v) {
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'k'
  if (Math.abs(v) >= 100)  return Math.round(v).toString()
  if (Math.abs(v) >= 10)   return v.toFixed(1)
  return v.toFixed(2)
}

/* ── Componente ──────────────────────────────────────────────────────────── */
export default function DiagramaNM({ puntos = [], punto = null, cumple = true }) {
  if (!puntos || puntos.length < 3) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 200, color: '#475569', fontSize: '0.75rem',
        fontFamily: FONT,
      }}>
        Calcular para ver el diagrama N-M
      </div>
    )
  }

  /* ── Construir diagrama completo (simétrico: rama + mirror) ─────────────── */
  // La rama positiva viene del motor; la negativa es el espejo
  const rightHalf = puntos.filter(p => isFinite(p.N) && isFinite(p.M))
  const leftHalf  = [...rightHalf].reverse().map(p => ({ N: p.N, M: -p.M }))
  const allPts    = [...rightHalf, ...leftHalf]

  /* ── Rangos ──────────────────────────────────────────────────────────────── */
  const allN = allPts.map(p => p.N)
  const allM = allPts.map(p => p.M)

  let Nmin = Math.min(...allN)
  let Nmax = Math.max(...allN)
  let Mmin = Math.min(...allM)
  let Mmax = Math.max(...allM)

  // Incluir origen y punto de diseño
  Nmin = Math.min(Nmin, 0)
  Nmax = Math.max(Nmax, 0)
  Mmin = Math.min(Mmin, 0)
  Mmax = Math.max(Mmax, 0)

  if (punto) {
    Nmin = Math.min(Nmin, punto.N * 1.15)
    Nmax = Math.max(Nmax, punto.N * 1.05)
    Mmin = Math.min(Mmin, -Math.abs(punto.M) * 1.15)
    Mmax = Math.max(Mmax, Math.abs(punto.M) * 1.15)
  }

  // Padding
  const Nr = Nmax - Nmin || 1
  const Mr = Mmax - Mmin || 1
  Nmin -= Nr * 0.06
  Nmax += Nr * 0.06
  Mmin -= Mr * 0.06
  Mmax += Mr * 0.06

  /* ── Layout SVG ──────────────────────────────────────────────────────────── */
  const MG = { t: 12, r: 18, b: 38, l: 52 }
  const PW = 240, PH = 180
  const vbW = MG.l + PW + MG.r
  const vbH = MG.t + PH + MG.b

  // Mapeo coordenadas de datos → píxeles SVG
  const mx = (M) => MG.l + ((M - Mmin) / (Mmax - Mmin)) * PW
  const my = (N) => MG.t + (1 - (N - Nmin) / (Nmax - Nmin)) * PH

  /* ── Grid y ticks ────────────────────────────────────────────────────────── */
  const ticksN = niceTicks(Nmin, Nmax, 5)
  const ticksM = niceTicks(Mmin, Mmax, 5)

  /* ── Polígono del diagrama ───────────────────────────────────────────────── */
  const polyPts = allPts
    .map(p => `${mx(p.M).toFixed(2)},${my(p.N).toFixed(2)}`)
    .join(' ')

  /* ── Punto de diseño ─────────────────────────────────────────────────────── */
  const ox = mx(0), oy = my(0)
  const ptColor = cumple ? OK_COLOR : FAIL_COLOR
  const px = punto ? mx(punto.M) : null
  const py = punto ? my(punto.N) : null

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ width: '100%', display: 'block', overflow: 'visible' }}
    >
      {/* ── Clip path for plot area ───────────────────────────────────── */}
      <defs>
        <clipPath id="plotClip">
          <rect x={MG.l} y={MG.t} width={PW} height={PH} />
        </clipPath>
      </defs>

      {/* ── Background ────────────────────────────────────────────────── */}
      <rect x={MG.l} y={MG.t} width={PW} height={PH}
        fill="rgba(15,23,42,0.0)" />

      {/* ── Grid ──────────────────────────────────────────────────────── */}
      {ticksN.map((n, i) => (
        <line key={`gn${i}`} x1={MG.l} y1={my(n)} x2={MG.l + PW} y2={my(n)}
          stroke={GRID_COLOR} strokeWidth={1} />
      ))}
      {ticksM.map((m, i) => (
        <line key={`gm${i}`} x1={mx(m)} y1={MG.t} x2={mx(m)} y2={MG.t + PH}
          stroke={GRID_COLOR} strokeWidth={1} />
      ))}

      {/* ── Diagrama de interacción ───────────────────────────────────── */}
      <polygon
        points={polyPts}
        fill={`${ACCENT}12`}
        stroke={ACCENT}
        strokeWidth={1.4}
        strokeLinejoin="round"
        clipPath="url(#plotClip)"
      />

      {/* ── Ejes ──────────────────────────────────────────────────────── */}
      {/* Eje N (vertical) */}
      <line x1={ox} y1={MG.t} x2={ox} y2={MG.t + PH} stroke={AXIS_COLOR} strokeWidth={0.9} />
      {/* Eje M (horizontal) */}
      <line x1={MG.l} y1={oy} x2={MG.l + PW} y2={oy} stroke={AXIS_COLOR} strokeWidth={0.9} />

      {/* ── Ticks y etiquetas eje N (izquierda) ───────────────────────── */}
      {ticksN.map((n, i) => (
        <g key={`tn${i}`}>
          <line x1={MG.l - 3} y1={my(n)} x2={MG.l} y2={my(n)} stroke={TEXT_COLOR} strokeWidth={0.7} />
          <text
            x={MG.l - 5} y={my(n) + 3.5}
            textAnchor="end" fill={TEXT_COLOR} fontSize={7.5}
            fontFamily={FONT}
          >
            {fmtTick(n)}
          </text>
        </g>
      ))}

      {/* ── Ticks y etiquetas eje M (abajo) ───────────────────────────── */}
      {ticksM.map((m, i) => (
        <g key={`tm${i}`}>
          <line x1={mx(m)} y1={MG.t + PH} x2={mx(m)} y2={MG.t + PH + 3} stroke={TEXT_COLOR} strokeWidth={0.7} />
          <text
            x={mx(m)} y={MG.t + PH + 12}
            textAnchor="middle" fill={TEXT_COLOR} fontSize={7.5}
            fontFamily={FONT}
          >
            {fmtTick(m)}
          </text>
        </g>
      ))}

      {/* ── Labels de ejes ────────────────────────────────────────────── */}
      {/* N label (rotado, izquierda) */}
      <text
        x={10} y={MG.t + PH / 2}
        textAnchor="middle" fill={TEXT_COLOR} fontSize={8}
        fontFamily={FONT}
        transform={`rotate(-90, 10, ${MG.t + PH / 2})`}
      >
        N (kN)
      </text>
      {/* M label (abajo) */}
      <text
        x={MG.l + PW / 2} y={vbH - 4}
        textAnchor="middle" fill={TEXT_COLOR} fontSize={8}
        fontFamily={FONT}
      >
        M (kN·m)
      </text>

      {/* ── Línea origen → punto de diseño ────────────────────────────── */}
      {punto && px !== null && (
        <line
          x1={ox} y1={oy} x2={px} y2={py}
          stroke={ptColor} strokeWidth={0.9}
          strokeDasharray="3 2.5"
          opacity={0.8}
        />
      )}

      {/* ── Punto de diseño ───────────────────────────────────────────── */}
      {punto && px !== null && (
        <g>
          <circle cx={px} cy={py} r={6} fill={`${ptColor}22`} />
          <circle cx={px} cy={py} r={3.5} fill={ptColor} />
          <circle cx={px} cy={py} r={3.5} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={0.7} />
        </g>
      )}

      {/* ── Punto de origen ───────────────────────────────────────────── */}
      <circle cx={ox} cy={oy} r={2} fill={AXIS_COLOR} opacity={0.6} />
    </svg>
  )
}
