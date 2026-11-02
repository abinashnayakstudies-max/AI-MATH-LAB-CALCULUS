# AI Math Lab — Design System Specification

> Grounded in the architectural principles of [Paul Bakaus's Impeccable](https://github.com/pbakaus/impeccable), [Leon's Taste Skill](https://github.com/leonxlnx/taste-skill), and [Emil Kowalski's Sonner](https://github.com/emilkowalski/sonner).

---

## 1. Philosophical Foundations & Anti-Pattern Rejection

AI Math Lab adheres to uncompromising frontend craft, eliminating generic "AI slop" in favor of intentional, mathematically grounded software architecture:

- **No Purple Gradient Halos / AI Tropes:** Avoid gratuitous rainbow glows, neon drop shadows, or generic pastel blobs.
- **Restrained Spatial Rhythm:** Every margin, padding, and layout dimension adheres strictly to an 8px base grid (`8px`, `16px`, `24px`, `32px`, `48px`).
- **Tactile Ergonomics:** Every interactive element has a minimum touch target height of **44px** (`min-height: 44px`), clear `:focus-visible` ring indicators, and physical feedback (`transform: scale(0.98)` on `:active`).
- **Optimal Line Lengths:** Body paragraphs and explanatory text are hard-capped at **75ch** (`max-width: 75ch`) to prevent eye fatigue across widescreen displays.
- **Mathematical Motion Curves:** Animations use purposeful weighted transitions (`cubic-bezier(0.16, 1, 0.3, 1)`) rather than bouncy or cartoonish easing.

---

## 2. Color Palette & Token Hierarchy (Rich Noir)

The palette balances intense dark contrast with warm, organic academic materials:

| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `--bg-base` | `#0D0B0E` | Deep Obsidian Velvet canvas (zero glare, deep contrast) |
| `--bg-surface` | `rgba(22, 18, 23, 0.78)` | Card, modal, and panel elevation with 20px backdrop blur |
| `--text-main` | `#F5EFE6` | Warm Cream primary typography (WCAG AAA compliant: 14.8:1) |
| `--text-muted` | `#A3B5A5` | Muted Sage secondary labels and metadata |
| `--text-dim` | `#748375` | Subtle coordinates, code annotations, and inactive controls |
| `--accent-crimson` | `#C23B60` | Derivative vectors, tangent lines, and focus actions |
| `--accent-burgundy`| `#781D39` | Primary action fills, active navigation indicator |
| `--accent-sage` | `#8A9E8C` | Integrals, secant baselines, and mathematical proofs |
| `--accent-jade` | `#50E3C2` | Gradient arrows ($\nabla f$), optimal roots, verified answers |
| `--border-subtle` | `rgba(245, 239, 230, 0.08)` | 1px precision tactile dividers |

---

## 3. Typographic Scale

- **Display Headings (`h1`):** `clamp(28px, 3.2vw, 42px)`, `font-weight: 700`, `letter-spacing: -0.025em`.
- **Module Headings (`h2`):** `18px`, `font-weight: 600`, `letter-spacing: -0.015em`.
- **Card Titles (`h3`):** `15px`, `font-weight: 600`.
- **Body Text:** `14px`, `line-height: 1.6`, `max-width: 75ch`.
- **Mathematical Formulas:** Rendered via KaTeX display blocks or inline typography (`JetBrains Mono`, `KaTeX_Main`).
- **System Labels / Metadata:** `10px - 11px`, `letter-spacing: 0.12em`, `font-weight: 700`, uppercase.

---

## 4. Micro-Interactions & Notifications (Sonner Stack)

- **Toast Architecture:** Emil Kowalski's Sonner stacked-card paradigm with natural depth scaling (`scale(1 - 0.05 * idx)`), expand-on-hover physics, and smooth cubic-bezier transitions.
- **Physical Feedback:** 
  - Hover: subtle upward translation (`translateY(-1px)`) and border luminance increase.
  - Active: tactile compression (`scale(0.98)`).
  - Focus: 2px offset ring (`outline: 2px solid var(--accent-crimson)`).
- **60 FPS Live Oscilloscope:** Real-time traveling wave animations in Signals & Systems modules utilizing `requestAnimationFrame` with zero thread blocking.

---

## 5. Accessibility & Ergonomics (WCAG 2.1 AA)

- All text meets or exceeds **4.5:1** contrast against surrounding surfaces.
- High-contrast presentation mode supports university auditorium projectors with pure black background (`#000000`) and enlarged KaTeX typography.
- Keyboard navigation: Full `Tab` focus ring support, `Enter` key execution on formula inputs, and screen-reader accessible landmark tags.
