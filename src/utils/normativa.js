/**
 * Constantes y propiedades de materiales según el Código Estructural (CE).
 * Equivalente al Eurocódigo 2.
 * Todas las tensiones en MPa (N/mm²).
 */

// ── Coeficientes parciales de seguridad ─────────────────────────────────────
export const GAMMA_C = 1.5    // Hormigón, ELU persistente/transitoria  (CE Tab. 15.3)
export const GAMMA_S = 1.15   // Acero pasivo                           (CE Tab. 15.3)

// ── Módulo de elasticidad del acero ─────────────────────────────────────────
export const Es = 200_000  // MPa

// ── Deformación última del hormigón (diagrama parábola-rectángulo) ───────────
export const ECU = 0.0035  // CE Art. 39.5

// ── Parámetros del bloque rectangular (CE Art. 39.5, fck ≤ 50 MPa) ─────────
export const LAMBDA = 0.8  // factor de altura del bloque
export const ETA    = 1.0  // factor de eficacia de la resistencia

// ── Tabla de hormigones ──────────────────────────────────────────────────────
const HORMIGONES_FCK = {
  'HA-25': 25,
  'HA-30': 30,
  'HA-35': 35,
  'HA-40': 40,
  'HA-45': 45,
  'HA-50': 50,
}

/**
 * Devuelve las propiedades calculadas de un hormigón.
 * @param {string} tipo  'HA-25' | 'HA-30' | 'HA-35' | 'HA-40' | 'HA-45' | 'HA-50'
 * @returns {{ fck, fcd, fctm, fctk005, Ecm }}  todas en MPa
 */
export function propiedadesHormigon(tipo) {
  const fck = HORMIGONES_FCK[tipo]
  if (!fck) throw new Error(`Hormigón no reconocido: ${tipo}`)
  return {
    fck,
    fcd:      fck / GAMMA_C,                             // resistencia de cálculo  [MPa]
    fctm:     0.30 * Math.pow(fck, 2 / 3),               // resistencia media a tracción [MPa] CE (fck≤50)
    fctk005:  0.70 * 0.30 * Math.pow(fck, 2 / 3),       // fractil 5%  [MPa]
    Ecm:      8500 * Math.pow(fck + 8, 1 / 3),           // módulo de deformación longitudinal [MPa]
  }
}

// ── Tabla de aceros ──────────────────────────────────────────────────────────
const ACEROS_FYK = { 'B400S': 400, 'B500S': 500, 'B500SD': 500 }

/**
 * Devuelve las propiedades del acero de armaduras.
 * @param {string} tipo  'B400S' | 'B500S' | 'B500SD'
 * @returns {{ fyk, fyd, Es }}  tensiones en MPa
 */
export function propiedadesAcero(tipo) {
  const fyk = ACEROS_FYK[tipo]
  if (!fyk) throw new Error(`Acero no reconocido: ${tipo}`)
  return {
    fyk,
    fyd: fyk / GAMMA_S,  // resistencia de cálculo  [MPa]
    Es,
  }
}

// ── Límites de fisuración por clase de exposición (CE Tab. 49.1) ─────────────
const WMAX_MAP = {
  'I':    0.4,
  'IIa':  0.3, 'IIb':  0.3,
  'IIIa': 0.2, 'IIIb': 0.2, 'IIIc': 0.2,
  'IV':   0.1,
  'Qa':   0.2, 'Qb':   0.2, 'Qc':   0.2,
}

/**
 * Devuelve la abertura máxima de fisura admisible según la clase de exposición.
 * @param {string} clase  'I' | 'IIa' | 'IIb' | ...
 * @returns {number}  wmax [mm]
 */
export function wmaxFisuracion(clase) {
  return WMAX_MAP[clase] ?? 0.3
}
