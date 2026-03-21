import { useState, useMemo, useRef } from 'react'
import { LayoutGrid, AlertTriangle } from 'lucide-react'
import { calcularVigaHormigon } from './engine/calculosVigas'
import { exportarPdf } from '../../utils/exportPdf'
import SeccionRectangular from '../../components/svg/SeccionRectangular'
import InputField          from '../../components/common/InputField'
import SelectField         from '../../components/common/SelectField'
import InputGroup          from '../../components/common/InputGroup'
import ModoEsfuerzosToggle from '../../components/common/ModoEsfuerzosToggle'
import CalculateButton     from '../../components/common/CalculateButton'
import ResultsTable        from '../../components/common/ResultsTable'
import ExportPdfButton     from '../../components/common/ExportPdfButton'
import StaleBanner        from '../../components/common/StaleBanner'

/* ── Option lists ───────────────────────────────────── */
const DIAM_BARRAS   = [10, 12, 16, 20, 25, 32].map(d => ({ value: d, label: `ø${d}` }))
const DIAM_ESTRIBOS = [6, 8, 10, 12].map(d => ({ value: d, label: `ø${d}` }))
const RAMAS         = [2, 4].map(r => ({ value: r, label: `${r} ramas` }))

const HORMIGONES = [
  { value: 'HA-25', label: 'HA-25  (fck = 25 MPa)' },
  { value: 'HA-30', label: 'HA-30  (fck = 30 MPa)' },
  { value: 'HA-35', label: 'HA-35  (fck = 35 MPa)' },
  { value: 'HA-40', label: 'HA-40  (fck = 40 MPa)' },
  { value: 'HA-45', label: 'HA-45  (fck = 45 MPa)' },
  { value: 'HA-50', label: 'HA-50  (fck = 50 MPa)' },
]
const ACEROS = [
  { value: 'B400S',  label: 'B400S  (fyk = 400 MPa)' },
  { value: 'B500S',  label: 'B500S  (fyk = 500 MPa)' },
  { value: 'B500SD', label: 'B500SD (fyk = 500 MPa)' },
]
const EXPOSICIONES = [
  'I', 'IIa', 'IIb', 'IIIa', 'IIIb', 'IIIc', 'IV', 'Qa', 'Qb', 'Qc',
].map(c => ({ value: c, label: c }))

const TIPOS_VIGA = [
  { value: 'biapoyada',          label: 'Biapoyada' },
  { value: 'voladizo',           label: 'Voladizo' },
  { value: 'empotrada_apoyada',  label: 'Empotrada-Apoyada' },
  { value: 'biempotrada',        label: 'Biempotrada' },
]

/* ── Coeficientes ELU ────────────────────────────────── */
const γg = 1.35, γq = 1.5

function calcEsfuerzos({ tipo, L, g, q }) {
  const fd = γg * g + γq * q  // carga total de cálculo [kN/m]
  switch (tipo) {
    case 'biapoyada':         return { Md: fd * L * L / 8,  Vd: fd * L / 2   }
    case 'voladizo':          return { Md: fd * L * L / 2,  Vd: fd * L       }
    case 'empotrada_apoyada': return { Md: fd * L * L / 8,  Vd: fd * L * 5/8 }
    case 'biempotrada':       return { Md: fd * L * L / 12, Vd: fd * L / 2   }
    default:                  return { Md: 0, Vd: 0 }
  }
}

/* ── As de armadura ─────────────────────────────────── */
function asTotal(n, diam) {
  return (n * Math.PI * (diam / 2) ** 2 / 100).toFixed(2)  // cm²
}

/* ── Estado inicial ─────────────────────────────────── */
const INIT = {
  // Geometría
  b: 300, h: 500, dp: 35,
  // Armadura tracción
  nBarras: 3, diamBarras: 20,
  // Armadura compresión
  compresionActiva: false, nComp: 2, diamComp: 16,
  // Estribos
  diamEstribo: 8, sepEstribo: 200, ramasEstribo: 2,
  // Materiales
  hormigon: 'HA-30', acero: 'B500S', exposicion: 'IIa',
  // Esfuerzos
  modo: 'directo',
  Md: 120, Vd: 80,
  tipoViga: 'biapoyada', L: 5.0, g: 10, q: 5,
}


/* ── Component ──────────────────────────────────────── */
export default function Vigas() {
  const [v, setV] = useState(INIT)
  const [results, setResults] = useState(null)
  const [calcError, setCalcError] = useState(null)
  const [isStale, setIsStale] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const svgWrapperRef = useRef(null)

  function set(key, val) {
    setV(prev => ({ ...prev, [key]: val }))
    setIsStale(true)
    setCalcError(null)
  }

  function validate() {
    if (!(v.b > 0) || !(v.h > 0)) return 'Las dimensiones b y h deben ser positivas.'
    if (v.dp <= 0 || v.dp >= v.h / 2) return `Recubrimiento d' (${v.dp} mm) debe ser positivo y menor que h/2.`
    if (v.modo === 'cargas' && !(v.L > 0)) return 'La longitud L debe ser positiva.'
    return null
  }
  function numChange(key) {
    return (e) => set(key, parseFloat(e.target.value) || 0)
  }
  function selChange(key) {
    return (e) => set(key, e.target.value)
  }

  /* Auto-calculate Md / Vd from cargas */
  const esfuerzosCalculados = useMemo(() => {
    if (v.modo !== 'cargas') return null
    const { Md, Vd } = calcEsfuerzos({ tipo: v.tipoViga, L: v.L, g: v.g, q: v.q })
    return { Md: Md.toFixed(2), Vd: Vd.toFixed(2) }
  }, [v.modo, v.tipoViga, v.L, v.g, v.q])

  function handleCalc() {
    const err = validate()
    if (err) { setCalcError(err); return }
    try {
      const res = calcularVigaHormigon(v)
      setResults(res)
      setIsStale(false)
      setCalcError(null)
    } catch (err) {
      setCalcError(err.message)
    }
  }

  async function handleExportPdf() {
    if (!results || isExporting) return
    setIsExporting(true)
    try {
      const svgEl = svgWrapperRef.current?.querySelector('svg') ?? null
      const datosEntrada = [
        { label: 'Ancho b',               valor: v.b,           unidad: 'mm'   },
        { label: 'Canto total h',          valor: v.h,           unidad: 'mm'   },
        { label: "Recubrimiento mecánico d'", valor: v.dp,       unidad: 'mm'   },
        { label: 'Armadura tracción',      valor: `${v.nBarras}Ø${v.diamBarras}`, unidad: `(As = ${asTotal(v.nBarras, v.diamBarras)} cm²)` },
        ...(v.compresionActiva ? [{ label: 'Armadura compresión', valor: `${v.nComp}Ø${v.diamComp}`, unidad: `(As' = ${asTotal(v.nComp, v.diamComp)} cm²)` }] : []),
        { label: 'Estribos',               valor: `Ø${v.diamEstribo} / ${v.sepEstribo}`, unidad: 'mm' },
        { label: 'Ramas estribos',         valor: v.ramasEstribo, unidad: ''   },
        { label: 'Hormigón',               valor: v.hormigon,    unidad: ''    },
        { label: 'Acero',                  valor: v.acero,       unidad: ''    },
        { label: 'Clase de exposición',    valor: v.exposicion,  unidad: ''    },
        { label: 'Md (ELU)',               valor: results.esfuerzos.Md.toFixed(1), unidad: 'kN·m' },
        { label: 'Vd (ELU)',               valor: results.esfuerzos.Vd.toFixed(1), unidad: 'kN'   },
        { label: 'Md,ELS',                 valor: results.esfuerzos.Md_els.toFixed(1), unidad: 'kN·m' },
      ]
      await exportarPdf({
        titulo: 'Comprobación de viga de hormigón armado',
        datosEntrada,
        svgElement: svgEl,
        resultados: results.resumen,
        referenciasNorma: 'Código Estructural español (CE). Art. 42.3 — Flexión simple y compuesta. Art. 44.2 — Cortante (método bielas-tirantes). Art. 49.2 — Fisuración (abertura característica de fisura).',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div
      className="module-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: '55% 45%',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* ── LEFT: Inputs ─────────────────────────────── */}
      <div
        style={{
          overflowY: 'auto',
          padding: '1.5rem 1.25rem 1.5rem 1.75rem',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Geometría */}
        <InputGroup title="Geometría">
          <InputField label="Ancho b"                  unit="mm" name="b"   value={v.b}   onChange={numChange('b')}   min={150}  max={1000} step={10} />
          <InputField label="Canto total h"             unit="mm" name="h"   value={v.h}   onChange={numChange('h')}   min={200}  max={1500} step={10} />
          <InputField label="Recubrimiento mecánico d'" unit="mm" name="dp"  value={v.dp}  onChange={numChange('dp')}  min={20}   max={80}   step={5}
            tooltip="Distancia desde la fibra más traccionada al centro de gravedad de la armadura" />
        </InputGroup>

        {/* Armadura tracción */}
        <InputGroup title="Armadura de tracción">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InputField label="Nº barras"  name="nBarras"    value={v.nBarras}    onChange={numChange('nBarras')}   min={2} max={10} step={1} />
            <SelectField label="Diámetro" name="diamBarras"  value={v.diamBarras} onChange={selChange('diamBarras')} options={DIAM_BARRAS} />
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            As = {asTotal(v.nBarras, v.diamBarras)} cm²
          </p>
        </InputGroup>

        {/* Armadura compresión */}
        <InputGroup title="Armadura de compresión">
          {/* Toggle activar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: v.compresionActiva ? '0.9rem' : 0 }}>
            <button
              role="switch"
              aria-checked={v.compresionActiva}
              onClick={() => set('compresionActiva', !v.compresionActiva)}
              style={{
                width: 34, height: 18, borderRadius: 99, border: 'none',
                background: v.compresionActiva ? 'var(--accent)' : 'var(--border-md)',
                cursor: 'pointer', position: 'relative', flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute', top: 2,
                  left: v.compresionActiva ? 'calc(100% - 16px)' : 2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.18s',
                }}
              />
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
              {v.compresionActiva ? 'Activada' : 'Sin armadura de compresión'}
            </span>
          </div>

          {v.compresionActiva && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InputField label="Nº barras" name="nComp"    value={v.nComp}    onChange={numChange('nComp')}    min={2} max={10} step={1} />
                <SelectField label="Diámetro" name="diamComp" value={v.diamComp} onChange={selChange('diamComp')} options={DIAM_BARRAS} />
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                As' = {asTotal(v.nComp, v.diamComp)} cm²
              </p>
            </>
          )}
        </InputGroup>

        {/* Estribos */}
        <InputGroup title="Estribos">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <SelectField label="Diámetro"  name="diamEstribo"  value={v.diamEstribo}  onChange={selChange('diamEstribo')}  options={DIAM_ESTRIBOS} />
            <InputField  label="Separación" unit="mm" name="sepEstribo"  value={v.sepEstribo}  onChange={numChange('sepEstribo')}  min={50} max={400} step={10} />
            <SelectField label="Ramas"     name="ramasEstribo" value={v.ramasEstribo} onChange={selChange('ramasEstribo')} options={RAMAS} />
          </div>
        </InputGroup>

        {/* Materiales */}
        <InputGroup title="Materiales">
          <SelectField label="Hormigón"         name="hormigon"   value={v.hormigon}   onChange={selChange('hormigon')}   options={HORMIGONES} />
          <SelectField label="Acero"            name="acero"      value={v.acero}      onChange={selChange('acero')}      options={ACEROS} />
          <SelectField
            label="Clase de exposición"
            name="exposicion"
            value={v.exposicion}
            onChange={selChange('exposicion')}
            options={EXPOSICIONES}
            tooltip="Afecta al límite de fisuración wmax según EHE Art. 49"
          />
        </InputGroup>

        {/* Esfuerzos */}
        <InputGroup title="Esfuerzos de cálculo">
          <div style={{ marginBottom: '1rem' }}>
            <ModoEsfuerzosToggle modo={v.modo} onChange={(m) => set('modo', m)} />
          </div>

          {v.modo === 'directo' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputField label="Md — momento" unit="kN·m" name="Md" value={v.Md} onChange={numChange('Md')} step={1} min={0} />
              <InputField label="Vd — cortante" unit="kN"  name="Vd" value={v.Vd} onChange={numChange('Vd')} step={1} min={0} />
            </div>
          ) : (
            <>
              <SelectField label="Tipo de viga" name="tipoViga" value={v.tipoViga} onChange={selChange('tipoViga')} options={TIPOS_VIGA} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <InputField label="Luz L" unit="m"    name="L" value={v.L} onChange={numChange('L')} step={0.25} min={0.5} />
                <InputField label="g"     unit="kN/m" name="g" value={v.g} onChange={numChange('g')} step={0.5}  min={0} />
                <InputField label="q"     unit="kN/m" name="q" value={v.q} onChange={numChange('q')} step={0.5}  min={0} />
              </div>
              {esfuerzosCalculados && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(56,189,248,0.05)',
                    border: '1px solid rgba(56,189,248,0.12)',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--accent-dim)',
                  }}
                >
                  Md = {esfuerzosCalculados.Md} kN·m &nbsp;·&nbsp; Vd = {esfuerzosCalculados.Vd} kN
                </div>
              )}
            </>
          )}
        </InputGroup>

        {/* Calcular */}
        <div style={{ paddingTop: '0.5rem', paddingBottom: '1rem' }}>
          <CalculateButton onClick={handleCalc} />
        </div>
      </div>

      {/* ── RIGHT: Section SVG + Results ─────────────── */}
      <div
        style={{
          overflowY: 'auto',
          padding: '1.5rem 1.75rem 1.5rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* SVG section */}
        <div
          ref={svgWrapperRef}
          style={{
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            height: 280,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <SeccionRectangular
            b={v.b}
            h={v.h}
            recubrimiento={v.dp}
            armaduraTraccion={{ nBarras: v.nBarras, diametro: v.diamBarras }}
            armaduraCompresion={v.compresionActiva ? { nBarras: v.nComp, diametro: v.diamComp } : null}
            estribos={{ diametro: v.diamEstribo, separacion: v.sepEstribo }}
          />
        </div>

        {/* Results */}
        {!results && !calcError && (
          <div
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 120,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-3)', fontSize: '0.8rem', gap: '0.4rem',
            }}
          >
            <LayoutGrid size={24} strokeWidth={1} style={{ opacity: 0.35 }} />
            Pulsa Calcular para ver los resultados
          </div>
        )}

        {/* Stale warning */}
        {results && isStale && <StaleBanner />}

        {/* Error banner */}
        {calcError && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
              padding: '0.85rem 1rem',
              background: 'var(--fail-bg)',
              border: '1px solid var(--fail-border)',
              borderRadius: 10,
              fontSize: '0.8rem', color: 'var(--fail)',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Error de cálculo:</strong> {calcError}</span>
          </div>
        )}

        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Esfuerzos resumen */}
            <div
              style={{
                padding: '0.85rem 1rem',
                background: 'var(--bg-muted)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
              }}
            >
              <SummaryItem label="Md"       value={`${results.esfuerzos.Md.toFixed(1)} kN·m`} />
              <SummaryItem label="Vd"       value={`${results.esfuerzos.Vd.toFixed(1)} kN`} />
              <SummaryItem label="Md,ELS"   value={`${results.esfuerzos.Md_els.toFixed(1)} kN·m`} />
              <SummaryItem label="As"       value={`${asTotal(v.nBarras, v.diamBarras)} cm²`} />
              <SummaryItem label={v.hormigon} value={`fck = ${v.hormigon.replace('HA-','')} MPa`} />
            </div>

            {/* Comprobaciones */}
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                Comprobaciones
              </p>
              <ResultsTable results={results.resumen} />
            </div>

            {/* Detalle flexión */}
            <DetailsPanel title="Detalle — Flexión" items={[
              { label: 'Mu (momento resistente)',  value: `${results.flexion.Mu} kN·m` },
              { label: 'Posición fibra neutra x',  value: `${results.flexion.x} mm` },
              { label: 'x / d',                    value: results.flexion.xd },
              { label: 'Ductilidad (x/d ≤ 0.617)', value: results.flexion.ductil ? 'Dominio 3 ✓' : 'Fuera de dominio ✗', warn: !results.flexion.ductil },
              { label: 'As tracción',               value: `${results.flexion.As} mm²` },
            ]} />

            {/* Detalle cortante */}
            <DetailsPanel title="Detalle — Cortante" items={[
              { label: 'Vu1 (compresión oblicua)', value: `${results.cortante.Vu1} kN` },
              { label: 'Vcu (aportación hormigón)', value: `${results.cortante.Vcu} kN` },
              { label: 'Vsu (aportación estribos)', value: `${results.cortante.Vsu} kN` },
              { label: 'Vu2 = Vcu + Vsu',          value: `${results.cortante.Vu2} kN` },
              { label: 'Asw (sección estribo)',     value: `${results.cortante.Asw} mm²` },
            ]} />

            {/* Detalle fisuración */}
            <DetailsPanel title="Detalle — Fisuración" items={[
              { label: 'σs (tensión acero ELS)',   value: `${results.fisuracion.sigmaS} MPa` },
              { label: 'Fibra neutra ELS x',       value: `${results.fisuracion.x_els} mm` },
              { label: 'hc,eff',                   value: `${results.fisuracion.h_ceff} mm` },
              { label: 'sm (separación fisuras)',  value: `${results.fisuracion.sm} mm` },
              { label: 'wk (abertura fisura)',     value: `${results.fisuracion.wk} mm`, highlight: true },
              { label: 'wmax',                     value: `${results.fisuracion.wmax} mm` },
            ]} />

            <ExportPdfButton
              onClick={handleExportPdf}
              loading={isExporting}
              disabled={!results}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Details panel ───────────────────────────────────── */
function DetailsPanel({ title, items }) {
  return (
    <div
      style={{
        background: 'var(--bg-muted)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.55rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '0.5rem 1rem' }}>
        {items.map((item, i) => (
          <div key={i} className="res-row">
            <span className="res-label">{item.label}</span>
            <span
              className="res-value"
              style={item.highlight ? { color: 'var(--accent)' } : item.warn ? { color: 'var(--fail)' } : {}}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Summary item ────────────────────────────────────── */
function SummaryItem({ label, value }) {
  return (
    <div>
      <p style={{ margin: '0 0 0.1rem', fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-1)' }}>{value}</p>
    </div>
  )
}
