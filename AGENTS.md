# AGENTS.md — Concreta

## Project Overview

Concreta is a client-side structural engineering calculator for Spanish construction professionals. It performs design checks for reinforced concrete (CE — Código Estructural), steel profiles (CTE DB-SE-A / Eurocódigo 3), and foundations (CTE DB-SE-C). All calculations run in-browser with no backend. Deployed on GitHub Pages.

## Tech Stack

- **Framework**: React 19 (functional components, hooks only — no class components)
- **Build**: Vite 8 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite`, plus CSS custom properties in `src/index.css`
- **Routing**: react-router-dom 7 (BrowserRouter, nested routes under `/app`)
- **PDF Export**: jsPDF + svg2pdf.js
- **Icons**: lucide-react
- **Linting**: ESLint 9 (flat config) with react-hooks and react-refresh plugins
- **No TypeScript, no tests, no backend, no state library** (useState only)

## Architecture

### Directory Layout

```
src/
  main.jsx              # Entry point, BrowserRouter setup
  App.jsx               # Route definitions
  index.css             # Tailwind directives, CSS design tokens, theme variables
  pages/                # Route-level pages (Landing, Hormigon, Acero, Cimentaciones)
  modules/              # Feature modules, each with UI + engine/
    hormigon/           # Vigas.jsx, Pilares.jsx + engine/calculosVigas.js, calculosPilares.js
    acero/              # VigasAcero.jsx, PilaresAcero.jsx + engine/calculosAcero.js, calculosPilaresAcero.js
    cimentaciones/      # Zapatas.jsx, Losa.jsx, MurosHormigon.jsx + engine/calculosZapatas.js, calculosLosa.js, calculosMuros.js
  components/
    common/             # Reusable UI: InputField, SelectField, ResultsTable, CalculateButton, etc.
    layout/             # AppLayout.jsx (sidebar + Outlet)
    svg/                # SVG diagram components (sections, interaction diagrams, force plots)
  hooks/                # useTheme.js
  utils/                # exportPdf.js, normativa.js (material properties, partial factors)
  data/                 # perfilesAcero.json (IPE, HEB, HEA, UPN profile tables)
```

### Key Patterns

- **Module = UI component + pure engine**: Each calculator (e.g., `Vigas.jsx`) manages form state via `useState` and calls a pure function from `engine/` (e.g., `calcularVigas()`). Engines have no side effects.
- **Form state**: A single state object `v` with a `set(key, val)` helper that also sets `isStale = true`.
- **Memoized results**: `useMemo` wraps engine calls so they recompute only when inputs change.
- **Stale banner**: When inputs change after a calculation, `StaleBanner` prompts the user to recalculate.
- **Theme**: `useTheme` hook reads/writes `localStorage('concreta-theme')` and sets `data-theme` on `<html>`. Default is dark.

### Data Flow

```
InputField → setState(v) → setIsStale(true)
                              ↓
                         useMemo → engine function (pure)
                              ↓
CalculateButton → setResults(output) → setIsStale(false)
                              ↓
                    ResultsTable + SVG diagrams
```

## Conventions

### Language

- **UI text, variable names, function names**: Spanish (domain-specific engineering notation)
- **Code structure, comments**: Mix of Spanish and English; prefer Spanish for domain terms

### Naming

| Context | Convention | Examples |
|---|---|---|
| React components | PascalCase `.jsx` | `Vigas.jsx`, `InputField.jsx` |
| Engine modules | camelCase `.js` | `calculosVigas.js`, `calculosPilaresAcero.js` |
| Functions | Spanish verbs, camelCase | `calcularVigas()`, `comprobarFlexion()`, `clasificarSeccion()` |
| Efforts/loads | Standard notation | `Nd`, `Md`, `Vd` (design), `Med`, `Ved` (steel) |
| Materials | Eurocode notation | `fck`, `fyd`, `fctm`, `Ecm` |
| Geometry | Short symbols | `b`, `h`, `d`, `dp`, `L`, `tw`, `tf` |
| Results | Spanish | `cumple` (passes), `aprovechamiento` (utilization), `articuloNorma` (code reference) |
| Constants | UPPER_SNAKE | `GAMMA_C`, `GAMMA_S` |

### Units

- **Internal**: N, mm, MPa (all engine calculations)
- **User-facing I/O**: kN, m, MPa (convert at boundaries)

### Component Pattern

Every module UI component follows this structure:
1. State initialization with defaults
2. `set(key, val)` helper for form changes
3. `useMemo` for calculations
4. `handleCalculate` for explicit trigger
5. `handleExportPdf` for PDF generation
6. JSX: InputGroup → InputField/SelectField → CalculateButton → ResultsTable → SVG diagrams

### Styling

- Tailwind utility classes for layout and spacing
- CSS custom properties (`--bg`, `--accent`, `--text-1`, etc.) in `index.css` for theming
- Inline `style` objects for dynamic or computed values
- Dark theme by default; light via `[data-theme="light"]`

## Engineering Standards

| Domain | Standard | Key Articles |
|---|---|---|
| Reinforced concrete | Código Estructural (CE) | Art. 39.5 (rectangular block), 42.3 (flexion), 43.5 (buckling), 44.2 (shear), 49.2 (crack width) |
| Steel | CTE DB-SE-A / Eurocódigo 3 | Tab. 5.2 (section class), §6.2.4–6.2.6 (resistance), §6.3.1–6.3.3 (buckling, interaction) |
| Foundations | CTE DB-SE-C / CE | Art. 4.2 (ground stress), Art. 4.3 (stability), Rankine earth pressure |

**Load combinations:**
- ELU: `qd = 1.35·g + 1.50·q` (CE Art. 12.2)
- ELS: `qfre = g + 0.70·q` (ψ₁ = 0.7)

**Partial safety factors:** γ_c = 1.5 (concrete), γ_s = 1.15 (steel), γ_M0 = 1.05, γ_M1 = 1.05 (steel profiles)

## Development

```bash
npm run dev       # Vite dev server (localhost:5173)
npm run build     # Production build → dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Guidelines for AI Agents

- **Do not invent structural formulas.** All calculations must reference the applicable standard article. When modifying engine files, preserve or update the normative reference comments.
- **Keep engines pure.** No React imports, no DOM access, no side effects in `engine/` files. They receive plain objects and return plain objects.
- **Preserve unit conventions.** Engines work in N/mm/MPa internally. Convert kN↔N and m↔mm at the UI boundary.
- **Spanish domain terms are intentional.** Do not translate `cumple`, `aprovechamiento`, `Md`, `fck`, etc. to English — they match professional usage.
- **Match existing component patterns.** New calculators should follow the same `useState` + `set()` + `useMemo` + `CalculateButton` + `ResultsTable` structure.
- **SVG diagrams must work in both screen and PDF.** Use the same color-adaptation approach as existing diagrams (dark-on-light inversion for print).
- **No unnecessary dependencies.** The project is intentionally minimal. Do not add state management libraries, UI component libraries, or testing frameworks unless explicitly requested.
- **Tailwind + CSS variables for styling.** Do not introduce CSS modules, styled-components, or other CSS-in-JS solutions.
