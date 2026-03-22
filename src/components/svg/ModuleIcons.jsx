/**
 * ModuleIcons.jsx
 * Iconos SVG personalizados para los módulos de Concreta.
 * API compatible con lucide-react: acepta size, strokeWidth y style.
 */

/* ── Hormigón Armado ────────────────────────────────────────────────────────
   Sección rectangular con estribo (discontinuo), barras de tracción (abajo)
   y barras de compresión (arriba).
*/
export function HormigonIcon({ size = 24, strokeWidth = 1.75, style = {} }) {
  const sw = strokeWidth
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {/* Sección de hormigón */}
      <rect x="2" y="3" width="20" height="18" />

      {/* Estribo (interior discontinuo) */}
      <rect
        x="4.5" y="5.5" width="15" height="13"
        strokeDasharray="2.5 1.5"
        strokeWidth={sw * 0.6}
      />

      {/* Barras de tracción — fila inferior */}
      <circle cx="7.5"  cy="18.8" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="12"   cy="18.8" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="18.8" r="1.35" fill="currentColor" stroke="none" />

      {/* Barras de compresión — fila superior */}
      <circle cx="8.5"  cy="6.2" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="6.2" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ── Acero ──────────────────────────────────────────────────────────────────
   Perfil en I (IPE / HEB): ala superior, alma y ala inferior.
*/
export function AceroIcon({ size = 24, strokeWidth = 1.75, style = {} }) {
  const sw = strokeWidth
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {/* Ala superior */}
      <rect x="2" y="3" width="20" height="3.5" />

      {/* Alma */}
      <rect x="10" y="6.5" width="4" height="11" />

      {/* Ala inferior */}
      <rect x="2" y="17.5" width="20" height="3.5" />
    </svg>
  )
}

/* ── Cimentaciones ──────────────────────────────────────────────────────────
   Pilar sobre zapata aislada, con línea de terreno y rayas de tierra.
*/
export function CimentacionesIcon({ size = 24, strokeWidth = 1.75, style = {} }) {
  const sw = strokeWidth
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {/* Pilar */}
      <rect x="9.5" y="2" width="5" height="10" />

      {/* Zapata (toca la base del pilar) */}
      <rect x="2.5" y="12" width="19" height="6" />

      {/* Línea de terreno */}
      <line x1="1" y1="20" x2="23" y2="20" />

      {/* Rayas de tierra */}
      <line x1="2"  y1="20" x2="4.5"  y2="22.5" strokeWidth={sw * 0.75} />
      <line x1="6"  y1="20" x2="8.5"  y2="22.5" strokeWidth={sw * 0.75} />
      <line x1="10" y1="20" x2="12.5" y2="22.5" strokeWidth={sw * 0.75} />
      <line x1="14" y1="20" x2="16.5" y2="22.5" strokeWidth={sw * 0.75} />
      <line x1="18" y1="20" x2="20.5" y2="22.5" strokeWidth={sw * 0.75} />
    </svg>
  )
}
