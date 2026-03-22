# Concreta

Aplicación web de cálculo estructural para uso profesional cotidiano. Calcula secciones de hormigón armado, perfiles de acero y cimentaciones según normativa española, directamente en el navegador sin instalación.

**Demo:** [jramirezbandera.github.io/concreta](https://jramirezbandera.github.io/concreta)

---

## Módulos implementados

### Hormigón armado — Código Estructural (CE)

**Vigas**
- Esfuerzos automáticos (Md, Vd) desde cargas distribuidas para 4 esquemas de apoyo: biapoyada, voladizo, empotrada-apoyada, biempotrada. Combinaciones ELU (1.35g + 1.50q) y ELS (g + 0.70q)
- Flexión simple y doble armadura. Bloque rectangular (CE Art. 42.3). Control de ductilidad (x/d ≤ 0.617)
- Cortante con contribución del hormigón (Vcu) y de los estribos (Vsu), factor de tamaño ξ (CE Art. 44.2)
- Fisuración: ancho de fisura wk por método de la sección fisurada homogeneizada. Límites según clase de exposición (CE Art. 49.2)

**Pilares**
- Diagrama N-M de interacción con 210+ puntos, armadura simétrica o por caras
- Pandeo: método de amplificación de momentos, rigidez efectiva EI_eff (CE Art. 43.5). Pilar corto (λ < 25) vs. esbelto
- Comprobación de cuantías geométricas 0.3% – 4.0% (CE Art. 47.1)

---

### Acero laminado — CTE DB-SE-A / EC3

**Vigas**
- Clasificación de sección (Clases 1–4) según EC3 Tabla 5.2 con factor ε = √(235/fy)
- Resistencia a flexión Mc,Rd = Wy·fy/γM0 (§6.2.6)
- Resistencia a cortante Vc,Rd con área de cortante Avz (§6.2.4)
- Interacción M+V para Ved > 0.5·Vc,Rd (§6.2.5)
- Pandeo lateral-torsional: Mcr por Timoshenko, λ̄LT, χLT, Mb,Rd = χLT·Wy·fy/γM1 (§6.3.2)
- Flecha ELS para vanos con límites L/300, L/350, L/400
- Familias disponibles: IPE, HEB, HEA, UPN

**Pilares**
- Pandeo axial en ambos ejes (y-y, z-z): curvas a, b, c, d (EC3 §6.3.1)
- Pandeo lateral-torsional para momento flector (EC3 §6.3.2)
- Flexocompresión biaxial: método 2 Anexo B (EC3 §6.3.3), ecuaciones 6.61 y 6.62 con factores kyy, kzy, kzz, kyz

---

### Cimentaciones — CTE DB-SE-C

**Zapatas aisladas**
- Distribución trapezoidal o triangular de tensiones en el terreno (Art. 4.2)
- Estabilidad al vuelco (CSV ≥ 2.0) y al deslizamiento (CSD ≥ 1.5) (Art. 4.3)
- Armadura de flexión en ambas direcciones como ménsula

**Losa de cimentación**
- Modelo de Winkler: longitud elástica Le = (4EI/ks·B)^0.25
- Tensión de contacto, flecha, armadura inferior y superior mínima
- Cortante sin armadura transversal

**Muros de hormigón con zapata corrida**
- Empujes de Rankine activos, zonas saturadas/no saturadas, presión hidrostática
- Estabilidad al vuelco y deslizamiento
- Esfuerzos en alzado (momento y cortante en la base del muro)
- Armadura en alzado, tacón y puntera

---

## Stack técnico

| Paquete | Uso |
|---|---|
| React 19 + Vite 8 | UI y build |
| React Router v7 (HashRouter) | Navegación — compatible con GitHub Pages |
| Tailwind CSS v4 | Utilidades CSS |
| jsPDF 4 + svg2pdf.js 2.7 | Exportación de informes en PDF |
| lucide-react | Iconos UI |

Sin backend. Todo el cálculo se ejecuta en el navegador.

---

## Estructura del proyecto

```
src/
├── components/
│   ├── common/          # InputField, SelectField, ResultsTable, CalculateButton…
│   ├── layout/          # AppLayout (sidebar + toggle de tema)
│   └── svg/             # Secciones transversales SVG y diagramas de esfuerzos
├── modules/
│   ├── hormigon/
│   │   ├── Vigas.jsx / Pilares.jsx
│   │   └── engine/      # calculosVigas.js, calculosPilares.js (funciones puras)
│   ├── acero/
│   │   ├── VigasAcero.jsx / PilaresAcero.jsx
│   │   └── engine/      # calculosAcero.js, calculosPilaresAcero.js
│   └── cimentaciones/
│       ├── Zapatas.jsx / Losa.jsx / MurosHormigon.jsx
│       └── engine/      # calculosZapatas.js, calculosLosa.js, calculosMuros.js
├── pages/               # Landing.jsx, Hormigon.jsx, Acero.jsx, Cimentaciones.jsx
├── data/                # perfilesAcero.json (IPE, HEB, HEA, UPN)
├── hooks/               # useTheme.js
└── utils/
    ├── exportPdf.js     # Generación de informes PDF (A4)
    └── normativa.js     # Propiedades de materiales y coeficientes parciales
```

---

## Convenciones de cálculo

- **Unidades internas:** N y mm en hormigón; kN y m en acero y cimentaciones
- **Coeficientes parciales:** γc = 1.5 · γs = 1.15 · γM0 = 1.05 · γM1 = 1.05
- **Materiales hormigón:** HA-25 a HA-50 (fck, fcd, fctm, Ecm)
- **Materiales acero estructural:** B400S, B500S, B500SD · S235, S275, S355
- Los motores de cálculo son **funciones puras** sin efectos secundarios
- Todos los resultados incluyen referencia al artículo de la norma aplicable

---

## Informes PDF

El botón "Exportar PDF" genera un informe A4 con:
1. Cabecera con título y fecha
2. Tabla de datos de entrada
3. Sección transversal (SVG vectorial)
4. Diagramas de esfuerzos M/V/f (en vigas de acero)
5. Tabla de comprobaciones con aprovechamiento y estado

---

## Desarrollo local

```bash
npm install
npm run dev
```

```bash
npm run build    # Build de producción
npm run deploy   # Publica en GitHub Pages (rama gh-pages)
```

---

## Normativa de referencia

- **Código Estructural (CE)** — hormigón armado (equivalente al EC2 adaptado para España)
- **CTE DB-SE-A** — estructuras de acero
- **CTE DB-SE-C** — cimentaciones
- **EN 1993-1-1 (EC3)** — acero estructural (pandeo, clasificación de secciones)
