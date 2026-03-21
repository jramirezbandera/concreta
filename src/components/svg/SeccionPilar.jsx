/**
 * SeccionPilar.jsx
 * SVG de sección rectangular de pilar con barras en las 4 caras.
 */

/* ── Paleta ──────────────────────────────────────────────────────────────── */
const C = {
  concrete:    'rgba(30,58,100,0.22)',
  concreteStr: '#94a3b8',
  stirrup:     '#475569',
  bar:         '#38bdf8',
  barLat:      '#7dd3fc',
  dim:         '#64748b',
  dimText:     '#94a3b8',
  cover:       '#334155',
}

const MAX_W = 200
const MAX_H = 200
const MG    = { t: 38, r: 65, b: 65, l: 20 }

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function HArrow({ x1, x2, y, color = C.dim, sz = 4.5 }) {
  if (x2 - x1 < 2 * sz + 2) return null
  return (
    <g>
      <line x1={x1 + sz} y1={y} x2={x2 - sz} y2={y} stroke={color} strokeWidth={0.7} />
      <polygon points={`${x1},${y} ${x1+sz},${y-2} ${x1+sz},${y+2}`} fill={color} />
      <polygon points={`${x2},${y} ${x2-sz},${y-2} ${x2-sz},${y+2}`} fill={color} />
    </g>
  )
}

function VArrow({ x, y1, y2, color = C.dim, sz = 4.5 }) {
  if (y2 - y1 < 2 * sz + 2) return null
  return (
    <g>
      <line x1={x} y1={y1 + sz} x2={x} y2={y2 - sz} stroke={color} strokeWidth={0.7} />
      <polygon points={`${x},${y1} ${x-2},${y1+sz} ${x+2},${y1+sz}`} fill={color} />
      <polygon points={`${x},${y2} ${x-2},${y2-sz} ${x+2},${y2-sz}`} fill={color} />
    </g>
  )
}

function Bar({ cx, cy, r, color = C.bar }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 1.5} fill={`${color}18`} />
      <circle cx={cx} cy={cy} r={r}       fill={color} opacity={0.88} />
      <circle cx={cx} cy={cy} r={r}       fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={0.8} />
    </g>
  )
}

/* ── Posiciones de barras ──────────────────────────────────────────────────── */
function buildBarPositions(armadura, B, H, dp, scale, sx, sy, W, Hp) {
  const bars = []
  const dpPx = dp * scale

  const addHorizFace = (n, r, cy) => {
    if (n <= 0) return
    if (n === 1) { bars.push({ cx: sx + W / 2, cy, r }); return }
    const step = (W - 2 * dpPx) / (n - 1)
    for (let i = 0; i < n; i++) bars.push({ cx: sx + dpPx + i * step, cy, r })
  }

  if (armadura.tipo === 'simetrica') {
    const n  = Math.max(4, Number(armadura.nBarras)  || 4)
    const d  = Math.max(6, Number(armadura.diametro) || 16)
    const r  = Math.max((d / 2) * scale, 2.5)

    const nFace = Math.max(2, Math.round(n / 4))
    const nLat  = Math.max(0, Math.floor((n - 2 * nFace) / 2))

    addHorizFace(nFace, r, sy + dpPx)
    addHorizFace(nFace, r, sy + Hp - dpPx)

    if (nLat > 0) {
      const step = (Hp - 2 * dpPx) / (nLat + 1)
      for (let i = 1; i <= nLat; i++) {
        const cy = sy + dpPx + i * step
        bars.push({ cx: sx + dpPx,     cy, r, lateral: true })
        bars.push({ cx: sx + W - dpPx, cy, r, lateral: true })
      }
    }
  } else {
    const { nSup = 0, diamSup = 16, nInf = 0, diamInf = 16, nLat = 0, diamLat = 12 } = armadura
    const rS = Math.max((Number(diamSup) / 2) * scale, 2.5)
    const rI = Math.max((Number(diamInf) / 2) * scale, 2.5)
    const rL = Math.max((Number(diamLat) / 2) * scale, 2.5)

    addHorizFace(Number(nSup), rS, sy + dpPx)
    addHorizFace(Number(nInf), rI, sy + Hp - dpPx)

    const nl = Number(nLat)
    if (nl > 0 && Number(diamLat) > 0) {
      const step = (Hp - 2 * dpPx) / (nl + 1)
      for (let i = 1; i <= nl; i++) {
        const cy = sy + dpPx + i * step
        bars.push({ cx: sx + dpPx,     cy, r: rL, lateral: true })
        bars.push({ cx: sx + W - dpPx, cy, r: rL, lateral: true })
      }
    }
  }

  return bars
}

/* ── Componente principal ────────────────────────────────────────────────── */
export default function SeccionPilar({ b, h, recubrimiento, armadura }) {
  const B  = Math.max(Number(b)              || 300, 100)
  const H  = Math.max(Number(h)              || 300, 100)
  const dp = Math.max(Number(recubrimiento)  || 40,  10)

  const scale = Math.min(MAX_W / B, MAX_H / H)
  const W  = B * scale
  const Hp = H * scale

  const sx = MG.l
  const sy = MG.t

  const vbW = MG.l + W + MG.r
  const vbH = MG.t + Hp + MG.b

  const dpPx = dp * scale

  // Cotas
  const dimY_b   = sy + Hp + 18
  const extLen_b = 16
  const textY_b  = dimY_b + 13

  const dimX_h   = sx + W + 18
  const extLen_h = 16
  const textX_h  = dimX_h + 14

  // Barras
  const bars = armadura
    ? buildBarPositions(armadura, B, H, dp, scale, sx, sy, W, Hp)
    : []

  return (
    <svg
      viewBox={`0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
      style={{ width: '100%', maxHeight: 300, display: 'block', overflow: 'visible' }}
    >
      {/* ── Sección exterior ───────────────────────────────────────────── */}
      <rect
        x={sx} y={sy} width={W} height={Hp}
        fill={C.concrete}
        stroke={C.concreteStr}
        strokeWidth={1.5}
      />

      {/* ── Estribo (recubrimiento) discontinuo ───────────────────────── */}
      {dpPx > 0 && W - 2 * dpPx > 4 && Hp - 2 * dpPx > 4 && (
        <rect
          x={sx + dpPx} y={sy + dpPx}
          width={W - 2 * dpPx} height={Hp - 2 * dpPx}
          fill="none"
          stroke={C.stirrup}
          strokeWidth={0.9}
          strokeDasharray="4 3"
          rx={dpPx * 0.25}
        />
      )}

      {/* ── Barras ──────────────────────────────────────────────────────── */}
      {bars.map(({ cx, cy, r, lateral }, i) => (
        <Bar key={i} cx={cx} cy={cy} r={r} color={lateral ? C.barLat : C.bar} />
      ))}

      {/* ── Cota recubrimiento (esquina) ───────────────────────────────── */}
      <line
        x1={sx} y1={sy} x2={sx + dpPx} y2={sy + dpPx}
        stroke="#2d3f55" strokeWidth={0.8} strokeDasharray="2.5 2"
      />
      <circle cx={sx + dpPx} cy={sy + dpPx} r={1.5} fill="#475569" />
      <text x={sx + 3} y={sy - 6} fill={C.dimText} fontSize={8} fontFamily="'JetBrains Mono', monospace">
        d' = {dp} mm
      </text>

      {/* ── Cota b (horizontal, abajo) ─────────────────────────────────── */}
      <line x1={sx}   y1={sy + Hp + 4} x2={sx}   y2={sy + Hp + extLen_b} stroke={C.dim} strokeWidth={0.7} />
      <line x1={sx+W} y1={sy + Hp + 4} x2={sx+W} y2={sy + Hp + extLen_b} stroke={C.dim} strokeWidth={0.7} />
      <HArrow x1={sx} x2={sx + W} y={dimY_b} />
      <text x={sx + W / 2} y={textY_b} textAnchor="middle" fill={C.dimText} fontSize={9} fontFamily="'JetBrains Mono', monospace">
        b = {B} mm
      </text>

      {/* ── Cota h (vertical, derecha) ─────────────────────────────────── */}
      <line x1={sx + W + 4} y1={sy}    x2={sx + W + extLen_h} y2={sy}    stroke={C.dim} strokeWidth={0.7} />
      <line x1={sx + W + 4} y1={sy+Hp} x2={sx + W + extLen_h} y2={sy+Hp} stroke={C.dim} strokeWidth={0.7} />
      <VArrow x={dimX_h} y1={sy} y2={sy + Hp} />
      <text
        x={textX_h} y={sy + Hp / 2}
        textAnchor="middle" fill={C.dimText} fontSize={9} fontFamily="'JetBrains Mono', monospace"
        transform={`rotate(-90, ${textX_h}, ${sy + Hp / 2})`}
      >
        h = {H} mm
      </text>
    </svg>
  )
}
