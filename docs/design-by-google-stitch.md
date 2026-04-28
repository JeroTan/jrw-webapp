---
name: Architectural System
colors:
  surface: "#fcf8f9"
  surface-dim: "#dcd9d9"
  surface-bright: "#fcf8f9"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f6f3f3"
  surface-container: "#f0eded"
  surface-container-high: "#ebe7e7"
  surface-container-highest: "#e5e2e2"
  on-surface: "#1c1b1c"
  on-surface-variant: "#45474b"
  inverse-surface: "#313031"
  inverse-on-surface: "#f3f0f0"
  outline: "#76777b"
  outline-variant: "#c6c6cb"
  surface-tint: "#5b5e66"
  primary: "#000000"
  on-primary: "#ffffff"
  primary-container: "#181c22"
  on-primary-container: "#80848c"
  inverse-primary: "#c3c6cf"
  secondary: "#0060ab"
  on-secondary: "#ffffff"
  secondary-container: "#4ca0ff"
  on-secondary-container: "#003664"
  tertiary: "#000000"
  on-tertiary: "#ffffff"
  tertiary-container: "#181c1f"
  on-tertiary-container: "#808488"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#dfe2eb"
  primary-fixed-dim: "#c3c6cf"
  on-primary-fixed: "#181c22"
  on-primary-fixed-variant: "#43474e"
  secondary-fixed: "#d3e3ff"
  secondary-fixed-dim: "#a3c9ff"
  on-secondary-fixed: "#001c39"
  on-secondary-fixed-variant: "#004882"
  tertiary-fixed: "#e0e3e7"
  tertiary-fixed-dim: "#c3c7cb"
  on-tertiary-fixed: "#181c1f"
  on-tertiary-fixed-variant: "#43474b"
  background: "#fcf8f9"
  on-background: "#1c1b1c"
  surface-variant: "#e5e2e2"
typography:
  identity-logo:
    fontFamily: Satoshi
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 100%
    letterSpacing: -0.02em
  identity-tagline:
    fontFamily: Space Mono
    fontSize: 9.6px
    fontWeight: "400"
    lineHeight: 100%
    letterSpacing: 0.5em
  h1:
    fontFamily: Satoshi
    fontSize: 48px
    fontWeight: "700"
    lineHeight: "1.1"
    letterSpacing: -0.03em
  h2:
    fontFamily: Satoshi
    fontSize: 32px
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: -0.02em
  h3:
    fontFamily: Satoshi
    fontSize: 20px
    fontWeight: "700"
    lineHeight: "1.4"
    letterSpacing: 0em
  body-large:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: 0em
  body-main:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: "400"
    lineHeight: "1.6"
    letterSpacing: 0em
  label-caps:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: "400"
    lineHeight: "1"
    letterSpacing: 0.1em
  code-sm:
    fontFamily: Space Mono
    fontSize: 11px
    fontWeight: "400"
    lineHeight: "1.4"
    letterSpacing: 0em
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 80px
  grid-gutter: 1px
---

## Brand & Style

This design system embodies the intersection of architectural precision and the "System" protagonist trope—exuding an aura of calculated, hidden power within an ultra-clean environment. The aesthetic is rooted in **Minimalism** and **Technical Brutalism**, utilizing high-contrast visuals and modular logic to create a sense of absolute clarity and "Apparently Limitless" potential.

The user experience should feel like stepping into a high-end architectural firm's digital blueprint: authoritative, disciplined, and frictionless. It avoids decorative fluff in favor of structural integrity, where every 1px line serves a purpose in the overarching hierarchy.

## Colors

The palette is strictly functional, leveraging extreme contrast to drive focus and intent.

- **Surface (#FFFFFF):** The canvas. Pure white provides a sterile, expansive environment that suggests limitless space.
- **Content (#0D1117):** Deep black used for primary text, iconography, and structural elements. It provides the "ink" on the page.
- **Accent (#3E96F4):** Electric Cobalt. This color is used sparingly for interactive highlights, system status, and the signature "period" in the logo. It represents the "power" level of the system.
- **Support (#E1E4E8):** A technical light grey reserved exclusively for 1px borders, grid lines, and subtle dividers.

## Typography

The typographic system contrasts the bold, humanist geometry of **Satoshi** with the technical, monospaced utility of **Space Mono**.

- **Satoshi (Identity):** Used for headlines and brand-level messaging. It represents the "Architect"—clean, professional, and commanding.
- **Space Mono (Utility):** Used for all body text, labels, and system readouts. It represents the "System"—technical, precise, and data-driven.

**Logo Treatment:** The "JRW." logo uses Satoshi Bold. The tagline "Apparently Limitless" is positioned directly beneath or adjacent, rendered at 40% of the logo's height in Space Mono with a wide 0.5em tracking to emphasize the technical nature of the system.

## Layout & Spacing

This design system utilizes a **Modular Grid** logic inspired by terminal interfaces and architectural blueprints.

- **The Grid:** A 12-column fluid grid where every module is separated by a 1px border (#E1E4E8). Content does not float; it sits within defined terminal-like cells.
- **Spacing Rhythm:** Based on a 4px baseline. Vertical and horizontal padding within modules should remain consistent (e.g., 24px) to maintain the "System" integrity.
- **Borders as Spacing:** Instead of traditional white space margins, use 1px lines to define containment zones. This creates a high-density, technical feel without clutter.

## Elevation & Depth

This system rejects shadows. Depth is communicated through **structural stacking and 1px borders**.

- **Flat Architecture:** All elements sit on the same Z-axis. Separation is achieved through the #E1E4E8 border lines.
- **Tonal Layering:** To indicate an active state or a "raised" element (like a modal), use a thin 1px black (#0D1117) border instead of the standard grey one.
- **No Blurs:** Transparency and blurs are avoided to maintain the "Ultra-clean" requirement. Use solid #FFFFFF backgrounds for all containers to ensure maximum legibility and high contrast.

## Shapes

The shape language is strictly **Sharp (0px)**.

Every element—from buttons and input fields to large structural containers—must have square corners. This reinforces the architectural and technical "System" vibe. Rounded corners are seen as soft; sharp corners are seen as precise and calculated.

## Components

- **Buttons:** Rectangular with 1px black borders. Default state is #FFFFFF background with #0D1117 text. Primary "Power" buttons use #3E96F4 background with #FFFFFF text. All labels in Space Mono (Caps).
- **Inputs:** Simple boxes defined by a 1px #E1E4E8 border. On focus, the border changes to 1px #3E96F4. Use Space Mono for placeholder text at 70% opacity.
- **Chips/Labels:** Small, rectangular tags with a #0D1117 background and #FFFFFF Space Mono text. Used for status or categories.
- **Cards/Modules:** Defined strictly by 1px borders. Headers within cards should be separated by a horizontal 1px line.
- **Checkboxes/Radios:** Square (0px radius). Checked state is a solid #0D1117 fill or an "X" in Space Mono.
- **Grid Indicators:** Small "+" symbols at the intersection of 1px border lines can be used to emphasize the "Architectural" feel.
- **System Readouts:** Use Space Mono for any data-heavy components, ensuring all numbers are tabular (monospaced) for technical alignment.
