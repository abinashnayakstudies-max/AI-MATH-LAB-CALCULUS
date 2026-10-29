# AI Math Lab — Next-Generation Calculus & Signals Computational Platform

**AI Math Lab** is an interactive, engineering-grade computational mathematics and signals platform combining exact symbolic math, rigorous numerical solvers, a trained PyTorch neural network, Three.js 3D WebGL visualizations, and real-time SVG signal processing laboratories.

Built strictly according to the **AI Math Lab Master Blueprint** and styled in the **Rich Dark Noir** visual identity (Warm Cream `#F5EFE6`, Sage-Grey `#8A9E8C`, Deep Burgundy `#781D39` / Crimson `#C23B60`, and Velvety Noir `#0D0B0E`).

---

## 🌐 Live Deployments

- **Frontend (Vercel):** [https://frontend-kappa-nine-hvdnx63cox.vercel.app/](https://frontend-kappa-nine-hvdnx63cox.vercel.app/)
- **Backend API (Render):** [https://ai-math-lab-backend.onrender.com/](https://ai-math-lab-backend.onrender.com/)
- **Interactive OpenAPI Docs:** [https://ai-math-lab-backend.onrender.com/docs](https://ai-math-lab-backend.onrender.com/docs)

---

## 🚀 Two Pillars + Curated Practice Solver

### 📐 Pillar 1: Calculus Core
1. **Generalized Mean Value Theorem (MVT) Explorer:**
   - Interactive 3D WebGL (Three.js) orbit scene with flat 2D orthographic projection switch.
   - Dual-engine verification: PyTorch deep learning candidate prediction (`mvt_model_v4.pt`) verified with Brent numerical root refinement.
   - Secant slope alignment, dynamic tangent lines, and interactive click-to-pin coordinate evaluation.
2. **Symbolic Calculus Engine:**
   - 1st through 5th order derivatives and indefinite/definite integrals with step-by-step KaTeX worked solutions.
3. **Taylor & Maclaurin Series Expansions:**
   - Dynamic polynomial order slider ($N = 1 \dots 10$) with step-by-step coefficient table and convergence comparison curves.
4. **Riemann Sums & Area Visualizer:**
   - Definite integral approximation using Left, Right, Midpoint, and Trapezoidal rules with interactive partition slider ($n = 4 \dots 50$).
5. **Critical Points, Extrema & Inflections:**
   - Stationary point detection, local maxima/minima via second-derivative test, global extrema on $[a, b]$, and inflection points.
6. **Limits & Continuity:**
   - One-sided ($x 	o a^-, x 	o a^+$) and two-sided limits, limits at infinity ($\pm \infty$), and point continuity testing.

---

### 📡 Pillar 2: Signals & Systems Lab
1. **Signal Explorer & Transformations:**
   - **Dual-Domain Representation:** Continuous time ($t$) vector curves vs. Discrete time ($n$) authentic stem plots.
   - **Signal Families:** Unit Step $u(t)$, Unit Impulse $\delta(t)$, Ramp $r(t)$, Rectangular Pulse $	ext{rect}(t/	au)$, Sinusoids, Decaying Exponential $e^{-lpha t}u(t)$, and Sinc pulse $	ext{sinc}(t)$.
   - **Transformation Algebra:** Time shifting $t - t_0$, time scaling $a$, time reversal $t 	o -t$, and amplitude scaling $A$.
   - **Energy Metric:** Evaluates $E = \int |x(t)|^2 dt$ or $\sum |x[n]|^2$.
2. **4-Track Convolution Visualizer:**
   - Continuous $(x * h)(t) = \int x(	au)h(t-	au)d	au$ and discrete $(x * h)[n] = \sum_k x[k]h[n-k]$ convolution.
   - **Synchronized 2×2 Grid:** 1) Stationary Input $x$, 2) Sliding Kernel $h(t - 	au)$, 3) Overlap Product with shaded integral area, and 4) Output Waveform $y(t)$ with active cursor.
   - Interactive sweep player with Play/Pause animation and real-time instantaneous readout.
3. **LTI System Analyzer:**
   - System catalog: Ideal Delay, Accumulator/Integrator, Moving Average, Squarer (Non-Linear test), and Time Scaler (Time-Varying/Non-Causal test).
   - **Formal Proofs:** Detailed mathematical derivation cards for Linearity, Time-Invariance, Causality, and BIBO Stability.
   - Impulse response $h$ and step response $s$ characterization.
4. **Fourier Analysis Lab:**
   - Harmonic synthesis for Square, Triangle, and Sawtooth waves with harmonics slider $N \in [1, 25]$.
   - **Dual SVG Visualization:** Time-domain approximation curve with visible **Gibbs phenomenon** ripples vs. Frequency-domain magnitude line spectrum bar chart ($|b_n|$ vs. $n$).
   - Exact KaTeX series formulas and Mean Squared Error ($MSE$).

---

### 🎓 Pillar 3: Practice Mode & Step-by-Step Solver
- Curated multi-tier problem sets across Calculus and Signals & Systems.
- Difficulty tiers: *Fundamentals*, *Standard*, and *Challenge*.
- Pedagogical hint drawer without spoiling the answer.
- Instant answer verification against backend `/practice/verify`.
- Expandable step-by-step worked solutions with full mathematical rigor in KaTeX.

---

## 🔗 True URL Deep-Link Hash Routing

The application features full browser hash routing supporting direct navigation, browser Back/Forward history, and reload persistence:
- `/#/mvt` — Mean Value Theorem 3D Explorer
- `/#/calculus` — Symbolic Calculus Engine
- `/#/taylor` — Taylor & Maclaurin Series
- `/#/riemann` — Riemann Sums Area Visualizer
- `/#/critical` — Critical Points & Extrema
- `/#/limits` — Limits & Continuity
- `/#/signals/explorer` — Signal Explorer & Transformations
- `/#/signals/convolution` — Convolution Visualizer
- `/#/signals/lti` — LTI System Analyzer
- `/#/signals/fourier` — Fourier Analysis Lab
- `/#/practice` — Curated Practice Mode & Step-by-Step Solver
- `/#/about` — System Architecture & Standards

---

## 🛡️ Mathematical Reliability Protocol

1. **AST Math Parser:** Restricted expression parsing with implicit multiplication (`2x`, `3sin(x)`, `x(x+1)`) and strict security checks. No `eval()` or `exec()`.
2. **Hybrid Verification:** Critical ML candidate estimates are mathematically verified and polished by numerical solvers (e.g. Brent root finding).
3. **No Keystroke Auto-Calculation:** Heavy calculations execute only on explicit button click or pressing <kbd>Enter</kbd> to avoid unnecessary computation and UI interruption.

---

## 🛠️ Tech Stack

- **Backend:** FastAPI, Pydantic, SymPy, NumPy, SciPy, PyTorch, Uvicorn.
- **Frontend:** React 18, Vite, Three.js 3D WebGL, KaTeX, Lucide Icons.
- **CI/CD:** Vercel (Frontend), Render (Backend).
