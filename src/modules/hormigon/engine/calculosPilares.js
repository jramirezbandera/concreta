/**
 * calculosPilares.js
 * Motor de cálculo para pilares de hormigón armado (CE — Código Estructural).
 *
 * Flexocompresión: diagrama de interacción N-M con bloque rectangular (CE Art. 39.5).
 * Pandeo: amplificación de momentos simplificada (CE Art. 43.5).
 *
 * Convención de signos:
 *   N  > 0 → compresión   (kN)
 *   M  > 0 → convencional (kN·m)
 *   y  medida desde la cara comprimida (superior) hacia abajo (mm)
 */

import {
  propiedadesHormigon, propiedadesAcero,
  Es, ECU, LAMBDA, ETA,
} from '../../../utils/normativa.js'

const PI = Math.PI

/* ── Capas de armadura ───────────────────────────────────────────────────── */
/**
 * Construye el array de capas [{As [mm²], y [mm]}] a partir del objeto armadura.
 * Las capas del lado comprimido tienen y pequeña; lado traccionado y ≈ h.
 */
export function buildLayers(armadura, h, dp) {
  const layers = []

  if (armadura.tipo === 'simetrica') {
    const n  = Math.max(4, Number(armadura.nBarras)  || 4)
    const d  = Math.max(6, Number(armadura.diametro) || 16)
    const A1 = PI * (d / 2) ** 2

    // Barras por cara horizontal (incluyen esquinas)
    const nFace = Math.max(2, Math.round(n / 4))
    // Barras intermedias por cara lateral (excluyendo esquinas)
    const nLat  = Math.max(0, Math.floor((n - 2 * nFace) / 2))

    layers.push({ As: nFace * A1, y: dp })        // cara comprimida (superior)
    layers.push({ As: nFace * A1, y: h - dp })    // cara traccionada (inferior)

    if (nLat > 0) {
      const step = (h - 2 * dp) / (nLat + 1)
      for (let i = 1; i <= nLat; i++) {
        layers.push({ As: 2 * A1, y: dp + i * step })  // par lateral (izq + der)
      }
    }
  } else {
    // Por caras: superior (comprimida), inferior (traccionada), laterales
    const { nSup = 0, diamSup = 16, nInf = 0, diamInf = 16, nLat = 0, diamLat = 12 } = armadura
    const A = (d) => PI * (Number(d) / 2) ** 2

    const ns = Number(nSup), ds = Number(diamSup)
    const ni = Number(nInf), di = Number(diamInf)
    const nl = Number(nLat), dl = Number(diamLat)

    if (ns > 0 && ds > 0) layers.push({ As: ns * A(ds), y: dp })
    if (ni > 0 && di > 0) layers.push({ As: ni * A(di), y: h - dp })
    if (nl > 0 && dl > 0) {
      const step = (h - 2 * dp) / (nl + 1)
      for (let i = 1; i <= nl; i++) {
        layers.push({ As: 2 * A(dl), y: dp + i * step })
      }
    }
  }

  return layers
}

/* ── N y M para una profundidad de fibra neutra dada ────────────────────── */
/**
 * @param {number} x    — profundidad de la fibra neutra desde cara comprimida [mm]
 * @returns {{ N [N], M [N·mm] }}  positivos = compresión / dextrógiro
 */
function computeNM_raw(x, b, h, fcd, fyd, layers) {
  // Bloque rectangular de hormigón
  let Nc = 0, Mc = 0
  if (x > 0) {
    const a = Math.min(LAMBDA * x, h)          // altura del bloque [mm]
    Nc = ETA * fcd * b * a                     // fuerza de compresión [N]
    Mc = Nc * (h / 2 - a / 2)                 // momento respecto al centroide [N·mm]
  }

  // Contribución de armaduras
  let Ns = 0, Ms = 0
  for (const { As, y } of layers) {
    const eps   = x > 0 ? ECU * (x - y) / x : -(fyd / Es)  // tracción pura fuera del diagrama
    const sigma = Math.max(-fyd, Math.min(fyd, eps * Es))   // [MPa]
    const F     = As * sigma                                 // [N]
    Ns += F
    Ms += F * (h / 2 - y)
  }

  return { N: Nc + Ns, M: Mc + Ms }
}

/* ── Diagrama de interacción ─────────────────────────────────────────────── */
/**
 * Genera la rama M ≥ 0 del diagrama N-M variando x desde tracción pura
 * hasta compresión pura.
 *
 * @returns {Array<{N [kN], M [kN·m]}>}
 */
export function calcularDiagramaInteraccion(b, h, dp, armadura, tipoHormigon, tipoAcero) {
  const { fcd }  = propiedadesHormigon(tipoHormigon)
  const { fyd }  = propiedadesAcero(tipoAcero)
  const layers   = buildLayers(armadura, h, dp)
  const totalAs  = layers.reduce((s, l) => s + l.As, 0)

  const points = []

  // ① Punto de tracción pura (x → 0⁻)
  points.push({ N: -fyd * totalAs / 1000, M: 0 })

  // ② Variar x: 0→h (flexión + compresión creciente)  — 150 puntos
  for (let i = 1; i <= 150; i++) {
    const x = h * i / 150
    const { N, M } = computeNM_raw(x, b, h, fcd, fyd, layers)
    points.push({ N: N / 1000, M: M / 1e6 })
  }

  // ③ Zona de alta compresión (x: h → 15h) — 60 puntos
  for (let i = 1; i <= 60; i++) {
    const x = h * (1 + i * 0.25)
    const { N, M } = computeNM_raw(x, b, h, fcd, fyd, layers)
    points.push({ N: N / 1000, M: M / 1e6 })
  }

  // ④ Compresión pura (x → ∞)
  const Nc0 = ETA * fcd * b * h
  const Ns0 = fyd * totalAs
  points.push({ N: (Nc0 + Ns0) / 1000, M: 0 })

  return points
}

/* ── Mmax del diagrama para un N dado ───────────────────────────────────── */
function getMmaxAtN(points, Nd) {
  const sorted = [...points].sort((a, b) => a.N - b.N)
  const Nmin   = sorted[0].N
  const Nmax   = sorted[sorted.length - 1].N

  if (Nd < Nmin || Nd > Nmax) return null

  let maxM = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i], p2 = sorted[i + 1]
    if (p1.N <= Nd && Nd <= p2.N) {
      const dN = p2.N - p1.N
      const t  = dN > 0 ? (Nd - p1.N) / dN : 0
      maxM = Math.max(maxM, p1.M + t * (p2.M - p1.M))
    }
  }
  return maxM
}

/* ── Pandeo simplificado ─────────────────────────────────────────────────── */
/**
 * Método de amplificación de momentos (CE Art. 43.5).
 * EI_eff = Kc·Ecm·Ic   con   Kc = 0.3/(1 + 0.5·φef),  φef ≈ 1.
 *
 * @param {number} b, h       — sección [mm]
 * @param {number} L_m        — longitud del pilar [m]
 * @param {number} beta       — coeficiente de pandeo
 * @param {number} Nd_kN      — axil de cálculo [kN] (compresión positiva)
 * @param {number} Md_kNm     — momento de 1er orden [kN·m]
 * @param {string} tipoHormigon
 */
export function calcularPandeoSimplificado(b, h, L_m, beta, Nd_kN, Md_kNm, tipoHormigon) {
  const { Ecm } = propiedadesHormigon(tipoHormigon)

  const Nd = Math.max(0, Number(Nd_kN))  * 1000    // N  (compresión)
  const Md = Math.abs(Number(Md_kNm))   * 1e6     // N·mm
  const L  = Number(L_m) * 1000                   // mm
  const l0 = Number(beta) * L                     // longitud de pandeo [mm]
  const ic = h / Math.sqrt(12)                    // radio de giro [mm]
  const lambda = l0 / ic                          // esbeltez mecánica

  // Excentricidad mínima (CE Art. 42.2): max(20 mm, L/400)
  const e_min  = Math.max(20, L / 400)
  const Md_min = Nd * e_min                       // N·mm
  const Md_eff = Math.max(Md, Md_min)

  if (lambda < 25) {
    return {
      lambda:               +lambda.toFixed(1),
      esPilarCorto:         true,
      ea:                   0,
      Mtotal:               +(Md_eff / 1e6).toFixed(2),
      factorAmplificacion:  1.0,
      Ncr:                  null,
      eMin:                 +e_min.toFixed(1),
    }
  }

  // Rigidez efectiva simplificada
  const Kc     = 0.3 / (1 + 0.5 * 1.0)     // φef = 1.0  →  Kc ≈ 0.2
  const Ic     = b * h ** 3 / 12
  const EI_eff = Kc * Ecm * Ic              // N·mm²
  const Ncr    = (PI ** 2 * EI_eff) / (l0 ** 2)  // N

  if (Nd >= 0.99 * Ncr) {
    return {
      lambda:               +lambda.toFixed(1),
      esPilarCorto:         false,
      ea:                   Infinity,
      Mtotal:               Infinity,
      factorAmplificacion:  Infinity,
      Ncr:                  +(Ncr / 1000).toFixed(1),
      eMin:                 +e_min.toFixed(1),
      error:                'Nd ≥ Ncr — pilar inestable a pandeo',
    }
  }

  const amp    = 1 / (1 - Nd / Ncr)
  const Mtotal = Md_eff * amp
  const e0     = Nd > 0 ? Md_eff / Nd : 0
  const ea     = Nd > 0 ? (Mtotal / Nd - e0) : 0

  return {
    lambda:               +lambda.toFixed(1),
    esPilarCorto:         false,
    ea:                   +ea.toFixed(1),
    Mtotal:               +(Mtotal / 1e6).toFixed(2),
    factorAmplificacion:  +amp.toFixed(3),
    Ncr:                  +(Ncr / 1000).toFixed(1),
    eMin:                 +e_min.toFixed(1),
  }
}

/* ── Comprobación global ─────────────────────────────────────────────────── */
/**
 * @param {object} inputs — valores del formulario
 * @returns {{ diagrama, pandeo, punto, mmax, cumple, rho, resumen }}
 */
export function comprobarPilar(inputs) {
  const { b, h, dp, armadura, tipoHormigon, tipoAcero, Nd, Md, L, beta } = inputs

  const bN  = Math.max(100, Number(b)  || 300)
  const hN  = Math.max(100, Number(h)  || 300)
  const dpN = Math.max(20,  Number(dp) || 40)

  // 1. Diagrama de interacción
  const diagrama = calcularDiagramaInteraccion(bN, hN, dpN, armadura, tipoHormigon, tipoAcero)

  // 2. Pandeo
  const pandeo = calcularPandeoSimplificado(bN, hN, Number(L), Number(beta), Number(Nd), Number(Md), tipoHormigon)

  const Nd_kN  = Number(Nd)
  const Mtotal = pandeo.Mtotal   // kN·m (con pandeo y excentricidad mínima)

  // 3. Verificar diagrama
  const mmax    = getMmaxAtN(diagrama, Nd_kN)
  const cumpleNM = mmax !== null && isFinite(Mtotal) && Math.abs(Mtotal) <= mmax
  const aprovNM  = (mmax !== null && mmax > 0 && isFinite(Mtotal))
    ? Math.min(Math.abs(Mtotal) / mmax * 100, 200)
    : (mmax === 0 ? 100 : 200)

  // 4. Cuantías
  const { fcd, fck } = propiedadesHormigon(tipoHormigon)
  const layers       = buildLayers(armadura, hN, dpN)
  const totalAs      = layers.reduce((s, l) => s + l.As, 0)
  const rho          = totalAs / (bN * hN) * 100   // %
  const rho_min = 0.3, rho_max = 4.0               // CE Art. 47.1.1
  const cumpleRho = rho >= rho_min && rho <= rho_max

  return {
    diagrama,
    pandeo,
    punto: { N: Nd_kN, M: isFinite(Mtotal) ? +Mtotal : 0 },
    mmax:  mmax !== null ? +mmax.toFixed(2) : null,
    rho:   +rho.toFixed(3),
    cumple: cumpleNM && cumpleRho,
    resumen: [
      {
        nombre:          'Cuantía geométrica ρ',
        valorCalculado:  +rho.toFixed(3),
        valorLimite:     '0.30 – 4.00',
        unidad:          '%',
        aprovechamiento: +Math.min(rho / rho_max * 100, 200).toFixed(1),
        cumple:          cumpleRho,
        articuloNorma:   'CE Art. 47.1',
      },
      {
        nombre:          'Esbeltez λ',
        valorCalculado:  pandeo.lambda,
        valorLimite:     '< 200',
        unidad:          '',
        aprovechamiento: +Math.min(pandeo.lambda / 200 * 100, 200).toFixed(1),
        cumple:          pandeo.lambda < 200,
        articuloNorma:   'CE Art. 43.1',
      },
      {
        nombre:          'Flexocompresión N-M',
        valorCalculado:  isFinite(Mtotal) ? +Math.abs(Mtotal).toFixed(2) : '∞',
        valorLimite:     mmax !== null ? +mmax.toFixed(2) : '—',
        unidad:          'kN·m',
        aprovechamiento: +Math.min(aprovNM, 200).toFixed(1),
        cumple:          cumpleNM,
        articuloNorma:   'CE Art. 42.1',
      },
    ],
  }
}
