/**
 * SeccionRectangular.jsx
 * SVG de sección rectangular de hormigón armado.
 * Se actualiza en tiempo real al cambiar los props (re-render de React).
 *
 * Sistema de coordenadas: origin en (0,0) de la viewBox, sección
 * posicionada en (MARGIN.l, MARGIN.t).
 * Escala interna: px/mm, ajustada para que la sección quepa en MAX_W × MAX_H.
 */

/* ── Paleta ──────────────────────────────────────────────────────────────── */
const C = {
  concrete:    'rgba(30,58,100,0.22)',  // fill de la sección
  concreteStr: '#94a3b8',              // borde exterior
  stirrup:     '#475569',              // estribo discontinuo
  barTension:  '#38bdf8',              // barras de tracción (cyan)
  barComp:     '#818cf8',              // barras de compresión (violeta)
  dim:         '#64748b',              // líneas de cota
  dimText:     '#94a3b8',             // texto de cotas
  labelT:      '#38bdf8',              // label armadura tracción
  labelC:      '#818cf8',              // label armadura compresión
  cover:       '#334155',             // línea de recubrimiento
}

/* ── Márgenes y límites de escala ────────────────────────────────────────── */
const MAX_W = 220   // ancho máximo de la sección en px
const MAX_H = 265   // alto máximo de la sección en px
const MG = { t: 42, r: 72, b: 72, l: 22 }

/* ── Helpers de dibujo ───────────────────────────────────────────────────── */

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

/* Distribuye n barras de radio r entre xL y xR */
function barXs(n, r, xL, xR) {
  if (n <= 0) return []
  if (n === 1) return [(xL + xR) / 2]
  const step = (xR - xL - 2 * r) / (n - 1)
  return Array.from({ length: n }, (_, i) => xL + r + i * step)
}

/* ── Barra (con brillo) ──────────────────────────────────────────────────── */
function Bar({ cx, cy, r, color }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 1.5} fill={`${color}18`} />
      <circle cx={cx} cy={cy} r={r}       fill={color} opacity={0.88} />
      <circle cx={cx} cy={cy} r={r}       fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={0.8} />
    </g>
  )
}

/* ── Componente principal ────────────────────────────────────────────────── */
export default function SeccionRectangular({
  b,
  h,
  recubrimiento,
  armaduraTraccion,
  armaduraCompresion,
  estribos,
}) {
  /* Parsear props */
  const B   = Math.max(Number(b)   || 300, 50)
  const H   = Math.max(Number(h)   || 500, 100)
  const dp  = Math.max(Number(recubrimiento) || 35, 10)
  const nT  = Math.max(Number(armaduraTraccion?.nBarras)  || 0, 0)
  const φT  = Math.max(Number(armaduraTraccion?.diametro) || 0, 0)
  const hasC = !!armaduraCompresion
  const nC  = hasC ? Math.max(Number(armaduraCompresion.nBarras)  || 0, 0) : 0
  const φC  = hasC ? Math.max(Number(armaduraCompresion.diametro) || 0, 0) : 0
  const φE  = Math.max(Number(estribos?.diametro) || 8, 0)

  /* Escala: que la sección quepa en MAX_W × MAX_H */
  const scale = Math.min(MAX_W / B, MAX_H / H)
  const W  = B * scale   // sección en px
  const Hp = H * scale   // sección en px

  /* Posición de la sección en la viewBox */
  const sx = MG.l
  const sy = MG.t

  /* Dimensiones totales de la viewBox */
  const vbW = MG.l + W + MG.r
  const vbH = MG.t + Hp + MG.b

  /* ── Zona de estribos ──────────────────────────────────────────────────── */
  // Recubrimiento a CdG de estribo (cara ext. → CL estribo) ≈ dp - φT/2 - φE/2
  const cov_st = Math.max(dp - φT / 2 - φE / 2, φE / 2) * scale   // px
  const ix = sx + cov_st
  const iy = sy + cov_st
  const iW = W - 2 * cov_st
  const iHp = Hp - 2 * cov_st

  /* ── Posiciones de las barras ──────────────────────────────────────────── */
  const rT   = Math.max((φT / 2) * scale, 2.5)
  const rC   = Math.max((φC / 2) * scale, 2.5)
  const dpPx = dp * scale   // recubrimiento mecánico en px

  // Tracción: fila inferior (cy = sy + Hp - dp*scale)
  const barY_T = sy + Hp - dpPx
  const xs_T   = barXs(nT, rT, ix + rT, ix + iW - rT)

  // Compresión: fila superior (cy = sy + dp*scale)
  const barY_C = sy + dpPx
  const xs_C   = hasC ? barXs(nC, rC, ix + rC, ix + iW - rC) : []

  /* ── Área de texto para labels ─────────────────────────────────────────── */
  const As_T = (nT * Math.PI * (φT / 2) ** 2 / 100).toFixed(2)
  const As_C = (nC * Math.PI * (φC / 2) ** 2 / 100).toFixed(2)

  /* ── Cotas b (abajo) ───────────────────────────────────────────────────── */
  const dimY_b   = sy + Hp + 18   // y de la línea de cota
  const extLen_b = 16
  const textY_b  = dimY_b + 13

  /* ── Cotas h (derecha) ─────────────────────────────────────────────────── */
  const dimX_h   = sx + W + 18   // x de la línea de cota
  const extLen_h = 16
  const textX_h  = dimX_h + 14

  /* ── Cota recubrimiento (top-left) ──────────────────────────────────────── */
  // Línea diagonal de (sx,sy) a (ix,iy) con texto
  const dpLabel = `d' = ${dp}`

  return (
    <svg
      viewBox={`0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
      style={{ width: '100%', maxHeight: 350, display: 'block', overflow: 'visible' }}
    >
      {/* ── Sección (rectángulo exterior) ─────────────────────────────────── */}
      <rect
        x={sx} y={sy} width={W} height={Hp}
        fill={C.concrete}
        stroke={C.concreteStr}
        strokeWidth={1.5}
      />

      {/* ── Estribo (rectángulo interior discontinuo) ─────────────────────── */}
      {iW > 0 && iHp > 0 && (
        <rect
          x={ix} y={iy} width={iW} height={iHp}
          fill="none"
          stroke={C.stirrup}
          strokeWidth={0.9}
          strokeDasharray="4 3"
          rx={cov_st * 0.3}
        />
      )}

      {/* Esquinas redondeadas del estribo (indicación visual) */}
      {iW > 0 && iHp > 0 && [
        [ix, iy], [ix + iW, iy], [ix, iy + iHp], [ix + iW, iy + iHp],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.2} fill={C.stirrup} />
      ))}

      {/* ── Barras de tracción ────────────────────────────────────────────── */}
      {xs_T.map((cx, i) => (
        <Bar key={`t${i}`} cx={cx} cy={barY_T} r={rT} color={C.barTension} />
      ))}

      {/* ── Barras de compresión ──────────────────────────────────────────── */}
      {xs_C.map((cx, i) => (
        <Bar key={`c${i}`} cx={cx} cy={barY_C} r={rC} color={C.barComp} />
      ))}

      {/* ── Línea de recubrimiento mecánico (esquina top-left) ────────────── */}
      <line
        x1={sx} y1={sy} x2={sx + cov_st} y2={sy + cov_st}
        stroke="#2d3f55" strokeWidth={0.8} strokeDasharray="2.5 2"
      />
      <circle cx={sx + cov_st} cy={sy + cov_st} r={1.5} fill="#475569" />
      <text
        x={sx + 3} y={sy - 6}
        fill={C.dimText} fontSize={8}
        fontFamily="'JetBrains Mono', monospace"
      >
        {dpLabel} mm
      </text>

      {/* ── Cota b (horizontal, debajo) ──────────────────────────────────── */}
      {/* Líneas de prolongación */}
      <line x1={sx}   y1={sy + Hp + 4} x2={sx}   y2={sy + Hp + extLen_b} stroke={C.dim} strokeWidth={0.7} />
      <line x1={sx+W} y1={sy + Hp + 4} x2={sx+W} y2={sy + Hp + extLen_b} stroke={C.dim} strokeWidth={0.7} />
      {/* Flecha */}
      <HArrow x1={sx} x2={sx + W} y={dimY_b} />
      {/* Texto */}
      <text
        x={sx + W / 2} y={textY_b}
        textAnchor="middle" fill={C.dimText} fontSize={9}
        fontFamily="'JetBrains Mono', monospace"
      >
        b = {B} mm
      </text>

      {/* ── Cota h (vertical, a la derecha) ──────────────────────────────── */}
      {/* Líneas de prolongación */}
      <line x1={sx + W + 4} y1={sy}    x2={sx + W + extLen_h} y2={sy}    stroke={C.dim} strokeWidth={0.7} />
      <line x1={sx + W + 4} y1={sy+Hp} x2={sx + W + extLen_h} y2={sy+Hp} stroke={C.dim} strokeWidth={0.7} />
      {/* Flecha */}
      <VArrow x={dimX_h} y1={sy} y2={sy + Hp} />
      {/* Texto rotado */}
      <text
        x={textX_h} y={sy + Hp / 2}
        textAnchor="middle" fill={C.dimText} fontSize={9}
        fontFamily="'JetBrains Mono', monospace"
        transform={`rotate(-90, ${textX_h}, ${sy + Hp / 2})`}
      >
        h = {H} mm
      </text>

      {/* ── Labels de armaduras ───────────────────────────────────────────── */}
      {/* Tracción: debajo de la sección */}
      {nT > 0 && φT > 0 && (
        <text
          x={sx + W / 2} y={sy + Hp + extLen_b + 28}
          textAnchor="middle" fill={C.labelT} fontSize={9}
          fontFamily="'JetBrains Mono', monospace"
        >
          {nT}Ø{φT} · As = {As_T} cm²
        </text>
      )}
      {/* Compresión: encima de la sección */}
      {hasC && nC > 0 && φC > 0 && (
        <text
          x={sx + W / 2} y={sy - 18}
          textAnchor="middle" fill={C.labelC} fontSize={9}
          fontFamily="'JetBrains Mono', monospace"
        >
          {nC}Ø{φC} · As' = {As_C} cm²
        </text>
      )}

      {/* ── Indicador estribo (esquina top-right) ────────────────────────── */}
      {φE > 0 && (
        <text
          x={sx + W - 2} y={sy + 10}
          textAnchor="end" fill={C.stirrup} fontSize={8}
          fontFamily="'JetBrains Mono', monospace"
        >
          □ Ø{φE}
        </text>
      )}
    </svg>
  )
}
