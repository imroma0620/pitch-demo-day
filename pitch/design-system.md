# PITCH TIMER — Design System
> Versión 1.0 · Herramienta pedagógica para presentaciones UX · Optimizada para Zoom

---

## 1. Principios de diseño

| Principio | Descripción |
|-----------|-------------|
| **Funcional primero** | Cada elemento existe por una razón. Sin decoración vacía. |
| **Legible en Zoom** | Contraste alto, tamaños generosos, sin detalles que se pierdan en pantalla compartida. |
| **Lógica UX visible** | La interfaz enseña con su estructura. El orden visual refuerza el orden del pitch. |
| **Tensión útil** | El tiempo que corre no estresa, orienta. El color y el sonido son información, no alarma. |

---

## 2. Paleta de color

### Colores base

```
--color-bg          #FFFFFF   /* Fondo principal */
--color-surface     #F4F4F0   /* Superficies secundarias, cards */
--color-border      #E0E0D8   /* Bordes y separadores */
--color-ink         #0A0A0A   /* Texto principal */
--color-ink-muted   #6B6B6B   /* Texto secundario, etiquetas */
```

### Color de acento

```
--color-green       #1A8C4E   /* Acento principal: botones, anillo activo, énfasis */
--color-green-light #E8F5EE   /* Fondos de estado activo, hover suave */
--color-green-dark  #0F5C32   /* Hover en botones, estados pressed */
```

### Estados del cronómetro

```
--color-ok          #1A8C4E   /* 0–3 min · Verde · En ritmo */
--color-warn        #C47A1A   /* 3–4 min · Ámbar · Acelera */
--color-danger      #B83232   /* 4–5 min · Rojo · Cierra ya */
--color-done        #0A0A0A   /* Tiempo agotado · Negro total */
```

### Regla de uso del verde

- ✅ Botones de acción primaria
- ✅ Anillo de progreso (estado ok)
- ✅ Sección activa del pitch
- ✅ Énfasis en texto clave (máx. 1 por bloque)
- ❌ Fondos grandes
- ❌ Texto corrido
- ❌ Más de un elemento verde por fila

---

## 3. Tipografía

### Familia

```
font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', monospace;
```

> Monospace como decisión conceptual: precisión, código, sistemas. Comunica que esta herramienta es técnica y rigurosa — como el trabajo UX mismo.

### Escala tipográfica

| Token | Tamaño | Peso | Uso |
|-------|--------|------|-----|
| `--text-display` | 64px | 700 | Contador principal (MM:SS) |
| `--text-heading` | 24px | 600 | Nombre de sección activa |
| `--text-label` | 13px | 500 | Etiquetas, índices de sección |
| `--text-body` | 15px | 400 | Prompt de guía, descripciones |
| `--text-micro` | 11px | 400 | Metadatos, tiempo por sección |

### Reglas tipográficas

- Todo en `letter-spacing: 0.02em` mínimo
- Etiquetas de sección en `text-transform: uppercase`
- El contador siempre en `font-variant-numeric: tabular-nums` para que no salte
- Sin itálicas — la mono no las necesita

---

## 4. Espaciado

Sistema basado en múltiplos de **8px**:

```
--space-1    4px
--space-2    8px
--space-3   12px
--space-4   16px
--space-6   24px
--space-8   32px
--space-12  48px
--space-16  64px
```

Regla: padding interno de componentes siempre `--space-4` o `--space-6`. Nunca valores arbitrarios.

---

## 5. Componentes

### 5.1 Ring Timer (Anillo principal)

```
Tipo:         SVG circle con stroke-dashoffset animado
Tamaño:       280px × 280px
Grosor anillo: 14px
Track (fondo): --color-border
Progreso:      color según estado del tiempo
Transición:    stroke-dashoffset 1s linear
Centro:        Contador MM:SS en --text-display
Subtexto:      Nombre de sección activa en --text-label
```

**Estados del anillo:**

| Tiempo restante | Color del anillo | Comportamiento |
|-----------------|-----------------|----------------|
| 5:00 – 2:00 | `--color-ok` | Fluye normal |
| 2:00 – 1:00 | `--color-warn` | Parpadeo suave 0.5s |
| 1:00 – 0:00 | `--color-danger` | Parpadeo 0.3s |
| 0:00 | `--color-done` | Anillo completo negro, alarma |

---

### 5.2 Barra de secciones

```
Layout:       5 segmentos horizontales en fila
Ancho:        proporcional al tiempo de cada sección
Altura:       6px (barra) + 20px etiqueta debajo
Sección pasada:  --color-ink
Sección activa:  --color-green con glow sutil
Sección futura:  --color-border
```

**Secciones y tiempos por defecto:**

| # | Nombre | Duración | % del total |
|---|--------|----------|-------------|
| 1 | EL DOLOR | 0:45 | 15% |
| 2 | LA INSIGHT | 0:45 | 15% |
| 3 | LA SOLUCIÓN | 1:00 | 20% |
| 4 | LA EVIDENCIA | 1:00 | 20% |
| 5 | EL SIGUIENTE PASO | 0:30 | 10% |
| — | BUFFER | 1:00 | 20% |

---

### 5.3 Prompt de guía

```
Posición:     Debajo del anillo, sobre los controles
Tipografía:   --text-body, --color-ink-muted
Comportamiento: Cambia con cada sección activa
Animación:    fade-in 0.3s ease al cambiar sección
```

**Textos por sección:**

| Sección | Prompt |
|---------|--------|
| EL DOLOR | `¿Quién sufre qué? ¿Por qué importa ahora?` |
| LA INSIGHT | `¿Qué descubriste investigando que otros no ven?` |
| LA SOLUCIÓN | `¿Qué propones? ¿Cómo funciona en una línea?` |
| LA EVIDENCIA | `¿Qué validaste? Usuarios reales, datos, pruebas.` |
| EL SIGUIENTE PASO | `¿Qué decides o qué necesitas hoy?` |

---

### 5.4 Botones de control

```
Altura:       44px (mínimo tappable)
Padding:      12px 24px
Border-radius: 4px (casi cuadrado — decisión mono/técnica)
Font:         --text-label, uppercase, letter-spacing 0.1em
```

| Variante | Fondo | Texto | Borde | Uso |
|----------|-------|-------|-------|-----|
| Primary | `--color-green` | `#FFFFFF` | none | START / RESET |
| Secondary | transparent | `--color-ink` | `--color-border` 1px | PAUSE |
| Ghost | transparent | `--color-ink-muted` | none | Acciones secundarias |

**Estados de hover:** `--color-green-dark` en primary, `--color-surface` en secondary.

---

### 5.5 Alertas de sonido

```
Tecnología:   Web Audio API (sin dependencias externas)
```

| Momento | Tipo de sonido | Descripción |
|---------|---------------|-------------|
| 3:00 restantes | Tono suave · 440Hz · 0.2s | "Vas bien, mantén el ritmo" |
| 1:00 restante | Doble pitido · 660Hz · 0.1s+0.1s | "Cierra fuerte" |
| 0:00 | Tono sostenido · 880Hz · 1.5s | "Tiempo agotado" |

Volumen máximo: `0.3` — audible sin sobresaltar al presentador.

---

## 6. Layout general

```
┌─────────────────────────────────┐
│  PITCH TIMER          [5:00]    │  ← Header mínimo
├─────────────────────────────────┤
│                                 │
│         [ ANILLO SVG ]          │  ← 280px, centrado
│          04:12                  │
│        LA INSIGHT               │
│                                 │
│  ¿Qué descubriste investigando  │  ← Prompt de guía
│  que otros no ven?              │
│                                 │
├─────────────────────────────────┤
│  ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Barra de secciones
│  DOLOR  INSIGHT  SOL  EVI  SIG  │
├─────────────────────────────────┤
│     [ PAUSE ]    [ RESET ]      │  ← Controles
└─────────────────────────────────┘
```

**Ancho óptimo para Zoom:** 600px · centrado en viewport · fondo blanco puro.

---

## 7. Archivos del proyecto

```
pitch-timer/
├── index.html          ← Todo el código (autocontenido)
├── design-system.md    ← Este archivo
└── README.md           ← Instrucciones de uso y GitHub Pages
```

---

## 8. Tokens CSS listos para usar

```css
:root {
  /* Colores */
  --color-bg:          #FFFFFF;
  --color-surface:     #F4F4F0;
  --color-border:      #E0E0D8;
  --color-ink:         #0A0A0A;
  --color-ink-muted:   #6B6B6B;
  --color-green:       #1A8C4E;
  --color-green-light: #E8F5EE;
  --color-green-dark:  #0F5C32;
  --color-warn:        #C47A1A;
  --color-danger:      #B83232;

  /* Tipografía */
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', monospace;
  --text-display: 64px;
  --text-heading: 24px;
  --text-label:   13px;
  --text-body:    15px;
  --text-micro:   11px;

  /* Espaciado */
  --space-1:  4px;
  --space-2:  8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
}
```

---

*Design system generado como base para `index.html` · Ajustar según feedback de estudiantes.*
