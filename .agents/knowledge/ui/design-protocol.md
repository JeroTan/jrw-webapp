# UI/UX Pro Max (UUPM) Design & System Protocol

This document is the **MANDATORY** authority for all visual and interactive design. It enforces a systematic approach to UI, moving beyond "looks" into a scalable **Design System** (Design Tokens + Atomic Components).

## 🛑 Core Directives (No Exceptions)

- **Task Mastery:** You MUST use `TaskCreate` to audit the existing design debt (if any) and define the "Design Token" roadmap before drafting components.
- **The "System" Requirement:** You MUST define a 4px or 8px base spacing scale. No "magic numbers" for margins or padding.
- **Accessibility First:** Every color palette choice MUST pass a WCAG 2.1 AA contrast check.
- **State Logic:** You MUST define the UI for 5 states: **Ideal, Empty, Error, Partial (Loading), and Active/Focus.**

---

## 🛠 The UUPM Deep-Dive Workflow

### 1. Brand & Mood Architecture

- **Voice Research:** Map the project to a 2D scale: [Formal <---> Playful] and [Minimal <---> Expressive].
- **Chromatic Strategy:** Research 3 palettes. Define **Primary**, **Success**, **Warning**, and **Critical** semantic colors based on brand mood.

### 2. Typography & Hierarchy (Scale-Based)

- **Fluid Type Scale:** Implement a modular scale (e.g., Major Third 1.250).
- **Readability Rules:** Define line-heights (1.5x for body, 1.2x for headers) and letter spacing for all "Pro" typography.

### 3. Design Tokens (The Technical Backbone)

Define and document tokens for:

- **Spacing:** `space-xs (4px)`, `space-sm (8px)`, `space-md (16px)`, etc.
- **Radius:** `radius-sm (4px)`, `radius-lg (12px)`, `radius-full (9999px)`.
- **Elevation (Shadows):** Define 3 levels: `flat`, `raised`, `overlay` (using multi-layered soft shadows).

### 4. Atomic Component Audit

Research top UI libraries (Tailwind UI, Radix, Shadcn) and evaluate their "Atom-to-Organism" scalability:

- **Atoms:** Buttons, Inputs, Labels (The building blocks).
- **Molecules:** Search bars, Card headers, Form groups.
- **Organisms:** Navigation bars, Data tables, Complex modals.

---

## 📋 Deliverable Standard: The UI Blueprint

Write to `tangram/design/ui.md` with high-fidelity detail:

### 1. Design Tokens & Variables

| Token Category | Value/Scale      | Implementation (CSS/Tailwind) |
| :------------- | :--------------- | :---------------------------- |
| **Colors**     | Primary: #XXXXXX | `bg-primary`, `text-primary`  |
| **Spacing**    | 8px Base         | `p-2`, `m-4`, `gap-2`         |
| **Radius**     | 12px (Soft)      | `rounded-xl`                  |

### 2. The Elevation & Depth Map

- **Surface 0 (Background):** Base color.
- **Surface 1 (Cards/Sidebar):** +1 elevation (Shadow/Border).
- **Surface 2 (Modals/Popovers):** +2 elevation (Heavy blur/Deep shadow).

### 3. Interaction & Motion Specs (The "Pro" Touch)

- **Transitions:** Default durations (e.g., 200ms ease-in-out).
- **Micro-interactions:** Define behavior for: `hover:scale`, `active:press-in`, `focus:ring-2`.
- **Loading Pattern:** Use **Skeletons** for data-heavy sections; avoid generic spinners.

### 4. Platform-Specific Logic

- **Adaptive Breakpoints:** Define behavior for Mobile (375px), Tablet (768px), and Desktop (1440px).
- **Touch Targets:** Minimum 44x44px for mobile-first surfaces.

---

## 🗣 User Validation (The "Pro" Interview)

Ask 5-8 questions via `AskUserQuestion`:

1. **Density:** "Should the UI be high-density (B2B/Data) or airy (B2C/SaaS)?"
2. **Corner Radius:** "Do we prefer 'Hard' (0-2px), 'Soft' (8-12px), or 'Full' (pill-shaped) aesthetics?"
3. **Glassmorphism:** "Should we use background blurs for overlays to add depth?"
4. **Motion Tolerance:** "Do we want high-motion (animations everywhere) or functional-motion (utility only)?"

**Final Action:** Once user confirms, lock the UI system into `tangram/design/ui.md`.
