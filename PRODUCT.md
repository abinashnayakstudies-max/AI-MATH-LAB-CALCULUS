# AI Math Lab — Product Specification & Platform Architecture

> Comprehensive product architecture for institutional and STEM university computational mathematics.

---

## 1. Executive Summary

**AI Math Lab** is an interactive, browser-native computational platform that unites **Symbolic Calculus**, **Differential Equations**, **3D Multivariable Geometry**, and **Signals & Systems** with deep machine learning and real-time audio DSP.

The platform eliminates server hosting bottlenecks by pairing a high-performance **FastAPI + PyTorch + SymPy** cloud backend with an **instant client-side zero-latency math engine (`clientMathEngine.js`)**, ensuring fluid 60 FPS exploration even during free-tier cold-starts or complete network isolation.

---

## 2. Laboratory Modules & Capabilities

### Pillar 01: Calculus Core
1. **Module 01 — 3D Mean Value Theorem (MVT) Explorer:**
   - 3D WebGL orbit controls with interactive curve evaluation.
   - Dual-mode root discovery: PyTorch neural model candidate prediction + Brent's hybrid numerical refinement.
   - Direct coordinate pinning with tangent/secant slope alignment.
2. **Module 02 — Exact Symbolic Calculus Engine:**
   - Closed-form symbolic differentiation (1st through 5th orders).
   - Definite and indefinite integration with step-by-step derivation breakdown.
3. **Module 03 — Taylor & Maclaurin Polynomial Approximation:**
   - Variable polynomial expansions $P_n(x)$ around arbitrary centers $a$.
   - Live convergence tracking and error bounds.
4. **Module 04 — Riemann Sums Geometric Partition Visualizer:**
   - Geometric partition area slices (Left, Right, Midpoint, and Trapezoidal rules).
   - Dynamic partition count slider ($n = 4 \dots 50$) with Simpson's rule exact benchmark error calculation.
5. **Module 05 — Critical Points, Extrema & Inflections:**
   - Stationary point solver $f'(x) = 0$ with second-derivative test classification.
   - Global extrema on closed intervals $[a, b]$ and inflection points $f''(x) = 0$.
6. **Module 06 — Limits, Asymptotes & Continuity:**
   - Two-sided limits, one-sided limits ($x \to a^-$, $x \to a^+$), and limits at infinity.
   - Continuity verification and L'Hôpital insights.
7. **Module 11 — 3D Multivariable Vector Calculus:**
   - Real-time 3D scalar fields $z = f(x, y)$ (Saddle, Paraboloid, Waveform Ripple, Monkey Saddle).
   - Analytical tangent planes $T_p S$ and steepest ascent gradient vector arrows $\nabla f$.
   - Hessian determinant discriminant ($D = f_{xx}f_{yy} - f_{xy}^2$) for 3D critical point classification.

### Pillar 02: Signals & Systems
8. **Module 07 — Signal Explorer & Arbitrary Transformations:**
   - Continuous waveforms $x(t)$ and discrete stem sequences $x[n]$.
   - 20+ preset random waveforms (Ricker Wavelets, Sinc Packets, Monocycles, Resonators).
   - Dynamic signal transformations $y(t) = A \cdot x(a(t - t_0))$ with 60 FPS live oscilloscope traveling wave animation.
9. **Module 08 — 4-Track Convolution Visualizer:**
   - Synchronized four-track animation: Input $x(\tau)$, Folded/Shifted $h(t - \tau)$, Product Overlap, and Accumulated Output $y(t)$.
10. **Module 09 — LTI System Analyzer & Proof Engine:**
    - Linearity, Time-Invariance, Causality, and BIBO Stability proofs.
    - Closed-form impulse response $h(t)$ and step response $s(t)$.
11. **Module 10 — Fourier Analysis & Acoustic Web Audio DSP:**
    - Real-time synthesis of square, sawtooth, triangle, and arbitrary harmonic series.
    - Gibbs phenomenon overshoot visualization ($\approx 8.95\%$).
    - Interactive Web Audio API synthesis: listen to harmonics and live microphone FFT decomposition.

---

## 3. Pedagogical AI Copilot & Practice Arena

- **Universal Mathematical Reasoning Engine:** Multi-persona assistance (Carl Friedrich Gauss, Ada Lovelace, Joseph Fourier) tailored across undergraduate, graduate, and research levels.
- **Curated Problem Bank & Speed Tangents Arcade:**
  - 100+ curated multi-step challenge problems with KaTeX derivations and hints.
  - Gamified speed tangent estimation mini-game with Web Audio synthesizer sound effects, streaks, and local high score persistence.

---

## 4. Academic Publishing & Integration

- **One-Click Jupyter Notebook Export (`.ipynb`):** Pre-populated with runnable Python, SymPy, NumPy, and Matplotlib code.
- **Printable Academic PDF Report:** Formatted with publication-grade vector diagrams, parameter tables, and mathematical conclusions.
- **Sonner Toast Feedback:** Immediate non-blocking feedback across calculation, copy, and game events.
