import { useState, useMemo, useRef } from 'react'
import { LayoutGrid, AlertTriangle } from 'lucide-react'
import { comprobarPilar }      from './engine/calculosPilares'
import { exportarPdf }         from '../../utils/exportPdf'
import SeccionPilar            from '../../components/svg/SeccionPilar'
import DiagramaNM              from '../../components/svg/DiagramaNM'
import InputField              from '../../components/common/InputField'
import SelectField             from '../../components/common/SelectField'
import InputGroup              from '../../components/common/InputGroup'
import ModoEsfuerzosToggle     from '../../components/common/ModoEsfuerzosToggle'
import CalculateButton         from '../../components/common/CalculateButton'
import ResultsTable            from '../../components/common/ResultsTable'
import ExportPdfButton         from '../../components/common/ExportPdfButton'
import StaleBanner             from '../../components/common/StaleBanner'

/* ── Option lists ───────────────────────────────────────────────────────── */
const DIAM_BARRAS = [10, 12, 16, 20, 25, 32].map(d => ({ value: d, label: `ø${d}` }))

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
const BETA_OPTS = [
  { value: 0.5, label: 'β = 0.5 — Biempotrado' },
  { value: 0.7, label: 'β = 0.7 — Empotrado-Articulado' },
  { value: 1.0, label: 'β = 1.0 — Biarticulado' },
  { value: 2.0, label: 'β = 2.0 — Voladizo' },
]

const PI = Math.PI
function asTotal(n, d) {
  return (Number(n) * PI * (Number(d) / 2) ** 2 / 100).toFixed(2)  // cm²
}

/* ── Estado inicial ─────────────────────────────────────────────────────── */
const INIT = {
  // Geometría
  b: 300, h: 300, dp: 40, L: 3.0, beta: 1.0,
  // Armadura
  armaduraTipo: 'simetrica',
  nBarras: 8, diamBarras: 16,
  nSup: 3, diamSup: 16,
  nInf: 3, diamInf: 16,
  nLat: 1, diamLat: 12,
  // Materiales
  hormigon: 'HA-25', acero: 'B500S',
  // Esfuerzos
  modo: 'directo',
  Nd: 800, Md: 60,
  // modo cargas
  N_total: 800, e0: 75,
}

/* ── Componente ─────────────────────────────────────────────────────────── */
export default function Pilares() {
  const [v, setV]             = useState(INIT)
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
    if (!(v.L > 0)) return 'La longitud L debe ser positiva.'
    if (v.dp <= 0 || v.dp >= Math.min(v.b, v.h) / 2) return 'Recubrimiento mecánico inválido.'
    return null
  }
  const num = (key) => (e) => set(key, parseFloat(e.target.value) || 0)
  const sel = (key) => (e) => set(key, e.target.value)

  /* Esfuerzos efectivos */
  const esfuerzosEfectivos = useMemo(() => {
    if (v.modo === 'cargas') {
      return {
        Nd: v.N_total,
        Md: +(v.N_total * v.e0 / 1000).toFixed(2),  // kN·m = kN × mm / 1000
      }
    }
    return { Nd: v.Nd, Md: v.Md }
  }, [v.modo, v.N_total, v.e0, v.Nd, v.Md])

  /* Objeto armadura para el motor */
  const armadura = useMemo(() => {
    if (v.armaduraTipo === 'simetrica') {
      return { tipo: 'simetrica', nBarras: v.nBarras, diametro: v.diamBarras }
    }
    return {
      tipo: 'porCaras',
      nSup: v.nSup, diamSup: v.diamSup,
      nInf: v.nInf, diamInf: v.diamInf,
      nLat: v.nLat, diamLat: v.diamLat,
    }
  }, [v.armaduraTipo, v.nBarras, v.diamBarras, v.nSup, v.diamSup, v.nInf, v.diamInf, v.nLat, v.diamLat])

  function handleCalc() {
    const err = validate()
    if (err) { setCalcError(err); return }
    try {
      const res = comprobarPilar({
        b: v.b, h: v.h, dp: v.dp,
        armadura,
        tipoHormigon: v.hormigon,
        tipoAcero:    v.acero,
        Nd: esfuerzosEfectivos.Nd,
        Md: esfuerzosEfectivos.Md,
        L:  v.L,
        beta: v.beta,
      })
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
      const { Nd, Md } = esfuerzosEfectivos
      const datosEntrada = [
        { label: 'Ancho b',             valor: v.b,       unidad: 'mm' },
        { label: 'Canto h',             valor: v.h,       unidad: 'mm' },
        { label: "Recubrimiento d'",    valor: v.dp,      unidad: 'mm' },
        { label: 'Longitud L',          valor: v.L,       unidad: 'm'  },
        { label: 'Coef. pandeo β',      valor: v.beta,    unidad: ''   },
        v.armaduraTipo === 'simetrica'
          ? { label: 'Armadura simétrica', valor: `${v.nBarras}Ø${v.diamBarras}`, unidad: `(As = ${asTotal(v.nBarras, v.diamBarras)} cm²)` }
          : { label: 'Armadura por caras', valor: `${v.nSup}Ø${v.diamSup} / ${v.nInf}Ø${v.diamInf} / ${v.nLat}Ø${v.diamLat}`, unidad: '' },
        { label: 'Hormigón',            valor: v.hormigon, unidad: ''  },
        { label: 'Acero',               valor: v.acero,    unidad: ''  },
        { label: 'Nd (ELU)',            valor: Nd,          unidad: 'kN'   },
        { label: 'Md 1er orden',        valor: Md,          unidad: 'kN·m' },
        { label: 'Esbeltez λ',          valor: results.pandeo.lambda, unidad: '' },
        { label: 'Mtotal (con pandeo)', valor: results.pandeo.Mtotal, unidad: 'kN·m' },
      ]
      await exportarPdf({
        titulo: 'Comprobación de pilar de hormigón armado',
        datosEntrada,
        svgElement: svgEl,
        resultados: results.resumen,
        referenciasNorma: 'Código Estructural español (CE). Art. 42.1 — Flexocompresión. Art. 43.1 / 43.5 — Pandeo (amplificación de momentos). Art. 47.1 — Cuantías.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: '55% 45%', height: '100%', minHeight: 0 }}>

      {/* ── LEFT: Inputs ──────────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', padding: '1.5rem 1.25rem 1.5rem 1.75rem', borderRight: '1px solid var(--border)' }}>

        {/* Geometría */}
        <InputGroup title="Geometría">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InputField label="Ancho b"  unit="mm" name="b" value={v.b} onChange={num('b')} min={200} max={800} step={10} />
            <InputField label="Canto h"  unit="mm" name="h" value={v.h} onChange={num('h')} min={200} max={800} step={10} />
          </div>
          <InputField label="Recubrimiento mecánico d'" unit="mm" name="dp" value={v.dp} onChange={num('dp')} min={20} max={80} step={5}
            tooltip="Distancia desde la cara exterior al centro de gravedad de la armadura" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InputField label="Longitud L" unit="m" name="L" value={v.L} onChange={num('L')} min={1} max={20} step={0.25} />
            <SelectField
              label="Coef. pandeo β"
              name="beta"
              value={v.beta}
              onChange={sel('beta')}
              options={BETA_OPTS}
              tooltip="β = 0.5 biempotrado · 0.7 empotrado-articulado · 1.0 biarticulado · 2.0 voladizo"
            />
          </div>
        </InputGroup>

        {/* Armadura */}
        <InputGroup title="Armadura">
          {/* Toggle simétrica / por caras */}
          <div
            style={{
              display: 'inline-flex', gap: 0,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 2, marginBottom: '0.9rem',
            }}
          >
            {[
              { id: 'simetrica',  label: 'Simétrica' },
              { id: 'porCaras',   label: 'Por caras'  },
            ].map(({ id, label }) => {
              const active = v.armaduraTipo === id
              return (
                <button
                  key={id}
                  onClick={() => set('armaduraTipo', id)}
                  style={{
                    padding: '0.3rem 0.85rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: active ? 500 : 400,
                    background:   active ? 'var(--accent)' : 'transparent',
                    color:        active ? '#050a12'        : 'var(--text-2)',
                    border: 'none', borderRadius: 4, cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {v.armaduraTipo === 'simetrica' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InputField label="Nº barras total" name="nBarras"   value={v.nBarras}   onChange={num('nBarras')}   min={4} max={32} step={4} />
                <SelectField label="Diámetro"       name="diamBarras" value={v.diamBarras} onChange={sel('diamBarras')} options={DIAM_BARRAS} />
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                As,total ≈ {asTotal(v.nBarras, v.diamBarras)} cm²
              </p>
            </>
          ) : (
            <>
              {/* Superior (comprimida) */}
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.7rem', color: 'var(--accent-dim)', fontFamily: 'var(--font-mono)' }}>
                Cara superior (comprimida)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <InputField label="Nº barras" name="nSup"   value={v.nSup}   onChange={num('nSup')}   min={2} max={10} step={1} />
                <SelectField label="Ø"        name="diamSup" value={v.diamSup} onChange={sel('diamSup')} options={DIAM_BARRAS} />
              </div>
              {/* Inferior (traccionada) */}
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.7rem', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                Cara inferior (traccionada)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <InputField label="Nº barras" name="nInf"   value={v.nInf}   onChange={num('nInf')}   min={2} max={10} step={1} />
                <SelectField label="Ø"        name="diamInf" value={v.diamInf} onChange={sel('diamInf')} options={DIAM_BARRAS} />
              </div>
              {/* Laterales */}
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Caras laterales (por cara)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InputField label="Nº barras" name="nLat"   value={v.nLat}   onChange={num('nLat')}   min={0} max={8} step={1} />
                <SelectField label="Ø"        name="diamLat" value={v.diamLat} onChange={sel('diamLat')} options={DIAM_BARRAS} />
              </div>
            </>
          )}
        </InputGroup>

        {/* Materiales */}
        <InputGroup title="Materiales">
          <SelectField label="Hormigón" name="hormigon" value={v.hormigon} onChange={sel('hormigon')} options={HORMIGONES} />
          <SelectField label="Acero"    name="acero"    value={v.acero}    onChange={sel('acero')}    options={ACEROS} />
        </InputGroup>

        {/* Esfuerzos */}
        <InputGroup title="Esfuerzos de cálculo">
          <div style={{ marginBottom: '1rem' }}>
            <ModoEsfuerzosToggle modo={v.modo} onChange={(m) => set('modo', m)} />
          </div>

          {v.modo === 'directo' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputField label="Nd — axil"    unit="kN"   name="Nd" value={v.Nd} onChange={num('Nd')} step={10} min={0} />
              <InputField label="Md — momento" unit="kN·m" name="Md" value={v.Md} onChange={num('Md')} step={1}  min={0} />
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InputField label="N total" unit="kN" name="N_total" value={v.N_total} onChange={num('N_total')} step={10} min={0} />
                <InputField label="e₀"      unit="mm" name="e0"      value={v.e0}      onChange={num('e0')}      step={5}  min={0}
                  tooltip="Excentricidad de primer orden = Md/Nd" />
              </div>
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
                Nd = {esfuerzosEfectivos.Nd} kN &nbsp;·&nbsp; Md = {esfuerzosEfectivos.Md} kN·m
              </div>
            </>
          )}
        </InputGroup>

        {/* Calcular */}
        <div style={{ paddingTop: '0.5rem', paddingBottom: '1rem' }}>
          <CalculateButton onClick={handleCalc} />
        </div>
      </div>

      {/* ── RIGHT: Sección + Diagrama + Resultados ─────────────────────── */}
      <div style={{
        overflowY: 'auto',
        padding: '1.5rem 1.75rem 1.5rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>

        {/* Sección SVG */}
        <div
          ref={svgWrapperRef}
          style={{
            background: 'var(--bg-muted)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '0.75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SeccionPilar
            b={v.b}
            h={v.h}
            recubrimiento={v.dp}
            armadura={armadura}
          />
        </div>

        {/* Diagrama N-M */}
        <div style={{
          background: 'var(--bg-muted)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '0.85rem 1rem 0.5rem',
        }}>
          <p style={{
            margin: '0 0 0.5rem',
            fontSize: '0.65rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}>
            Diagrama de interacción N-M
          </p>
          <DiagramaNM
            puntos={results?.diagrama ?? []}
            punto={results?.punto ?? null}
            cumple={results?.cumple ?? true}
          />
        </div>

        {/* Placeholder antes de calcular */}
        {!results && !calcError && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: 80,
            background: 'var(--bg-muted)', border: '1px solid var(--border)',
            borderRadius: 10,
            color: 'var(--text-3)', fontSize: '0.8rem', gap: '0.4rem',
          }}>
            <LayoutGrid size={20} strokeWidth={1} style={{ opacity: 0.35 }} />
            Pulsa Calcular para ver los resultados
          </div>
        )}

        {/* Stale warning */}
        {results && isStale && <StaleBanner />}

        {/* Error */}
        {calcError && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
            padding: '0.85rem 1rem',
            background: 'var(--fail-bg)', border: '1px solid var(--fail-border)',
            borderRadius: 10, fontSize: '0.8rem', color: 'var(--fail)',
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Error de cálculo:</strong> {calcError}</span>
          </div>
        )}

        {/* Resultados */}
        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Resumen pandeo */}
            <div style={{
              padding: '0.85rem 1rem',
              background: 'var(--bg-muted)', border: '1px solid var(--border)',
              borderRadius: 10, display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
            }}>
              <SummaryItem label="Nd"       value={`${esfuerzosEfectivos.Nd} kN`} />
              <SummaryItem label="Md,1er"   value={`${esfuerzosEfectivos.Md} kN·m`} />
              <SummaryItem label="λ"        value={results.pandeo.lambda} />
              <SummaryItem
                label={results.pandeo.esPilarCorto ? 'Pilar corto' : `amp. ×${results.pandeo.factorAmplificacion}`}
                value={`Mtot = ${results.pandeo.Mtotal} kN·m`}
              />
            </div>

            {/* Comprobaciones */}
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                Comprobaciones
              </p>
              <ResultsTable results={results.resumen} />
            </div>

            {/* Detalle pandeo */}
            <DetailsPanel title="Detalle — Pandeo" items={[
              { label: 'Longitud de pandeo l₀',      value: `${(Number(v.L) * Number(v.beta) * 1000).toFixed(0)} mm` },
              { label: 'Esbeltez λ = l₀/ic',         value: results.pandeo.lambda },
              { label: results.pandeo.esPilarCorto ? 'Pilar corto (λ < 25)' : 'Factor amplificación',
                value: results.pandeo.esPilarCorto ? '— no precisa 2º orden' : `${results.pandeo.factorAmplificacion}` },
              ...(results.pandeo.Ncr ? [{ label: 'Ncr (Euler)',  value: `${results.pandeo.Ncr} kN` }] : []),
              { label: 'Excentricidad mínima e_min', value: `${results.pandeo.eMin} mm` },
              { label: 'Momento total Mtotal',        value: `${results.pandeo.Mtotal} kN·m`, highlight: true },
            ]} />

            <ExportPdfButton onClick={handleExportPdf} loading={isExporting} disabled={!results} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Auxiliares ──────────────────────────────────────────────────────────── */
function DetailsPanel({ title, items }) {
  return (
    <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '0.5rem 1rem' }}>
        {items.map((item, i) => (
          <div key={i} className="res-row">
            <span className="res-label">{item.label}</span>
            <span className="res-value" style={item.highlight ? { color: 'var(--accent)' } : {}}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <p style={{ margin: '0 0 0.1rem', fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-1)' }}>{value}</p>
    </div>
  )
}
