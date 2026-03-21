/**
 * exportPdf.js
 * Genera un PDF A4 con cabecera, datos de entrada, sección SVG y tabla de resultados.
 */

import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'

/* ── Paleta del documento (blanco — para imprimir) ───────────────────────── */
const A = { r: 56,  g: 189, b: 248 }  // accent #38bdf8
const PAGE_W = 210
const PAGE_H = 297
const ML = 20          // margin left
const MR = 20          // margin right
const CW = PAGE_W - ML - MR   // content width = 170 mm

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function setAccent(doc)  { doc.setTextColor(A.r, A.g, A.b) }
function setBlack(doc)   { doc.setTextColor(30, 30, 30) }
function setGray(doc)    { doc.setTextColor(120, 120, 120) }
function setDark(doc)    { doc.setTextColor(60, 60, 60) }

function sectionHeading(doc, text, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setAccent(doc)
  doc.text(text, ML, y)
  return y + 5
}

function tableHeader(doc, cols, labels, y) {
  doc.setFillColor(242, 244, 248)
  doc.rect(ML, y, CW, 6.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(90, 90, 90)
  cols.forEach((x, i) => doc.text(labels[i], ML + x + 2, y + 4.5))
  return y + 6.5
}

/* ── Función principal ───────────────────────────────────────────────────── */
/**
 * @param {object} config
 * @param {string} config.titulo
 * @param {Array<{label:string, valor:string|number, unidad:string}>} config.datosEntrada
 * @param {SVGSVGElement|null} config.svgElement
 * @param {Array} config.resultados  — mismo formato que ResultsTable
 * @param {string} config.referenciasNorma
 */
export async function exportarPdf({ titulo, datosEntrada, svgElement, resultados, referenciasNorma }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  let y = 22

  /* ── Cabecera ─────────────────────────────────────────────────────────── */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setAccent(doc)
  doc.text('CONCRETA', ML, y)

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  setBlack(doc)
  doc.text(titulo, ML, y)

  // Fecha alineada a la derecha (en la misma línea que el título)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  setGray(doc)
  doc.text(fecha, PAGE_W - MR, y - 5, { align: 'right' })

  y += 5

  // Línea separadora accent
  doc.setDrawColor(A.r, A.g, A.b)
  doc.setLineWidth(0.5)
  doc.line(ML, y, PAGE_W - MR, y)
  y += 9

  /* ── Datos de entrada ─────────────────────────────────────────────────── */
  y = sectionHeading(doc, 'DATOS DE ENTRADA', y)
  y = tableHeader(doc, [0, 80], ['Parámetro', 'Valor'], y)

  datosEntrada.forEach((d, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(250, 251, 253)
      doc.rect(ML, y, CW, 6, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setDark(doc)
    doc.text(String(d.label), ML + 2, y + 4)

    doc.setFont('courier', 'normal')
    doc.setFontSize(8.5)
    setBlack(doc)
    doc.text(`${d.valor}${d.unidad ? '  ' + d.unidad : ''}`, ML + 82, y + 4)

    y += 6
  })

  y += 7

  /* ── Sección SVG ──────────────────────────────────────────────────────── */
  if (svgElement) {
    y = sectionHeading(doc, 'SECCIÓN TRANSVERSAL', y)

    // Calcular aspect ratio desde el viewBox del SVG
    const vb = svgElement.viewBox?.baseVal
    const aspectRatio = vb && vb.height > 0 ? vb.width / vb.height : 4 / 3

    const svgW  = 130    // mm — ancho fijo
    const svgH  = Math.min(svgW / aspectRatio, 100)
    const svgX  = ML + (CW - svgW) / 2   // centrado

    // Borde contenedor
    doc.setDrawColor(210, 215, 225)
    doc.setLineWidth(0.25)
    doc.roundedRect(svgX - 4, y - 2, svgW + 8, svgH + 8, 2, 2, 'S')

    await svg2pdf(svgElement, doc, { x: svgX, y, width: svgW, height: svgH })

    y += svgH + 14
  }

  /* ── Nueva página si no hay espacio para la tabla ─────────────────────── */
  if (y > PAGE_H - 80) {
    doc.addPage()
    y = 22
  }

  /* ── Tabla de resultados ──────────────────────────────────────────────── */
  y = sectionHeading(doc, 'RESULTADOS', y)

  const RC = [0, 52, 80, 108, 135, 153]  // columnas relativas
  const RLABELS = ['Comprobación', 'Calculado', 'Límite', 'Aprovech.', 'Estado', 'Norma']
  y = tableHeader(doc, RC, RLABELS, y)

  resultados.forEach((r, i) => {
    if (y > PAGE_H - 25) { doc.addPage(); y = 22 }

    if (i % 2 === 1) {
      doc.setFillColor(250, 251, 253)
      doc.rect(ML, y, CW, 7, 'F')
    }

    const calc  = typeof r.valorCalculado === 'number' ? r.valorCalculado.toFixed(2) : String(r.valorCalculado)
    const lim   = typeof r.valorLimite    === 'number' ? r.valorLimite.toFixed(2)    : String(r.valorLimite)
    const unid  = r.unidad ?? ''
    const aprov = `${Math.min(Math.round(r.aprovechamiento), 999)}%`

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setDark(doc)
    doc.text(r.nombre, ML + RC[0] + 2, y + 4.5)

    doc.setFont('courier', 'normal')
    doc.setFontSize(7.5)
    setBlack(doc)
    doc.text(`${calc} ${unid}`.trim(), ML + RC[1] + 2, y + 4.5)
    doc.text(`${lim} ${unid}`.trim(),  ML + RC[2] + 2, y + 4.5)
    doc.text(aprov,                    ML + RC[3] + 2, y + 4.5)

    // Estado — verde/rojo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    if (r.cumple) {
      doc.setTextColor(22, 163, 74)
      doc.text('CUMPLE',    ML + RC[4] + 2, y + 4.5)
    } else {
      doc.setTextColor(220, 38, 38)
      doc.text('NO CUMPLE', ML + RC[4] + 2, y + 4.5)
    }

    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    setGray(doc)
    doc.text(r.articuloNorma ?? '', ML + RC[5] + 2, y + 4.5)

    y += 7
  })

  y += 8

  /* ── Referencias normativas ───────────────────────────────────────────── */
  if (referenciasNorma) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    setGray(doc)
    const lines = doc.splitTextToSize(referenciasNorma, CW)
    doc.text(lines, ML, y)
  }

  /* ── Pie de página (todas las páginas) ───────────────────────────────── */
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(210, 215, 225)
    doc.setLineWidth(0.25)
    doc.line(ML, PAGE_H - 12, PAGE_W - MR, PAGE_H - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    setGray(doc)
    doc.text(`Generado con Concreta — ${fecha}`, PAGE_W / 2, PAGE_H - 7, { align: 'center' })
    doc.text(`${p} / ${totalPages}`, PAGE_W - MR, PAGE_H - 7, { align: 'right' })
  }

  doc.save('concreta-viga.pdf')
}
