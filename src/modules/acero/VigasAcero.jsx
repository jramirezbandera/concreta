import { useState, useMemo, useRef } from 'react'
import { Wrench, AlertTriangle } from 'lucide-react'
import perfilesData               from '../../data/perfilesAcero.json'
import { calcularVigaAcero, calcularEsfuerzosAcero } from './engine/calculosAcero'
import { exportarPdf }            from '../../utils/exportPdf'
import PerfilAcero                from '../../components/svg/PerfilAcero'
import DiagramaEsfuerzosAcero    from '../../components/svg/DiagramaEsfuerzosAcero'
import InputField                 from '../../components/common/InputField'
import SelectField                from '../../components/common/SelectField'
import InputGroup                 from '../../components/common/InputGroup'
import ModoEsfuerzosToggle        from '../../components/common/ModoEsfuerzosToggle'
import CalculateButton            from '../../components/common/CalculateButton'
import ResultsTable               from '../../components/common/ResultsTable'
import ExportPdfButton            from '../../components/common/ExportPdfButton'
import StaleBanner               from '../../components/common/StaleBanner'

/* ── Opciones ───────────────────────────────────────────────────────────── */
const FAMILIAS = ['IPE', 'HEB', 'HEA', 'UPN']

const ACEROS = [
  { value: 235, label: 'S235  (fy = 235 MPa)' },
  { value: 275, label: 'S275  (fy = 275 MPa)' },
  { value: 355, label: 'S355  (fy = 355 MPa)' },
]

const TIPOS_VIGA = [
  { value: 'biapoyada',  label: 'Biapoyada' },
  { value: 'voladizo',   label: 'Voladizo' },
  { value: 'emp-art',    label: 'Empotrada-Apoyada' },
  { value: 'biempotr',   label: 'Biempotrada' },
]

const LIMITE_FLECHA = [
  { value: 300, label: 'L / 300' },
  { value: 350, label: 'L / 350' },
  { value: 400, label: 'L / 400' },
]

/* ── Estado inicial ─────────────────────────────────────────────────────── */
const INIT = {
  familia:       'IPE',
  perfilNombre:  'IPE 240',
  fy:            275,
  L:             6.0,
  tipoViga:      'biapoyada',
  Lcr:           6.0,
  limiteFlecha:  300,
  modo:          'cargas',
  Med:           80,
  Ved:           40,
  g:             8,
  q:             5,
}

/* ── Componente ─────────────────────────────────────────────────────────── */
export default function VigasAcero() {
  const [v, setV]                 = useState(INIT)
  const [results, setResults]     = useState(null)
  const [calcError, setCalcError] = useState(null)
  const [isStale, setIsStale] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const svgWrapperRef  = useRef(null)
  const diagramWrapRef = useRef(null)

  function set(key, val) {
    setV(prev => ({ ...prev, [key]: val }))
    setIsStale(true)
    setCalcError(null)
  }

  function validate() {
    if (!perfilObj) return 'Perfil no encontrado.'
    if (!(v.L > 0)) return 'La longitud L debe ser positiva.'
    if (!(v.Lcr >= 0)) return 'Lcr debe ser ≥ 0.'
    if (v.modo === 'directo' && !(v.Med >= 0)) return 'Med debe ser ≥ 0.'
    if (v.modo === 'cargas' && v.g + v.q <= 0) return 'La carga total (g+q) debe ser positiva.'
    return null
  }
  const num = (key) => (e) => set(key, parseFloat(e.target.value) || 0)
  const sel = (key) => (e) => set(key, e.target.value)

  /* Perfiles disponibles según familia */
  const perfilesDisponibles = useMemo(() => {
    return (perfilesData[v.familia] ?? []).map(p => ({ value: p.nombre, label: p.nombre }))
  }, [v.familia])

  /* Perfil seleccionado */
  const perfilObj = useMemo(() => {
    return (perfilesData[v.familia] ?? []).find(p => p.nombre === v.perfilNombre) ?? null
  }, [v.familia, v.perfilNombre])

  /* Esfuerzos auto-calculados en modo cargas */
  const esfuerzosCalculados = useMemo(() => {
    if (v.modo !== 'cargas') return null
    const esf = calcularEsfuerzosAcero(v.tipoViga, v.L, v.g, v.q)
    return esf
  }, [v.modo, v.tipoViga, v.L, v.g, v.q])

  function handleCalc() {
    const err = validate()
    if (err) { setCalcError(err); return }
    try {
      const Med_kNm = v.modo === 'cargas' ? esfuerzosCalculados.Med_kNm : v.Med
      const Ved_kN  = v.modo === 'cargas' ? esfuerzosCalculados.Ved_kN  : v.Ved
      const res = calcularVigaAcero({
        perfil:       perfilObj,
        fy:           Number(v.fy),
        Med_kNm:      Med_kNm,
        Ved_kN:       Ved_kN,
        Lcr_m:        Number(v.Lcr),
        L_m:          Number(v.L),
        g_kNm:        Number(v.g),
        q_kNm:        Number(v.q),
        tipoViga:     v.tipoViga,
        limiteFlecha: Number(v.limiteFlecha),
        modo:         v.modo,
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
      const svgEl     = svgWrapperRef.current?.querySelector('svg')  ?? null
      const diagramEl = diagramWrapRef.current?.querySelector('svg') ?? null
      const Med = v.modo === 'cargas' ? esfuerzosCalculados?.Med_kNm : v.Med
      const Ved = v.modo === 'cargas' ? esfuerzosCalculados?.Ved_kN  : v.Ved
      const datosEntrada = [
        { label: 'Perfil',               valor: v.perfilNombre, unidad: '' },
        { label: 'h × b',                valor: `${perfilObj?.h} × ${perfilObj?.b}`, unidad: 'mm' },
        { label: 'Área A',               valor: perfilObj?.A,   unidad: 'mm²' },
        { label: 'Wy (módulo elástico)',  valor: perfilObj?.Wy,  unidad: 'mm³' },
        { label: 'Tipo de acero',         valor: `S${v.fy}`,     unidad: `(fy = ${v.fy} MPa)` },
        { label: 'Longitud L',            valor: v.L,            unidad: 'm' },
        { label: 'Condición de apoyo',    valor: TIPOS_VIGA.find(t=>t.value===v.tipoViga)?.label ?? v.tipoViga, unidad: '' },
        { label: 'Lcr pandeo lateral',    valor: v.Lcr,          unidad: 'm' },
        { label: 'Límite flecha',         valor: `L/${v.limiteFlecha}`, unidad: '' },
        ...(v.modo === 'cargas'
          ? [{ label: 'g', valor: v.g, unidad: 'kN/m' }, { label: 'q', valor: v.q, unidad: 'kN/m' }]
          : []),
        { label: 'Med (ELU)',             valor: Med, unidad: 'kN·m' },
        { label: 'Ved (ELU)',             valor: Ved, unidad: 'kN' },
        { label: 'Clase de sección',      valor: results.clasificacion.clase, unidad: '' },
      ]
      await exportarPdf({
        titulo: 'Comprobación de viga de acero laminado',
        datosEntrada,
        svgElement: svgEl,
        diagramSvgElement: diagramEl,
        resultados: results.resumen,
        referenciasNorma: 'CTE DB SE-A / CE. Art. 6.2.5 Flexión. Art. 6.2.6 Cortante. Art. 6.3.2 Pandeo lateral. DB-SE Art. 4.3.3 Flechas.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  /* Cuando cambia la familia, seleccionar el primer perfil */
  function handleFamiliaChange(e) {
    const fam = e.target.value
    const primero = perfilesData[fam]?.[0]?.nombre ?? ''
    setV(prev => ({ ...prev, familia: fam, perfilNombre: primero }))
    setResults(null)
    setCalcError(null)
  }

  return (
    <div className="module-grid" style={{ display: 'grid', gridTemplateColumns: '55% 45%', height: '100%', minHeight: 0 }}>

      {/* ── LEFT: Inputs ──────────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', padding: '1.5rem 1.25rem 1.5rem 1.75rem', borderRight: '1px solid var(--border)' }}>

        {/* Perfil */}
        <InputGroup title="Perfil">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-2)', letterSpacing: '-0.005em' }}>
                Familia
              </p>
              <div style={{ position: 'relative' }}>
                <select
                  className="sel"
                  value={v.familia}
                  onChange={handleFamiliaChange}
                >
                  {FAMILIAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <SelectField
              label="Perfil"
              value={v.perfilNombre}
              onChange={(e) => { set('perfilNombre', e.target.value) }}
              options={perfilesDisponibles}
            />
          </div>

          {/* Info del perfil */}
          {perfilObj && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.55rem 0.75rem',
              background: 'var(--accent-subtle)',
              border: '1px solid var(--accent-border)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: 'var(--accent-dim)',
              lineHeight: 1.7,
            }}>
              h={perfilObj.h} mm · b={perfilObj.b} mm · tw={perfilObj.tw} mm · tf={perfilObj.tf} mm
              <br />
              A={perfilObj.A} mm² · Wy={perfilObj.Wy.toLocaleString()} mm³ · peso={perfilObj.peso} kg/m
            </div>
          )}
        </InputGroup>

        {/* Material */}
        <InputGroup title="Material">
          <SelectField label="Tipo de acero" value={v.fy} onChange={(e) => set('fy', Number(e.target.value))} options={ACEROS} />
        </InputGroup>

        {/* Configuración del vano */}
        <InputGroup title="Configuración del vano">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InputField label="Longitud L" unit="m" value={v.L} onChange={num('L')} step={0.25} min={0.5} />
            <SelectField label="Condición de apoyo" value={v.tipoViga} onChange={sel('tipoViga')} options={TIPOS_VIGA} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <InputField
              label="Lcr pandeo lateral" unit="m"
              value={v.Lcr}
              onChange={num('Lcr')}
              step={0.25} min={0}
              tooltip="Distancia entre arriostramientos laterales del ala comprimida"
            />
            <SelectField label="Límite flecha" value={v.limiteFlecha} onChange={(e) => set('limiteFlecha', Number(e.target.value))} options={LIMITE_FLECHA} />
          </div>
        </InputGroup>

        {/* Esfuerzos */}
        <InputGroup title="Esfuerzos de cálculo">
          <div style={{ marginBottom: '1rem' }}>
            <ModoEsfuerzosToggle modo={v.modo} onChange={(m) => set('modo', m)} />
          </div>

          {v.modo === 'directo' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InputField label="Med" unit="kN·m" value={v.Med} onChange={num('Med')} step={1} min={0} />
              <InputField label="Ved" unit="kN"   value={v.Ved} onChange={num('Ved')} step={1} min={0} />
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <InputField label="g" unit="kN/m" value={v.g} onChange={num('g')} step={0.5} min={0} />
                <InputField label="q" unit="kN/m" value={v.q} onChange={num('q')} step={0.5} min={0} />
              </div>
              {esfuerzosCalculados && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.6rem 0.75rem',
                  background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
                  borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-dim)',
                }}>
                  Med = {esfuerzosCalculados.Med_kNm} kN·m &nbsp;·&nbsp; Ved = {esfuerzosCalculados.Ved_kN} kN
                </div>
              )}
            </>
          )}
        </InputGroup>

        <div style={{ paddingTop: '0.5rem', paddingBottom: '1rem' }}>
          <CalculateButton onClick={handleCalc} />
        </div>
      </div>

      {/* ── RIGHT: SVG + Resultados ────────────────────────────────────── */}
      <div style={{
        overflowY: 'auto',
        padding: '1.5rem 1.75rem 1.5rem 1.25rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>

        {/* SVG perfil */}
        <div
          ref={svgWrapperRef}
          style={{
            background: 'var(--bg-muted)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '0.75rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <PerfilAcero perfil={perfilObj} />
        </div>

        {/* Diagrama M/V/f */}
        <div
          ref={diagramWrapRef}
          style={{
          background: 'var(--bg-muted)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '0.75rem 0.5rem 0.5rem',
        }}>
          <p style={{
            margin: '0 0 0.4rem 0.5rem',
            fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-3)',
          }}>
            Diagramas de esfuerzos
          </p>
          <DiagramaEsfuerzosAcero
            tipoViga={v.tipoViga}
            L={v.L}
            qd={v.modo === 'cargas' ? (esfuerzosCalculados?.qd ?? 0) : 0}
            q_ser={v.g + v.q}
            Iy={perfilObj?.Iy ?? 0}
            Med={v.modo === 'cargas' ? (esfuerzosCalculados?.Med_kNm ?? 0) : v.Med}
            Ved={v.modo === 'cargas' ? (esfuerzosCalculados?.Ved_kN ?? 0) : v.Ved}
            flecha={results?.flecha?.flecha ?? 0}
            modo={v.modo}
          />
        </div>

        {/* Placeholder */}
        {!results && !calcError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 100, background: 'var(--bg-muted)', border: '1px solid var(--border)',
            borderRadius: 10, color: 'var(--text-3)', fontSize: '0.8rem', gap: '0.4rem',
          }}>
            <Wrench size={22} strokeWidth={1} style={{ opacity: 0.35 }} />
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

            {/* Resumen */}
            <div style={{
              padding: '0.85rem 1rem', background: 'var(--bg-muted)',
              border: '1px solid var(--border)', borderRadius: 10,
              display: 'flex', gap: '1.5rem', flexWrap: 'wrap',
            }}>
              <SummaryItem label="Med"       value={`${results.Med_kNm} kN·m`} />
              <SummaryItem label="Mc,Rd"     value={`${results.flexion.McRd} kN·m`} />
              <SummaryItem label="Mb,Rd"     value={`${results.pandeoLateral.MbRd} kN·m`} />
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

            {/* Detalle clasificación */}
            <DetailsPanel title="Detalle — Clasificación de sección" items={[
              { label: 'ε = √(235/fy)',    value: results.clasificacion.eps.toFixed(3) },
              { label: 'c/t ala',          value: results.clasificacion.ctAla },
              { label: 'Clase ala',        value: `Clase ${results.clasificacion.claseAla}` },
              { label: 'c/t alma',         value: results.clasificacion.ctAlma },
              { label: 'Clase alma',       value: `Clase ${results.clasificacion.claseAlma}` },
              { label: 'Clase sección',    value: `Clase ${results.clasificacion.clase}`, highlight: true },
            ]} />

            {/* Detalle pandeo lateral */}
            <DetailsPanel title="Detalle — Pandeo lateral" items={[
              { label: 'Lcr',              value: `${v.Lcr} m` },
              { label: 'Mcr (elástico)',   value: `${results.pandeoLateral.Mcr} kN·m` },
              { label: 'λLT',             value: results.pandeoLateral.lambdaLT },
              { label: 'χLT',             value: results.pandeoLateral.chiLT },
              { label: results.pandeoLateral.hayPandeo ? 'PL activo' : 'Sin pandeo lateral (λLT ≤ 0.4)',
                value: results.pandeoLateral.hayPandeo ? '—' : 'Mb,Rd = Mc,Rd' },
              { label: 'Mb,Rd',           value: `${results.pandeoLateral.MbRd} kN·m`, highlight: true },
            ]} />

            <ExportPdfButton onClick={handleExportPdf} loading={isExporting} disabled={!results} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function DetailsPanel({ title, items }) {
  return (
    <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--table-head-bg)' }}>
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
    <div style={{ minWidth: 0, maxWidth: '100%' }}>
      <p style={{ margin: '0 0 0.1rem', fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 500, color: 'var(--text-1)' }}>{value}</p>
    </div>
  )
}
