/**
 * SeccionLosa.jsx
 * SVG de sección transversal de franja de losa con armadura y resortes de terreno.
 * Mismo estilo visual que SeccionRectangular.
 */

const C = {
  fill:     'rgba(30,58,100,0.22)',
  stroke:   '#94a3b8',
  rebar:    '#60a5fa',
  rebarTop: '#94a3b8',
  soil:     'rgba(120,90,40,0.18)',
  soilStk:  '#92805a',
  spring:   '#64748b',
  dim:      '#64748b',
  dimText:  '#94a3b8',
}

const FONT = "'JetBrains Mono', monospace"

const MAX_W = 220
const MAX_H = 90   // canto máximo dibujado
const MG    = { t: 30, r: 65, b: 70, l: 20 }

function HArrow({ x1, x2, y, color = C.dim, sz = 4 }) {
  if (x2 - x1 < 2 * sz + 2) return null
  return (
    <g>
      <line x1={x1 + sz} y1={y} x2={x2 - sz} y2={y} stroke={color} strokeWidth={0.7} />
      <polygon points={`${x1},${y} ${x1+sz},${y-2} ${x1+sz},${y+2}`} fill={color} />
      <polygon points={`${x2},${y} ${x2-sz},${y-2} ${x2-sz},${y+2}`} fill={color} />
    </g>
  )
}

function VArrow({ x, y1, y2, color = C.dim, sz = 4 }) {
  if (y2 - y1 < 2 * sz + 2) return null
  return (
    <g>
      <line x1={x} y1={y1 + sz} x2={x} y2={y2 - sz} stroke={color} strokeWidth={0.7} />
      <polygon points={`${x},${y1} ${x-2},${y1+sz} ${x+2},${y1+sz}`} fill={color} />
      <polygon points={`${x},${y2} ${x-2},${y2-sz} ${x+2},${y2-sz}`} fill={color} />
    </g>
  )
}

/* ── Resorte de Winkler ─────────────────────────────────────────────────── */
function Spring({ x, y0, height }) {
  const coils = 4
  const amp   = 4
  const pts   = []
  const seg   = height / (coils * 2 + 1)

  // Línea vertical entrada
  pts.push(`M ${x} ${y0}`)
  pts.push(`L ${x} ${y0 + seg * 0.6}`)

  // Zigzag
  for (let i = 0; i < coils * 2; i++) {
    const xOff = i % 2 === 0 ? amp : -amp
    pts.push(`L ${x + xOff} ${y0 + seg * (0.6 + (i + 0.5))}`)
  }
  pts.push(`L ${x} ${y0 + seg * (0.6 + coils * 2 + 0.4)}`)
  pts.push(`L ${x} ${y0 + height}`)

  return <path d={pts.join(' ')} stroke={C.spring} strokeWidth={0.8} fill="none" />
}

/* ── Componente ──────────────────────────────────────────────────────────── */
export default function SeccionLosa({ inputs = {} }) {
  const {
    h            = 0.6,
    B            = 1.0,
    recubrimiento = 50,
    armInf        = { diametro: 16, separacion: 150 },
    armSup        = { diametro: 12, separacion: 200 },
  } = inputs

  const rec_mm = Number(recubrimiento) || 50
  const dInf   = Number(armInf?.diametro)    || 16
  const sInf   = Number(armInf?.separacion)  || 150
  const dSup   = Number(armSup?.diametro)    || 12
  const sSup   = Number(armSup?.separacion)  || 200

  /* ── Escala ─────────────────────────────────────────────────────────── */
  const scale = Math.min(MAX_W / B, MAX_H / h)
  const W  = B * scale
  const Hp = Math.min(h * scale, MAX_H)

  const sx = MG.l
  const sy = MG.t
  const vbW = MG.l + W + MG.r
  const SPRING_H = 30
  const SOIL_H   = 10
  const vbH = sy + Hp + SPRING_H + SOIL_H + MG.b

  /* ── Armaduras ──────────────────────────────────────────────────────── */
  const recPx     = (rec_mm / (h * 1000)) * Hp   // recubrimiento en px
  const rInfPx    = Math.max((dInf / (h * 1000)) * Hp / 2, 2.5)
  const rSupPx    = Math.max((dSup / (h * 1000)) * Hp / 2, 2.0)
  const yInf      = sy + Hp - recPx               // centro barras inf
  const ySup      = sy + recPx                     // centro barras sup

  // Nº de barras visible (máximo 10 en el ancho)
  const nInfVis = Math.min(Math.max(Math.floor(W / ((sInf / (h * 1000)) * Hp * 2 + 4)), 2), 10)
  const nSupVis = Math.min(Math.max(Math.floor(W / ((sSup / (h * 1000)) * Hp * 2 + 4)), 2), 10)
  const sepInfPx = nInfVis > 1 ? W / (nInfVis - 1) : W / 2
  const sepSupPx = nSupVis > 1 ? W / (nSupVis - 1) : W / 2

  /* ── Resortes (5 resortes equiespaciados) ───────────────────────────── */
  const nSprings = 5
  const springY0 = sy + Hp
  const springXs = Array.from({ length: nSprings }, (_, i) =>
    sx + (i + 0.5) * (W / nSprings)
  )

  /* ── Cotas ──────────────────────────────────────────────────────────── */
  const dimX_h = sx + W + 14
  const dimY_B = sy - 12

  return (
    <svg
      viewBox={`0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
      style={{ width: '100%', maxHeight: 260, display: 'block', overflow: 'visible' }}
    >
      {/* ── Sección losa ─────────────────────────────────────────────── */}
      <rect
        x={sx} y={sy} width={W} height={Hp}
        fill={C.fill} stroke={C.stroke} strokeWidth={1.3}
      />

      {/* ── Armadura inferior ──────────────────────────────────────── */}
      {Array.from({ length: nInfVis }, (_, i) => {
        const cx = sx + (nInfVis === 1 ? W / 2 : i * sepInfPx)
        return (
          <circle
            key={`inf${i}`}
            cx={cx} cy={yInf} r={rInfPx}
            fill={C.rebar} stroke={C.rebar} strokeWidth={0.5}
          />
        )
      })}

      {/* ── Armadura superior ──────────────────────────────────────── */}
      {Array.from({ length: nSupVis }, (_, i) => {
        const cx = sx + (nSupVis === 1 ? W / 2 : i * sepSupPx)
        return (
          <circle
            key={`sup${i}`}
            cx={cx} cy={ySup} r={rSupPx}
            fill="none" stroke={C.rebarTop} strokeWidth={1}
          />
        )
      })}

      {/* Recubrimiento dashed lines */}
      <line x1={sx + 2} y1={sy + recPx} x2={sx + W - 2} y2={sy + recPx}
        stroke={C.dimText} strokeWidth={0.4} strokeDasharray="2 3" opacity={0.5} />
      <line x1={sx + 2} y1={sy + Hp - recPx} x2={sx + W - 2} y2={sy + Hp - recPx}
        stroke={C.dimText} strokeWidth={0.4} strokeDasharray="2 3" opacity={0.5} />

      {/* ── Resortes Winkler ──────────────────────────────────────── */}
      {springXs.map((x, i) => (
        <Spring key={i} x={x} y0={springY0} height={SPRING_H} />
      ))}

      {/* Placa de apoyo (línea base resortes) */}
      <line
        x1={sx} y1={springY0 + SPRING_H}
        x2={sx + W} y2={springY0 + SPRING_H}
        stroke={C.spring} strokeWidth={0.7}
      />

      {/* Terreno */}
      <rect
        x={sx} y={springY0 + SPRING_H} width={W} height={SOIL_H}
        fill={C.soil} stroke={C.soilStk} strokeWidth={0.7}
      />
      {Array.from({ length: 7 }, (_, i) => {
        const step = W / 7
        const x0 = sx + i * step + step * 0.1
        return (
          <line key={i} x1={x0} y1={springY0 + SPRING_H}
            x2={x0 - 4} y2={springY0 + SPRING_H + SOIL_H}
            stroke={C.soilStk} strokeWidth={0.5} />
        )
      })}

      {/* Label Winkler */}
      <text
        x={sx + W / 2} y={springY0 + SPRING_H + SOIL_H + 12}
        textAnchor="middle" fill={C.dimText} fontSize={6.5} fontFamily={FONT}
      >
        Modelo Winkler (ks)
      </text>

      {/* ── Cota B (arriba) ────────────────────────────────────────── */}
      <line x1={sx}   y1={sy - 4} x2={sx}   y2={sy - 14} stroke={C.dim} strokeWidth={0.6} />
      <line x1={sx+W} y1={sy - 4} x2={sx+W} y2={sy - 14} stroke={C.dim} strokeWidth={0.6} />
      <HArrow x1={sx} x2={sx + W} y={dimY_B} />
      <text x={sx + W / 2} y={sy - 17} textAnchor="middle" fill={C.dimText} fontSize={7.5} fontFamily={FONT}>
        B = {B} m
      </text>

      {/* ── Cota h (derecha) ────────────────────────────────────────── */}
      <line x1={sx+W+3} y1={sy}    x2={dimX_h} y2={sy}    stroke={C.dim} strokeWidth={0.6} />
      <line x1={sx+W+3} y1={sy+Hp} x2={dimX_h} y2={sy+Hp} stroke={C.dim} strokeWidth={0.6} />
      <VArrow x={dimX_h - 2} y1={sy} y2={sy + Hp} />
      <text
        x={dimX_h + 10} y={sy + Hp / 2 + 3}
        textAnchor="middle" fill={C.dimText} fontSize={7.5} fontFamily={FONT}
        transform={`rotate(-90, ${dimX_h + 10}, ${sy + Hp / 2})`}
      >
        h = {h} m
      </text>

      {/* ── Leyenda armaduras ────────────────────────────────────────── */}
      <circle cx={sx} cy={vbH - 20} r={3} fill={C.rebar} />
      <text x={sx + 7} y={vbH - 17} fill={C.dimText} fontSize={6} fontFamily={FONT}>
        inf ∅{dInf}@{sInf}
      </text>
      <circle cx={sx + 70} cy={vbH - 20} r={3} fill="none" stroke={C.rebarTop} strokeWidth={1} />
      <text x={sx + 77} y={vbH - 17} fill={C.dimText} fontSize={6} fontFamily={FONT}>
        sup ∅{dSup}@{sSup}
      </text>

      {/* ── Label recubrimiento ──────────────────────────────────────── */}
      <text x={sx + W + 3} y={sy + recPx + 3} fill={C.dimText} fontSize={6} fontFamily={FONT}>
        {rec_mm}mm
      </text>
    </svg>
  )
}
