/**
 * calculosZapatas.js
 * Motor de cálculo para zapatas aisladas (CTE DB-SE-C / CE).
 * Unidades: kN, m, kPa (kN/m²), MPa para resistencias.
 */

import { propiedadesHormigon, propiedadesAcero, GAMMA_C, GAMMA_S, Es, ECU, LAMBDA, ETA } from '../../../utils/normativa.js'

const PI = Math.PI

/* ── Peso propio zapata ─────────────────────────────────────────────────── */
function pesoPropio(a, b, h) {
  return a * b * h * 25   // kN  (γhormigon = 25 kN/m³)
}

/* ── 1. Tensiones sobre el terreno (ELS) ────────────────────────────────── */
/**
 * @param {number} a        — dimensión en dirección del momento [m]
 * @param {number} b        — dimensión perpendicular [m]
 * @param {number} h        — canto de la zapata [m]
 * @param {number} Nd       — axil en base del pilar [kN] (ELS, compresión +)
 * @param {number} Md       — momento en base del pilar [kN·m] (ELS)
 * @param {number} sigmaAdm — tensión admisible del terreno [kN/m²]
 */
export function comprobarTensionesTerreno(a, b, h, Nd, Md, sigmaAdm) {
  const Pp      = pesoPropio(a, b, h)
  const N_total = Nd + Pp
  const e       = Nd > 0 ? Math.abs(Md) / Nd : 0   // excentricidad [m]

  let sigmaMax, sigmaMin, distribucion

  if (e <= a / 6) {
    // Distribución trapezoidal
    sigmaMax    = (N_total / (a * b)) * (1 + 6 * e / a)
    sigmaMin    = (N_total / (a * b)) * (1 - 6 * e / a)
    distribucion = 'trapezoidal'
  } else {
    // Distribución triangular (despegue parcial)
    const xp    = 3 * (a / 2 - e)                     // longitud de contacto [m]
    sigmaMax    = 2 * N_total / (3 * b * (a / 2 - e))
    sigmaMin    = 0
    distribucion = 'triangular'
  }

  const aprovechamiento = Math.min((sigmaMax / sigmaAdm) * 100, 200)
  const cumple          = sigmaMax <= sigmaAdm

  return {
    sigmaMax:       +sigmaMax.toFixed(2),
    sigmaMin:       +sigmaMin.toFixed(2),
    excentricidad:  +e.toFixed(3),
    distribucion,
    Pp:             +Pp.toFixed(1),
    N_total:        +N_total.toFixed(1),
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma: 'CTE DB-SE-C Art. 4.2',
  }
}

/* ── 2. Comprobación de vuelco ──────────────────────────────────────────── */
/**
 * @param {number} a    — dimensión en dirección del momento [m]
 * @param {number} h    — canto de la zapata [m]
 * @param {number} Nd   — axil [kN]
 * @param {number} Md   — momento [kN·m]
 * @param {number} Vd   — cortante horizontal [kN]
 * @param {number} Pp   — peso propio zapata [kN]
 */
export function comprobarVuelco(a, h, Nd, Md, Vd, Pp) {
  const Me = (Nd + Pp) * (a / 2)              // momento estabilizador [kN·m]
  const Mv = Math.abs(Md) + Math.abs(Vd) * h  // momento desestabilizador [kN·m]

  if (Mv <= 0) {
    return { Me: +Me.toFixed(1), Mv: 0, coefSeguridad: Infinity, cumple: true, articuloNorma: 'CTE DB-SE-C Art. 4.3' }
  }

  const CSV = Me / Mv
  const aprovechamiento = Math.min((2.0 / CSV) * 100, 200)
  const cumple = CSV >= 2.0

  return {
    Me:              +Me.toFixed(1),
    Mv:              +Mv.toFixed(1),
    coefSeguridad:   +CSV.toFixed(2),
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma:   'CTE DB-SE-C Art. 4.3',
  }
}

/* ── 3. Comprobación de deslizamiento ───────────────────────────────────── */
/**
 * @param {number} Nd               — axil [kN]
 * @param {number} Vd               — cortante [kN]
 * @param {number} Pp               — peso propio [kN]
 * @param {number} anguloRozamiento — δ en grados
 */
export function comprobarDeslizamiento(Nd, Vd, Pp, anguloRozamiento) {
  const tanDelta = Math.tan((anguloRozamiento * PI) / 180)
  const Fr       = (Nd + Pp) * tanDelta    // fuerza resistente [kN]
  const Vabs     = Math.abs(Vd)

  if (Vabs <= 0) {
    return { Fr: +Fr.toFixed(1), Vd: 0, CSD: Infinity, cumple: true, articuloNorma: 'CTE DB-SE-C Art. 4.3' }
  }

  const CSD = Fr / Vabs
  const aprovechamiento = Math.min((1.5 / CSD) * 100, 200)
  const cumple = CSD >= 1.5

  return {
    Fr:              +Fr.toFixed(1),
    Vd:              +Vabs.toFixed(1),
    CSD:             +CSD.toFixed(2),
    tanDelta:        +tanDelta.toFixed(3),
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma:   'CTE DB-SE-C Art. 4.3',
  }
}

/* ── 4. Comprobación de armadura a flexión ──────────────────────────────── */
/**
 * @param {number} a             — dimensión zapata en dirección a [m]
 * @param {number} b             — dimensión zapata en dirección b [m]
 * @param {number} h             — canto [m]
 * @param {number} recubrimiento — [mm]
 * @param {number} ap            — ancho del pilar en dirección a [m]
 * @param {number} bp            — ancho del pilar en dirección b [m]
 * @param {number} sigmaMax      — tensión máxima en terreno [kN/m²]
 * @param {number} sigmaMin      — tensión mínima [kN/m²]
 * @param {object} armadura      — { nBarrasA, diamA, nBarrasB, diamB }
 * @param {string} tipoHormigon
 * @param {string} tipoAcero
 */
export function comprobarArmaduraFlexion(a, b, h, recubrimiento, ap, bp, sigmaMax, sigmaMin, armadura, tipoHormigon, tipoAcero) {
  const { fcd } = propiedadesHormigon(tipoHormigon)
  const { fyd } = propiedadesAcero(tipoAcero)

  const d_mm = h * 1000 - recubrimiento   // canto útil [mm]
  const d_m  = d_mm / 1000

  // Vuelo en dirección a (hacia la sección de referencia = cara del pilar)
  const v_a = (a - ap) / 2   // [m]
  const v_b = (b - bp) / 2   // [m]

  // ── Dirección a ───────────────────────────────────────────────────────
  // Tensiones en la sección de referencia (cara del pilar, a distancia v_a del borde)
  // x medido desde el borde con σmax
  const sigmaEnCaraA = sigmaMax - (sigmaMax - sigmaMin) / a * v_a
  const sigmaMediaA  = (sigmaMax + sigmaEnCaraA) / 2   // [kN/m²]

  // Momento en cara del pilar [kN·m] (ancho b)
  const Md_a = sigmaMediaA * b * v_a * v_a / 2   // kN·m

  // Momento último de la sección zapata (ancho b, canto útil d)
  // Simplificado: As_nec ≈ Md_a * 1e6 / (0.9 * d_mm * fyd)  [mm²]
  const As_nec_a = Md_a * 1e6 / (0.9 * d_mm * fyd)  // mm²

  // As dispuesta
  const nA    = Number(armadura.nBarrasA) || 0
  const dA    = Number(armadura.diamA)    || 0
  const As_a  = nA * PI * (dA / 2) ** 2             // mm²

  const aprovA = As_a > 0 ? Math.min(As_nec_a / As_a * 100, 200) : 200
  const cumpleA = As_a >= As_nec_a && As_a > 0

  // ── Dirección b ───────────────────────────────────────────────────────
  const sigmaMedia_unif = (sigmaMax + sigmaMin) / 2   // tensión media global
  const Md_b = sigmaMedia_unif * a * v_b * v_b / 2    // kN·m (ancho a)

  const As_nec_b = Md_b * 1e6 / (0.9 * d_mm * fyd)

  const nB    = Number(armadura.nBarrasB) || 0
  const dB    = Number(armadura.diamB)    || 0
  const As_b  = nB * PI * (dB / 2) ** 2

  const aprovB = As_b > 0 ? Math.min(As_nec_b / As_b * 100, 200) : 200
  const cumpleB = As_b >= As_nec_b && As_b > 0

  // ── Cuantía mínima geométrica (CE / EHE) ─────────────────────────────
  const As_min = Math.max(0.0018 * b * 1000 * h * 1000, 0.0008 * b * 1000 * h * 1000)  // mm²/m aprox
  // Simplificado: ρmin = 0.15% para zapatas en CE
  const rho_a  = As_a > 0 ? As_a / (b * 1000 * d_mm) * 100 : 0   // %
  const rho_b  = As_b > 0 ? As_b / (a * 1000 * d_mm) * 100 : 0   // %

  return {
    // Dirección a
    Md_a:        +Md_a.toFixed(2),
    As_nec_a:    +As_nec_a.toFixed(0),
    As_disp_a:   +As_a.toFixed(0),
    aprovA:      +aprovA.toFixed(1),
    cumpleA,
    // Dirección b
    Md_b:        +Md_b.toFixed(2),
    As_nec_b:    +As_nec_b.toFixed(0),
    As_disp_b:   +As_b.toFixed(0),
    aprovB:      +aprovB.toFixed(1),
    cumpleB,
    d_mm:        +d_mm.toFixed(0),
    v_a:         +v_a.toFixed(3),
    v_b:         +v_b.toFixed(3),
    rho_a:       +rho_a.toFixed(3),
    rho_b:       +rho_b.toFixed(3),
    articuloNorma: 'CE Art. 42.1',
  }
}

/* ── Función principal ───────────────────────────────────────────────────── */
/**
 * @param {object} inputs — todos los valores del formulario
 */
export function calcularZapata(inputs) {
  const {
    a, b, h, recubrimiento,
    ap, bp,
    sigmaAdm, anguloRozamiento,
    tipoHormigon, tipoAcero,
    armaduraA, armaduraB,
    Nd, Md, Vd,
  } = inputs

  const aN = Number(a),  bN = Number(b),  hN = Number(h)
  const apN = Number(ap), bpN = Number(bp)
  const recN = Number(recubrimiento)

  const tensiones    = comprobarTensionesTerreno(aN, bN, hN, Number(Nd), Number(Md), Number(sigmaAdm))
  const Pp           = tensiones.Pp
  const vuelco       = comprobarVuelco(aN, hN, Number(Nd), Number(Md), Number(Vd), Pp)
  const deslizamiento = comprobarDeslizamiento(Number(Nd), Number(Vd), Pp, Number(anguloRozamiento))
  const flexion      = comprobarArmaduraFlexion(
    aN, bN, hN, recN, apN, bpN,
    tensiones.sigmaMax, tensiones.sigmaMin,
    { nBarrasA: armaduraA?.nBarras, diamA: armaduraA?.diametro, nBarrasB: armaduraB?.nBarras, diamB: armaduraB?.diametro },
    tipoHormigon, tipoAcero,
  )

  const resumen = [
    {
      nombre:          'Tensión máxima terreno',
      valorCalculado:  tensiones.sigmaMax,
      valorLimite:     Number(sigmaAdm),
      unidad:          'kN/m²',
      aprovechamiento: tensiones.aprovechamiento,
      cumple:          tensiones.cumple,
      articuloNorma:   tensiones.articuloNorma,
    },
    {
      nombre:          'Estabilidad al vuelco (CSV)',
      valorCalculado:  vuelco.coefSeguridad === Infinity ? 999 : vuelco.coefSeguridad,
      valorLimite:     2.0,
      unidad:          '',
      aprovechamiento: vuelco.cumple ? Math.min(vuelco.aprovechamiento ?? 50, 100) : 110,
      cumple:          vuelco.cumple,
      articuloNorma:   vuelco.articuloNorma,
    },
    {
      nombre:          'Estabilidad al deslizamiento (CSD)',
      valorCalculado:  deslizamiento.CSD === Infinity ? 999 : deslizamiento.CSD,
      valorLimite:     1.5,
      unidad:          '',
      aprovechamiento: deslizamiento.cumple ? Math.min(deslizamiento.aprovechamiento ?? 50, 100) : 110,
      cumple:          deslizamiento.cumple,
      articuloNorma:   deslizamiento.articuloNorma,
    },
    {
      nombre:          'Armadura flexión — dirección a',
      valorCalculado:  flexion.As_nec_a,
      valorLimite:     flexion.As_disp_a,
      unidad:          'mm²',
      aprovechamiento: flexion.aprovA,
      cumple:          flexion.cumpleA,
      articuloNorma:   flexion.articuloNorma,
    },
    {
      nombre:          'Armadura flexión — dirección b',
      valorCalculado:  flexion.As_nec_b,
      valorLimite:     flexion.As_disp_b,
      unidad:          'mm²',
      aprovechamiento: flexion.aprovB,
      cumple:          flexion.cumpleB,
      articuloNorma:   flexion.articuloNorma,
    },
  ]

  return { tensiones, vuelco, deslizamiento, flexion, resumen }
}
