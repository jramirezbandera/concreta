/**
 * PilarAceroSVG.jsx
 * Elevation view of a steel column:
 *   - N downward arrow (compression), My moment arc, Mz dot symbol
 *   - Buckled deformed shape when λ̄ > 0.2
 *   - I cross-section sketch (right side)
 */

const FONT = "'JetBrains Mono', monospace"
const PI   = Math.PI

const C = {
  steel:   'rgba(30,58,100,0.22)',
  stroke:  '#94a3b8',
  dim:     '#64748b',
  text:    '#94a3b8',
  buckle:  'rgba(56,189,248,0.9)',
  buckleZ: 'rgba(167,139,250,0.85)',
  forceN:  '#f87171',
  forceM:  '#fb923c',
}

/* ── Canvas ─────────────────────────────────────────────────────────── */
const VW  = 390
const VH  = 262

/* ── Column geometry ─────────────────────────────────────────────────── */
const CX  = 94    // center X of column
const TOP = 48    // top Y of column
const BOT = 218   // bottom Y
const CH  = BOT - TOP   // column height in px (170)
const HW  = 11    // half-width of column body

/* ── Cross-section position ──────────────────────────────────────────── */
const SCX = 302   // center X of cross-section area
const SCY = 108   // center Y of cross-section area

/* ── Mini dimension arrow helpers ───────────────────────────────────── */
function HArr({ x1, x2, y, color = C.dim, sz = 3.5 }) {
  if (x2 - x1 < 2 * sz + 2) return null
  return (
    <g>
      <line x1={x1 + sz} y1={y} x2={x2 - sz} y2={y} stroke={color} strokeWidth={0.7} />
      <polygon points={`${x1},${y} ${x1+sz},${y-1.5} ${x1+sz},${y+1.5}`} fill={color} />
      <polygon points={`${x2},${y} ${x2-sz},${y-1.5} ${x2-sz},${y+1.5}`} fill={color} />
    </g>
  )
}
function VArr({ x, y1, y2, color = C.dim, sz = 3.5 }) {
  if (y2 - y1 < 2 * sz + 2) return null
  return (
    <g>
      <line x1={x} y1={y1 + sz} x2={x} y2={y2 - sz} stroke={color} strokeWidth={0.7} />
      <polygon points={`${x},${y1} ${x-1.5},${y1+sz} ${x+1.5},${y1+sz}`} fill={color} />
      <polygon points={`${x},${y2} ${x-1.5},${y2-sz} ${x+1.5},${y2-sz}`} fill={color} />
    </g>
  )
}

/* ── Clockwise moment arc with manual arrowhead ──────────────────────
 * Draws a C-shape arc (open to the right) centered at (cx, cy) with
 * radius r. Arc sweeps CW from startDeg to endDeg going through 0°.
 * Arrowhead is drawn at the END point pointing in the CW tangent dir.
 * ─────────────────────────────────────────────────────────────────── */
function MomentArc({ cx, cy, r, startDeg, endDeg, color }) {
  const s  = startDeg * PI / 180
  const e  = endDeg   * PI / 180

  const x0 = cx + r * Math.cos(s)
  const y0 = cy + r * Math.sin(s)
  const x1 = cx + r * Math.cos(e)
  const y1 = cy + r * Math.sin(e)

  // Clockwise sweep (sweep=1), spans 230° → large-arc=1
  const arcD = `M ${x0.toFixed(1)},${y0.toFixed(1)} A ${r},${r} 0 1,1 ${x1.toFixed(1)},${y1.toFixed(1)}`

  // Clockwise tangent at end angle e (SVG Y-down):
  // For x=cx+r·cos(t), y=cy+r·sin(t), CW tangent = (-sin(t), cos(t))
  const tx = -Math.sin(e)
  const ty =  Math.cos(e)

  // Arrowhead polygon: tip at endpoint extended by sz, base perpendicular
  const sz = 5.5, hw = 3
  const tipX = (x1 + tx * sz).toFixed(1)
  const tipY = (y1 + ty * sz).toFixed(1)
  const p1x  = (x1 + (-ty) * hw).toFixed(1)
  const p1y  = (y1 + tx    * hw).toFixed(1)
  const p2x  = (x1 + ty    * hw).toFixed(1)
  const p2y  = (y1 + (-tx) * hw).toFixed(1)

  return (
    <g>
      <path d={arcD} fill="none" stroke={color} strokeWidth={1.7} />
      <polygon points={`${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`} fill={color} />
    </g>
  )
}

/* ── Sine wave for buckle shape ──────────────────────────────────────── */
function sineWave(cx, amp, top, height, n = 40) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const x = (cx + amp * Math.sin(PI * t)).toFixed(1)
    const y = (top + t * height).toFixed(1)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
}

/* ── Pin support ─────────────────────────────────────────────────────── */
function PinSupport({ cx, cy, up = false }) {
  const s  = up ? -1 : 1    // direction of triangle apex
  const ty = cy + s * 12    // triangle base Y
  return (
    <g>
      <polygon
        points={`${cx},${cy} ${cx-9},${ty} ${cx+9},${ty}`}
        fill="none" stroke={C.stroke} strokeWidth={1.2}
      />
      <line x1={cx-13} y1={ty} x2={cx+13} y2={ty} stroke={C.stroke} strokeWidth={1.2} />
      {[0,1,2,3,4,5].map(i => (
        <line key={i}
          x1={cx - 12 + i * 5} y1={ty}
          x2={cx - 15 + i * 5} y2={ty + s * 5}
          stroke={C.stroke} strokeWidth={0.8}
        />
      ))}
    </g>
  )
}

/* ── Component ───────────────────────────────────────────────────────── */
export default function PilarAceroSVG({ perfil, results }) {

  /* Cross-section proportional scale to fit max 82×66 px */
  const h_mm  = perfil?.h  ?? 200
  const b_mm  = perfil?.b  ?? 100
  const tw_mm = perfil?.tw ?? 6
  const tf_mm = perfil?.tf ?? 10

  const sc  = Math.min(82 / b_mm, 66 / h_mm)
  const sw  = b_mm  * sc
  const sh  = h_mm  * sc
  const stf = Math.max(tf_mm * sc, 1.5)
  const stw = Math.max(tw_mm * sc, 1.2)

  /* Buckling */
  const pandeo     = results?.pandeo
  const lambda_y   = pandeo?._lambda_y ?? 0
  const showBuckle = lambda_y > 0.2

  /* My arc parameters:
   * Center to the right of column, arc from -115° to +115° CW (230° span) */
  const arcCX = CX + HW + 28    // center X of moment arc
  const arcCY = TOP + CH * 0.45 // center Y (slightly above mid)
  const arcR  = 20              // radius

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: '100%', maxHeight: 310, display: 'block', overflow: 'visible' }}
    >

      {/* ── Column body ───────────────────────────────────────────── */}
      <rect
        x={CX - HW} y={TOP} width={HW * 2} height={CH}
        fill={C.steel} stroke={C.stroke} strokeWidth={1.3}
      />

      {/* ── Buckled deformed shape (y-y, in-plane) ────────────────── */}
      {showBuckle && (
        <path
          d={sineWave(CX, 16, TOP, CH)}
          fill="none" stroke={C.buckle} strokeWidth={2} strokeDasharray="5 3"
        />
      )}

      {/* ── Supports ──────────────────────────────────────────────── */}
      <PinSupport cx={CX} cy={BOT} up={false} />
      <PinSupport cx={CX} cy={TOP} up={true}  />

      {/* ── N arrow (compression, pointing DOWN) ──────────────────── */}
      {/* shaft */}
      <line x1={CX} y1={8} x2={CX} y2={TOP - 14} stroke={C.forceN} strokeWidth={2.2} />
      {/* manual arrowhead tip pointing down */}
      <polygon
        points={`${CX},${TOP - 4} ${CX - 5},${TOP - 15} ${CX + 5},${TOP - 15}`}
        fill={C.forceN}
      />
      <text
        x={CX + 8} y={20}
        fill={C.forceN} fontSize={9.5} fontFamily={FONT} fontWeight={500}
      >
        Ned
      </text>

      {/* ── My moment arc (right of column, clockwise) ────────────── */}
      <MomentArc
        cx={arcCX} cy={arcCY} r={arcR}
        startDeg={-115} endDeg={115}
        color={C.forceM}
      />
      <text
        x={arcCX + arcR + 7} y={arcCY + 4}
        fill={C.forceM} fontSize={9} fontFamily={FONT}
      >
        My
      </text>

      {/* ── Mz symbol (dot = moment out of page, left of column) ──── */}
      <circle
        cx={CX - HW - 20} cy={TOP + CH * 0.68}
        r={8} fill="none" stroke={C.forceM} strokeWidth={1.4}
      />
      <circle
        cx={CX - HW - 20} cy={TOP + CH * 0.68}
        r={2.8} fill={C.forceM}
      />
      <text
        x={CX - HW - 20} y={TOP + CH * 0.68 + 19}
        fill={C.forceM} fontSize={8.5} fontFamily={FONT} textAnchor="middle"
      >
        Mz
      </text>

      {/* ── Lcr dimension arrow (further left of Mz) ─────────────── */}
      <line
        x1={CX - HW - 44} y1={TOP}
        x2={CX - HW - 44} y2={BOT}
        stroke={C.dim} strokeWidth={0.6} strokeDasharray="3 2"
      />
      <VArr x={CX - HW - 44} y1={TOP} y2={BOT} color={C.dim} sz={4} />
      <text
        x={CX - HW - 57} y={(TOP + BOT) / 2}
        fill={C.text} fontSize={8} fontFamily={FONT} textAnchor="middle"
        transform={`rotate(-90, ${CX - HW - 57}, ${(TOP + BOT) / 2})`}
      >
        Lcr
      </text>

      {/* ── λ / χ annotation (below arc, right of column) ───────── */}
      {pandeo && (
        <g>
          <text
            x={arcCX - arcR + 2} y={BOT - 8}
            fill={C.buckle} fontSize={7.5} fontFamily={FONT}
          >
            {'λ̄y=' + pandeo.lambda_y + '  χy=' + pandeo.chi_y}
          </text>
          <text
            x={arcCX - arcR + 2} y={BOT + 4}
            fill={C.buckleZ} fontSize={7.5} fontFamily={FONT}
          >
            {'λ̄z=' + pandeo.lambda_z + '  χz=' + pandeo.chi_z}
          </text>
        </g>
      )}

      {/* ══ CROSS-SECTION (right side) ══════════════════════════════ */}
      {perfil && (() => {
        const ox = SCX - sw / 2   // translate origin X
        const oy = SCY - sh / 2   // translate origin Y
        return (
          <g transform={`translate(${ox.toFixed(1)},${oy.toFixed(1)})`}>
            {/* top flange */}
            <rect x={0} y={0} width={sw} height={stf}
              fill={C.steel} stroke={C.stroke} strokeWidth={1} />
            {/* web */}
            <rect x={(sw - stw) / 2} y={stf} width={stw} height={sh - 2 * stf}
              fill={C.steel} stroke={C.stroke} strokeWidth={1} />
            {/* bottom flange */}
            <rect x={0} y={sh - stf} width={sw} height={stf}
              fill={C.steel} stroke={C.stroke} strokeWidth={1} />

            {/* b label (top) */}
            <line x1={0}  y1={-4} x2={0}  y2={-13} stroke={C.dim} strokeWidth={0.7} />
            <line x1={sw} y1={-4} x2={sw} y2={-13} stroke={C.dim} strokeWidth={0.7} />
            <HArr x1={0} x2={sw} y={-10} color={C.dim} />
            <text x={sw / 2} y={-16} textAnchor="middle" fill={C.text} fontSize={7.5} fontFamily={FONT}>
              b={b_mm}
            </text>

            {/* h label (right) */}
            <line x1={sw + 4} y1={0}  x2={sw + 14} y2={0}  stroke={C.dim} strokeWidth={0.7} />
            <line x1={sw + 4} y1={sh} x2={sw + 14} y2={sh} stroke={C.dim} strokeWidth={0.7} />
            <VArr x={sw + 11} y1={0} y2={sh} color={C.dim} />
            <text
              x={sw + 23} y={sh / 2}
              fill={C.text} fontSize={7.5} fontFamily={FONT} textAnchor="middle"
              transform={`rotate(-90, ${sw + 23}, ${sh / 2})`}
            >
              h={h_mm}
            </text>

            {/* profile name */}
            <text x={sw / 2} y={sh + 17}
              textAnchor="middle" fill={C.text} fontSize={8} fontFamily={FONT} fontWeight={500}
            >
              {perfil.nombre}
            </text>
          </g>
        )
      })()}

      {!perfil && (
        <text x={VW / 2} y={VH / 2} textAnchor="middle" fill={C.text} fontSize={11} fontFamily={FONT}>
          Selecciona un perfil
        </text>
      )}
    </svg>
  )
}
