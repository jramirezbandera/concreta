/**
 * ZapataAislada.jsx
 * SVG para zapata aislada: alzado + diagrama de tensiones + planta con armadura.
 * Mismo estilo visual que SeccionRectangular / PerfilAcero.
 */

const C = {
  fill:     'rgba(30,58,100,0.22)',
  stroke:   '#94a3b8',
  pilar:    'rgba(60,40,10,0.25)',
  pilarStk: '#b0926a',
  terrain:  'rgba(120,90,40,0.15)',
  terrainStk: '#92805a',
  sigma:    'rgba(59,130,246,0.18)',
  sigmaStk: '#3b82f6',
  rebar:    '#64748b',
  dim:      '#64748b',
  dimText:  '#94a3b8',
  axisLine: '#475569',
}

const FONT = "'JetBrains Mono', monospace"

/* ── Cota horizontal ──────────────────────────────────────────────────────── */
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

/* ── Cota vertical ────────────────────────────────────────────────────────── */
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

/* ── Componente principal ──────────────────────────────────────────────────── */
export default function ZapataAislada({ inputs = {}, resultados = {} }) {
  const {
    a    = 2.0,
    b    = 2.0,
    h    = 0.5,
    ap   = 0.35,
    bp   = 0.35,
    armaduraA = { nBarras: 8, diametro: 12 },
    armaduraB = { nBarras: 8, diametro: 12 },
  } = inputs

  const tensiones = resultados.tensiones ?? {}
  const sigmaMax  = tensiones.sigmaMax  ?? 100
  const sigmaMin  = tensiones.sigmaMin  ?? 60
  const distrib   = tensiones.distribucion ?? 'trapezoidal'

  /* ── Escalado ──────────────────────────────────────────────────────────── */
  const DRAW_W   = 180   // ancho útil de dibujo [px]
  const DRAW_H_Z = 40    // altura zapata [px] (proporcional a h/a)
  const PILAR_H  = 50    // altura pilar dibujado
  const SIGMA_H  = 36    // altura max del diagrama sigma

  const scaleX  = DRAW_W / a
  const zapW    = DRAW_W
  const zapH    = Math.max(DRAW_H_Z, (h / a) * DRAW_W)
  const pilarW  = (ap / a) * DRAW_W

  /* ── Layout vertical (alzado) ─────────────────────────────────────────── */
  const MG_L    = 22
  const MG_R    = 60
  const MG_T    = 12
  const MG_SIGMA_B = SIGMA_H + 18  // espacio para diagrama sigma debajo zapata

  // coordenadas alzado
  const zx  = MG_L
  const zy  = MG_T + PILAR_H         // y top zapata
  const px  = MG_L + (zapW - pilarW) / 2  // x left pilar
  const py  = MG_T                    // y top pilar

  /* ── Diagrama σ (debajo de la zapata) ─────────────────────────────────── */
  const sigmaY0 = zy + zapH          // base zapata = top diagrama
  const maxVal  = Math.max(sigmaMax, 1)
  const hMax    = distrib === 'trapezoidal' ? SIGMA_H : SIGMA_H
  const hMin    = distrib === 'trapezoidal' ? (sigmaMin / maxVal) * SIGMA_H : 0
  const hMaxPx  = (sigmaMax / maxVal) * SIGMA_H

  // Puntos del diagrama (trapecio o triángulo, tensiones de compresión hacia abajo)
  // lado izquierdo = σmax, lado derecho = σmin
  const sX0 = zx
  const sX1 = zx + zapW
  const sY_topL = sigmaY0 + hMaxPx   // y fondo izq (σmax)
  const sY_topR = sigmaY0 + hMin     // y fondo der (σmin o 0)

  let sigmaPoints
  if (distrib === 'trapezoidal') {
    sigmaPoints = `${sX0},${sigmaY0} ${sX1},${sigmaY0} ${sX1},${sY_topR} ${sX0},${sY_topL}`
  } else {
    // triangular: contacto solo en parte izq
    const xContact = sX0 + zapW * (3 * (a / 2 - Math.abs(tensiones.excentricidad ?? 0)) / a)
    sigmaPoints = `${sX0},${sigmaY0} ${Math.min(xContact, sX1)},${sigmaY0} ${sX0},${sY_topL}`
  }

  /* ── Terreno ──────────────────────────────────────────────────────────── */
  const terrainY  = sigmaY0 + SIGMA_H + 4
  const terrainH  = 10

  /* ── Vista en planta ──────────────────────────────────────────────────── */
  const GAP_ALZADO_PLANTA = 20
  const plantaY  = terrainY + terrainH + GAP_ALZADO_PLANTA
  const plantaW  = DRAW_W
  const scaleB   = DRAW_W / Math.max(a, b)
  const plantaH  = b * scaleB           // alto planta (dirección b)
  const pilPW    = ap * scaleX
  const pilPH    = bp * scaleB
  const pilPX    = MG_L + (plantaW - pilPW) / 2
  const pilPY    = plantaY + (plantaH - pilPH) / 2

  /* ── Parrilla armadura (dirección a: horizontales, dirección b: verticales) */
  const nA   = Number(armaduraA?.nBarras) || 6
  const nB   = Number(armaduraB?.nBarras) || 6
  const recP = 4  // px recubrimiento para dibujo
  const rebarLines_a = []   // horizontal (dirección a)
  const rebarLines_b = []   // vertical (dirección b)

  if (nA >= 2) {
    for (let i = 0; i < nA; i++) {
      const yy = plantaY + recP + (i / (nA - 1)) * (plantaH - 2 * recP)
      rebarLines_a.push({ x1: MG_L + recP, x2: MG_L + plantaW - recP, y: yy })
    }
  }
  if (nB >= 2) {
    for (let j = 0; j < nB; j++) {
      const xx = MG_L + recP + (j / (nB - 1)) * (plantaW - 2 * recP)
      rebarLines_b.push({ x: xx, y1: plantaY + recP, y2: plantaY + plantaH - recP })
    }
  }

  /* ── Dimensiones totales SVG ──────────────────────────────────────────── */
  const vbW = MG_L + DRAW_W + MG_R
  const vbH = plantaY + plantaH + 30

  /* ── Cotas ─────────────────────────────────────────────────────────────── */
  const dimY_a_alzado = sigmaY0 + SIGMA_H + terrainH + 10   // debajo del terreno
  const dimX_h_right  = MG_L + zapW + 14

  return (
    <svg
      viewBox={`0 0 ${vbW.toFixed(0)} ${vbH.toFixed(0)}`}
      style={{ width: '100%', maxHeight: 460, display: 'block', overflow: 'visible' }}
    >
      {/* ── ALZADO ───────────────────────────────────────────────────────── */}

      {/* Pilar */}
      <rect
        x={px} y={py} width={pilarW} height={PILAR_H}
        fill={C.pilar} stroke={C.pilarStk} strokeWidth={1.2}
      />

      {/* Zapata */}
      <rect
        x={zx} y={zy} width={zapW} height={zapH}
        fill={C.fill} stroke={C.stroke} strokeWidth={1.3}
      />

      {/* Diagrama de tensiones */}
      <polygon points={sigmaPoints} fill={C.sigma} stroke={C.sigmaStk} strokeWidth={0.8} />

      {/* Etiqueta σmax */}
      <text
        x={sX0 - 3} y={sY_topL}
        textAnchor="end" fill={C.sigmaStk} fontSize={6.5} fontFamily={FONT}
      >
        {sigmaMax}
      </text>
      {/* Etiqueta σmin (sólo trapezoidal) */}
      {distrib === 'trapezoidal' && sigmaMin > 0 && (
        <text
          x={sX1 + 3} y={sY_topR}
          textAnchor="start" fill={C.sigmaStk} fontSize={6.5} fontFamily={FONT}
        >
          {sigmaMin}
        </text>
      )}
      {/* Línea base σ = 0 */}
      <line
        x1={sX0 - 3} y1={sigmaY0} x2={sX1 + 3} y2={sigmaY0}
        stroke={C.sigmaStk} strokeWidth={0.5} strokeDasharray="2 2"
      />
      {/* Label kN/m² */}
      <text x={sX0} y={sigmaY0 + SIGMA_H + 7} fill={C.dimText} fontSize={6} fontFamily={FONT}>
        σ [kN/m²]
      </text>

      {/* Terreno (hachuras) */}
      <rect
        x={zx} y={terrainY} width={zapW} height={terrainH}
        fill={C.terrain} stroke={C.terrainStk} strokeWidth={0.7}
      />
      {/* Líneas terreno diagonales */}
      {Array.from({ length: 8 }, (_, i) => {
        const step = zapW / 8
        const x0 = zx + i * step
        return (
          <line
            key={i}
            x1={x0} y1={terrainY}
            x2={x0 - 5} y2={terrainY + terrainH}
            stroke={C.terrainStk} strokeWidth={0.5}
          />
        )
      })}

      {/* ── Cotas alzado ─────────────────────────────────────────────────── */}
      {/* Cota a (ancho zapata, encima pilar) */}
      <line x1={zx}      y1={py - 4} x2={zx}      y2={py - 14} stroke={C.dim} strokeWidth={0.6} />
      <line x1={zx+zapW} y1={py - 4} x2={zx+zapW} y2={py - 14} stroke={C.dim} strokeWidth={0.6} />
      <HArrow x1={zx} x2={zx + zapW} y={py - 10} />
      <text x={zx + zapW / 2} y={py - 16} textAnchor="middle" fill={C.dimText} fontSize={7.5} fontFamily={FONT}>
        a = {a} m
      </text>

      {/* Cota h (altura zapata, derecha) */}
      <line x1={zx+zapW+3} y1={zy}      x2={dimX_h_right} y2={zy}      stroke={C.dim} strokeWidth={0.6} />
      <line x1={zx+zapW+3} y1={zy+zapH} x2={dimX_h_right} y2={zy+zapH} stroke={C.dim} strokeWidth={0.6} />
      <VArrow x={dimX_h_right - 2} y1={zy} y2={zy + zapH} />
      <text
        x={dimX_h_right + 10} y={zy + zapH / 2 + 3}
        textAnchor="middle" fill={C.dimText} fontSize={7.5} fontFamily={FONT}
        transform={`rotate(-90, ${dimX_h_right + 10}, ${zy + zapH / 2})`}
      >
        h = {h} m
      </text>

      {/* Etiqueta "ALZADO" */}
      <text x={MG_L} y={py - 1} fill={C.dimText} fontSize={6} fontFamily={FONT} fontWeight="600" letterSpacing="0.06em">
        ALZADO
      </text>

      {/* ── PLANTA ───────────────────────────────────────────────────────── */}

      {/* Separador */}
      <line
        x1={MG_L} y1={plantaY - 8} x2={MG_L + plantaW} y2={plantaY - 8}
        stroke={C.dim} strokeWidth={0.4} strokeDasharray="3 2"
      />

      {/* Etiqueta "PLANTA" */}
      <text x={MG_L} y={plantaY - 1} fill={C.dimText} fontSize={6} fontFamily={FONT} fontWeight="600" letterSpacing="0.06em">
        PLANTA
      </text>

      {/* Contorno zapata planta */}
      <rect
        x={MG_L} y={plantaY} width={plantaW} height={plantaH}
        fill={C.fill} stroke={C.stroke} strokeWidth={1.2}
      />

      {/* Armaduras dirección a (barras horizontales, perpendiculares a la vista) */}
      {rebarLines_a.map((l, i) => (
        <line key={`ra${i}`} x1={l.x1} y1={l.y} x2={l.x2} y2={l.y}
          stroke={C.rebar} strokeWidth={0.9} opacity={0.7} />
      ))}

      {/* Armaduras dirección b (barras verticales, perpendiculares a la vista) */}
      {rebarLines_b.map((l, j) => (
        <line key={`rb${j}`} x1={l.x} y1={l.y1} x2={l.x} y2={l.y2}
          stroke={C.rebar} strokeWidth={0.6} strokeDasharray="2 2" opacity={0.6} />
      ))}

      {/* Contorno pilar en planta */}
      <rect
        x={pilPX} y={pilPY} width={pilPW} height={pilPH}
        fill={C.pilar} stroke={C.pilarStk} strokeWidth={1}
      />

      {/* Cota b (alto planta, derecha) */}
      <line x1={MG_L+plantaW+3} y1={plantaY}        x2={MG_L+plantaW+13} y2={plantaY}        stroke={C.dim} strokeWidth={0.6} />
      <line x1={MG_L+plantaW+3} y1={plantaY+plantaH} x2={MG_L+plantaW+13} y2={plantaY+plantaH} stroke={C.dim} strokeWidth={0.6} />
      <VArrow x={MG_L + plantaW + 9} y1={plantaY} y2={plantaY + plantaH} />
      <text
        x={MG_L + plantaW + 20} y={plantaY + plantaH / 2 + 3}
        textAnchor="middle" fill={C.dimText} fontSize={7.5} fontFamily={FONT}
        transform={`rotate(-90, ${MG_L + plantaW + 20}, ${plantaY + plantaH / 2})`}
      >
        b = {b} m
      </text>

      {/* Leyenda armadura */}
      <line x1={MG_L} y1={vbH - 14} x2={MG_L + 12} y2={vbH - 14} stroke={C.rebar} strokeWidth={1} />
      <text x={MG_L + 15} y={vbH - 11} fill={C.dimText} fontSize={6} fontFamily={FONT}>
        dir-a ({nA}∅{armaduraA?.diametro})
      </text>
      <line x1={MG_L + 72} y1={vbH - 14} x2={MG_L + 84} y2={vbH - 14} stroke={C.rebar} strokeWidth={0.7} strokeDasharray="2 2" />
      <text x={MG_L + 87} y={vbH - 11} fill={C.dimText} fontSize={6} fontFamily={FONT}>
        dir-b ({nB}∅{armaduraB?.diametro})
      </text>
    </svg>
  )
}
