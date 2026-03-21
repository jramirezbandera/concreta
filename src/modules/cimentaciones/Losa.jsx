/**
 * Losa.jsx
 * Módulo de cálculo de losa de cimentación — franja de análisis (Winkler).
 * CTE DB-SE-C / Código Estructural.
 */

import { useState, useRef } from 'react'
import { Layers } from 'lucide-react'
import { comprobarFranjaLosa } from './engine/calculosLosa'
import StaleBanner             from '../../components/common/StaleBanner'
import { exportarPdf }         from '../../utils/exportPdf'
import SeccionLosa             from '../../components/svg/SeccionLosa'
import InputField              from '../../components/common/InputField'
import SelectField             from '../../components/common/SelectField'
import InputGroup              from '../../components/common/InputGroup'
import CalculateButton         from '../../components/common/CalculateButton'
import ResultsTable            from '../../components/common/ResultsTable'
import ExportPdfButton         from '../../components/common/ExportPdfButton'

/* ── Opciones de materiales ──────────────────────────────────────────── */
const HORMIGONES = ['HA-25', 'HA-30', 'HA-35', 'HA-40'].map(v => ({ value: v, label: v }))
const ACEROS     = ['B400S', 'B500S', 'B500SD'].map(v => ({ value: v, label: v }))

/* ── Estado inicial ─────────────────────────────────────────────────── */
const INIT = {
  h:             0.60,   // m
  B:             1.0,    // m (franja de análisis)
  recubrimiento: 50,     // mm
  N:             150,    // kN/m
  incluyePP:     true,
  sigmaAdm:      200,    // kN/m²
  ks:            30000,  // kN/m³
  tipoHormigon:  'HA-25',
  tipoAcero:     'B500S',
  // Armadura inferior
  diamInf:       16,
  sepInf:        150,    // mm
  // Armadura superior
  diamSup:       12,
  sepSup:        200,    // mm
}

/* ── Fila de resultado rápido ───────────────────────────────────────── */
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

/* ── Toggle simple ──────────────────────────────────────────────────── */
function Toggle({ label, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10,
          background: checked ? 'var(--accent)' : 'var(--border-md)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#050a12' : 'var(--text-3)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

/* ── Componente ─────────────────────────────────────────────────────── */
export default function Losa() {
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

  function buildInputs() {
    return {
      h: v.h, B: v.B, recubrimiento: v.recubrimiento,
      N: v.N, incluyePP: v.incluyePP,
      sigmaAdm: v.sigmaAdm, ks: v.ks,
      tipoHormigon: v.tipoHormigon, tipoAcero: v.tipoAcero,
      armInf: { diametro: v.diamInf, separacion: v.sepInf },
      armSup: { diametro: v.diamSup, separacion: v.sepSup },
    }
  }

  function validate() {
    if (v.h <= 0) return 'El espesor h debe ser mayor que 0.'
    if (v.B <= 0) return 'El ancho de franja B debe ser mayor que 0.'
    if (v.N < 0)  return 'La carga N no puede ser negativa.'
    if (v.sigmaAdm <= 0) return 'La tensión admisible debe ser mayor que 0.'
    if (v.ks <= 0) return 'El módulo de balasto ks debe ser mayor que 0.'
    return null
  }

  function handleCalc() {
    const err = validate()
    if (err) { setCalcError(err); return }
    try {
      const res = comprobarFranjaLosa(buildInputs())
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
        titulo: 'Losa de Cimentación — Franja Winkler',
        datosEntrada: [
          { label: 'Espesor h',         value: `${v.h} m` },
          { label: 'Ancho franja B',    value: `${v.B} m` },
          { label: 'Recubrimiento',     value: `${v.recubrimiento} mm` },
          { label: 'Carga N',           value: `${v.N} kN/m` },
          { label: 'Peso propio',       value: v.incluyePP ? 'Incluido' : 'No incluido' },
          { label: 'σ admisible',        value: `${v.sigmaAdm} kN/m²` },
          { label: 'Módulo balasto ks', value: `${v.ks} kN/m³` },
          { label: 'Hormigón / Acero',  value: `${v.tipoHormigon} / ${v.tipoAcero}` },
          { label: 'Arm. inferior',     value: `∅${v.diamInf} c/${v.sepInf}mm` },
          { label: 'Arm. superior',     value: `∅${v.diamSup} c/${v.sepSup}mm` },
        ],
        svgElement:  svgEl,
        resultados:  results.resumen,
        referenciasNorma: ['CTE DB-SE-C Art. 4.2', 'CE Art. 42.1', 'CE Art. 44.2'],
      })
    } finally {
      setIsExporting(false)
    }
  }

  const svgInputs = {
    h: v.h, B: v.B, recubrimiento: v.recubrimiento,
    armInf: { diametro: v.diamInf, separacion: v.sepInf },
    armSup: { diametro: v.diamSup, separacion: v.sepSup },
  }

  const cumpleTodo = results ? results.resumen.every(r => r.cumple) : null

  return (
    <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', padding: '1.5rem', alignItems: 'start', minHeight: '100%' }}>

      {/* ── Columna izquierda ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

        <InputGroup title="Geometría de la losa">
          <InputField label="h — Espesor"          value={v.h}             onChange={num('h')}             step="0.05" min="0.2"  unit="m" />
          <InputField label="B — Ancho de franja"  value={v.B}             onChange={num('B')}             step="0.1"  min="0.5"  unit="m"  tooltip="Ancho de la franja de análisis" />
          <InputField label="Recubrimiento"         value={v.recubrimiento} onChange={num('recubrimiento')} step="5"    min="30"   unit="mm" />
        </InputGroup>

        <InputGroup title="Cargas">
          <InputField label="N — Carga lineal" value={v.N} onChange={num('N')} step="10" min="0" unit="kN/m" />
          <Toggle
            label="Incluir peso propio automático"
            checked={v.incluyePP}
            onChange={(val) => set('incluyePP', val)}
          />
          {v.incluyePP && (
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              Pp = {(v.h * 25 * v.B).toFixed(2)} kN/m
            </p>
          )}
        </InputGroup>

        <InputGroup title="Terreno">
          <InputField
            label="σ admisible"
            value={v.sigmaAdm}
            onChange={num('sigmaAdm')}
            step="10" min="50" unit="kN/m²"
          />
          <InputField
            label="ks — Módulo de balasto"
            value={v.ks}
            onChange={num('ks')}
            step="1000" min="5000" unit="kN/m³"
            tooltip="Arena suelta: 10000-20000 · Arena densa: 40000-80000 · Arcilla dura: 30000-60000"
          />
        </InputGroup>

        <InputGroup title="Materiales">
          <SelectField label="Hormigón" value={v.tipoHormigon} onChange={sel('tipoHormigon')} options={HORMIGONES} />
          <SelectField label="Acero"    value={v.tipoAcero}    onChange={sel('tipoAcero')}    options={ACEROS} />
        </InputGroup>

        <InputGroup title="Armadura inferior (por m de ancho)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="∅ [mm]"  value={v.diamInf} onChange={num('diamInf')} step="2" min="8"  unit="mm" />
            <InputField label="sep [mm]" value={v.sepInf}  onChange={num('sepInf')}  step="10" min="50" unit="mm" />
          </div>
        </InputGroup>

        <InputGroup title="Armadura superior (por m de ancho)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="∅ [mm]"  value={v.diamSup} onChange={num('diamSup')} step="2" min="8"  unit="mm" />
            <InputField label="sep [mm]" value={v.sepSup}  onChange={num('sepSup')}  step="10" min="50" unit="mm" />
          </div>
        </InputGroup>

        <CalculateButton onClick={handleCalc} />

        {calcError && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--fail-bg)', border: '1px solid var(--fail-border)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--fail)' }}>
            {calcError}
          </div>
        )}
      </div>

      {/* ── Columna derecha ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {results && isStale && <StaleBanner />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>

          {/* SVG sección */}
          <div
            ref={svgWrapperRef}
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}
          >
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
              Sección transversal
            </p>
            <SeccionLosa inputs={svgInputs} />
          </div>

          {/* Resultados clave */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {cumpleTodo !== null && (
              <div style={{
                padding: '0.85rem 1rem', borderRadius: 10,
                background: cumpleTodo ? 'var(--ok-bg)' : 'var(--fail-bg)',
                border: `1px solid ${cumpleTodo ? 'var(--ok-border)' : 'var(--fail-border)'}`,
              }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: cumpleTodo ? 'var(--ok)' : 'var(--fail)' }}>
                  {cumpleTodo ? 'TODAS LAS COMPROBACIONES OK' : 'ALGUNA COMPROBACIÓN FALLA'}
                </p>
              </div>
            )}

            {results && (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                  Modelo Winkler
                </p>
                <ResRow label="Carga total N_tot"  value={results.N_tot}  unit="kN/m" />
                {v.incluyePP && <ResRow label="Peso propio Pp"  value={results.Pp}  unit="kN/m" />}
                <ResRow label="Longitud elástica Le" value={results.Le}  unit="m" />
                <ResRow label="Tensión terreno σ"   value={results.sigma} unit="kN/m²" />
                <ResRow label="Mmax (Winkler)"       value={results.Mmax} unit="kN·m" />
                <ResRow label="Vmax"                 value={results.Vmax} unit="kN" />
                <ResRow label="Vcu"                  value={results.Vcu}  unit="kN" />
              </div>
            )}

            {results && (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                  Armadura
                </p>
                <ResRow label="d útil"                value={results.d_mm}      unit="mm" />
                <ResRow label="As,nec inf"             value={results.As_nec_inf}  unit="mm²" />
                <ResRow label="As,disp inf"            value={results.As_disp_inf} unit="mm²" />
                <ResRow label="As inf (por metro)"     value={results.As_1m_inf}   unit="mm²/m" />
                <ResRow label="As,nec sup"             value={results.As_nec_sup}  unit="mm²" />
                <ResRow label="As,disp sup"            value={results.As_disp_sup} unit="mm²" />
                <ResRow label="ρ inf"                  value={`${results.rho_inf}%`} />
                <ResRow label="ρ sup"                  value={`${results.rho_sup}%`} />
              </div>
            )}
          </div>
        </div>

        {results && (
          <>
            <ResultsTable results={results.resumen} />
            <ExportPdfButton onClick={handleExport} loading={isExporting} disabled={isExporting} />
          </>
        )}

        {!results && !calcError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 260,
            background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--text-3)', fontSize: '0.82rem', gap: '0.5rem',
          }}>
            <Layers size={32} strokeWidth={0.9} style={{ opacity: 0.35, marginBottom: '0.25rem' }} />
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-2)' }}>Losa de cimentación — Modelo Winkler</p>
            <p style={{ margin: 0 }}>Introduce los parámetros y pulsa Calcular</p>
          </div>
        )}
      </div>
    </div>
  )
}
