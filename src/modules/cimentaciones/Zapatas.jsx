/**
 * Zapatas.jsx
 * Módulo de cálculo de zapatas aisladas.
 * CTE DB-SE-C / Código Estructural.
 */

import { useState, useRef } from 'react'
import { Layers } from 'lucide-react'
import { calcularZapata }  from './engine/calculosZapatas'
import StaleBanner         from '../../components/common/StaleBanner'
import { exportarPdf }     from '../../utils/exportPdf'
import ZapataAislada       from '../../components/svg/ZapataAislada'
import InputField          from '../../components/common/InputField'
import SelectField         from '../../components/common/SelectField'
import InputGroup          from '../../components/common/InputGroup'
import CalculateButton     from '../../components/common/CalculateButton'
import ResultsTable        from '../../components/common/ResultsTable'
import ExportPdfButton     from '../../components/common/ExportPdfButton'

/* ── Opciones de materiales ─────────────────────────────────────────────── */
const HORMIGONES = ['HA-25', 'HA-30', 'HA-35', 'HA-40'].map(v => ({ value: v, label: v }))
const ACEROS     = ['B400S', 'B500S', 'B500SD'].map(v => ({ value: v, label: v }))

/* ── Estado inicial ─────────────────────────────────────────────────────── */
const INIT = {
  // Geometría zapata
  a:             2.0,    // m  dimensión dirección del momento
  b:             2.0,    // m  dimensión perpendicular
  h:             0.5,    // m  canto
  recubrimiento: 70,     // mm
  // Geometría pilar
  ap:            0.35,   // m
  bp:            0.35,   // m
  // Terreno
  sigmaAdm:      150,    // kN/m²
  anguloRozamiento: 30,  // grados
  // Material
  tipoHormigon:  'HA-25',
  tipoAcero:     'B500S',
  // Armaduras
  nBarrasA:      8,
  diamA:         16,
  nBarrasB:      8,
  diamB:         16,
  // Cargas (ELS)
  Nd:            500,    // kN   axil
  Md:            30,     // kN·m momento
  Vd:            10,     // kN   cortante
}

/* ── Fila de resultado rápido ───────────────────────────────────────────── */
function ResRow({ label, value, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-1)' }}>
        {value}
        {unit && <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginLeft: '0.25rem' }}>{unit}</span>}
      </span>
    </div>
  )
}

/* ── Componente ─────────────────────────────────────────────────────────── */
export default function Zapatas() {
  const [v, setV]                     = useState(INIT)
  const [results, setResults]         = useState(null)
  const [calcError, setCalcError]     = useState(null)
  const [isStale, setIsStale]         = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const svgWrapperRef                 = useRef(null)

  function set(key, val) {
    setV(prev => ({ ...prev, [key]: val }))
    setIsStale(true)
    setCalcError(null)
  }
  const num = (key) => (e) => set(key, parseFloat(e.target.value) || 0)
  const sel = (key) => (e) => set(key, e.target.value)

  /* Inputs para el motor */
  const buildInputs = () => ({
    a: v.a, b: v.b, h: v.h, recubrimiento: v.recubrimiento,
    ap: v.ap, bp: v.bp,
    sigmaAdm: v.sigmaAdm, anguloRozamiento: v.anguloRozamiento,
    tipoHormigon: v.tipoHormigon, tipoAcero: v.tipoAcero,
    armaduraA: { nBarras: v.nBarrasA, diametro: v.diamA },
    armaduraB: { nBarras: v.nBarrasB, diametro: v.diamB },
    Nd: v.Nd, Md: v.Md, Vd: v.Vd,
  })

  function validate() {
    if (v.a <= 0) return 'La dimensión a debe ser mayor que 0.'
    if (v.b <= 0) return 'La dimensión b debe ser mayor que 0.'
    if (v.h <= 0) return 'El canto h debe ser mayor que 0.'
    if (v.ap <= 0 || v.bp <= 0) return 'Las dimensiones del pilar deben ser mayores que 0.'
    if (v.Nd <= 0) return 'El axil Nd debe ser mayor que 0.'
    if (v.sigmaAdm <= 0) return 'La tensión admisible debe ser mayor que 0.'
    return null
  }

  function handleCalc() {
    const err = validate()
    if (err) { setCalcError(err); return }
    try {
      const res = calcularZapata(buildInputs())
      setResults(res)
      setCalcError(null)
      setIsStale(false)
    } catch (err) {
      setCalcError(err.message)
    }
  }

  async function handleExport() {
    if (!results) return
    setIsExporting(true)
    try {
      const svgEl = svgWrapperRef.current?.querySelector('svg')
      await exportarPdf({
        titulo: 'Zapata Aislada — CTE DB-SE-C',
        datosEntrada: [
          { label: 'Dimensiones',       value: `${v.a} × ${v.b} × ${v.h} m` },
          { label: 'Pilar',             value: `${v.ap} × ${v.bp} m` },
          { label: 'Hormigón / Acero',  value: `${v.tipoHormigon} / ${v.tipoAcero}` },
          { label: 'σ admisible',        value: `${v.sigmaAdm} kN/m²` },
          { label: 'δ rozamiento',       value: `${v.anguloRozamiento}°` },
          { label: 'Nd / Md / Vd',       value: `${v.Nd} kN / ${v.Md} kN·m / ${v.Vd} kN` },
          { label: 'Armadura dir-a',    value: `${v.nBarrasA} ∅ ${v.diamA} mm` },
          { label: 'Armadura dir-b',    value: `${v.nBarrasB} ∅ ${v.diamB} mm` },
        ],
        svgElement:  svgEl,
        resultados:  results.resumen,
        referenciasNorma: ['CTE DB-SE-C Art. 4.2', 'CTE DB-SE-C Art. 4.3', 'CE Art. 42.1'],
      })
    } finally {
      setIsExporting(false)
    }
  }

  /* ── Datos contextuales para SVG ──────────────────────────────────────── */
  const svgInputs = {
    a: v.a, b: v.b, h: v.h,
    ap: v.ap, bp: v.bp,
    armaduraA: { nBarras: v.nBarrasA, diametro: v.diamA },
    armaduraB: { nBarras: v.nBarrasB, diametro: v.diamB },
  }

  /* ── Aprovechamiento global ─────────────────────────────────────────── */
  const cumpleTodo = results ? results.resumen.every(r => r.cumple) : null

  return (
    <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', padding: '1.5rem', alignItems: 'start', minHeight: '100%' }}>

      {/* ── COLUMNA IZQUIERDA: Inputs ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

        <InputGroup title="Geometría zapata">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="a [m]"  value={v.a}  onChange={num('a')}  step="0.05" min="0.5" tooltip="Dimensión en dirección del momento" />
            <InputField label="b [m]"  value={v.b}  onChange={num('b')}  step="0.05" min="0.5" tooltip="Dimensión perpendicular al momento" />
          </div>
          <InputField label="h — Canto [m]" value={v.h} onChange={num('h')} step="0.05" min="0.3" unit="m" />
          <InputField label="Recubrimiento" value={v.recubrimiento} onChange={num('recubrimiento')} step="5" min="30" unit="mm" />
        </InputGroup>

        <InputGroup title="Geometría pilar">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="ap [m]" value={v.ap} onChange={num('ap')} step="0.05" min="0.2" />
            <InputField label="bp [m]" value={v.bp} onChange={num('bp')} step="0.05" min="0.2" />
          </div>
        </InputGroup>

        <InputGroup title="Terreno">
          <InputField label="σ admisible" value={v.sigmaAdm} onChange={num('sigmaAdm')} step="10" min="50" unit="kN/m²" />
          <InputField label="Ángulo rozamiento δ" value={v.anguloRozamiento} onChange={num('anguloRozamiento')} step="1" min="15" max="40" unit="°" tooltip="Ángulo de rozamiento terreno-cimentación" />
        </InputGroup>

        <InputGroup title="Materiales">
          <SelectField label="Hormigón" value={v.tipoHormigon} onChange={sel('tipoHormigon')} options={HORMIGONES} />
          <SelectField label="Acero"    value={v.tipoAcero}    onChange={sel('tipoAcero')}    options={ACEROS} />
        </InputGroup>

        <InputGroup title="Cargas (ELS)">
          <InputField label="Nd — Axil"      value={v.Nd} onChange={num('Nd')} step="10" min="0"    unit="kN" />
          <InputField label="Md — Momento"   value={v.Md} onChange={num('Md')} step="5"  min="0"    unit="kN·m" tooltip="Momento en base del pilar (valor absoluto)" />
          <InputField label="Vd — Cortante"  value={v.Vd} onChange={num('Vd')} step="5"  min="0"    unit="kN" />
        </InputGroup>

        <InputGroup title="Armadura dirección a">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="Nº barras" value={v.nBarrasA} onChange={num('nBarrasA')} step="1" min="4" />
            <InputField label="∅ [mm]"    value={v.diamA}    onChange={num('diamA')}    step="2" min="8" unit="mm" />
          </div>
        </InputGroup>

        <InputGroup title="Armadura dirección b">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="Nº barras" value={v.nBarrasB} onChange={num('nBarrasB')} step="1" min="4" />
            <InputField label="∅ [mm]"    value={v.diamB}    onChange={num('diamB')}    step="2" min="8" unit="mm" />
          </div>
        </InputGroup>

        <CalculateButton onClick={handleCalc} />

        {calcError && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--fail-bg)', border: '1px solid var(--fail-border)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--fail)' }}>
            {calcError}
          </div>
        )}
      </div>

      {/* ── COLUMNA DERECHA: Resultados ──────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {results && isStale && <StaleBanner />}

        {/* SVG + estado global */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>

          {/* SVG zapata */}
          <div
            ref={svgWrapperRef}
            style={{
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '1rem',
            }}
          >
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
              Geometría
            </p>
            <ZapataAislada inputs={svgInputs} resultados={results ?? {}} />
          </div>

          {/* Estado comprobaciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Semáforo global */}
            {cumpleTodo !== null && (
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: cumpleTodo ? 'var(--ok-bg)' : 'var(--fail-bg)',
                border: `1px solid ${cumpleTodo ? 'var(--ok-border)' : 'var(--fail-border)'}`,
              }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: cumpleTodo ? 'var(--ok)' : 'var(--fail)' }}>
                  {cumpleTodo ? 'TODAS LAS COMPROBACIONES OK' : 'ALGUNA COMPROBACIÓN FALLA'}
                </p>
              </div>
            )}

            {/* Datos tensiones */}
            {results && (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                  Tensiones terreno
                </p>
                <ResRow label="σmax"           value={results.tensiones.sigmaMax}  unit="kN/m²" />
                <ResRow label="σmin"           value={results.tensiones.sigmaMin}  unit="kN/m²" />
                <ResRow label="Excentricidad"  value={results.tensiones.excentricidad} unit="m" />
                <ResRow label="Distribución"   value={results.tensiones.distribucion} />
                <ResRow label="Peso propio"    value={results.tensiones.Pp}  unit="kN" />
                <ResRow label="N total"        value={results.tensiones.N_total} unit="kN" />
              </div>
            )}

            {/* Datos estabilidad */}
            {results && (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                  Estabilidad
                </p>
                <ResRow label="Me (vuelco)"    value={results.vuelco.Me}  unit="kN·m" />
                <ResRow label="Mv (vuelco)"    value={results.vuelco.Mv}  unit="kN·m" />
                <ResRow label="CSV"            value={results.vuelco.coefSeguridad === Infinity ? '∞' : results.vuelco.coefSeguridad} />
                <ResRow label="Fr (desliz.)"   value={results.deslizamiento.Fr}  unit="kN" />
                <ResRow label="CSD"            value={results.deslizamiento.CSD === Infinity ? '∞' : results.deslizamiento.CSD} />
              </div>
            )}

            {/* Datos flexión */}
            {results && (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                  Flexión
                </p>
                <ResRow label="d útil"         value={results.flexion.d_mm}  unit="mm" />
                <ResRow label="Md dir-a"        value={results.flexion.Md_a}  unit="kN·m" />
                <ResRow label="As,nec dir-a"    value={results.flexion.As_nec_a} unit="mm²" />
                <ResRow label="As,disp dir-a"   value={results.flexion.As_disp_a} unit="mm²" />
                <ResRow label="Md dir-b"        value={results.flexion.Md_b}  unit="kN·m" />
                <ResRow label="As,nec dir-b"    value={results.flexion.As_nec_b} unit="mm²" />
                <ResRow label="As,disp dir-b"   value={results.flexion.As_disp_b} unit="mm²" />
                <ResRow label="ρ dir-a"         value={`${results.flexion.rho_a}%`} />
                <ResRow label="ρ dir-b"         value={`${results.flexion.rho_b}%`} />
              </div>
            )}
          </div>
        </div>

        {/* Tabla de comprobaciones */}
        {results && (
          <>
            <ResultsTable results={results.resumen} />
            <ExportPdfButton onClick={handleExport} loading={isExporting} disabled={isExporting} />
          </>
        )}

        {/* Placeholder vacío */}
        {!results && !calcError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 260,
            background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--text-3)', fontSize: '0.82rem', gap: '0.5rem',
          }}>
            <Layers size={32} strokeWidth={0.9} style={{ opacity: 0.35, marginBottom: '0.25rem' }} />
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-2)' }}>Zapata aislada — CTE DB-SE-C</p>
            <p style={{ margin: 0 }}>Introduce los parámetros y pulsa Calcular</p>
          </div>
        )}
      </div>
    </div>
  )
}
