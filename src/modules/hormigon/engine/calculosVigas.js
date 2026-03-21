/**
 * Motor de cálculo de vigas de hormigón armado.
 * Normativa: Código Estructural español (CE), equivalente al Eurocódigo 2.
 *
 * CONVENIO DE UNIDADES INTERNAS:
 *   Fuerzas    → N
 *   Momentos   → N·mm
 *   Longitudes → mm
 *   Tensiones  → MPa (= N/mm²)
 *
 * Las funciones exportadas reciben unidades de formulario (kN, m, MPa, mm)
 * y devuelven resultados en las mismas unidades para mostrar en pantalla.
 * La conversión interna N·mm ↔ kN·m se realiza con factor 1 × 10⁶.
 */

import {
  propiedadesHormigon, propiedadesAcero, wmaxFisuracion,
  Es, ECU, LAMBDA, ETA, GAMMA_C,
} from '../../../utils/normativa.js'

// ── Utilidad: área de armadura ────────────────────────────────────────────────
// nBarras [adim], diametro [mm] → As [mm²]
function areaBarras(nBarras, diametro) {
  return Number(nBarras) * Math.PI * Math.pow(Number(diametro) / 2, 2)
}

// ── 1. Esfuerzos desde cargas ─────────────────────────────────────────────────
/**
 * Calcula Md y Vd a partir de la carga aplicada.
 * Combinación ELU persistente: qd = 1.35·g + 1.50·q (CE Art. 12.2)
 * Combinación ELS frecuente:   qfre = g + 0.70·q    (CE Tab. 12.1, ψ1=0.7 uso general)
 *
 * @param {string} tipoViga   'biapoyada' | 'voladizo' | 'empotrada_apoyada' | 'biempotrada'
 * @param {number} L          Longitud del vano [m]
 * @param {number} g          Carga permanente característica [kN/m]
 * @param {number} q          Carga variable característica [kN/m]
 * @returns {{ Md, Vd, Md_els, qd, qfre }}  Md [kN·m], Vd [kN]
 */
export function calcularEsfuerzosDesdeCargas(tipoViga, L, g, q) {
  const qd   = 1.35 * g + 1.50 * q   // kN/m — ELU
  const qfre = g + 0.70 * q           // kN/m — ELS frecuente

  let Md, Vd, Md_els
  switch (tipoViga) {
    case 'biapoyada':
      Md     = qd   * L * L / 8
      Md_els = qfre * L * L / 8
      Vd     = qd   * L / 2
      break
    case 'voladizo':
      Md     = qd   * L * L / 2
      Md_els = qfre * L * L / 2
      Vd     = qd   * L
      break
    case 'empotrada_apoyada':
      // Momento máx. en vano ≈ 9qL²/128; cortante máx. en apoyo empotrado = 5qL/8
      Md     = 9 / 128 * qd   * L * L
      Md_els = 9 / 128 * qfre * L * L
      Vd     = 5 / 8   * qd   * L
      break
    case 'biempotrada':
      // Momento en apoyos (máximo) = qL²/12; vano = qL²/24
      Md     = qd   * L * L / 12
      Md_els = qfre * L * L / 12
      Vd     = qd   * L / 2
      break
    default:
      Md = Md_els = Vd = 0
  }
  return { Md, Vd, Md_els, qd, qfre, tipoViga, L }
}

// ── 2. Flexión simple / compuesta (CE Art. 42.3) ─────────────────────────────
/**
 * Comprobación a flexión mediante bloque rectangular de compresiones.
 * Válido para fck ≤ 50 MPa (λ=0.8, η=1.0).
 *
 * Sección simplemente armada:
 *   Equilibrio: η·fcd·b·λ·x = As·fyd  →  x = As·fyd / (η·fcd·b·λ)
 *   Mu = As·fyd·(d − λ·x/2) = As·fyd·(d − 0.4·x)
 *
 * Sección doblemente armada:
 *   η·fcd·b·λ·x + As2·σ's = As·fyd
 *   σ's = min(εcu·(x−d2)/x · Es, fyd)  —  verificar plastificación
 *   Mu = η·fcd·b·λ·x·(d−0.4x) + As2·σ's·(d−d2)
 *
 * @param {number} b                  Ancho [mm]
 * @param {number} h                  Canto total [mm]
 * @param {number} dPrima             Recubrimiento mecánico tracción [mm]
 * @param {{ nBarras, diametro }}      armaduraTraccion
 * @param {{ activa, nBarras, diametro }} armaduraCompresion
 * @param {string} tipoHormigon
 * @param {string} tipoAcero
 * @param {number} Md_kNm             Momento de cálculo [kN·m]
 * @returns {object}
 */
export function comprobarFlexion(b, h, dPrima, armaduraTraccion, armaduraCompresion, tipoHormigon, tipoAcero, Md_kNm) {
  const Md = Md_kNm * 1e6    // kN·m → N·mm

  const { fck, fcd } = propiedadesHormigon(tipoHormigon)
  const { fyd }      = propiedadesAcero(tipoAcero)

  const d  = h - dPrima  // canto útil [mm]
  const As = areaBarras(armaduraTraccion.nBarras, armaduraTraccion.diametro)  // mm²

  let x, Mu, sigma_As2 = 0, As2 = 0, comp_plastifica = true

  if (!armaduraCompresion?.activa) {
    // ── Sección simplemente armada ─────────────────────────────────────────
    x  = (As * fyd) / (ETA * fcd * b * LAMBDA)   // mm
    Mu = As * fyd * (d - 0.4 * x)                 // N·mm
  } else {
    // ── Sección doblemente armada ──────────────────────────────────────────
    As2       = areaBarras(armaduraCompresion.nBarras, armaduraCompresion.diametro)  // mm²
    const d2  = dPrima  // profundidad del CdG de arm. compresión ≈ recubrimiento mecánico [mm]

    // Primera estimación de x asumiendo As2 plastifica
    x = (As * fyd - As2 * fyd) / (ETA * fcd * b * LAMBDA)
    x = Math.max(x, d2 + 1)  // x debe ser mayor que d2

    // Verificar si As2 plastifica: ε's = εcu·(x − d2)/x ≥ fyd/Es
    const eps_As2 = ECU * (x - d2) / x
    const eps_yd  = fyd / Es
    comp_plastifica = eps_As2 >= eps_yd
    sigma_As2 = comp_plastifica ? fyd : eps_As2 * Es   // MPa

    // Recalcular x con σ's real
    x = (As * fyd - As2 * sigma_As2) / (ETA * fcd * b * LAMBDA)
    x = Math.max(x, d2 + 1)

    const Mu_hormigon = ETA * fcd * b * LAMBDA * x * (d - 0.4 * x)  // N·mm
    const Mu_As2      = As2 * sigma_As2 * (d - d2)                   // N·mm
    Mu = Mu_hormigon + Mu_As2
  }

  const xd     = x / d
  const ductil = xd <= 0.617   // Dominio 3: deformación controlada por el acero (CE Art. 42.3.2)
  const aprov  = Md > 0 ? (Md / Mu) * 100 : 0

  return {
    Mu:              Number((Mu / 1e6).toFixed(2)),  // kN·m
    x:               Number(x.toFixed(1)),            // mm
    xd:              Number(xd.toFixed(4)),
    ductil,
    comp_plastifica,
    sigma_As2:       Number(sigma_As2.toFixed(1)),    // MPa
    As:              Number(As.toFixed(1)),            // mm²
    As2:             Number(As2.toFixed(1)),           // mm²
    aprovechamiento: Number(aprov.toFixed(1)),
    cumple:          Md <= Mu && ductil,
    valorCalculado:  Number(Md_kNm.toFixed(2)),
    valorLimite:     Number((Mu / 1e6).toFixed(2)),
    unidad:          'kN·m',
    nombre:          'Flexión — Mu ≥ Md',
    articuloNorma:   'CE Art. 42.3',
  }
}

// ── 3. Cortante (CE Art. 44.2) ────────────────────────────────────────────────
/**
 * Comprobación a cortante. Modelo de bielas y tirantes (θ = 45°, simplificado).
 *
 * Vu1 — compresión oblicua del alma (CE Art. 44.2.3.1):
 *   Vu1 = 0.30·fcd·b·d  (para cotθ = 1, θ = 45°)
 *
 * Vu2 — tracción en el alma (CE Art. 44.2.3.2):
 *   Vcu = max( [0.18/γc·ξ·(100·ρl·fck)^(1/3)]·b·d,  [0.075/γc·ξ^(3/2)·fck^(1/2)]·b·d )
 *   Vsu = Asw/s · 0.9·d · fyd
 *   Vu2 = Vcu + Vsu
 *
 * Nota: la fórmula de Vcu es semi-empírica (EC2 / CE);
 *       el resultado es en N cuando b, d en mm y fck en MPa.
 *
 * @param {number} b   Ancho del alma [mm]
 * @param {number} h   Canto total [mm]
 * @param {number} dPrima  Recubrimiento mecánico [mm]
 * @param {{ diametroEstribo, separacion, nRamas }} estribos
 * @param {string} tipoHormigon
 * @param {string} tipoAcero
 * @param {{ nBarras, diametro }} armaduraTraccion
 * @param {number} Vd_kN  Cortante de cálculo [kN]
 * @returns {object}
 */
export function comprobarCortante(b, h, dPrima, estribos, tipoHormigon, tipoAcero, armaduraTraccion, Vd_kN) {
  const Vd = Vd_kN * 1000   // kN → N

  const { fck, fcd } = propiedadesHormigon(tipoHormigon)
  const { fyd }      = propiedadesAcero(tipoAcero)

  const d  = h - dPrima  // canto útil [mm]
  const As = areaBarras(armaduraTraccion.nBarras, armaduraTraccion.diametro)  // mm²

  // ── Vu1: compresión del alma ───────────────────────────────────────────────
  const Vu1 = 0.30 * fcd * b * d   // N

  // ── Vcu: contribución del hormigón ─────────────────────────────────────────
  const xi    = Math.min(1 + Math.sqrt(200 / d), 2.0)         // factor de tamaño  (d en mm)
  const rho_l = Math.min(As / (b * d), 0.02)                  // cuantía de tracción, máx. 0.02

  const Vcu_formula = (0.18 / GAMMA_C) * xi * Math.pow(100 * rho_l * fck, 1 / 3) * b * d  // N
  const Vcu_min     = (0.075 / GAMMA_C) * Math.pow(xi, 1.5) * Math.pow(fck, 0.5) * b * d  // N
  const Vcu         = Math.max(Vcu_formula, Vcu_min)   // N

  // ── Vsu: contribución de los estribos ──────────────────────────────────────
  // Asw = área de una sección transversal de estribo (todas las ramas)
  const Asw = areaBarras(estribos.nRamas, estribos.diametroEstribo)  // mm²
  const z   = 0.9 * d   // brazo mecánico [mm]
  const Vsu = (Asw / Number(estribos.separacion)) * z * fyd   // N

  const Vu2    = Vcu + Vsu   // N
  const Vu_lim = Math.min(Vu1, Vu2)
  const aprov  = Vd > 0 ? (Vd / Vu_lim) * 100 : 0

  return {
    Vu1:             Number((Vu1 / 1000).toFixed(2)),   // kN
    Vcu:             Number((Vcu / 1000).toFixed(2)),   // kN
    Vsu:             Number((Vsu / 1000).toFixed(2)),   // kN
    Vu2:             Number((Vu2 / 1000).toFixed(2)),   // kN
    Asw:             Number(Asw.toFixed(1)),             // mm²
    aprovechamiento: Number(aprov.toFixed(1)),
    cumple:          Vd <= Vu1 && Vd <= Vu2,
    valorCalculado:  Number(Vd_kN.toFixed(2)),
    valorLimite:     Number((Vu_lim / 1000).toFixed(2)),
    unidad:          'kN',
    nombre:          'Cortante — Vu ≥ Vd',
    articuloNorma:   'CE Art. 44.2',
  }
}

// ── 4. Fisuración (CE Art. 49.2) ──────────────────────────────────────────────
/**
 * Comprobación de la abertura de fisura característica wk.
 * Método: EC2 / CE Art. 49.2 (sección fisurada, elasticidad, relación modular n = Es/Ecm).
 *
 * Fibra neutra en ELS (sección fisurada):
 *   b·x²/2 + n·As·x − n·As·d = 0  →  x = (−nAs + √(nAs² + 2·b·nAs·d)) / b
 *
 * Tensión en el acero:
 *   σs = Md_els / (As · (d − x/3))  — simplificado para sección sin As2 en ELS
 *       o más riguroso: σs = Md_els · n · (d−x) / I_c
 *
 * Separación media de fisuras (CE, según prompt):
 *   sm = 2·c + 0.2·s + 0.4·k1·φ/ρp,eff
 *
 * Deformación media:
 *   εsm − εcm = max(σs/Es · [1 − kt·fctm/(ρp,eff·σs)], 0.6·σs/Es)
 *
 * wk = sm · (εsm − εcm)
 *
 * @param {number} b
 * @param {number} h
 * @param {number} dPrima               Recubrimiento mecánico [mm]
 * @param {{ nBarras, diametro }}        armaduraTraccion
 * @param {string} tipoHormigon
 * @param {string} tipoAcero            (no usado directamente pero se pasa por coherencia)
 * @param {number} Md_els_kNm           Momento ELS frecuente [kN·m]
 * @param {string} claseExposicion
 * @returns {object}
 */
export function comprobarFisuracion(b, h, dPrima, armaduraTraccion, tipoHormigon, tipoAcero, Md_els_kNm, claseExposicion) {
  const wmax = wmaxFisuracion(claseExposicion)   // mm

  // Caso especial: sin momento de servicio → sin fisuras
  if (!Md_els_kNm || Md_els_kNm <= 0) {
    return { wk: 0, wmax, sm: 0, sigmaS: 0, x_els: 0, aprovechamiento: 0, cumple: true,
      valorCalculado: 0, valorLimite: wmax, unidad: 'mm', nombre: 'Fisuración — wk ≤ wmax', articuloNorma: 'CE Art. 49.2' }
  }

  const Md_els = Md_els_kNm * 1e6   // kN·m → N·mm

  const { fck, fctm, Ecm } = propiedadesHormigon(tipoHormigon)

  const d   = h - dPrima    // canto útil [mm]
  const phi = Number(armaduraTraccion.diametro)   // diámetro de barra [mm]
  const As  = areaBarras(armaduraTraccion.nBarras, phi)   // mm²
  const n   = Es / Ecm   // relación modular (adimensional)

  // ── Fibra neutra sección fisurada ──────────────────────────────────────────
  // Ecuación cuadrática: b·x²/2 + n·As·x − n·As·d = 0
  const nAs  = n * As
  const x_els = (-nAs + Math.sqrt(nAs * nAs + 2 * b * nAs * d)) / b   // mm

  // ── Momento de inercia de la sección fisurada homogeneizada ───────────────
  const I_c = (b * Math.pow(x_els, 3)) / 3 + n * As * Math.pow(d - x_els, 2)   // mm⁴

  // ── Tensión en el acero en ELS ────────────────────────────────────────────
  const sigma_s = Md_els * n * (d - x_els) / I_c   // MPa

  if (sigma_s <= 0) {
    return { wk: 0, wmax, sm: 0, sigmaS: 0, x_els: Number(x_els.toFixed(1)),
      aprovechamiento: 0, cumple: true,
      valorCalculado: 0, valorLimite: wmax, unidad: 'mm', nombre: 'Fisuración — wk ≤ wmax', articuloNorma: 'CE Art. 49.2' }
  }

  // ── Área eficaz de hormigón en tracción ───────────────────────────────────
  // hc,eff = min(2.5·(h−d), (h−x)/3, h/2)  [mm]
  const h_ceff = Math.min(2.5 * (h - d), (h - x_els) / 3, h / 2)
  const Ac_eff = b * h_ceff   // mm²

  // ── Cuantía eficaz ────────────────────────────────────────────────────────
  const rho_peff = Math.max(As / Ac_eff, 1e-6)

  // ── Recubrimiento nominal y separación entre barras ───────────────────────
  const c       = Math.max(dPrima - phi / 2, 5)   // recubrimiento a cara de barra [mm]
  const n_barras = Number(armaduraTraccion.nBarras)
  const s_barras = n_barras > 1
    ? Math.max((b - 2 * c - n_barras * phi) / (n_barras - 1), 0)
    : 0   // separación libre entre barras [mm]

  // ── Separación media de fisuras (CE / EC2) ─────────────────────────────────
  // sm = 2·c + 0.2·s + 0.4·k1·φ/ρp,eff   (k1 = 0.8, barras de alta adherencia)
  const k1 = 0.8
  const sm = 2 * c + 0.2 * s_barras + 0.4 * k1 * phi / rho_peff   // mm

  // ── Deformación media (εsm − εcm) ─────────────────────────────────────────
  // kt = 0.4 (cargas de larga duración)
  const kt   = 0.4
  const term = (rho_peff > 0 && sigma_s > 0)
    ? kt * fctm / (rho_peff * sigma_s)
    : 0
  const eps_sm_cm = Math.max(
    (sigma_s / Es) * (1 - term),
    0.6 * sigma_s / Es,
  )

  // ── Abertura de fisura característica ─────────────────────────────────────
  const wk   = sm * eps_sm_cm   // mm
  const aprov = (wk / wmax) * 100

  return {
    wk:              Number(wk.toFixed(4)),          // mm
    wmax,                                             // mm
    sm:              Number(sm.toFixed(1)),           // mm
    sigmaS:          Number(sigma_s.toFixed(1)),      // MPa
    x_els:           Number(x_els.toFixed(1)),        // mm
    rho_peff:        Number((rho_peff * 100).toFixed(4)),  // %
    h_ceff:          Number(h_ceff.toFixed(1)),       // mm
    aprovechamiento: Number(aprov.toFixed(1)),
    cumple:          wk <= wmax,
    valorCalculado:  Number(wk.toFixed(4)),
    valorLimite:     wmax,
    unidad:          'mm',
    nombre:          'Fisuración — wk ≤ wmax',
    articuloNorma:   'CE Art. 49.2',
  }
}

// ── 5. Función principal ───────────────────────────────────────────────────────
/**
 * Punto de entrada único del motor de cálculo de vigas.
 * Recibe el estado completo del formulario Vigas.jsx y devuelve
 * todos los resultados formateados para la interfaz.
 *
 * @param {object} inputs  Estado del formulario (v)
 * @returns {{ esfuerzos, flexion, cortante, fisuracion, resumen }}
 */
export function calcularVigaHormigon(inputs) {
  const {
    b, h, dp,
    nBarras, diamBarras,
    compresionActiva, nComp, diamComp,
    diamEstribo, sepEstribo, ramasEstribo,
    hormigon: tipoHormigon,
    acero:    tipoAcero,
    exposicion,
    modo, Md: Md_input, Vd: Vd_input,
    tipoViga, L, g, q,
  } = inputs

  // ── Esfuerzos ────────────────────────────────────────────────────────────
  let Md, Vd, Md_els, esfuerzosDetalle = null

  if (modo === 'cargas') {
    const ef   = calcularEsfuerzosDesdeCargas(tipoViga, Number(L), Number(g), Number(q))
    Md         = ef.Md
    Vd         = ef.Vd
    Md_els     = ef.Md_els
    esfuerzosDetalle = ef
  } else {
    Md     = Number(Md_input)
    Vd     = Number(Vd_input)
    // ELS frecuente ≈ ELU / 1.50 como estimación conservadora cuando no se conocen las cargas individuales
    Md_els = Md / 1.50
  }

  // ── Estructuras de datos de armadura ────────────────────────────────────
  const armaduraTraccion   = { nBarras: Number(nBarras),    diametro: Number(diamBarras) }
  const armaduraCompresion = { activa: Boolean(compresionActiva), nBarras: Number(nComp), diametro: Number(diamComp) }
  const estribos           = { diametroEstribo: Number(diamEstribo), separacion: Number(sepEstribo), nRamas: Number(ramasEstribo) }

  // ── Comprobaciones ───────────────────────────────────────────────────────
  const flexion    = comprobarFlexion(Number(b), Number(h), Number(dp), armaduraTraccion, armaduraCompresion, tipoHormigon, tipoAcero, Md)
  const cortante   = comprobarCortante(Number(b), Number(h), Number(dp), estribos, tipoHormigon, tipoAcero, armaduraTraccion, Vd)
  const fisuracion = comprobarFisuracion(Number(b), Number(h), Number(dp), armaduraTraccion, tipoHormigon, tipoAcero, Md_els, exposicion)

  // ── Array para ResultsTable ──────────────────────────────────────────────
  const resumen = [flexion, cortante, fisuracion]

  return {
    esfuerzos: { Md, Vd, Md_els, detalle: esfuerzosDetalle },
    flexion,
    cortante,
    fisuracion,
    resumen,
  }
}
