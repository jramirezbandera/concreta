import { useState, useMemo, useRef } from 'react'
import { Columns, AlertTriangle } from 'lucide-react'
import perfilesData              from '../../data/perfilesAcero.json'
import { calcularPilarAcero }   from './engine/calculosPilaresAcero'
import { exportarPdf }          from '../../utils/exportPdf'
import PilarAceroSVG            from '../../components/svg/PilarAceroSVG'
import InputField               from '../../components/common/InputField'
import SelectField              from '../../components/common/SelectField'
import InputGroup               from '../../components/common/InputGroup'
import CalculateButton          from '../../components/common/CalculateButton'
import ResultsTable             from '../../components/common/ResultsTable'
import ExportPdfButton          from '../../components/common/ExportPdfButton'
import StaleBanner             from '../../components/common/StaleBanner'

/* ── Opciones ───────────────────────────────────────────────────────── */
const FAMILIAS = ['IPE', 'HEB', 'HEA', 'UPN']

const ACEROS = [
  { value: 235, label: 'S235  (fy = 235 MPa)' },
  { value: 275, label: 'S275  (fy = 275 MPa)' },
  { value: 355, label: 'S355  (fy = 355 MPa)' },
]

const CM_OPTS = [
  { value: 0.4, label: '0.40 — flectores iguales, doble curvatura' },
  { value: 0.6, label: '0.60 — diagrama triangular' },
  { value: 0.9, label: '0.90 — momento en un extremo' },
  { value: 1.0, label: '1.00 — conservador / momento uniforme' },
]

/* ── Estado inicial ─────────────────────────────────────────────────── */
const INIT = {
  familia:     'IPE',
  perfilNombre:'IPE 240',
  fy:          275,
  Ned_kN:      300,
  Myed_kNm:   40,
  Mzed_kNm:   0,
  Lcry_m:      4.0,
  Lcrz_m:      4.0,
  Lcr_LT_m:    4.0,
  Cmy:         0.9,
  Cmz:         0.9,
  CmLT:        0.9,
}

/* ── Componente ─────────────────────────────────────────────────────── */
export default function PilaresAcero() {
  const [v, setV]                 = useState(INIT)
  const [results, setResults]     = useState(null)
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
    if (!perfilObj) return 'Perfil no encontrado.'
    if (!(v.Ned_kN > 0)) return 'Ned debe ser positivo.'
    if (!(v.Lcry_m > 0) || !(v.Lcrz_m > 0)) return 'Las longitudes de pandeo deben ser positivas.'
    return null
  }
  const num = (key) => (e) => set(key, parseFloat(e.target.value) || 0)

  /* Perfiles según familia */
  const perfilesDisponibles = useMemo(() =>
    (perfilesData[v.familia] ?? []).map(p => ({ value: p.nombre, label: p.nombre }))
  , [v.familia])

  const perfilObj = useMemo(() =>
    (perfilesData[v.familia] ?? []).find(p => p.nombre === v.perfilNombre) ?? null
  , [v.familia, v.perfilNombre])

  function handleFamiliaChange(e) {
    const fam = e.target.value
    const primero = perfilesData[fam]?.[0]?.nombre ?? ''
    setV(prev => ({ ...prev, familia: fam, perfilNombre: primero }))
    setResults(null); setCalcError(null)
  }

  function handleCalc() {
    const err = validate()
    if (err) { setCalcError(err); return }
    try {
      const res = calcularPilarAcero({
        perfil:    perfilObj,
        fy:        Number(v.fy),
        Ned_kN:    Number(v.Ned_kN),
        Myed_kNm:  Number(v.Myed_kNm),
        Mzed_kNm:  Number(v.Mzed_kNm),
        Lcry_m:    Number(v.Lcry_m),
        Lcrz_m:    Number(v.Lcrz_m),
        Lcr_LT_m:  Number(v.Lcr_LT_m),
        Cmy:       Number(v.Cmy),
        Cmz:       Number(v.Cmz),
        CmLT:      Number(v.CmLT),
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
      const datosEntrada = [
        { label: 'Perfil',                   valor: v.perfilNombre,   unidad: '' },
        { label: 'h × b',                    valor: `${perfilObj?.h} × ${perfilObj?.b}`, unidad: 'mm' },
        { label: 'A',                         valor: perfilObj?.A,     unidad: 'mm²' },
        { label: 'Tipo de acero',             valor: `S${v.fy}`,       unidad: `(fy = ${v.fy} MPa)` },
        { label: 'Ned',                       valor: v.Ned_kN,         unidad: 'kN' },
        { label: 'My,Ed',                     valor: v.Myed_kNm,       unidad: 'kN·m' },
        { label: 'Mz,Ed',                     valor: v.Mzed_kNm,       unidad: 'kN·m' },
        { label: 'Lcr y-y',                   valor: v.Lcry_m,         unidad: 'm' },
        { label: 'Lcr z-z',                   valor: v.Lcrz_m,         unidad: 'm' },
        { label: 'Lcr pandeo lateral',        valor: v.Lcr_LT_m,       unidad: 'm' },
        { label: 'Cmy',                       valor: v.Cmy,            unidad: '' },
        { label: 'Cmz',                       valor: v.Cmz,            unidad: '' },
        { label: 'CmLT',                      valor: v.CmLT,           unidad: '' },
        { label: 'Clase de sección',          valor: results.clasificacion.clase, unidad: '' },
      ]
      await exportarPdf({
        titulo: 'Comprobación de pilar de acero — pandeo y flexocompresión',
        datosEntrada,
        svgElement: svgEl,
        resultados: results.resumen,
        referenciasNorma: 'EC3 EN 1993-1-1: §6.2.4 Compresión. §6.3.1 Pandeo axial. §6.3.2 Pandeo lateral. §6.3.3 Flexocompresión (Método 2, Anexo B).',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const hayMomento = Math.abs(Number(v.Myed_kNm)) > 0 || Math.abs(Number(v.Mzed_kNm)) > 0

  return (
    <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: '55% 45%', height: '100%', minHeight: 0 }}>

      {/* ── LEFT: Inputs ─────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', padding: '1.5rem 1.25rem 1.5rem 1.75rem', borderRight: '1px solid var(--border)' }}>

        {/* Perfil */}
        <InputGroup title="Perfil">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-2)', letterSpacing: '-0.005em' }}>
                Familia
              </p>
              <select className="sel" value={v.familia} onChange={handleFamiliaChange}>
                {FAMILIAS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <SelectField
              label="Perfil"
              value={v.perfilNombre}
              onChange={(e) => set('perfilNombre', e.target.value)}
              options={perfilesDisponibles}
            />
          </div>

          {perfilObj && (
            <div style={{
              marginTop: '0.5rem', padding: '0.55rem 0.75rem',
              background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)',
              borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              color: 'var(--accent-dim)', lineHeight: 1.7,
            }}>
              h={perfilObj.h} mm · b={perfilObj.b} mm · tf={perfilObj.tf} mm · tw={perfilObj.tw} mm
              <br />
              A={perfilObj.A} mm² · Iy={perfilObj.Iy?.toLocaleString()} mm⁴ · Iz={perfilObj.Iz?.toLocaleString()} mm⁴
            </div>
          )}
        </InputGroup>

        {/* Material */}
        <InputGroup title="Material">
          <SelectField
            label="Tipo de acero"
            value={v.fy}
            onChange={(e) => set('fy', Number(e.target.value))}
            options={ACEROS}
          />
        </InputGroup>

        {/* Longitudes de pandeo */}
        <InputGroup title="Longitudes de pandeo">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InputField
              label="Lcr,y — eje fuerte" unit="m"
              value={v.Lcry_m} onChange={num('Lcry_m')} step={0.25} min={0.1}
              tooltip="Longitud de pandeo en el plano del eje fuerte y-y. Para columna articulada: Lcr = L."
            />
            <InputField
              label="Lcr,z — eje débil" unit="m"
              value={v.Lcrz_m} onChange={num('Lcrz_m')} step={0.25} min={0.1}
              tooltip="Longitud de pandeo en el plano del eje débil z-z. Suele ser el determinante."
            />
          </div>
          <InputField
            label="Lcr,LT — pandeo lateral" unit="m"
            value={v.Lcr_LT_m} onChange={num('Lcr_LT_m')} step={0.25} min={0}
            tooltip="Distancia entre arriostramientos del ala comprimida. Controla el pandeo lateral-torsional."
          />
        </InputGroup>

        {/* Cargas ELU */}
        <InputGroup title="Cargas ELU">
          <InputField
            label="Ned (axil)" unit="kN"
            value={v.Ned_kN} onChange={num('Ned_kN')} step={10} min={0}
            tooltip="Axil de compresión de cálculo (positivo compresión)."
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <InputField
              label="My,Ed — eje fuerte" unit="kN·m"
              value={v.Myed_kNm} onChange={num('Myed_kNm')} step={5} min={0}
              tooltip="Momento flector en el eje fuerte y-y. 0 si sólo hay pandeo axial."
            />
            <InputField
              label="Mz,Ed — eje débil" unit="kN·m"
              value={v.Mzed_kNm} onChange={num('Mzed_kNm')} step={1} min={0}
              tooltip="Momento flector en el eje débil z-z. Para flexocompresión biaxial."
            />
          </div>
        </InputGroup>

        {/* Factores Cm (solo si hay momento) */}
        {hayMomento && (
          <InputGroup title="Factores de momento equivalente Cm">
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
              Según EC3 Anexo B, Tabla B.3. Usar 1.0 si no se conoce el diagrama.
            </p>
            <SelectField
              label="Cmy — eje fuerte y-y"
              value={v.Cmy}
              onChange={(e) => set('Cmy', Number(e.target.value))}
              options={CM_OPTS}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <SelectField
                label="Cmz — eje débil z-z"
                value={v.Cmz}
                onChange={(e) => set('Cmz', Number(e.target.value))}
                options={CM_OPTS}
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <SelectField
                label="CmLT — pandeo lateral"
                value={v.CmLT}
                onChange={(e) => set('CmLT', Number(e.target.value))}
                options={CM_OPTS}
              />
            </div>
          </InputGroup>
        )}

        <div style={{ paddingTop: '0.5rem', paddingBottom: '1rem' }}>
          <CalculateButton onClick={handleCalc} />
        </div>
      </div>

      {/* ── RIGHT: SVG + Resultados ──────────────────────────────── */}
      <div style={{
        overflowY: 'auto',
        padding: '1.5rem 1.75rem 1.5rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>

        {/* SVG */}
        <div
          ref={svgWrapperRef}
          style={{
            background: 'var(--bg-muted)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '0.75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <PilarAceroSVG perfil={perfilObj} results={results} />
        </div>

        {/* Placeholder */}
        {!results && !calcError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 90, background: 'var(--bg-muted)', border: '1px solid var(--border)',
            borderRadius: 10, color: 'var(--text-3)', fontSize: '0.8rem', gap: '0.4rem',
          }}>
            <Columns size={22} strokeWidth={1} style={{ opacity: 0.35 }} />
            Pulsa Calcular para ver los resultados
          </div>
        )}

        {/* Stale warning */}
        {results && isStale && <StaleBanner />}

        {/* Error */}
        {calcError && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
            padding: '0.85rem 1rem', background: 'var(--fail-bg)',
            border: '1px solid var(--fail-border)', borderRadius: 10,
            fontSize: '0.8rem', color: 'var(--fail)',
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Error:</strong> {calcError}</span>
          </div>
        )}

        {/* Resultados */}
        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Summary */}
            <div style={{
              padding: '0.85rem 1rem', background: 'var(--bg-muted)',
              border: '1px solid var(--border)', borderRadius: 10,
              display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
            }}>
              <SummaryItem label="Ned"      value={`${v.Ned_kN} kN`} />
              <SummaryItem label="Nc,Rd"    value={`${results.pandeo.NcRd} kN`} />
              <SummaryItem label="Nb,Rd,y"  value={`${results.pandeo.NbRd_y} kN`} />
              <SummaryItem label="Nb,Rd,z"  value={`${results.pandeo.NbRd_z} kN`} />
              <SummaryItem
                label="Clase sección"
                value={results.clasificacion.clase === 4
                  ? 'Clase 4 ⚠'
                  : `Clase ${results.clasificacion.clase}`}
              />
            </div>

            {/* Clase 4 warning */}
            {results.clasificacion.clase === 4 && (
              <div style={{
                display: 'flex', gap: '0.6rem', padding: '0.75rem 1rem',
                background: 'var(--warn-bg, rgba(210,153,34,0.1))',
                border: '1px solid var(--warn-border, rgba(210,153,34,0.3))',
                borderRadius: 8, fontSize: '0.78rem', color: 'var(--warn, #d29922)',
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                Sección clase 4 — requiere cálculo de sección eficaz (fuera del alcance de esta versión).
              </div>
            )}

            {/* Comprobaciones */}
            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                Comprobaciones
              </p>
              <ResultsTable results={results.resumen} />
            </div>

            {/* Detalle — Pandeo axial */}
            <DetailsPanel title="Detalle — Pandeo axial" items={[
              { label: 'h / b',                      value: (perfilObj.h / perfilObj.b).toFixed(2) },
              { label: 'tf',                          value: `${perfilObj.tf} mm` },
              { label: 'Curva pandeo y-y',            value: results.pandeo.curva_y },
              { label: 'Curva pandeo z-z',            value: results.pandeo.curva_z },
              { label: 'λ̄y (esbeltez adim. y-y)',   value: results.pandeo.lambda_y },
              { label: 'λ̄z (esbeltez adim. z-z)',   value: results.pandeo.lambda_z },
              { label: 'χy — factor reducción y-y',  value: results.pandeo.chi_y },
              { label: 'χz — factor reducción z-z',  value: results.pandeo.chi_z },
              { label: 'Ncr,y (Euler y-y)',           value: `${results.pandeo.Ncr_y} kN` },
              { label: 'Ncr,z (Euler z-z)',           value: `${results.pandeo.Ncr_z} kN` },
              { label: 'Nb,Rd,y',                    value: `${results.pandeo.NbRd_y} kN`, highlight: true },
              { label: 'Nb,Rd,z',                    value: `${results.pandeo.NbRd_z} kN`, highlight: true },
            ]} />

            {/* Detalle — Pandeo lateral (si hay My) */}
            {Math.abs(Number(v.Myed_kNm)) > 0 && (
              <DetailsPanel title="Detalle — Pandeo lateral-torsional" items={[
                { label: 'Lcr,LT',         value: `${v.Lcr_LT_m} m` },
                { label: 'Mcr (elástico)', value: `${results.pandeoLateral.Mcr} kN·m` },
                { label: 'λ̄LT',          value: results.pandeoLateral.lambdaLT },
                { label: 'χLT',           value: results.pandeoLateral.chiLT },
                { label: results.pandeoLateral.hayPandeoLateral
                    ? 'PLT activo (λ̄LT > 0.4)'
                    : 'Sin PLT (λ̄LT ≤ 0.4)',
                  value: results.pandeoLateral.hayPandeoLateral ? '—' : 'Mb,Rd = Mc,Rd' },
                { label: 'Mb,Rd',         value: `${results.pandeoLateral.MbRd} kN·m`, highlight: true },
              ]} />
            )}

            {/* Detalle — Flexocompresión */}
            {results.flexocompresion && (
              <DetailsPanel title="Detalle — Flexocompresión (EC3 Anexo B)" items={[
                { label: 'μy = Ned / Nb,Rd,y',      value: results.flexocompresion.mu_y },
                { label: 'μz = Ned / Nb,Rd,z',      value: results.flexocompresion.mu_z },
                { label: 'kyy',                      value: results.flexocompresion.kyy },
                { label: 'kyz',                      value: results.flexocompresion.kyz },
                { label: 'kzy',                      value: results.flexocompresion.kzy },
                { label: 'kzz',                      value: results.flexocompresion.kzz },
                { label: 'Mb,Rd,y',                  value: `${results.flexocompresion.MbRd_y} kN·m` },
                { label: 'Mc,Rd,z',                  value: `${results.flexocompresion.McRd_z} kN·m` },
                { label: 'Ec. 6.61 (≤ 1.0)',        value: results.flexocompresion.expr_61, highlight: true },
                { label: 'Ec. 6.62 (≤ 1.0)',        value: results.flexocompresion.expr_62, highlight: true },
              ]} />
            )}

            {/* Detalle — Clasificación */}
            <DetailsPanel title="Detalle — Clasificación de sección (compresión)" items={[
              { label: 'ε = √(235/fy)',   value: results.clasificacion.eps },
              { label: 'c/t ala',         value: results.clasificacion.ctAla },
              { label: 'Clase ala',       value: `Clase ${results.clasificacion.claseAla}` },
              { label: 'c/t alma',        value: results.clasificacion.ctAlma },
              { label: 'Clase alma',      value: `Clase ${results.clasificacion.claseAlma}` },
              { label: 'Clase sección',   value: `Clase ${results.clasificacion.clase}`, highlight: true },
            ]} />

            <ExportPdfButton onClick={handleExportPdf} loading={isExporting} disabled={!results} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
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
