# UI/UX Blueprint: Technical Brutalism

## 1. Platform Strategy
- **Target Platform**: Responsive Web.
- **Framework**: Astro (SSR) + React (Islands).
- **Styling Core**: Tailwind CSS (Strictly customized for 0px radius and 1px borders).

## 2. Visual Identity (Google Stitch System)

### 2.1 Color Palette (Extreme Contrast)
| Token | Hex Code | Role |
| :--- | :--- | :--- |
| **Surface** | `#FFFFFF` | Base canvas. Sterile, expansive, architectural. |
| **Content** | `#0D1117` | Primary text, icons, and structural "ink". |
| **Accent** | `#3E96F4` | Electric Cobalt. Reserved for power elements (Primary CTA, status, logo dot). |
| **Support** | `#E1E4E8` | Technical grey for 1px grid lines and dividers. |

### 2.2 Typography (The Identity Duo)
| Usage | Font Family | Style | Role |
| :--- | :--- | :--- | :--- |
| **Headlines** | `Satoshi` | Bold (700) | The "Architect": Commanding, geometric, professional. |
| **Body/Utility** | `Space Mono` | Regular (400) | The "System": Technical, monospaced, data-driven. |

- **Fluid Type Scale**: Based on a Major Third (1.25) modular scale.
- **Logo Treatment**: Satoshi Bold for "JRW.". Space Mono for "Apparently Limitless" (40% height, 0.5em tracking).

### 2.3 Shapes & Elevation
- **Radius**: Strictly `0px` (Sharp). No rounded corners allowed.
- **Elevation**: NO shadows, NO blurs, NO gradients. 
- **Depth Hierarchy**:
  - **Flat**: Defined by 1px Support grey (`#E1E4E8`).
  - **Active/Raised**: Indicated by 1px Content black (`#0D1117`) or Accent blue (`#3E96F4`).

## 3. Component Strategy

### 3.1 Structural Components (The Grid)
- **Modular Logic**: A 12-column grid where content is contained within 1px bordered cells.
- **Intersections**: Small `+` symbols at line intersections to emphasize architectural blueprints.
- **Spacing Rhythm**: 4px baseline. Padding consistent across modules (Standard: 24px).

### 3.2 Atomic Elements
- **Buttons**:
  - *Default*: 1px Black border, White BG, Black Space Mono text (Caps).
  - *Primary (Power)*: Electric Cobalt (#3E96F4) BG, White text.
- **Inputs**: Defined by 1px Support grey border. On focus, switches to 1px Accent blue.
- **Checkboxes**: Square (0px). Checked state = Solid black fill or "X" in Space Mono.
- **Systems Readout**: All tables and data displays MUST use Space Mono with tabular figures.

## 4. UX Logic & Flow
- **Frictionless Discovery**: A server-side rendered grid that feels like a blueprint, allowing fast filtering with technical labels.
- **Checkout Integrity**: Interactive elements (Cart/Payment) feel like "System Commands"—immediate, clear, and high-contrast.
- **Adaptive Breakpoints**: 
  - Desktop: Full 1px Grid experience.
  - Mobile: Collapsed grid modules with minimum 44px touch targets while maintaining sharp corners.

## 5. Alignment
- *Source*: `design-by-google-stitch.md` (Supreme Law for visuals/typography).
- *Source*: `tangram/studies/feature-backlog.md` (Requirement for sub-200ms feel and localized trust).
- *Source*: `.gemini/knowledge/ui/design-protocol.md` (Systematic token mapping).
