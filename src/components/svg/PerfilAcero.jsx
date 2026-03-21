/**
 * PerfilAcero.jsx
 * SVG de perfil en I (IPE, HEB, HEA, UPN) con proporciones reales y cotas.
 * Mismo estilo visual que SeccionRectangular.
 */

const C = {
  fill:    'rgba(30,58,100,0.22)',
  stroke:  '#94a3b8',
  dim:     '#64748b',
  dimText: '#94a3b8',
}

const MAX_W = 200
const MAX_H = 240
const MG    = { t: 38, r: 80, b: 42, l: 20 }
const FONT  = "'JetBrains Mono', monospace"

/* ── Helpers de flechas ────────────────────────────────────────────────── */
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

/* ── Componente ─────────────────────────────────────────────────────────── */
export default function PerfilAcero({ perfil }) {
  if (!perfil) return null

  const { h = 200, b = 100, tw = 6, tf = 10 } = perfil

  const scale = Math.min(MAX_W / b, MAX_H / h)
  const W  = b  * scale   // ancho total
  const Hp = h  * scale   // altura total
  const TF = tf * scale   // espesor ala
  const TW = tw * scale   // espesor alma

  const sx = MG.l
  const sy = MG.t
  const vbW = MG.l + W + MG.r
  const vbH = MG.t + Hp + MG.b

  // Posiciones de las 3 rectángulos del perfil I
  const alaTop = { x: sx,              y: sy,          w: W,  h: TF }
  const alaBot = { x: sx,              y: sy + Hp - TF, w: W,  h: TF }
  const alma   = { x: sx + (W - TW)/2, y: sy + TF,     w: TW, h: Hp - 2 * TF }

  /* ── Cotas ─────────────────────────────────────────────────────────────── */
  // b (horizontal, encima)
  const dimY_b  = sy - 14
  const textY_b = sy - 20

  // h (vertical, derecha)
  const dimX_h  = sx + W + 18
  const textX_h = dimX_h + 14

  // tf (vertical, pequeña, derecha, marcando el ala superior)
  const tfX = sx + W + 42
  const tfTextX = tfX + 12

  // tw (horizontal, pequeña, en el alma)
  const twY = sy + Hp / 2
  const twTextY = twY + 12

  return (
    <svg
      viewBox={`0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
      style={{ width: '100%', maxHeight: 300, display: 'block', overflow: 'visible' }}
    >
      {/* ── Perfil I ──────────────────────────────────────────────────── */}
      {[alaTop, alaBot, alma].map((r, i) => (
        <rect
          key={i}
          x={r.x} y={r.y} width={r.w} height={r.h}
          fill={C.fill}
          stroke={C.stroke}
          strokeWidth={1.3}
          strokeLinejoin="miter"
        />
      ))}

      {/* ── Cota b (arriba) ───────────────────────────────────────────── */}
      <line x1={sx}   y1={sy - 4} x2={sx}   y2={sy - 16} stroke={C.dim} strokeWidth={0.7} />
      <line x1={sx+W} y1={sy - 4} x2={sx+W} y2={sy - 16} stroke={C.dim} strokeWidth={0.7} />
      <HArrow x1={sx} x2={sx + W} y={dimY_b} />
      <text x={sx + W/2} y={textY_b - 2} textAnchor="middle" fill={C.dimText} fontSize={8.5} fontFamily={FONT}>
        b = {b} mm
      </text>

      {/* ── Cota h (derecha) ──────────────────────────────────────────── */}
      <line x1={sx+W+4} y1={sy}    x2={sx+W+16} y2={sy}    stroke={C.dim} strokeWidth={0.7} />
      <line x1={sx+W+4} y1={sy+Hp} x2={sx+W+16} y2={sy+Hp} stroke={C.dim} strokeWidth={0.7} />
      <VArrow x={dimX_h} y1={sy} y2={sy + Hp} />
      <text
        x={textX_h} y={sy + Hp/2}
        textAnchor="middle" fill={C.dimText} fontSize={8.5} fontFamily={FONT}
        transform={`rotate(-90, ${textX_h}, ${sy + Hp/2})`}
      >
        h = {h} mm
      </text>

      {/* ── Cota tf (ala superior, derecha) ───────────────────────────── */}
      {TF > 3 && (
        <>
          <line x1={sx+W+4} y1={sy}    x2={tfX} y2={sy}    stroke={C.dim} strokeWidth={0.6} strokeDasharray="2 2" />
          <line x1={sx+W+4} y1={sy+TF} x2={tfX} y2={sy+TF} stroke={C.dim} strokeWidth={0.6} strokeDasharray="2 2" />
          <VArrow x={tfX} y1={sy} y2={sy + TF} color={C.dim} sz={3} />
          <text x={tfTextX} y={sy + TF/2 + 3} fill={C.dimText} fontSize={7.5} fontFamily={FONT}>
            tf={tf}
          </text>
        </>
      )}

      {/* ── Cota tw (alma, abajo del centro) ──────────────────────────── */}
      {TW > 2 && (
        <>
          <line x1={sx+(W-TW)/2} y1={twY+4} x2={sx+(W-TW)/2} y2={twY+18} stroke={C.dim} strokeWidth={0.6} strokeDasharray="2 2" />
          <line x1={sx+(W+TW)/2} y1={twY+4} x2={sx+(W+TW)/2} y2={twY+18} stroke={C.dim} strokeWidth={0.6} strokeDasharray="2 2" />
          <HArrow x1={sx+(W-TW)/2} x2={sx+(W+TW)/2} y={twY + 16} color={C.dim} sz={3} />
          <text x={sx + W/2} y={twTextY + 18} textAnchor="middle" fill={C.dimText} fontSize={7.5} fontFamily={FONT}>
            tw={tw}
          </text>
        </>
      )}
    </svg>
  )
}
