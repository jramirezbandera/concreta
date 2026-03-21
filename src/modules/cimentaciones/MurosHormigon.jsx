/**
 * MurosHormigon.jsx
 * Módulo de cálculo simplificado de muro de hormigón con zapata corrida.
 * CTE DB-SE-C / Código Estructural (Rankine + ménsula).
 */

import { useState, useRef } from 'react'
import { Layers } from 'lucide-react'
import { calcularMuro }  from './engine/calculosMuros'
import StaleBanner       from '../../components/common/StaleBanner'
import { exportarPdf }   from '../../utils/exportPdf'
import MuroContencion    from '../../components/svg/MuroContencion'
import InputField        from '../../components/common/InputField'
import SelectField       from '../../components/common/SelectField'
import InputGroup        from '../../components/common/InputGroup'
import CalculateButton   from '../../components/common/CalculateButton'
import ResultsTable      from '../../components/common/ResultsTable'
import ExportPdfButton   from '../../components/common/ExportPdfButton'

/* ── Materiales ──────────────────────────────────────────────────── */
const HORMIGONES = ['HA-25', 'HA-30', 'HA-35', 'HA-40'].map(v => ({ value: v, label: v }))
const ACEROS     = ['B400S', 'B500S', 'B500SD'].map(v => ({ value: v, label: v }))

/* ── Estado inicial ──────────────────────────────────────────────── */
const INIT = {
  // Geometría
  H:       3.0,    // m altura de tierras
  bwBase:  0.30,   // m espesor alzado en base
  bwTop:   0.20,   // m espesor alzado en coronación
  hz:      0.50,   // m canto zapata
  lp:      0.60,   // m puntera
  lt:      1.40,   // m talón
  // Terreno
  gamma:   18,     // kN/m³ peso tierras
  phi:     30,     // °  ángulo rozamiento interno
  delta:   20,     // °  ángulo rozamiento muro-terreno
  q:       10,     // kN/m² sobrecarga
  sigmaAdm: 150,   // kN/m² tensión admisible
  // Agua
  hayAgua: false,
  hf:      0,      // m altura freático sobre base zapata
  gammaSat: 20,    // kN/m³
  gammaW:  10,     // kN/m³
  // Materiales
  tipoHormigon: 'HA-25',
  tipoAcero:    'B500S',
  // Armaduras (nBarras por metro, diámetro mm)
  nAlzado: 8,   diamAlzado: 16,
  nTalon:  6,   diamTalon:  16,
  nPuntera: 5,  diamPuntera: 12,
}

/* ── Toggle ──────────────────────────────────────────────────────── */
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
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2,
          left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#050a12' : 'var(--text-3)',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}

/* ── Fila de dato rápido ─────────────────────────────────────────── */
function ResRow({ label, value, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.3rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', flexShrink: 0, marginRight: '0.5rem' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-1)', textAlign: 'right' }}>
        {value}
        {unit && <span style={{ fontSize: '0.65rem', color: 'var(--text-3)', marginLeft: '0.2rem' }}>{unit}</span>}
      </span>
    </div>
  )
}

/* ── Card de resultados ──────────────────────────────────────────── */
function Card({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem' }}>
      <p style={{ margin: '0 0 0.6rem', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────────── */
export default function MurosHormigon() {
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

  const B = v.lp + v.bwBase + v.lt

  function buildInputs() {
    return {
      H: v.H, bwBase: v.bwBase, bwTop: v.bwTop, hz: v.hz,
      lp: v.lp, lt: v.lt,
      gamma: v.gamma, phi: v.phi, delta: v.delta, q: v.q, sigmaAdm: v.sigmaAdm,
      hayAgua: v.hayAgua, hf: v.hf, gammaSat: v.gammaSat, gammaW: v.gammaW,
      tipoHormigon: v.tipoHormigon, tipoAcero: v.tipoAcero,
      armAlzado:  { nBarras: v.nAlzado,  diametro: v.diamAlzado },
      armTalon:   { nBarras: v.nTalon,   diametro: v.diamTalon },
      armPuntera: { nBarras: v.nPuntera, diametro: v.diamPuntera },
    }
  }

  function validate() {
    if (v.H <= 0)      return 'La altura de tierras H debe ser mayor que 0.'
    if (v.bwBase <= 0) return 'El espesor de alzado en base debe ser mayor que 0.'
    if (v.hz <= 0)     return 'El canto de zapata hz debe ser mayor que 0.'
    if (v.lt <= 0)     return 'La longitud del talón debe ser mayor que 0.'
    if (v.sigmaAdm <= 0) return 'La tensión admisible debe ser mayor que 0.'
    return null
  }

  function handleCalc() {
    const err = validate()
    if (err) { setCalcError(err); return }
    try {
      const res = calcularMuro(buildInputs())
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
        titulo: 'Muro de Hormigón con Zapata Corrida',
        datosEntrada: [
          { label: 'Altura tierras H',    value: `${v.H} m` },
          { label: 'Espesor base / cor.', value: `${v.bwBase} / ${v.bwTop} m` },
          { label: 'Canto zapata hz',     value: `${v.hz} m` },
          { label: 'Puntera / Talón',     value: `${v.lp} / ${v.lt} m` },
          { label: 'B total',             value: `${B.toFixed(2)} m` },
          { label: 'γ / φ / δ',           value: `${v.gamma} kN/m³ / ${v.phi}° / ${v.delta}°` },
          { label: 'q sobrecarga',        value: `${v.q} kN/m²` },
          { label: 'σ admisible',          value: `${v.sigmaAdm} kN/m²` },
          { label: 'Agua',                value: v.hayAgua ? `Sí — hf=${v.hf}m` : 'No' },
          { label: 'Hormigón / Acero',    value: `${v.tipoHormigon} / ${v.tipoAcero}` },
          { label: 'Arm. alzado',         value: `${v.nAlzado} ∅${v.diamAlzado}/m` },
          { label: 'Arm. talón',          value: `${v.nTalon} ∅${v.diamTalon}/m` },
          { label: 'Arm. puntera',        value: `${v.nPuntera} ∅${v.diamPuntera}/m` },
        ],
        svgElement:  svgEl,
        resultados:  results.resumen,
        referenciasNorma: ['CTE DB-SE-C Art. 4.2', 'CTE DB-SE-C Art. 4.3', 'CE Art. 42.1'],
      })
    } finally {
      setIsExporting(false)
    }
  }

  /* Inputs para el SVG (siempre actualizado con los inputs actuales) */
  const svgInputs = {
    H: v.H, hz: v.hz, lp: v.lp, lt: v.lt,
    bwBase: v.bwBase, bwTop: v.bwTop,
    gamma: v.gamma, phi: v.phi, q: v.q,
    hayAgua: v.hayAgua, hf: v.hf, gammaW: v.gammaW,
    armAlzado:  { nBarras: v.nAlzado,  diametro: v.diamAlzado },
    armTalon:   { nBarras: v.nTalon,   diametro: v.diamTalon },
    armPuntera: { nBarras: v.nPuntera, diametro: v.diamPuntera },
  }

  const cumpleTodo = results ? results.resumen.every(r => r.cumple) : null

  return (
    <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', padding: '1.5rem', alignItems: 'start' }}>

      {/* ── COLUMNA IZQUIERDA ──────────────────────────────────────── */}
      <div>

        <InputGroup title="Geometría">
          <InputField label="H — Altura de tierras" value={v.H}      onChange={num('H')}      step="0.25" min="0.5"  unit="m" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="bw base [m]" value={v.bwBase} onChange={num('bwBase')} step="0.05" min="0.15" />
            <InputField label="bw top [m]"  value={v.bwTop}  onChange={num('bwTop')}  step="0.05" min="0.15" />
          </div>
          <InputField label="hz — Canto zapata" value={v.hz} onChange={num('hz')} step="0.05" min="0.3" unit="m" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="lp — Puntera [m]" value={v.lp} onChange={num('lp')} step="0.05" min="0" />
            <InputField label="lt — Talón [m]"   value={v.lt} onChange={num('lt')} step="0.05" min="0.3" />
          </div>
          <div style={{ padding: '0.4rem 0.5rem', background: 'rgba(56,189,248,0.06)', borderRadius: 6, borderLeft: '2px solid var(--accent-dim)', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              B = {B.toFixed(2)} m
            </span>
          </div>
        </InputGroup>

        <InputGroup title="Terreno">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="γ [kN/m³]" value={v.gamma} onChange={num('gamma')} step="1" min="14" />
            <InputField label="φ [°]"     value={v.phi}   onChange={num('phi')}   step="1" min="15" max="45" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="δ [°]" value={v.delta} onChange={num('delta')} step="1" min="0" max="35"
              tooltip="Ángulo de rozamiento muro-terreno (δ ≤ 2/3·φ)" />
            <InputField label="q [kN/m²]" value={v.q} onChange={num('q')} step="2" min="0" />
          </div>
          <InputField label="σ admisible" value={v.sigmaAdm} onChange={num('sigmaAdm')} step="10" min="50" unit="kN/m²" />
        </InputGroup>

        <InputGroup title="Agua">
          <Toggle
            label="Nivel freático activo"
            checked={v.hayAgua}
            onChange={(val) => set('hayAgua', val)}
          />
          {v.hayAgua && (
            <>
              <InputField label="hf — Altura freático" value={v.hf} onChange={num('hf')} step="0.1" min="0" unit="m"
                tooltip="Medido desde la base de la zapata" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
                <InputField label="γ sat [kN/m³]" value={v.gammaSat} onChange={num('gammaSat')} step="1" min="16" />
                <InputField label="γ w [kN/m³]"   value={v.gammaW}   onChange={num('gammaW')}   step="1" min="9" />
              </div>
            </>
          )}
        </InputGroup>

        <InputGroup title="Materiales">
          <SelectField label="Hormigón" value={v.tipoHormigon} onChange={sel('tipoHormigon')} options={HORMIGONES} />
          <SelectField label="Acero"    value={v.tipoAcero}    onChange={sel('tipoAcero')}    options={ACEROS} />
        </InputGroup>

        <InputGroup title="Armaduras (barras/m + diámetro)">
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', color: 'var(--text-3)' }}>
            rec. nominal = 50 mm
          </p>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.68rem', color: 'var(--text-2)', fontWeight: 500 }}>
            Alzado — trasdós
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="nº barras/m" value={v.nAlzado}   onChange={num('nAlzado')}   step="1" min="3" />
            <InputField label="∅ [mm]"      value={v.diamAlzado} onChange={num('diamAlzado')} step="2" min="8" unit="mm" />
          </div>
          <p style={{ margin: '0.5rem 0 0.4rem', fontSize: '0.68rem', color: 'var(--text-2)', fontWeight: 500 }}>
            Talón — cara superior
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="nº barras/m" value={v.nTalon}   onChange={num('nTalon')}   step="1" min="3" />
            <InputField label="∅ [mm]"      value={v.diamTalon} onChange={num('diamTalon')} step="2" min="8" unit="mm" />
          </div>
          <p style={{ margin: '0.5rem 0 0.4rem', fontSize: '0.68rem', color: 'var(--text-2)', fontWeight: 500 }}>
            Puntera — cara inferior
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0.75rem' }}>
            <InputField label="nº barras/m" value={v.nPuntera}   onChange={num('nPuntera')}   step="1" min="3" />
            <InputField label="∅ [mm]"      value={v.diamPuntera} onChange={num('diamPuntera')} step="2" min="8" unit="mm" />
          </div>
        </InputGroup>

        <CalculateButton onClick={handleCalc} />

        {calcError && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--fail-bg)', border: '1px solid var(--fail-border)', borderRadius: 8, fontSize: '0.75rem', color: 'var(--fail)' }}>
            {calcError}
          </div>
        )}
      </div>

      {/* ── COLUMNA DERECHA ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {results && isStale && <StaleBanner />}

        {/* SVG + cards de resultados clave */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>

          {/* SVG */}
          <div
            ref={svgWrapperRef}
            style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}
          >
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
              Sección transversal
            </p>
            <MuroContencion inputs={svgInputs} resultados={results ?? {}} />
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Estado global */}
            {cumpleTodo !== null && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: 10,
                background: cumpleTodo ? 'var(--ok-bg)' : 'var(--fail-bg)',
                border: `1px solid ${cumpleTodo ? 'var(--ok-border)' : 'var(--fail-border)'}`,
              }}>
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: cumpleTodo ? 'var(--ok)' : 'var(--fail)' }}>
                  {cumpleTodo ? 'TODAS LAS COMPROBACIONES OK' : 'ALGUNA COMPROBACIÓN FALLA'}
                </p>
              </div>
            )}

            {/* Empujes */}
            {results && (
              <Card title="Empujes activos">
                <ResRow label="Ka (Rankine)"  value={results.empujes.Ka.toFixed(3)} />
                <ResRow label="Pa (tierra)"   value={results.empujes.Pa}   unit="kN/m" />
                <ResRow label="Pq (sobrec.)"  value={results.empujes.Pq}   unit="kN/m" />
                {results.empujes.Pw > 0 && (
                  <ResRow label="Pw (agua)"   value={results.empujes.Pw}   unit="kN/m" />
                )}
                <ResRow label="H total"       value={results.empujes.H_total} unit="kN/m" />
              </Card>
            )}

            {/* Estabilidad */}
            {results && (
              <Card title="Estabilidad">
                <ResRow label="Mest"   value={results.estabilidad.Mest}  unit="kN·m/m" />
                <ResRow label="Mdes"   value={results.estabilidad.Mdes}  unit="kN·m/m" />
                <ResRow label="CSV"    value={results.estabilidad.CSV === Infinity ? '∞' : results.estabilidad.CSV} />
                <ResRow label="Fr"     value={results.estabilidad.Fr}    unit="kN/m" />
                <ResRow label="CSD"    value={results.estabilidad.CSD === Infinity ? '∞' : results.estabilidad.CSD} />
              </Card>
            )}

            {/* Tensiones */}
            {results && (
              <Card title="Tensiones terreno">
                <ResRow label="σmax"    value={results.tensiones.sigmaMax}  unit="kN/m²" />
                <ResRow label="σmin"    value={results.tensiones.sigmaMin}  unit="kN/m²" />
                <ResRow label="e"       value={results.tensiones.e}         unit="m" />
                <ResRow label="Tipo"    value={results.tensiones.distribucion} />
              </Card>
            )}

            {/* Momentos de diseño */}
            {results && (
              <Card title="Momentos ELU">
                <ResRow label="M alzado"  value={results.alzado.M_Ed}   unit="kN·m/m" />
                <ResRow label="M talón"   value={results.zapata.M_Ed_tal} unit="kN·m/m" />
                <ResRow label="M puntera" value={results.zapata.M_Ed_pun} unit="kN·m/m" />
              </Card>
            )}

            {/* Armadura */}
            {results && (
              <Card title="Armadura (mm²/m)">
                <ResRow label="As,nec alz"  value={results.armadura.As_nec_alz} unit="mm²/m" />
                <ResRow label="As,disp alz" value={results.armadura.As_alz}     unit="mm²/m" />
                <ResRow label="As,nec tal"  value={results.armadura.As_nec_tal} unit="mm²/m" />
                <ResRow label="As,disp tal" value={results.armadura.As_tal}     unit="mm²/m" />
                <ResRow label="As,nec pun"  value={results.armadura.As_nec_pun} unit="mm²/m" />
                <ResRow label="As,disp pun" value={results.armadura.As_pun}     unit="mm²/m" />
              </Card>
            )}
          </div>
        </div>

        {/* Tabla comprobaciones */}
        {results && (
          <>
            <ResultsTable results={results.resumen} />
            <ExportPdfButton onClick={handleExport} loading={isExporting} disabled={isExporting} />
          </>
        )}

        {/* Placeholder */}
        {!results && !calcError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 200,
            background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10,
            color: 'var(--text-3)', fontSize: '0.82rem', gap: '0.5rem',
          }}>
            <Layers size={28} strokeWidth={0.9} style={{ opacity: 0.35 }} />
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-2)' }}>Muro de contención — Rankine + ménsula</p>
            <p style={{ margin: 0 }}>Introduce los parámetros y pulsa Calcular</p>
          </div>
        )}
      </div>
    </div>
  )
}
