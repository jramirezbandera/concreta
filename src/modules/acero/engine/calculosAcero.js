/**
 * calculosAcero.js
 * Motor de cálculo para vigas de acero laminado (CE / CTE DB-SE-A / EC3).
 * Todas las unidades internas en N y mm.
 */

const E   = 210000   // MPa — módulo de elasticidad del acero
const G   = 81000    // MPa — módulo de cortadura
const gM0 = 1.05     // coeficiente parcial resistencia sección
const gM1 = 1.05     // coeficiente parcial estabilidad
const NU  = 0.3      // coeficiente de Poisson

/**
 * clasificarSeccion(perfil, fy)
 * @param perfil — objeto con h, b, tw, tf, r (r=radio acuerdo, usar 0 si no existe)
 * @param fy     — límite elástico [MPa]
 * @returns { claseAla, claseAlma, clase, eps }
 *
 * Límites CE / DB-SE-A Tabla 5.3 (EN 1993-1-1 Table 5.2):
 *   ε = √(235/fy)
 *   Ala comprimida (voladizo): c/t ≤ 9ε (clase 1), 10ε (2), 14ε (3)
 *   Alma (flexión pura):       c/t ≤ 72ε (clase 1), 83ε (2), 124ε (3)
 *   c del ala = (b/2 - tw/2 - r)  ← simplificado sin r
 *   c del alma = h - 2·tf - 2·r   ← simplificado sin r
 */
export function clasificarSeccion(perfil, fy) {
  const { h, b, tw, tf, r = 0 } = perfil
  const eps = Math.sqrt(235 / fy)

  // Proyección libre del ala (semiancho menos mitad del alma menos radio de acuerdo)
  const cAla  = b / 2 - tw / 2 - r
  const ctAla = cAla / tf

  // Altura libre del alma
  const cAlma  = h - 2 * tf - 2 * r
  const ctAlma = cAlma / tw

  // Clasificación del ala (voladizo comprimido)
  let claseAla
  if      (ctAla <= 9  * eps) claseAla = 1
  else if (ctAla <= 10 * eps) claseAla = 2
  else if (ctAla <= 14 * eps) claseAla = 3
  else                         claseAla = 4

  // Clasificación del alma (flexión pura)
  let claseAlma
  if      (ctAlma <= 72  * eps) claseAlma = 1
  else if (ctAlma <= 83  * eps) claseAlma = 2
  else if (ctAlma <= 124 * eps) claseAlma = 3
  else                           claseAlma = 4

  const clase = Math.max(claseAla, claseAlma)

  return { claseAla, claseAlma, clase, eps, ctAla: +ctAla.toFixed(2), ctAlma: +ctAlma.toFixed(2) }
}

/**
 * comprobarFlexion(perfil, fy, Med_kNm, clase)
 * Mc,Rd = Wy · fy / γM0   (clase 1 y 2 → plástico Wy = Wpl, clase 3 → elástico Wy)
 * Note: the JSON stores elastic section modulus as "Wy" (cm³). Used for all classes.
 * @returns { McRd [kN·m], aprovechamiento [%], cumple, articuloNorma }
 */
export function comprobarFlexion(perfil, fy, Med_kNm, clase) {
  // Wy en el JSON ya está en mm³
  const Wy_mm3 = perfil.Wy

  // Mc,Rd en N·mm → convertir a kN·m
  const McRd_Nmm = Wy_mm3 * fy / gM0
  const McRd_kNm = McRd_Nmm / 1e6

  const Med = Math.abs(Med_kNm)
  const aprovechamiento = Math.min((Med / McRd_kNm) * 100, 200)
  const cumple = Med <= McRd_kNm

  return {
    McRd: +McRd_kNm.toFixed(2),
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma: 'DB-SE-A §6.2.6 / EC3 6.2.5',
  }
}

/**
 * comprobarCortante(perfil, fy, Ved_kN)
 * Vc,Rd = Avz · (fy/√3) / γM0
 * @returns { VcRd [kN], aprovechamiento, cumple, articuloNorma }
 */
export function comprobarCortante(perfil, fy, Ved_kN) {
  const { h, b, tw, tf, r = 0 } = perfil

  // Área resistente a cortante — usar Avz del JSON si disponible, si no h·tw
  const Avz_mm2 = perfil.Avz ?? (h * tw)  // mm²

  // Vc,Rd en N → kN
  const VcRd_N   = Avz_mm2 * (fy / Math.sqrt(3)) / gM0
  const VcRd_kN  = VcRd_N / 1000

  const Ved = Math.abs(Ved_kN)
  const aprovechamiento = Math.min((Ved / VcRd_kN) * 100, 200)
  const cumple = Ved <= VcRd_kN

  return {
    VcRd: +VcRd_kN.toFixed(2),
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma: 'DB-SE-A §6.2.4 / EC3 6.2.6',
  }
}

/**
 * comprobarInteraccion(perfil, fy, Med_kNm, Ved_kN, VcRd_kN, McRd_kNm)
 * Si Ved ≤ 0.5·VcRd → no hay reducción
 * Si Ved > 0.5·VcRd → ρ = (2·Ved/VcRd - 1)², Mv,Rd = McRd·(1-ρ)
 * @returns { MvRd [kN·m], hayReduccion, aprovechamiento, cumple, articuloNorma }
 */
export function comprobarInteraccion(perfil, fy, Med_kNm, Ved_kN, VcRd_kN, McRd_kNm) {
  const Ved = Math.abs(Ved_kN)
  const Med = Math.abs(Med_kNm)
  const umbral = 0.5 * VcRd_kN

  let MvRd_kNm
  let hayReduccion

  if (Ved <= umbral) {
    // Sin reducción de momento
    MvRd_kNm   = McRd_kNm
    hayReduccion = false
  } else {
    const rho   = Math.pow((2 * Ved / VcRd_kN) - 1, 2)
    MvRd_kNm   = McRd_kNm * (1 - rho)
    hayReduccion = true
  }

  const aprovechamiento = Math.min((Med / MvRd_kNm) * 100, 200)
  const cumple = Med <= MvRd_kNm

  return {
    MvRd: +MvRd_kNm.toFixed(2),
    hayReduccion,
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma: 'DB-SE-A §6.2.5 / EC3 6.2.8',
  }
}

/**
 * comprobarPandeoLateral(perfil, fy, Med_kNm, Lcr_m, clase)
 * Mcr via Timoshenko: Mcr = C1·(π²EIz/Lcr²)·√(Iw/Iz + Lcr²·G·It/(π²·E·Iz))
 * C1 = 1.132 (carga uniforme)
 * λLT = √(Wy·fy/Mcr)
 * Si λLT ≤ 0.4 → no hay PL, MbRd = McRd
 * Si λLT > 0.4 → curva a: αLT = 0.21, ΦLT = 0.5(1+αLT(λLT-0.2)+λLT²)
 *                χLT = 1/(ΦLT+√(ΦLT²-λLT²)) ≤ 1.0
 *                MbRd = χLT·Wy·fy/γM1
 * @returns { Mcr [kN·m], lambdaLT, chiLT, MbRd [kN·m], hayPandeo, aprovechamiento, cumple, articuloNorma }
 */
export function comprobarPandeoLateral(perfil, fy, Med_kNm, Lcr_m, clase) {
  const C1 = 1.132  // carga uniformemente distribuida

  // JSON almacena todas las propiedades ya en mm (mm⁴, mm⁶, mm³)
  const Iz_mm4 = perfil.Iz  ?? 0
  const It_mm4 = perfil.It  ?? 0
  const Iw_mm6 = perfil.Iw  ?? 0
  const Wy_mm3 = perfil.Wy
  const Lcr_mm = Lcr_m * 1000                              // m → mm

  // Momento resistente sin pandeo (McRd)
  const McRd_Nmm = Wy_mm3 * fy / gM0
  const McRd_kNm = McRd_Nmm / 1e6

  // Si no hay datos de Iz / It suficientes, devolver sin pandeo
  if (Iz_mm4 <= 0 || It_mm4 <= 0 || Lcr_mm <= 0) {
    return {
      Mcr: +McRd_kNm.toFixed(2),
      lambdaLT: 0,
      chiLT: 1.0,
      MbRd: +McRd_kNm.toFixed(2),
      hayPandeo: false,
      aprovechamiento: +Math.min((Math.abs(Med_kNm) / McRd_kNm) * 100, 200).toFixed(1),
      cumple: Math.abs(Med_kNm) <= McRd_kNm,
      articuloNorma: 'DB-SE-A §6.3.2 / EC3 6.3.2',
    }
  }

  // Mcr de Timoshenko (N·mm)
  const pi2EIz = Math.PI ** 2 * E * Iz_mm4 / (Lcr_mm ** 2)
  const radicand = (Iw_mm6 > 0 ? Iw_mm6 / Iz_mm4 : 0) +
                   (Lcr_mm ** 2 * G * It_mm4) / (Math.PI ** 2 * E * Iz_mm4)
  const Mcr_Nmm = C1 * pi2EIz * Math.sqrt(Math.max(radicand, 0))
  const Mcr_kNm = Mcr_Nmm / 1e6

  // Esbeltez adimensional
  const lambdaLT = Math.sqrt((Wy_mm3 * fy) / Mcr_Nmm)

  let chiLT
  let hayPandeo

  if (lambdaLT <= 0.4) {
    chiLT     = 1.0
    hayPandeo = false
  } else {
    const alphaLT = 0.21  // curva a (perfiles laminados en I, h/b > 2)
    const PhiLT   = 0.5 * (1 + alphaLT * (lambdaLT - 0.2) + lambdaLT ** 2)
    chiLT     = Math.min(1 / (PhiLT + Math.sqrt(Math.max(PhiLT ** 2 - lambdaLT ** 2, 0))), 1.0)
    hayPandeo = true
  }

  const MbRd_Nmm = chiLT * Wy_mm3 * fy / gM1
  const MbRd_kNm = MbRd_Nmm / 1e6

  const Med = Math.abs(Med_kNm)
  const aprovechamiento = Math.min((Med / MbRd_kNm) * 100, 200)
  const cumple = Med <= MbRd_kNm

  return {
    Mcr: +Mcr_kNm.toFixed(2),
    lambdaLT: +lambdaLT.toFixed(3),
    chiLT: +chiLT.toFixed(3),
    MbRd: +MbRd_kNm.toFixed(2),
    hayPandeo,
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma: 'DB-SE-A §6.3.2 / EC3 6.3.2',
  }
}

/**
 * comprobarFlecha(perfil, L_m, g_kNm, q_kNm, tipoViga, limiteFlecha)
 * q_els = g + q (ELS característica)
 * Biapoyada: f = 5·q·L⁴/(384·E·Iy)
 * Voladizo:  f = q·L⁴/(8·E·Iy)
 * Emp-Art:   f = q·L⁴/(185·E·Iy)  (approx máximo)
 * Biempotr:  f = q·L⁴/(384·E·Iy)  (approx, centro vano)
 * limiteFlecha: 300, 350, or 400
 * @returns { flecha [mm], flechaAdm [mm], aprovechamiento, cumple, articuloNorma }
 */
export function comprobarFlecha(perfil, L_m, g_kNm, q_kNm, tipoViga, limiteFlecha) {
  const L_mm  = L_m * 1000                 // m → mm
  const q_ELS = (g_kNm + q_kNm) / 1000   // kN/m → N/mm (carga característica ELS)

  // Iy ya en mm⁴
  const Iy_mm4 = perfil.Iy

  let coef
  switch (tipoViga) {
    case 'voladizo':  coef = 8;   break
    case 'emp-art':   coef = 185; break
    case 'biempotr':  coef = 384; break
    case 'biapoyada':
    default:          coef = 384 / 5; break  // 5/384 → coef = 384/5
  }

  // Para biapoyada: f = 5·q·L⁴/(384·E·Iy) → denominador = 384*E*Iy/5
  // Reescribimos: f = q·L⁴ / (coef·E·Iy) con coef = 384/5 para biapoyada
  // Unificamos: f = q·L⁴ / (coef·E·Iy)  donde para biapoyada coef=384/5
  let flecha_mm
  if (tipoViga === 'biapoyada') {
    flecha_mm = (5 * q_ELS * L_mm ** 4) / (384 * E * Iy_mm4)
  } else {
    flecha_mm = (q_ELS * L_mm ** 4) / (coef * E * Iy_mm4)
  }

  const lim    = limiteFlecha ?? 300
  const fAdm   = L_mm / lim   // mm

  const aprovechamiento = Math.min((flecha_mm / fAdm) * 100, 200)
  const cumple = flecha_mm <= fAdm

  return {
    flecha: +flecha_mm.toFixed(2),
    flechaAdm: +fAdm.toFixed(2),
    aprovechamiento: +aprovechamiento.toFixed(1),
    cumple,
    articuloNorma: 'DB-SE §4.3.3 / EC3 NA',
  }
}

/**
 * calcularEsfuerzosAcero(tipoViga, L_m, g_kNm, q_kNm)
 * ELU: qd = 1.35·g + 1.50·q
 * Biapoyada:  Med = qd·L²/8, Ved = qd·L/2
 * Voladizo:   Med = qd·L²/2, Ved = qd·L
 * Emp-Art:    Med = qd·L²/8, Ved = 5/8·qd·L
 * Biempotr:   Med = qd·L²/12, Ved = qd·L/2
 */
export function calcularEsfuerzosAcero(tipoViga, L_m, g_kNm, q_kNm) {
  const qd = 1.35 * g_kNm + 1.50 * q_kNm  // kN/m (ELU)

  let Med_kNm, Ved_kN

  switch (tipoViga) {
    case 'voladizo':
      Med_kNm = qd * L_m ** 2 / 2
      Ved_kN  = qd * L_m
      break
    case 'emp-art':
      Med_kNm = qd * L_m ** 2 / 8
      Ved_kN  = (5 / 8) * qd * L_m
      break
    case 'biempotr':
      Med_kNm = qd * L_m ** 2 / 12
      Ved_kN  = qd * L_m / 2
      break
    case 'biapoyada':
    default:
      Med_kNm = qd * L_m ** 2 / 8
      Ved_kN  = qd * L_m / 2
      break
  }

  return {
    Med_kNm: +Med_kNm.toFixed(2),
    Ved_kN:  +Ved_kN.toFixed(2),
    qd:      +qd.toFixed(3),
  }
}

/**
 * calcularVigaAcero(inputs)
 * inputs: { perfil (object), fy, Med_kNm, Ved_kN, Lcr_m, L_m, g_kNm, q_kNm, tipoViga, limiteFlecha, modo }
 * If modo === 'cargas': compute Med and Ved from loads, otherwise use direct values.
 * Returns: { clasificacion, flexion, cortante, interaccion, pandeoLateral, flecha, resumen[] }
 * resumen[] format: [{ nombre, valorCalculado, valorLimite, unidad, aprovechamiento, cumple, articuloNorma }]
 */
export function calcularVigaAcero(inputs) {
  const {
    perfil,
    fy       = 275,
    Lcr_m    = inputs.L_m ?? 1,
    L_m      = 1,
    g_kNm    = 0,
    q_kNm    = 0,
    tipoViga = 'biapoyada',
    limiteFlecha = 300,
    modo     = 'cargas',
  } = inputs

  // Determinar Med y Ved
  let Med_kNm, Ved_kN
  if (modo === 'cargas') {
    const esf = calcularEsfuerzosAcero(tipoViga, L_m, g_kNm, q_kNm)
    Med_kNm   = esf.Med_kNm
    Ved_kN    = esf.Ved_kN
  } else {
    Med_kNm = Math.abs(inputs.Med_kNm ?? 0)
    Ved_kN  = Math.abs(inputs.Ved_kN  ?? 0)
  }

  // Comprobaciones
  const clasificacion  = clasificarSeccion(perfil, fy)
  const flexion        = comprobarFlexion(perfil, fy, Med_kNm, clasificacion.clase)
  const cortante       = comprobarCortante(perfil, fy, Ved_kN)
  const interaccion    = comprobarInteraccion(perfil, fy, Med_kNm, Ved_kN, cortante.VcRd, flexion.McRd)
  const pandeoLateral  = comprobarPandeoLateral(perfil, fy, Med_kNm, Lcr_m, clasificacion.clase)
  const flecha         = comprobarFlecha(perfil, L_m, g_kNm, q_kNm, tipoViga, limiteFlecha)

  // Resumen tabular
  const resumen = [
    {
      nombre:          'Flexión (Mc,Rd)',
      valorCalculado:  Med_kNm,
      valorLimite:     flexion.McRd,
      unidad:          'kN·m',
      aprovechamiento: flexion.aprovechamiento,
      cumple:          flexion.cumple,
      articuloNorma:   flexion.articuloNorma,
    },
    {
      nombre:          'Cortante (Vc,Rd)',
      valorCalculado:  Ved_kN,
      valorLimite:     cortante.VcRd,
      unidad:          'kN',
      aprovechamiento: cortante.aprovechamiento,
      cumple:          cortante.cumple,
      articuloNorma:   cortante.articuloNorma,
    },
    {
      nombre:          'Interacción M+V (Mv,Rd)',
      valorCalculado:  Med_kNm,
      valorLimite:     interaccion.MvRd,
      unidad:          'kN·m',
      aprovechamiento: interaccion.aprovechamiento,
      cumple:          interaccion.cumple,
      articuloNorma:   interaccion.articuloNorma,
    },
    {
      nombre:          'Pandeo lateral (Mb,Rd)',
      valorCalculado:  Med_kNm,
      valorLimite:     pandeoLateral.MbRd,
      unidad:          'kN·m',
      aprovechamiento: pandeoLateral.aprovechamiento,
      cumple:          pandeoLateral.cumple,
      articuloNorma:   pandeoLateral.articuloNorma,
    },
    {
      nombre:          'Flecha (ELS)',
      valorCalculado:  flecha.flecha,
      valorLimite:     flecha.flechaAdm,
      unidad:          'mm',
      aprovechamiento: flecha.aprovechamiento,
      cumple:          flecha.cumple,
      articuloNorma:   flecha.articuloNorma,
    },
  ]

  return {
    Med_kNm,
    Ved_kN,
    clasificacion,
    flexion,
    cortante,
    interaccion,
    pandeoLateral,
    flecha,
    resumen,
  }
}
