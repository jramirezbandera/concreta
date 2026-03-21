/**
 * calculosLosa.js
 * Motor de cálculo para losa de cimentación — franja de análisis (modelo Winkler).
 * Unidades internas: kN, m, kPa (kN/m²), MPa para resistencias.
 *
 * Modelo: viga sobre fundación elástica (Winkler) para una franja de ancho B.
 * Referencia: CTE DB-SE-C / Código Estructural.
 */

import { propiedadesHormigon, propiedadesAcero, GAMMA_C } from '../../../utils/normativa.js'

const PI = Math.PI

/* ── Área de armadura por metro de ancho ───────────────────────────────── */
function areaArmaduraPorMetro(diametro_mm, separacion_mm) {
  // mm²/m = π·(φ/2)² / sep · 1000
  return (PI * (diametro_mm / 2) ** 2 / separacion_mm) * 1000
}

/* ── Longitud elástica de Winkler ──────────────────────────────────────── */
/**
 * Le = (4·E·I / (ks·B))^(1/4)
 *
 * E  [kN/m²] = Ecm [MPa] × 1000
 * I  [m⁴]   = B · h³ / 12
 * ks [kN/m³]
 * B  [m]
 *
 * → Le [m]
 */
function longitudElastica(h_m, B_m, Ecm_MPa, ks_kNm3) {
  const E_kNm2 = Ecm_MPa * 1000           // kN/m²
  const I_m4   = B_m * h_m ** 3 / 12      // m⁴
  const Le     = Math.pow((4 * E_kNm2 * I_m4) / (ks_kNm3 * B_m), 0.25)  // m
  return Le
}

/* ── Resistencia a cortante sin armadura transversal (CE Art. 44.2) ─── */
/**
 * Vcu sobre sección de ancho B [m], canto h [m], con armadura inferior.
 *
 * @param {number} B_m          — ancho franja [m]
 * @param {number} h_m          — canto total [m]
 * @param {number} rec_mm       — recubrimiento [mm]
 * @param {number} As_inf_mm2   — área armadura inferior [mm²]
 * @param {string} tipoHormigon
 * @returns {number}  Vcu [kN]
 */
function calcularVcu(B_m, h_m, rec_mm, As_inf_mm2, tipoHormigon) {
  const { fck } = propiedadesHormigon(tipoHormigon)

  const b_mm = B_m * 1000              // mm
  const d_mm = h_m * 1000 - rec_mm    // canto útil [mm]

  const xi    = Math.min(1 + Math.sqrt(200 / d_mm), 2.0)
  const rho_l = Math.min(As_inf_mm2 / (b_mm * d_mm), 0.02)

  const Vcu_f = (0.18 / GAMMA_C) * xi * Math.pow(100 * rho_l * fck, 1 / 3) * b_mm * d_mm  // N
  const Vcu_m = (0.075 / GAMMA_C) * Math.pow(xi, 1.5) * Math.pow(fck, 0.5) * b_mm * d_mm  // N
  const Vcu   = Math.max(Vcu_f, Vcu_m)  // N

  return Vcu / 1000  // kN
}

/* ── Función principal ───────────────────────────────────────────────── */
/**
 * @param {object} inputs
 * @param {number} inputs.h            — espesor losa [m]
 * @param {number} inputs.B            — ancho de franja [m]
 * @param {number} inputs.recubrimiento — [mm]
 * @param {number} inputs.N            — carga lineal [kN/m]
 * @param {boolean} inputs.incluyePP   — incluir peso propio automáticamente
 * @param {number} inputs.sigmaAdm     — tensión admisible terreno [kN/m²]
 * @param {number} inputs.ks           — módulo de balasto [kN/m³]
 * @param {string} inputs.tipoHormigon
 * @param {string} inputs.tipoAcero
 * @param {object} inputs.armInf       — { diametro, separacion } [mm]
 * @param {object} inputs.armSup       — { diametro, separacion } [mm]
 */
export function comprobarFranjaLosa(inputs) {
  const {
    h, B, recubrimiento,
    N, incluyePP,
    sigmaAdm, ks,
    tipoHormigon, tipoAcero,
    armInf, armSup,
  } = inputs

  const { fcd, Ecm } = propiedadesHormigon(tipoHormigon)
  const { fyd }      = propiedadesAcero(tipoAcero)

  /* ── Carga total ─────────────────────────────────────────────────────── */
  const Pp    = incluyePP ? h * 25 * B : 0   // kN/m (peso propio por metro lineal)
  const N_tot = N + Pp                        // kN/m

  /* ── Tensión en el terreno ───────────────────────────────────────────── */
  // σ = N_total [kN/m] / B [m] = kN/m²
  const sigma     = N_tot / B
  const aprovSigma = Math.min((sigma / sigmaAdm) * 100, 200)
  const cumpleSigma = sigma <= sigmaAdm

  /* ── Longitud elástica de Winkler ─────────────────────────────────────── */
  const Le = longitudElastica(h, B, Ecm, ks)  // m

  /* ── Momento máximo (simplificado Winkler) ───────────────────────────── */
  // Para carga concentrada sobre viga infinita: Mmax = P·Le/4
  // Aquí N_tot [kN/m] actúa sobre 1m → P = N_tot [kN]
  const Mmax_kNm = N_tot * Le / 4   // kN·m  (momento en la sección crítica)

  /* ── Canto útil ──────────────────────────────────────────────────────── */
  const d_mm = h * 1000 - recubrimiento   // mm
  const d_m  = d_mm / 1000                // m

  /* ── Comprobación a flexión (armadura inferior) ──────────────────────── */
  // La sección resistente es B [m] de ancho, d [mm] de canto útil
  // As_nec = Mmax [kN·m] × 1e6 / (0.9 × d [mm] × fyd [MPa])  → mm²
  const As_nec_inf = Mmax_kNm * 1e6 / (0.9 * d_mm * fyd)   // mm²

  const dInf = Number(armInf?.diametro)   || 0
  const sInf = Number(armInf?.separacion) || 1
  const As_1m_inf  = dInf > 0 ? areaArmaduraPorMetro(dInf, sInf) : 0   // mm²/m
  const As_disp_inf = As_1m_inf * B   // mm² total en franja B

  const aprovFlexInf  = As_disp_inf > 0 ? Math.min(As_nec_inf / As_disp_inf * 100, 200) : 200
  const cumpleFlexInf = As_disp_inf >= As_nec_inf && As_disp_inf > 0

  /* ── Armadura superior (mínima / montaje — As ≥ 0.2 × As_inf) ───────── */
  const As_nec_sup = Math.max(As_nec_inf * 0.20, 0.0015 * B * 1000 * h * 1000)  // mm²
  const dSup = Number(armSup?.diametro)   || 0
  const sSup = Number(armSup?.separacion) || 1
  const As_1m_sup  = dSup > 0 ? areaArmaduraPorMetro(dSup, sSup) : 0
  const As_disp_sup = As_1m_sup * B

  const aprovFlexSup  = As_disp_sup > 0 ? Math.min(As_nec_sup / As_disp_sup * 100, 200) : 200
  const cumpleFlexSup = As_disp_sup >= As_nec_sup && As_disp_sup > 0

  /* ── Comprobación a cortante (sin armadura transversal) ─────────────── */
  // Vmax ≈ N_tot / 2  [kN]
  const Vmax_kN = N_tot / 2

  // Vcu calculada con armadura inferior
  const Vcu_kN = calcularVcu(B, h, recubrimiento, As_disp_inf, tipoHormigon)
  const aprovCortante  = Vmax_kN > 0 ? Math.min((Vmax_kN / Vcu_kN) * 100, 200) : 0
  const cumpleCortante = Vmax_kN <= Vcu_kN

  /* ── Cuantía geométrica ──────────────────────────────────────────────── */
  const rho_inf = As_disp_inf > 0 ? As_disp_inf / (B * 1000 * d_mm) * 100 : 0
  const rho_sup = As_disp_sup > 0 ? As_disp_sup / (B * 1000 * d_mm) * 100 : 0

  /* ── Resumen de comprobaciones ───────────────────────────────────────── */
  const resumen = [
    {
      nombre:          'Tensión sobre el terreno',
      valorCalculado:  +sigma.toFixed(2),
      valorLimite:     +sigmaAdm.toFixed(1),
      unidad:          'kN/m²',
      aprovechamiento: +aprovSigma.toFixed(1),
      cumple:          cumpleSigma,
      articuloNorma:   'CTE DB-SE-C Art. 4.2',
    },
    {
      nombre:          'Flexión — armadura inferior',
      valorCalculado:  +As_nec_inf.toFixed(0),
      valorLimite:     +As_disp_inf.toFixed(0),
      unidad:          'mm²',
      aprovechamiento: +aprovFlexInf.toFixed(1),
      cumple:          cumpleFlexInf,
      articuloNorma:   'CE Art. 42.1',
    },
    {
      nombre:          'Flexión — armadura superior',
      valorCalculado:  +As_nec_sup.toFixed(0),
      valorLimite:     +As_disp_sup.toFixed(0),
      unidad:          'mm²',
      aprovechamiento: +aprovFlexSup.toFixed(1),
      cumple:          cumpleFlexSup,
      articuloNorma:   'CE Art. 42.1',
    },
    {
      nombre:          'Cortante (sin armadura transv.)',
      valorCalculado:  +Vmax_kN.toFixed(2),
      valorLimite:     +Vcu_kN.toFixed(2),
      unidad:          'kN',
      aprovechamiento: +aprovCortante.toFixed(1),
      cumple:          cumpleCortante,
      articuloNorma:   'CE Art. 44.2',
    },
  ]

  return {
    sigma:         +sigma.toFixed(2),
    Pp:            +Pp.toFixed(2),
    N_tot:         +N_tot.toFixed(2),
    Le:            +Le.toFixed(3),
    Mmax:          +Mmax_kNm.toFixed(2),
    Vmax:          +Vmax_kN.toFixed(2),
    d_mm:          +d_mm.toFixed(0),
    As_nec_inf:    +As_nec_inf.toFixed(0),
    As_disp_inf:   +As_disp_inf.toFixed(0),
    As_1m_inf:     +As_1m_inf.toFixed(0),
    As_nec_sup:    +As_nec_sup.toFixed(0),
    As_disp_sup:   +As_disp_sup.toFixed(0),
    As_1m_sup:     +As_1m_sup.toFixed(0),
    Vcu:           +Vcu_kN.toFixed(2),
    rho_inf:       +rho_inf.toFixed(3),
    rho_sup:       +rho_sup.toFixed(3),
    resumen,
  }
}
