/**
 * calculosPilaresAcero.js
 * Pandeo axial + flexocompresión biaxial para pilares de acero laminado.
 * Referencia: EN 1993-1-1 (EC3) §6.2, §6.3.1, §6.3.3 — Método 2 (Anexo B).
 * Unidades internas: N, mm, MPa.
 */

const E   = 210000    // MPa — módulo elástico
const G   = 81000     // MPa — módulo de cortadura
const gM0 = 1.05      // γM0 — resistencia de sección
const gM1 = 1.05      // γM1 — estabilidad
const PI  = Math.PI

/* ── Factores de imperfección por curva de pandeo (EC3 Tab 6.1) ─── */
const ALPHA = { a0: 0.13, a: 0.21, b: 0.34, c: 0.49, d: 0.76 }

/* ── Curvas de pandeo para perfiles I/H laminados (EC3 Tab 6.2) ── */
function curvaPandeo(hb, tf_mm, eje) {
  // hb = h/b; eje: 'y' (fuerte) o 'z' (débil)
  if (tf_mm <= 40) {
    if (hb > 1.2) return eje === 'y' ? 'a' : 'b'
    else           return eje === 'y' ? 'b' : 'c'
  } else if (tf_mm <= 100) {
    if (hb > 1.2) return eje === 'y' ? 'b' : 'c'
    else           return 'c'
  }
  return 'd'
}

/* ── χ (factor de reducción de pandeo) ───────────────────────────── */
function chiPandeo(lambda_bar, curva) {
  if (lambda_bar <= 0.2) return 1.0
  const alpha = ALPHA[curva] ?? 0.34
  const Phi   = 0.5 * (1 + alpha * (lambda_bar - 0.2) + lambda_bar ** 2)
  return Math.min(1.0, 1 / (Phi + Math.sqrt(Math.max(Phi ** 2 - lambda_bar ** 2, 0))))
}

/* ══════════════════════════════════════════════════════════════════
   1. CLASIFICACIÓN DE SECCIÓN — COMPRESIÓN
   ══════════════════════════════════════════════════════════════════ */
/**
 * Clasificación de sección bajo compresión pura.
 * Alma con límites distintos a flexión (EC3 Tab 5.2, hoja 1).
 */
export function clasificarSeccionCompresion(perfil, fy) {
  const { h, b, tw, tf } = perfil
  const r   = perfil.r ?? 0
  const eps = Math.sqrt(235 / fy)

  // Ala (voladizo comprimido)
  const cAla  = b / 2 - tw / 2 - r
  const ctAla = cAla / tf
  let claseAla
  if      (ctAla <= 9  * eps) claseAla = 1
  else if (ctAla <= 10 * eps) claseAla = 2
  else if (ctAla <= 14 * eps) claseAla = 3
  else                         claseAla = 4

  // Alma en compresión pura (EC3 Tab 5.2, límites: 33/38/42·ε)
  const cAlma  = h - 2 * tf - 2 * r
  const ctAlma = cAlma / tw
  let claseAlma
  if      (ctAlma <= 33 * eps) claseAlma = 1
  else if (ctAlma <= 38 * eps) claseAlma = 2
  else if (ctAlma <= 42 * eps) claseAlma = 3
  else                          claseAlma = 4

  const clase = Math.max(claseAla, claseAlma)
  return {
    clase, claseAla, claseAlma,
    eps:    +eps.toFixed(3),
    ctAla:  +ctAla.toFixed(2),
    ctAlma: +ctAlma.toFixed(2),
  }
}

/* ══════════════════════════════════════════════════════════════════
   2. PANDEO AXIAL (EC3 §6.3.1)
   ══════════════════════════════════════════════════════════════════ */
/**
 * @param {object} perfil   — de perfilesAcero.json (mm)
 * @param {number} fy       — límite elástico [MPa]
 * @param {number} Ned_kN   — axil de cálculo [kN] (compresión positivo)
 * @param {number} Lcry_m   — longitud de pandeo eje fuerte y-y [m]
 * @param {number} Lcrz_m   — longitud de pandeo eje débil z-z [m]
 */
export function comprobarPandeoAxial(perfil, fy, Ned_kN, Lcry_m, Lcrz_m) {
  const A_mm2  = perfil.A   ?? 0
  const Iy_mm4 = perfil.Iy  ?? 0
  const Iz_mm4 = perfil.Iz  ?? 0
  const tf_mm  = perfil.tf  ?? 0
  const hb     = perfil.h / perfil.b

  const Ned_N  = Math.abs(Ned_kN) * 1000
  const NRk    = A_mm2 * fy               // N  — resistencia característica
  const NcRd_N = NRk / gM0               // N  — resistencia de la sección

  const Lcy_mm = Lcry_m * 1000
  const Lcz_mm = Lcrz_m * 1000

  // Cargas críticas de Euler
  const Ncr_y = PI ** 2 * E * Iy_mm4 / Lcy_mm ** 2   // N
  const Ncr_z = PI ** 2 * E * Iz_mm4 / Lcz_mm ** 2   // N

  // Esbelteces adimensionales
  const lambda_y = Math.sqrt(NRk / Ncr_y)
  const lambda_z = Math.sqrt(NRk / Ncr_z)

  // Curvas y factores χ
  const curva_y = curvaPandeo(hb, tf_mm, 'y')
  const curva_z = curvaPandeo(hb, tf_mm, 'z')
  const chi_y   = chiPandeo(lambda_y, curva_y)
  const chi_z   = chiPandeo(lambda_z, curva_z)

  // Resistencias a pandeo
  const NbRd_y = chi_y * NRk / gM1   // N
  const NbRd_z = chi_z * NRk / gM1   // N
  const NbRd   = Math.min(NbRd_y, NbRd_z)
  const ejeGobernante = NbRd_y <= NbRd_z ? 'y-y' : 'z-z'

  const aprov_seccion = Ned_N > 0 ? Math.min(Ned_N / NcRd_N * 100, 200) : 0
  const aprov_pandeo  = Ned_N > 0 ? Math.min(Ned_N / NbRd   * 100, 200) : 0

  return {
    A_mm2,
    NRk:          +(NRk    / 1000).toFixed(1),
    NcRd:         +(NcRd_N / 1000).toFixed(1),
    Ncr_y:        +(Ncr_y  / 1000).toFixed(1),
    Ncr_z:        +(Ncr_z  / 1000).toFixed(1),
    lambda_y:     +lambda_y.toFixed(3),
    lambda_z:     +lambda_z.toFixed(3),
    curva_y, curva_z,
    chi_y:        +chi_y.toFixed(3),
    chi_z:        +chi_z.toFixed(3),
    NbRd_y:       +(NbRd_y / 1000).toFixed(1),
    NbRd_z:       +(NbRd_z / 1000).toFixed(1),
    NbRd:         +(NbRd   / 1000).toFixed(1),
    ejeGobernante,
    aprov_seccion: +aprov_seccion.toFixed(1),
    aprov_pandeo:  +aprov_pandeo.toFixed(1),
    cumple_seccion: Ned_N <= NcRd_N,
    cumple_pandeo:  Ned_N <= NbRd,
    // raw (N, sin formatear) para uso en flexocompresión
    _NRk: NRk, _NbRd_y: NbRd_y, _NbRd_z: NbRd_z,
    _lambda_y: lambda_y, _lambda_z: lambda_z,
    _chi_y: chi_y, _chi_z: chi_z,
  }
}

/* ══════════════════════════════════════════════════════════════════
   3. PANDEO LATERAL-TORSIONAL (EC3 §6.3.2)
   ══════════════════════════════════════════════════════════════════ */
/**
 * @param {object} perfil
 * @param {number} fy
 * @param {number} Med_y_kNm — momento flector [kN·m]
 * @param {number} Lcr_LT_m  — longitud de pandeo lateral [m]
 */
export function comprobarPandeoLateral(perfil, fy, Med_y_kNm, Lcr_LT_m) {
  const Wy_mm3 = perfil.Wy ?? 0
  const Iz_mm4 = perfil.Iz ?? 0
  const It_mm4 = perfil.It ?? 0
  const Iw_mm6 = perfil.Iw ?? 0

  const McRd_Nmm = Wy_mm3 * fy / gM0

  if (Iz_mm4 <= 0 || It_mm4 <= 0 || Lcr_LT_m <= 0 || Math.abs(Med_y_kNm) === 0) {
    return {
      Mcr: +(McRd_Nmm / 1e6).toFixed(2),
      lambdaLT: 0, chiLT: 1.0,
      McRd: +(McRd_Nmm / 1e6).toFixed(2),
      MbRd: +(McRd_Nmm / 1e6).toFixed(2),
      hayPandeoLateral: false,
      aprov: 0, cumple: true,
      _MbRd_Nmm: McRd_Nmm, _chiLT: 1.0,
    }
  }

  const Llt_mm   = Lcr_LT_m * 1000
  // C1 = 1.0 conservador (momento uniforme en columna)
  const pi2EIz   = PI ** 2 * E * Iz_mm4 / Llt_mm ** 2
  const rad      = (Iw_mm6 > 0 ? Iw_mm6 / Iz_mm4 : 0) +
                   Llt_mm ** 2 * G * It_mm4 / (PI ** 2 * E * Iz_mm4)
  const Mcr_Nmm  = pi2EIz * Math.sqrt(Math.max(rad, 0))

  const lambdaLT = Math.sqrt(Wy_mm3 * fy / Mcr_Nmm)
  let chiLT
  if (lambdaLT <= 0.4) {
    chiLT = 1.0
  } else {
    const alpha = 0.21   // curva a (laminado, h/b > 2)
    const Phi   = 0.5 * (1 + alpha * (lambdaLT - 0.2) + lambdaLT ** 2)
    chiLT = Math.min(1.0, 1 / (Phi + Math.sqrt(Math.max(Phi ** 2 - lambdaLT ** 2, 0))))
  }

  const MbRd_Nmm = chiLT * Wy_mm3 * fy / gM1
  const Med      = Math.abs(Med_y_kNm) * 1e6
  const aprov    = MbRd_Nmm > 0 ? Math.min(Med / MbRd_Nmm * 100, 200) : 200

  return {
    Mcr:              +(Mcr_Nmm  / 1e6).toFixed(2),
    lambdaLT:         +lambdaLT.toFixed(3),
    chiLT:            +chiLT.toFixed(3),
    McRd:             +(McRd_Nmm / 1e6).toFixed(2),
    MbRd:             +(MbRd_Nmm / 1e6).toFixed(2),
    hayPandeoLateral: lambdaLT > 0.4,
    aprov:            +aprov.toFixed(1),
    cumple:           Med <= MbRd_Nmm,
    _MbRd_Nmm: MbRd_Nmm, _chiLT: chiLT,
  }
}

/* ══════════════════════════════════════════════════════════════════
   4. FLEXOCOMPRESIÓN BIAXIAL (EC3 §6.3.3, Método 2 — Anexo B)
   ══════════════════════════════════════════════════════════════════ */
/**
 * Ecuaciones (6.61) y (6.62).
 *
 * @param {object} pandeo    — resultado de comprobarPandeoAxial
 * @param {object} pandeoLT  — resultado de comprobarPandeoLateral
 * @param {number} Ned_kN    — axil [kN]
 * @param {number} Myed_kNm  — momento eje fuerte [kN·m]
 * @param {number} Mzed_kNm  — momento eje débil [kN·m]
 * @param {number} Cmy       — factor momento eq. eje y-y (0.4 – 1.0)
 * @param {number} Cmz       — factor momento eq. eje z-z (0.4 – 1.0)
 * @param {number} CmLT      — factor momento eq. pandeo lateral (0.4 – 1.0)
 * @param {number} fy
 * @param {object} perfil
 */
export function comprobarFlexocompresion(pandeo, pandeoLT, Ned_kN, Myed_kNm, Mzed_kNm, Cmy, Cmz, CmLT, fy, perfil) {
  const NbRd_y = pandeo._NbRd_y      // N
  const NbRd_z = pandeo._NbRd_z      // N
  const lambda_y = pandeo._lambda_y
  const lambda_z = pandeo._lambda_z

  const MbRd_y_Nmm = pandeoLT._MbRd_Nmm   // N·mm

  const Wz_mm3     = perfil.Wz ?? 0
  const McRd_z_Nmm = Wz_mm3 > 0 ? Wz_mm3 * fy / gM0 : 0   // N·mm

  const Ned_N = Math.abs(Ned_kN) * 1000
  const Med_y = Math.abs(Myed_kNm) * 1e6    // N·mm
  const Med_z = Math.abs(Mzed_kNm) * 1e6    // N·mm

  // Factores de utilización
  const mu_y = NbRd_y > 0 ? Ned_N / NbRd_y : 0
  const mu_z = NbRd_z > 0 ? Ned_N / NbRd_z : 0

  const CmLT_eff = Math.max(CmLT, 0.4)   // mínimo 0.4

  // kyy (Tabla B.1)
  const kyy = Cmy * (1 + Math.min((lambda_y - 0.2) * mu_y, 0.8 * mu_y))

  // kzy (Tabla B.2)
  const kzy_a = 1 - 0.1 * lambda_z / (CmLT_eff - 0.25) * mu_z
  const kzy_b = 1 - 0.1           / (CmLT_eff - 0.25) * mu_z
  const kzy   = Math.max(kzy_a, kzy_b)

  // kzz (Tabla B.1)
  const kzz = Cmz * (1 + Math.min((2 * lambda_z - 0.6) * mu_z, 1.4 * mu_z))

  // kyz = 0.6·kzz (Tabla B.2)
  const kyz = 0.6 * kzz

  // Ecuación (6.61): N/Nb,y + kyy·My/Mb,y + kyz·Mz/Mc,z ≤ 1
  const t1_61 = NbRd_y > 0      ? Ned_N / NbRd_y      : 0
  const t2_61 = MbRd_y_Nmm > 0  ? kyy * Med_y / MbRd_y_Nmm : 0
  const t3_61 = McRd_z_Nmm > 0  ? kyz * Med_z / McRd_z_Nmm : 0
  const expr_61 = t1_61 + t2_61 + t3_61

  // Ecuación (6.62): N/Nb,z + kzy·My/Mb,y + kzz·Mz/Mc,z ≤ 1
  const t1_62 = NbRd_z > 0      ? Ned_N / NbRd_z      : 0
  const t2_62 = MbRd_y_Nmm > 0  ? kzy * Med_y / MbRd_y_Nmm : 0
  const t3_62 = McRd_z_Nmm > 0  ? kzz * Med_z / McRd_z_Nmm : 0
  const expr_62 = t1_62 + t2_62 + t3_62

  return {
    kyy: +kyy.toFixed(3), kzy: +kzy.toFixed(3),
    kzz: +kzz.toFixed(3), kyz: +kyz.toFixed(3),
    mu_y: +mu_y.toFixed(3), mu_z: +mu_z.toFixed(3),
    MbRd_y: +(MbRd_y_Nmm / 1e6).toFixed(2),
    McRd_z: +(McRd_z_Nmm / 1e6).toFixed(2),
    expr_61: +expr_61.toFixed(3),
    expr_62: +expr_62.toFixed(3),
    aprov_61: +Math.min(expr_61 * 100, 200).toFixed(1),
    aprov_62: +Math.min(expr_62 * 100, 200).toFixed(1),
    cumple_61: expr_61 <= 1.0,
    cumple_62: expr_62 <= 1.0,
    cumple:    expr_61 <= 1.0 && expr_62 <= 1.0,
  }
}

/* ══════════════════════════════════════════════════════════════════
   ORQUESTADOR
   ══════════════════════════════════════════════════════════════════ */
/**
 * @param {object} inputs
 * @param {object} inputs.perfil
 * @param {number} inputs.fy         — [MPa]
 * @param {number} inputs.Ned_kN     — axil [kN]
 * @param {number} inputs.Myed_kNm   — momento eje fuerte [kN·m]
 * @param {number} inputs.Mzed_kNm   — momento eje débil [kN·m]
 * @param {number} inputs.Lcry_m     — longitud pandeo y-y [m]
 * @param {number} inputs.Lcrz_m     — longitud pandeo z-z [m]
 * @param {number} inputs.Lcr_LT_m   — longitud pandeo lateral [m]
 * @param {number} inputs.Cmy        — factor momento equivalente y-y
 * @param {number} inputs.Cmz        — factor momento equivalente z-z
 * @param {number} inputs.CmLT       — factor momento equivalente pandeo lateral
 */
export function calcularPilarAcero(inputs) {
  const {
    perfil, fy,
    Ned_kN = 0, Myed_kNm = 0, Mzed_kNm = 0,
    Lcry_m, Lcrz_m, Lcr_LT_m,
    Cmy = 0.9, Cmz = 0.9, CmLT = 0.9,
  } = inputs

  const hayMomento = Math.abs(Myed_kNm) > 0 || Math.abs(Mzed_kNm) > 0

  const clasificacion  = clasificarSeccionCompresion(perfil, fy)
  const pandeo         = comprobarPandeoAxial(perfil, fy, Ned_kN, Lcry_m, Lcrz_m)
  const pandeoLateral  = comprobarPandeoLateral(perfil, fy, Myed_kNm, Lcr_LT_m ?? Lcry_m)
  const flexocompresion = hayMomento
    ? comprobarFlexocompresion(pandeo, pandeoLateral, Ned_kN, Myed_kNm, Mzed_kNm, Cmy, Cmz, CmLT, fy, perfil)
    : null

  /* ── Tabla de resultados ─────────────────────────────────────── */
  const resumen = [
    {
      nombre:          'Compresión — resistencia sección (Nc,Rd)',
      valorCalculado:  +Math.abs(Ned_kN).toFixed(2),
      valorLimite:     pandeo.NcRd,
      unidad:          'kN',
      aprovechamiento: pandeo.aprov_seccion,
      cumple:          pandeo.cumple_seccion,
      articuloNorma:   'EC3 §6.2.4',
    },
    {
      nombre:          `Pandeo axial eje débil z-z — Nb,Rd (curva ${pandeo.curva_z}, λ̄z=${pandeo.lambda_z})`,
      valorCalculado:  +Math.abs(Ned_kN).toFixed(2),
      valorLimite:     pandeo.NbRd_z,
      unidad:          'kN',
      aprovechamiento: pandeo.aprov_pandeo,
      cumple:          pandeo.cumple_pandeo,
      articuloNorma:   'EC3 §6.3.1',
    },
    {
      nombre:          `Pandeo axial eje fuerte y-y — Nb,Rd (curva ${pandeo.curva_y}, λ̄y=${pandeo.lambda_y})`,
      valorCalculado:  +Math.abs(Ned_kN).toFixed(2),
      valorLimite:     pandeo.NbRd_y,
      unidad:          'kN',
      aprovechamiento: +Math.min(Math.abs(Ned_kN) / pandeo.NbRd_y * 100, 200).toFixed(1),
      cumple:          Math.abs(Ned_kN) <= pandeo.NbRd_y,
      articuloNorma:   'EC3 §6.3.1',
    },
  ]

  if (hayMomento && flexocompresion) {
    if (Math.abs(Myed_kNm) > 0) {
      resumen.push({
        nombre:          `Pandeo lateral — Mb,Rd (λ̄LT=${pandeoLateral.lambdaLT})`,
        valorCalculado:  +Math.abs(Myed_kNm).toFixed(2),
        valorLimite:     pandeoLateral.MbRd,
        unidad:          'kN·m',
        aprovechamiento: pandeoLateral.aprov,
        cumple:          pandeoLateral.cumple,
        articuloNorma:   'EC3 §6.3.2',
      })
    }
    resumen.push({
      nombre:          'Flexocompresión Ec. 6.61  [N/Nb,y + kyy·My/Mb,y]',
      valorCalculado:  flexocompresion.expr_61,
      valorLimite:     1.0,
      unidad:          '—',
      aprovechamiento: flexocompresion.aprov_61,
      cumple:          flexocompresion.cumple_61,
      articuloNorma:   'EC3 §6.3.3',
    })
    resumen.push({
      nombre:          'Flexocompresión Ec. 6.62  [N/Nb,z + kzy·My/Mb,y]',
      valorCalculado:  flexocompresion.expr_62,
      valorLimite:     1.0,
      unidad:          '—',
      aprovechamiento: flexocompresion.aprov_62,
      cumple:          flexocompresion.cumple_62,
      articuloNorma:   'EC3 §6.3.3',
    })
  }

  return { clasificacion, pandeo, pandeoLateral, flexocompresion, resumen }
}
