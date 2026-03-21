/**
 * MuroContencion.jsx
 * Vista en alzado (sección transversal) de un muro de hormigón con zapata corrida.
 * Muestra: geometría, terreno, agua, diagrama de empujes, diagrama de tensiones,
 * y armadura esquemática.
 */

const C = {
  fill:      'rgba(30,58,100,0.22)',
  stroke:    '#94a3b8',
  earth:     'rgba(120,90,40,0.22)',
  earthStk:  '#92805a',
  water:     'rgba(59,130,246,0.18)',
  waterStk:  '#3b82f6',
  press:     'rgba(239,68,68,0.18)',
  pressStk:  '#ef4444',
  react:     'rgba(34,197,94,0.18)',
  reactStk:  '#22c55e',
  rebar:     '#60a5fa',
  rebarBg:   '#334155',
  dim:       '#64748b',
  dimText:   '#94a3b8',
}

const FONT      = "'JetBrains Mono', monospace"
const DRAW_W    = 180   // ancho útil del dibujo [px]
const DRAW_H    = 175   // alto útil del dibujo [px]
const MG        = { t: 18, r: 78, b: 52, l: 22 }
const PRESS_MAX = 48    // ancho máximo del diagrama de empujes [px]
const REACT_MAX = 30    // alto máximo del diagrama de tensiones [px]
const BAR_R     = 3.2   // radio de barra de armadura [px]

/* ── Helpers de cotas ───────────────────────────────────────────────── */
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

/* ── Componente ─────────────────────────────────────────────────────── */
export default function MuroContencion({ inputs = {}, resultados = {} }) {
  const {
    H = 3, hz = 0.5, lp = 0.6, lt = 1.4,
    bwBase = 0.3, bwTop = 0.2,
    gamma = 18, phi = 30, q = 10,
    hayAgua = false, hf = 0, gammaW = 10,
    armAlzado  = { nBarras: 6, diametro: 16 },
    armTalon   = { nBarras: 6, diametro: 16 },
    armPuntera = { nBarras: 6, diametro: 12 },
  } = inputs

  const B = lp + bwBase + lt

  /* ── Escalas ────────────────────────────────────────────────────── */
  const scaleX = DRAW_W / B
  const scaleY = DRAW_H / (hz + H)

  // Transformaciones: real → SVG
  const tx = (x) => MG.l + x * scaleX
  const ty = (y) => MG.t + (hz + H - y) * scaleY   // y real: 0=base zapata, crece hacia arriba

  /* ── Geometría del alzado ───────────────────────────────────────── */
  // Cara frontal vertical (x = lp en toda la altura), cara trasera inclinada
  const wallPts = [
    tx(lp),           ty(hz),           // arranque fachada
    tx(lp + bwBase),  ty(hz),           // arranque trasdós
    tx(lp + bwTop),   ty(hz + H),       // coronación trasdós
    tx(lp),           ty(hz + H),       // coronación fachada
  ].reduce((a, v, i) => (i % 2 === 0 ? [...a, [v]] : [...a.slice(0, -1), [...a[a.length - 1], v]]), [])
    .map(([x, y]) => `${x},${y}`).join(' ')

  /* ── Tierra en trasdós ──────────────────────────────────────────── */
  // Fills from wall back face to right edge at full height
  function xBack(y_real) {
    // interpolación lineal de la cara trasera del muro
    return lp + bwBase - (bwBase - bwTop) * Math.max(0, (y_real - hz)) / H
  }

  const earthPts = [
    `${tx(xBack(hz))},${ty(hz)}`,
    `${tx(B)},${ty(hz)}`,
    `${tx(B)},${ty(hz + H)}`,
    `${tx(xBack(hz + H))},${ty(hz + H)}`,
  ].join(' ')

  /* ── Agua ───────────────────────────────────────────────────────── */
  let waterPts = null
  if (hayAgua && hf > hz) {
    const y_wl = Math.min(hf, hz + H)
    const y_wb = hz
    const xb_wl = xBack(y_wl)
    waterPts = [
      `${tx(xBack(y_wb))},${ty(y_wb)}`,
      `${tx(B)},${ty(y_wb)}`,
      `${tx(B)},${ty(y_wl)}`,
      `${tx(xb_wl)},${ty(y_wl)}`,
    ].join(' ')
  }

  /* ── Diagrama de empujes activos ────────────────────────────────── */
  // Ka (Rankine)
  const Ka    = Math.tan((45 - phi / 2) * Math.PI / 180) ** 2
  const p_top = Ka * q                             // presión en coronación
  const p_bot = Ka * gamma * H + Ka * q            // presión en base muro
  const pScale = p_bot > 0 ? PRESS_MAX / p_bot : 0

  // El diagrama se extiende hacia la DERECHA desde la cara trasera del muro
  const pressPts = [
    `${tx(xBack(hz + H)) + p_top * pScale},${ty(hz + H)}`,
    `${tx(xBack(hz + H))},${ty(hz + H)}`,
    `${tx(xBack(hz))},${ty(hz)}`,
    `${tx(xBack(hz)) + p_bot * pScale},${ty(hz)}`,
  ].join(' ')

  // Flecha indicadora de Pa
  const Pa_y  = ty(hz + H / 3)    // punto de aplicación triangular en SVG
  const arrowX1 = tx(xBack(hz + H / 3)) + (p_top + (p_bot - p_top) * (2 / 3)) * pScale
  const arrowX2 = tx(xBack(hz + H / 3))

  /* ── Diagrama de tensiones bajo zapata ──────────────────────────── */
  const sigmaMax = resultados?.tensiones?.sigmaMax ?? p_bot * 0.9
  const sigmaMin = resultados?.tensiones?.sigmaMin ?? p_bot * 0.4
  const rScale   = sigmaMax > 0 ? REACT_MAX / sigmaMax : 0

  const y_base = ty(0)  // y SVG de la base de la zapata
  const reactPts = [
    `${tx(0)},${y_base}`,
    `${tx(B)},${y_base}`,
    `${tx(B)},${y_base + sigmaMin * rScale}`,
    `${tx(0)},${y_base + sigmaMax * rScale}`,
  ].join(' ')

  /* ── Cotas ──────────────────────────────────────────────────────── */
  // H (altura tierra) — lado derecho
  const dimX_H   = tx(B) + PRESS_MAX + 10
  const dimX_hz  = tx(B) + 10
  // Dimensiones horizontales — encima de la zapata (debajo de la coronación)
  const dimY_top = ty(hz + H) - 12

  /* ── ViewBox final ──────────────────────────────────────────────── */
  const vbW = MG.l + DRAW_W + PRESS_MAX + MG.r
  const vbH = MG.t + DRAW_H + REACT_MAX + MG.b

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ width: '100%', maxHeight: 380, display: 'block', overflow: 'visible' }}
    >
      {/* ── Tierra trasdós ──────────────────────────────────────── */}
      <polygon points={earthPts} fill={C.earth} stroke={C.earthStk} strokeWidth={0.8} />

      {/* Hachuras terreno */}
      {Array.from({ length: 6 }, (_, i) => {
        const xt = tx(lp + bwTop + 0.05 + i * (lt - 0.05) / 5)
        return (
          <line key={i}
            x1={xt} y1={ty(hz + H)} x2={xt - 4} y2={ty(hz + H) - 10}
            stroke={C.earthStk} strokeWidth={0.5} />
        )
      })}

      {/* ── Agua ────────────────────────────────────────────────── */}
      {waterPts && (
        <polygon points={waterPts} fill={C.water} stroke={C.waterStk} strokeWidth={0.7} />
      )}
      {hayAgua && hf > hz && (
        <line x1={tx(xBack(Math.min(hf, hz + H)))} y1={ty(Math.min(hf, hz + H))}
          x2={tx(B)} y2={ty(Math.min(hf, hz + H))}
          stroke={C.waterStk} strokeWidth={1} strokeDasharray="3 2" />
      )}

      {/* ── Diagrama de empujes ──────────────────────────────────── */}
      <polygon points={pressPts} fill={C.press} stroke={C.pressStk} strokeWidth={0.8} />

      {/* Flecha resultante de Pa */}
      <line x1={arrowX1} y1={Pa_y} x2={arrowX2 + 2} y2={Pa_y}
        stroke={C.pressStk} strokeWidth={1.2} markerEnd="none" />
      <polygon
        points={`${arrowX2},${Pa_y} ${arrowX2+5},${Pa_y-2} ${arrowX2+5},${Pa_y+2}`}
        fill={C.pressStk}
      />
      {/* Etiqueta p_bot */}
      <text
        x={tx(xBack(hz)) + p_bot * pScale + 2}
        y={ty(hz) + 4}
        fill={C.pressStk} fontSize={6.5} fontFamily={FONT}
      >
        {p_bot.toFixed(1)} kN/m²
      </text>

      {/* ── Zapata ──────────────────────────────────────────────── */}
      <rect
        x={tx(0)} y={ty(hz)} width={B * scaleX} height={hz * scaleY}
        fill={C.fill} stroke={C.stroke} strokeWidth={1.3}
      />

      {/* ── Alzado ──────────────────────────────────────────────── */}
      <polygon points={wallPts} fill={C.fill} stroke={C.stroke} strokeWidth={1.3} />

      {/* ── Diagrama de tensiones bajo zapata ────────────────── */}
      <polygon points={reactPts} fill={C.react} stroke={C.reactStk} strokeWidth={0.8} />
      {/* Etiquetas σmax, σmin */}
      <text x={tx(0)} y={y_base + sigmaMax * rScale + 9}
        fill={C.reactStk} fontSize={6.5} fontFamily={FONT} textAnchor="middle">
        {sigmaMax.toFixed(1)}
      </text>
      {sigmaMin > 0 && (
        <text x={tx(B)} y={y_base + sigmaMin * rScale + 9}
          fill={C.reactStk} fontSize={6.5} fontFamily={FONT} textAnchor="middle">
          {sigmaMin.toFixed(1)}
        </text>
      )}
      <text x={tx(B / 2)} y={y_base + REACT_MAX + 18}
        fill={C.dimText} fontSize={6} fontFamily={FONT} textAnchor="middle">
        σ [kN/m²]
      </text>

      {/* ── Armadura esquemática ────────────────────────────────── */}
      {/* Alzado: barras en trasdós, arranque */}
      <circle cx={tx(lp + bwBase - 0.04)} cy={ty(hz + 0.15)} r={BAR_R} fill={C.rebar} />
      <text x={tx(lp + bwBase - 0.04) + 5} y={ty(hz + 0.15) + 3}
        fill={C.rebar} fontSize={5.5} fontFamily={FONT}>
        alz ∅{armAlzado?.diametro}
      </text>

      {/* Talón: barras cara superior */}
      <circle cx={tx(lp + bwBase + lt * 0.5)} cy={ty(hz - 0.06)} r={BAR_R} fill={C.rebar} />
      <text x={tx(lp + bwBase + lt * 0.5) + 5} y={ty(hz - 0.06) + 3}
        fill={C.rebar} fontSize={5.5} fontFamily={FONT}>
        tal ∅{armTalon?.diametro}
      </text>

      {/* Puntera: barras cara inferior */}
      <circle cx={tx(lp * 0.5)} cy={ty(0.06)} r={BAR_R} fill={C.dimText} />
      <text x={tx(lp * 0.5) - 24} y={ty(0.06) - 4}
        fill={C.dimText} fontSize={5.5} fontFamily={FONT}>
        pun ∅{armPuntera?.diametro}
      </text>

      {/* ── Cotas ────────────────────────────────────────────────── */}

      {/* H (altura de tierras) — derecha */}
      <line x1={tx(B) + 3}  y1={ty(hz)}    x2={dimX_H} y2={ty(hz)}    stroke={C.dim} strokeWidth={0.6} />
      <line x1={tx(B) + 3}  y1={ty(hz+H)}  x2={dimX_H} y2={ty(hz+H)}  stroke={C.dim} strokeWidth={0.6} />
      <VArrow x={dimX_H - 2} y1={ty(hz + H)} y2={ty(hz)} />
      <text
        x={dimX_H + 10} y={ty(hz + H / 2) + 3}
        textAnchor="middle" fill={C.dimText} fontSize={7.5} fontFamily={FONT}
        transform={`rotate(-90, ${dimX_H + 10}, ${ty(hz + H / 2)})`}
      >
        H={H}m
      </text>

      {/* hz (canto zapata) — derecha */}
      <line x1={tx(B) + 3}  y1={ty(0)}   x2={dimX_hz} y2={ty(0)}   stroke={C.dim} strokeWidth={0.6} />
      <VArrow x={dimX_hz - 2} y1={ty(hz)} y2={ty(0)} />
      <text
        x={dimX_hz + 8} y={ty(hz / 2) + 3}
        textAnchor="middle" fill={C.dimText} fontSize={6.5} fontFamily={FONT}
        transform={`rotate(-90, ${dimX_hz + 8}, ${ty(hz / 2)})`}
      >
        hz={hz}
      </text>

      {/* lp, bwBase, lt — horizontal arriba */}
      {/* lp */}
      <line x1={tx(0)}          y1={ty(hz+H)+4} x2={tx(0)}          y2={dimY_top} stroke={C.dim} strokeWidth={0.5} />
      <line x1={tx(lp)}         y1={ty(hz+H)+4} x2={tx(lp)}         y2={dimY_top} stroke={C.dim} strokeWidth={0.5} />
      <HArrow x1={tx(0)} x2={tx(lp)} y={dimY_top + 4} />
      <text x={tx(lp / 2)} y={dimY_top} textAnchor="middle" fill={C.dimText} fontSize={6.5} fontFamily={FONT}>
        lp={lp}
      </text>

      {/* bwBase */}
      <line x1={tx(lp + bwBase)} y1={ty(hz+H)+4} x2={tx(lp + bwBase)} y2={dimY_top} stroke={C.dim} strokeWidth={0.5} />
      <HArrow x1={tx(lp)} x2={tx(lp + bwBase)} y={dimY_top + 4} />
      <text x={tx(lp + bwBase / 2)} y={dimY_top} textAnchor="middle" fill={C.dimText} fontSize={6.5} fontFamily={FONT}>
        bw={bwBase}
      </text>

      {/* lt */}
      <line x1={tx(B)} y1={ty(hz+H)+4} x2={tx(B)} y2={dimY_top} stroke={C.dim} strokeWidth={0.5} />
      <HArrow x1={tx(lp + bwBase)} x2={tx(B)} y={dimY_top + 4} />
      <text x={tx(lp + bwBase + lt / 2)} y={dimY_top} textAnchor="middle" fill={C.dimText} fontSize={6.5} fontFamily={FONT}>
        lt={lt}
      </text>

      {/* B total */}
      <HArrow x1={tx(0)} x2={tx(B)} y={dimY_top - 8} color="#475569" />
      <text x={tx(B / 2)} y={dimY_top - 11} textAnchor="middle" fill={C.dimText} fontSize={7} fontFamily={FONT} fontWeight="600">
        B = {B.toFixed(2)} m
      </text>

      {/* Nivel freático label */}
      {hayAgua && hf > hz && (
        <text x={tx(B) + 3} y={ty(Math.min(hf, hz + H)) + 3}
          fill={C.waterStk} fontSize={6.5} fontFamily={FONT}>
          N.F. ({hf}m)
        </text>
      )}
    </svg>
  )
}
