/**
 * calculosMuros.js
 * Motor de cálculo para muro de hormigón con zapata corrida.
 * Modelo: Rankine (empuje activo) + viga ménsula para diseño de secciones.
 * Unidades: kN, m, kN/m², MPa.
 *
 * Convención: x medido desde el borde de la puntera (toe), positivo hacia talón.
 *             y medido desde la base de la zapata, positivo hacia arriba.
 */

import { propiedadesAcero } from '../../../utils/normativa.js'

const PI = Math.PI
const REC_MM = 50      // Recubrimiento nominal fijo [mm]
const GAMMA_H = 25     // Peso específico hormigón [kN/m³]

/* ── Ka de Rankine ────────────────────────────────────────────────────── */
function calcKa(phi_deg) {
  return Math.tan((45 - phi_deg / 2) * PI / 180) ** 2
}

/* ── Centroide X del alzado trapezoidal (cara frontal vertical) ─────── */
// Para trapecio con cara izquierda vertical (base b1, coronación b2, alt H):
// x_c = (b1² + b1·b2 + b2²) / [3·(b1+b2)]   desde la cara izquierda (puntera)
function centroideAlzado(lp, bwBase, bwTop) {
  const num = bwBase * bwBase + bwBase * bwTop + bwTop * bwTop
  const den = 3 * (bwBase + bwTop)
  return lp + num / den
}

/* ═══════════════════════════════════════════════════════════════════════
   1. EMPUJES ACTIVOS
   ═══════════════════════════════════════════════════════════════════════ */
/**
 * @returns {{ Ka, Pa, Pa_arm, Pq, Pq_arm, Pw, Pw_arm, H_total }}
 *          Fuerzas [kN/m] y brazos [m] respecto a la base de la zapata.
 */
export function calcularEmpujes(inputs) {
  const { H, hz, gamma, phi, q, hayAgua, hf, gammaSat, gammaW } = inputs
  const Ka = calcKa(phi)

  let Pa, Pa_arm, Pq, Pq_arm, Pw = 0, Pw_arm = 0

  if (!hayAgua || hf <= 0) {
    // Sin agua: presión triangular + rectángulo de sobrecarga
    Pa     = 0.5 * Ka * gamma * H * H
    Pa_arm = hz + H / 3
    Pq     = Ka * q * H
    Pq_arm = hz + H / 2
  } else {
    // Con agua: hf = altura freático sobre base de zapata
    const h_wet = Math.min(Math.max(hf - hz, 0), H)  // zona saturada en muro
    const h_dry = H - h_wet                            // zona sobre el freático

    // Tres componentes de empuje activo:
    const Pa1    = 0.5 * Ka * gamma * h_dry * h_dry                   // tri. seco
    const Pa2    = Ka * gamma * h_dry * h_wet                          // rect. seco sobre sat.
    const Pa3    = 0.5 * Ka * (gammaSat - gammaW) * h_wet * h_wet     // tri. efect. saturado

    const arm1 = hz + h_wet + h_dry / 3
    const arm2 = hz + h_wet / 2
    const arm3 = hz + h_wet / 3

    Pa     = Pa1 + Pa2 + Pa3
    Pa_arm = Pa > 0 ? (Pa1 * arm1 + Pa2 * arm2 + Pa3 * arm3) / Pa : hz + H / 3

    Pq     = Ka * q * H
    Pq_arm = hz + H / 2

    // Presión hidrostática (total desde base zapata hasta freático)
    Pw     = 0.5 * gammaW * hf * hf
    Pw_arm = hf / 3
  }

  return {
    Ka,
    Pa:      +Pa.toFixed(2),
    Pa_arm:  +Pa_arm.toFixed(3),
    Pq:      +Pq.toFixed(2),
    Pq_arm:  +Pq_arm.toFixed(3),
    Pw:      +Pw.toFixed(2),
    Pw_arm:  +Pw_arm.toFixed(3),
    H_total: +(Pa + Pq + Pw).toFixed(2),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   2. PESOS (por unidad de longitud de muro)
   ═══════════════════════════════════════════════════════════════════════ */
/**
 * @returns {{ W_alz, x_alz, W_zap, x_zap, W_tie, x_tie, W_sob, x_sob, V_total }}
 *          Cargas [kN/m] y posición X [m] desde puntera.
 */
export function calcularPesos(inputs) {
  const { H, hz, B, lp, lt, bwBase, bwTop, gamma, q,
          hayAgua, hf, gammaSat, gammaW } = inputs

  // Alzado (trapecio)
  const W_alz = (bwBase + bwTop) / 2 * H * GAMMA_H
  const x_alz = centroideAlzado(lp, bwBase, bwTop)

  // Zapata
  const W_zap = B * hz * GAMMA_H
  const x_zap = B / 2

  // Tierra sobre el talón (peso efectivo si hay agua)
  let W_tie
  if (hayAgua && hf > hz) {
    const h_sub = Math.min(hf - hz, H)   // profundidad sumergida en el talón
    const h_dry = H - h_sub
    W_tie = lt * h_dry * gamma + lt * h_sub * (gammaSat - gammaW)
  } else {
    W_tie = lt * H * gamma
  }
  const x_tie = lp + bwBase + lt / 2

  // Sobrecarga sobre el talón
  const W_sob = lt * q
  const x_sob = lp + bwBase + lt / 2

  const V_total = W_alz + W_zap + W_tie + W_sob

  return {
    W_alz:   +W_alz.toFixed(2),  x_alz:  +x_alz.toFixed(3),
    W_zap:   +W_zap.toFixed(2),  x_zap:  +x_zap.toFixed(3),
    W_tie:   +W_tie.toFixed(2),  x_tie:  +x_tie.toFixed(3),
    W_sob:   +W_sob.toFixed(2),  x_sob:  +x_sob.toFixed(3),
    V_total: +V_total.toFixed(2),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   3. ESTABILIDAD (vuelco y deslizamiento)
   ═══════════════════════════════════════════════════════════════════════ */
export function calcularEstabilidad(empujes, pesos, inputs) {
  const { delta } = inputs
  const { Pa, Pa_arm, Pq, Pq_arm, Pw, Pw_arm, H_total } = empujes
  const { W_alz, x_alz, W_zap, x_zap, W_tie, x_tie, W_sob, x_sob, V_total } = pesos

  // Momentos respecto a la puntera (x=0)
  const Mest = W_alz * x_alz + W_zap * x_zap + W_tie * x_tie + W_sob * x_sob
  const Mdes = Pa * Pa_arm + Pq * Pq_arm + Pw * Pw_arm

  // Vuelco
  const CSV  = Mdes > 0 ? Mest / Mdes : Infinity
  const cumpleVuelco  = CSV >= 2.0
  const aprovVuelco   = Mdes > 0 ? Math.min((2.0 / CSV) * 100, 200) : 0

  // Deslizamiento
  const tanDelta = Math.tan(delta * PI / 180)
  const Fr       = V_total * tanDelta
  const CSD      = H_total > 0 ? Fr / H_total : Infinity
  const cumpleDesliz  = CSD >= 1.5
  const aprovDesliz   = H_total > 0 ? Math.min((1.5 / CSD) * 100, 200) : 0

  return {
    Mest:         +Mest.toFixed(2),
    Mdes:         +Mdes.toFixed(2),
    CSV:          CSV === Infinity ? Infinity : +CSV.toFixed(2),
    cumpleVuelco,
    aprovVuelco:  +aprovVuelco.toFixed(1),
    Fr:           +Fr.toFixed(2),
    CSD:          CSD === Infinity ? Infinity : +CSD.toFixed(2),
    cumpleDesliz,
    aprovDesliz:  +aprovDesliz.toFixed(1),
    tanDelta:     +tanDelta.toFixed(3),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   4. TENSIONES BAJO ZAPATA
   ═══════════════════════════════════════════════════════════════════════ */
export function calcularTensiones(empujes, pesos, inputs) {
  const { B, sigmaAdm } = inputs
  const { Pa, Pa_arm, Pq, Pq_arm, Pw, Pw_arm } = empujes
  const { W_alz, x_alz, W_zap, x_zap, W_tie, x_tie, W_sob, x_sob, V_total } = pesos

  const Mest = W_alz * x_alz + W_zap * x_zap + W_tie * x_tie + W_sob * x_sob
  const Mdes = Pa * Pa_arm + Pq * Pq_arm + Pw * Pw_arm

  // Posición resultante vertical desde puntera
  const x_R = V_total > 0 ? (Mest - Mdes) / V_total : B / 2
  // Excentricidad (positiva → resultante hacia puntera = sigmaMax en toe)
  const e = B / 2 - x_R

  const sigmaMed = V_total / B

  let sigmaMax, sigmaMin, distribucion
  if (Math.abs(e) <= B / 6) {
    sigmaMax     = sigmaMed * (1 + 6 * e / B)
    sigmaMin     = sigmaMed * (1 - 6 * e / B)
    distribucion = 'trapezoidal'
  } else {
    // Distribución triangular (despegue parcial)
    sigmaMax     = 2 * V_total / (3 * (B / 2 - e))
    sigmaMin     = 0
    distribucion = 'triangular'
  }

  const cumple = sigmaMax <= sigmaAdm
  const aprov  = Math.min((sigmaMax / sigmaAdm) * 100, 200)

  return {
    sigmaMax:    +sigmaMax.toFixed(2),
    sigmaMin:    +sigmaMin.toFixed(2),
    sigmaMed:    +sigmaMed.toFixed(2),
    e:           +e.toFixed(3),
    x_R:         +x_R.toFixed(3),
    distribucion,
    cumple,
    aprov:       +aprov.toFixed(1),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   5. ESFUERZOS EN ALZADO (ménsula empotrada en cimiento)
   ═══════════════════════════════════════════════════════════════════════ */
/**
 * Momento flector y cortante en la sección de arranque del alzado.
 * γf permanentes = 1.35, variable (sobrecarga) = 1.5.
 */
export function calcularAlzado(empujes, inputs) {
  const { H, hz, gamma, phi, q, hayAgua, hf, gammaSat, gammaW } = inputs
  const { Ka } = empujes

  // Momentos característicos [kN·m/m] en arranque (z = H desde coronación)
  const M_earth  = Ka * gamma * H * H * H / 6
  const M_q      = Ka * q * H * H / 2

  // Agua en la zona del muro (si la hay)
  let M_water = 0
  if (hayAgua && hf > hz) {
    const h_wet  = Math.min(hf - hz, H)
    // Presión efectiva del agua sobre el muro: γw · h_wet, triángulo
    M_water = gammaW * h_wet * h_wet * h_wet / 6
  }

  const M_char = M_earth + M_q + M_water
  // ELU: γf=1.35 para cargas permanentes (tierra, agua), γf=1.5 para sobrecarga
  const M_Ed   = 1.35 * (M_earth + M_water) + 1.5 * M_q

  // Cortante en arranque [kN/m]
  const V_char = 0.5 * Ka * gamma * H * H + Ka * q * H
  const V_Ed   = 1.35 * 0.5 * Ka * gamma * H * H + 1.5 * Ka * q * H

  return {
    M_earth:  +M_earth.toFixed(2),
    M_q:      +M_q.toFixed(2),
    M_water:  +M_water.toFixed(2),
    M_char:   +M_char.toFixed(2),
    M_Ed:     +M_Ed.toFixed(2),
    V_char:   +V_char.toFixed(2),
    V_Ed:     +V_Ed.toFixed(2),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   6. ESFUERZOS EN ZAPATA (talón y puntera como ménsulas)
   ═══════════════════════════════════════════════════════════════════════ */
export function calcularZapata(tensiones, pesos, inputs) {
  const { hz, lp, lt, B, bwBase, H, gamma, q,
          hayAgua, hf, gammaSat, gammaW } = inputs
  const { sigmaMax, sigmaMin } = tensiones

  // Presión del terreno en la cara del muro (talón y puntera)
  const x_heel_face = lp + bwBase
  const x_toe_face  = lp

  const sigma_at_heel = sigmaMax - (sigmaMax - sigmaMin) * (x_heel_face / B)
  const sigma_at_toe  = sigmaMax - (sigmaMax - sigmaMin) * (x_toe_face  / B)

  // ── TALÓN ──────────────────────────────────────────────────────────────
  // Presión media del terreno bajo el talón
  const sigma_avg_heel = (sigma_at_heel + sigmaMin) / 2

  // Carga descendente total sobre el talón [kN/m²]
  let q_down_heel
  if (hayAgua && hf > hz) {
    const h_sub = Math.min(hf - hz, H)
    q_down_heel = (H - h_sub) * gamma + h_sub * gammaSat + hz * GAMMA_H + q
  } else {
    q_down_heel = H * gamma + hz * GAMMA_H + q
  }

  // Carga neta (positiva = hacia arriba)
  const q_net_heel = sigma_avg_heel - q_down_heel
  // Momento en el arranque del talón [kN·m/m]
  const M_char_tal = Math.abs(q_net_heel) * lt * lt / 2
  const M_Ed_tal   = 1.35 * M_char_tal

  // ── PUNTERA ─────────────────────────────────────────────────────────────
  const sigma_avg_toe = (sigmaMax + sigma_at_toe) / 2
  const q_net_toe     = sigma_avg_toe - hz * GAMMA_H   // net (footing self-weight)
  const M_char_pun    = Math.abs(q_net_toe) * lp * lp / 2
  const M_Ed_pun      = 1.35 * M_char_pun

  return {
    q_net_heel:  +q_net_heel.toFixed(2),
    M_char_tal:  +M_char_tal.toFixed(2),
    M_Ed_tal:    +M_Ed_tal.toFixed(2),
    q_net_toe:   +q_net_toe.toFixed(2),
    M_char_pun:  +M_char_pun.toFixed(2),
    M_Ed_pun:    +M_Ed_pun.toFixed(2),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   7. ARMADURA (As necesaria vs dispuesta)
   ═══════════════════════════════════════════════════════════════════════ */
function areaBarrasPorMetro(nBarras, diametro) {
  return (Number(nBarras) || 0) * PI * ((Number(diametro) || 0) / 2) ** 2
}

export function calcularArmadura(alzado, zapata, inputs) {
  const { bwBase, hz, tipoAcero, armAlzado, armTalon, armPuntera } = inputs
  const { fyd } = propiedadesAcero(tipoAcero)

  // Cantos útiles [mm]
  const d_alz = bwBase * 1000 - REC_MM
  const d_tal = hz    * 1000 - REC_MM
  const d_pun = hz    * 1000 - REC_MM

  // As necesaria [mm²/m]
  const As_nec_alz = alzado.M_Ed * 1e6 / (0.9 * d_alz * fyd)
  const As_nec_tal = zapata.M_Ed_tal * 1e6 / (0.9 * d_tal * fyd)
  const As_nec_pun = zapata.M_Ed_pun * 1e6 / (0.9 * d_pun * fyd)

  // As dispuesta [mm²/m]
  const As_alz = areaBarrasPorMetro(armAlzado?.nBarras,  armAlzado?.diametro)
  const As_tal = areaBarrasPorMetro(armTalon?.nBarras,   armTalon?.diametro)
  const As_pun = areaBarrasPorMetro(armPuntera?.nBarras, armPuntera?.diametro)

  // MRd = As · fyd · 0.9·d  [kN·m/m]
  const MRd_alz = As_alz > 0 ? As_alz * fyd * 0.9 * d_alz / 1e6 : 0
  const MRd_tal = As_tal > 0 ? As_tal * fyd * 0.9 * d_tal / 1e6 : 0
  const MRd_pun = As_pun > 0 ? As_pun * fyd * 0.9 * d_pun / 1e6 : 0

  const cumpleAlz = As_alz >= As_nec_alz && As_alz > 0
  const cumpleTal = As_tal >= As_nec_tal && As_tal > 0
  const cumplePun = As_pun >= As_nec_pun && As_pun > 0

  const aprovAlz = As_alz > 0 ? Math.min(As_nec_alz / As_alz * 100, 200) : 200
  const aprovTal = As_tal > 0 ? Math.min(As_nec_tal / As_tal * 100, 200) : 200
  const aprovPun = As_pun > 0 ? Math.min(As_nec_pun / As_pun * 100, 200) : 200

  return {
    d_alz,       As_nec_alz: +As_nec_alz.toFixed(0),  As_alz: +As_alz.toFixed(0),
    MRd_alz:     +MRd_alz.toFixed(2),  cumpleAlz, aprovAlz: +aprovAlz.toFixed(1),
    d_tal,       As_nec_tal: +As_nec_tal.toFixed(0),   As_tal: +As_tal.toFixed(0),
    MRd_tal:     +MRd_tal.toFixed(2),  cumpleTal, aprovTal: +aprovTal.toFixed(1),
    d_pun,       As_nec_pun: +As_nec_pun.toFixed(0),  As_pun: +As_pun.toFixed(0),
    MRd_pun:     +MRd_pun.toFixed(2),  cumplePun, aprovPun: +aprovPun.toFixed(1),
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   ORQUESTADOR
   ═══════════════════════════════════════════════════════════════════════ */
export function calcularMuro(inputs) {
  const inp = { ...inputs, B: inputs.lp + inputs.bwBase + inputs.lt }

  const empujes     = calcularEmpujes(inp)
  const pesos       = calcularPesos(inp)
  const estabilidad = calcularEstabilidad(empujes, pesos, inp)
  const tensiones   = calcularTensiones(empujes, pesos, inp)
  const alzado      = calcularAlzado(empujes, inp)
  const zapata      = calcularZapata(tensiones, pesos, inp)
  const armadura    = calcularArmadura(alzado, zapata, inp)

  const resumen = [
    {
      nombre:          'Estabilidad al vuelco (CSV)',
      valorCalculado:  estabilidad.CSV === Infinity ? 999 : estabilidad.CSV,
      valorLimite:     2.0,
      unidad:          '',
      aprovechamiento: estabilidad.cumpleVuelco ? Math.min(estabilidad.aprovVuelco, 100) : 110,
      cumple:          estabilidad.cumpleVuelco,
      articuloNorma:   'CTE DB-SE-C Art. 4.3',
    },
    {
      nombre:          'Estabilidad al deslizamiento (CSD)',
      valorCalculado:  estabilidad.CSD === Infinity ? 999 : estabilidad.CSD,
      valorLimite:     1.5,
      unidad:          '',
      aprovechamiento: estabilidad.cumpleDesliz ? Math.min(estabilidad.aprovDesliz, 100) : 110,
      cumple:          estabilidad.cumpleDesliz,
      articuloNorma:   'CTE DB-SE-C Art. 4.3',
    },
    {
      nombre:          'Tensión máxima terreno',
      valorCalculado:  tensiones.sigmaMax,
      valorLimite:     inp.sigmaAdm,
      unidad:          'kN/m²',
      aprovechamiento: tensiones.aprov,
      cumple:          tensiones.cumple,
      articuloNorma:   'CTE DB-SE-C Art. 4.2',
    },
    {
      nombre:          'Armado alzado (cara trasdós)',
      valorCalculado:  armadura.As_nec_alz,
      valorLimite:     armadura.As_alz,
      unidad:          'mm²/m',
      aprovechamiento: armadura.aprovAlz,
      cumple:          armadura.cumpleAlz,
      articuloNorma:   'CE Art. 42.1',
    },
    {
      nombre:          'Armado talón (cara superior)',
      valorCalculado:  armadura.As_nec_tal,
      valorLimite:     armadura.As_tal,
      unidad:          'mm²/m',
      aprovechamiento: armadura.aprovTal,
      cumple:          armadura.cumpleTal,
      articuloNorma:   'CE Art. 42.1',
    },
    {
      nombre:          'Armado puntera (cara inferior)',
      valorCalculado:  armadura.As_nec_pun,
      valorLimite:     armadura.As_pun,
      unidad:          'mm²/m',
      aprovechamiento: armadura.aprovPun,
      cumple:          armadura.cumplePun,
      articuloNorma:   'CE Art. 42.1',
    },
  ]

  return { empujes, pesos, estabilidad, tensiones, alzado, zapata, armadura, resumen, B: inp.B }
}
