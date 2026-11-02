/**
 * clientMathEngine.js
 * Instant zero-latency client-side numerical & analytical mathematics fallback engine.
 * Ensures the platform continues functioning smoothly even during cold-starts or offline states.
 */

export function clientEvaluateDerivative(expr, xVal = 1.0) {
  const h = 1e-6;
  const f = compileMathFunction(expr);
  if (!f) return null;
  try {
    const fPlus = f(xVal + h);
    const fMinus = f(xVal - h);
    return (fPlus - fMinus) / (2 * h);
  } catch {
    return null;
  }
}

export function clientEvaluateMVT(expr, a, b) {
  const f = compileMathFunction(expr);
  if (!f) return null;

  try {
    const fa = f(a);
    const fb = f(b);
    const secant = (fb - fa) / (b - a);
    const h = 1e-5;

    let bestC = (a + b) / 2;
    let minErr = Infinity;

    // Numerical scan across 300 points
    for (let i = 1; i < 300; i++) {
      const x = a + (i / 300) * (b - a);
      const deriv = (f(x + h) - f(x - h)) / (2 * h);
      const err = Math.abs(deriv - secant);
      if (err < minErr) {
        minErr = err;
        bestC = x;
      }
    }

    // Curve plot points
    const plot_points = [];
    for (let i = 0; i <= 120; i++) {
      const px = a + (i / 120) * (b - a);
      const py = f(px);
      if (Number.isFinite(py) && Math.abs(py) < 1e6) {
        plot_points.push({ x: px, y: py });
      }
    }

    return {
      canonical_c: bestC,
      hybrid_c: bestC,
      secant_slope: secant,
      mvt_points: [bestC],
      plot_points,
      is_client_fallback: true
    };
  } catch {
    return null;
  }
}

export function clientCalculateRiemann(expr, a, b, n = 8, method = "midpoint") {
  const f = compileMathFunction(expr);
  if (!f) return null;
  try {
    const numA = Number(a);
    const numB = Number(b);
    const numN = Math.max(Number(n) || 8, 1);
    const dx = (numB - numA) / numN;
    let sum = 0;
    const rectangles = [];

    for (let i = 0; i < numN; i++) {
      const x_left = numA + i * dx;
      const x_right = numA + (i + 1) * dx;
      let sampleX;
      if (method === "left") sampleX = x_left;
      else if (method === "right") sampleX = x_right;
      else sampleX = (x_left + x_right) / 2; // midpoint

      let height = f(sampleX);
      if (method === "trapezoid") {
        height = ((f(x_left) || 0) + (f(x_right) || 0)) / 2;
      }
      if (!Number.isFinite(height)) height = 0;
      sum += height * dx;

      rectangles.push({
        x_left,
        x_right,
        height,
        sample_x: sampleX
      });
    }

    // Generate smooth curve points
    const plot_points = [];
    const steps = 120;
    const margin = Math.max((numB - numA) * 0.15, 0.5);
    const plotA = numA - margin;
    const plotB = numB + margin;
    for (let i = 0; i <= steps; i++) {
      const x = plotA + (i / steps) * (plotB - plotA);
      const y = f(x);
      if (Number.isFinite(y) && Math.abs(y) < 1e6) {
        plot_points.push({ x, y });
      }
    }

    // Numerical integration (Simpson's rule) for exact reference comparison
    const simpsonN = 600;
    const sdx = (numB - numA) / simpsonN;
    let simpSum = (f(numA) || 0) + (f(numB) || 0);
    for (let i = 1; i < simpsonN; i++) {
      const x = numA + i * sdx;
      const val = f(x) || 0;
      simpSum += (i % 2 === 0 ? 2 : 4) * val;
    }
    const exact = (sdx / 3) * simpSum;

    return {
      riemann_sum: Number(sum.toFixed(5)),
      exact_integral: Number(exact.toFixed(5)),
      error: Number(Math.abs(sum - exact).toFixed(5)),
      dx: Number(dx.toFixed(4)),
      n: numN,
      method,
      rectangles,
      plot_points,
      is_client_fallback: true
    };
  } catch {
    return null;
  }
}

export function compileMathFunction(exprStr) {
  if (!exprStr) return null;
  try {
    let clean = exprStr
      .replace(/\^/g, "**")
      .replace(/sin\(/g, "Math.sin(")
      .replace(/cos\(/g, "Math.cos(")
      .replace(/tan\(/g, "Math.tan(")
      .replace(/exp\(/g, "Math.exp(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/sqrt\(/g, "Math.sqrt(")
      .replace(/pi/gi, "Math.PI")
      .replace(/e\b/g, "Math.E");

    // Replace implicit multiplications like 3x or 2*x
    clean = clean.replace(/(\d+)\s*([a-zA-Z])/g, "$1 * $2");

    return new Function("x", `try { with (Math) { return ${clean}; } } catch(e) { return NaN; }`);
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// SIGNALS & SYSTEMS EXTENDED ENGINE & RANDOM LIBRARY
// ----------------------------------------------------

export const RANDOM_SIGNAL_PRESETS = [
  {
    name: "Linear Chirp Pulse",
    formula: "sin(0.7 * t * t)",
    latex: "x(t) = \sin(0.7 t^2)",
    domain: "continuous",
    desc: "Frequency sweeps quadratically over time; fundamental to radar, sonar, and spread-spectrum DSP."
  },
  {
    name: "Damped Harmonic Oscillator",
    formula: "exp(-0.35 * abs(t)) * cos(5 * t)",
    latex: "x(t) = e^{-0.35|t|} \cos(5t)",
    domain: "continuous",
    desc: "Underdamped mechanical spring or RLC electrical tank circuit dissipating kinetic energy."
  },
  {
    name: "Normalized Sinc Pulse",
    formula: "sinc(t)",
    latex: "x(t) = \frac{\sin(\pi t)}{\pi t}",
    domain: "continuous",
    desc: "Ideal brick-wall low-pass filter impulse response (Nyquist-Shannon reconstruction kernel)."
  },
  {
    name: "Gaussian Wave Packet",
    formula: "exp(-0.5 * t * t) * cos(6 * t)",
    latex: "x(t) = e^{-t^2/2} \cos(6t)",
    domain: "continuous",
    desc: "Achieves the minimum theoretical time-frequency uncertainty product in Gabor analysis."
  },
  {
    name: "Dual-Tone Acoustic Beat",
    formula: "sin(3 * t) + 0.75 * sin(3.6 * t)",
    latex: "x(t) = \sin(3t) + 0.75\sin(3.6t)",
    domain: "continuous",
    desc: "Acoustic wave interference producing envelope amplitude beats at difference frequency Δω."
  },
  {
    name: "Causal Decaying Ramp",
    formula: "step(t) * t * exp(-0.65 * t)",
    latex: "x(t) = t e^{-0.65t} u(t)",
    domain: "continuous",
    desc: "Critically damped second-order step response with single smooth peak at t = 1/a."
  },
  {
    name: "Fourier Square Wave Partial Sum",
    formula: "sin(2 * t) + sin(6 * t)/3 + sin(10 * t)/5",
    latex: "x(t) = \sin(2t) + \frac{1}{3}\sin(6t) + \frac{1}{5}\sin(10t)",
    domain: "continuous",
    desc: "First 3 odd harmonics demonstrating rapid synthesis and the Gibbs phenomenon overshoot."
  },
  {
    name: "Triangular Bartlett Pulse",
    formula: "abs(t) <= 2 ? (1 - abs(t) / 2) : 0",
    latex: "x(t) = \max(0, 1 - |t|/2)",
    domain: "continuous",
    desc: "Autocorrelation of a rectangular pulse; yields a sinc^2(ω) power spectral density."
  },
  {
    name: "Ricker Wavelet (Mexican Hat)",
    formula: "(1 - t * t) * exp(-0.5 * t * t)",
    latex: "x(t) = (1 - t^2) e^{-t^2/2}",
    domain: "continuous",
    desc: "Negative second derivative of a Gaussian; standard source wavelet in seismic exploration."
  },
  {
    name: "Lorentzian Resonance Curve",
    formula: "1 / (1 + t * t)",
    latex: "x(t) = \frac{1}{1 + t^2}",
    domain: "continuous",
    desc: "Cauchy distribution characterizing atomic emission spectral lines and optical cavities."
  },
  {
    name: "Exponential Charging Curve",
    formula: "step(t) * (1 - exp(-1.4 * t))",
    latex: "x(t) = (1 - e^{-1.4t}) u(t)",
    domain: "continuous",
    desc: "RC capacitor charging profile reaching 63.2% of final value in one time constant."
  },
  {
    name: "Modulated Sinc Packet",
    formula: "sinc(t) * cos(5 * t)",
    latex: "x(t) = \text{sinc}(t) \cos(5t)",
    domain: "continuous",
    desc: "Bandpass signal shifting baseband spectrum to center carrier frequency ω0."
  },
  {
    name: "Half-Wave Rectified Sinusoid",
    formula: "max(0, sin(2 * t))",
    latex: "x(t) = \max(0, \sin(2t))",
    domain: "continuous",
    desc: "Ideal diode rectifier preserving positive lobes and introducing DC bias plus harmonics."
  },
  {
    name: "Full-Wave Rectified Cosine",
    formula: "abs(cos(2 * t))",
    latex: "x(t) = |\cos(2t)|",
    domain: "continuous",
    desc: "Full-wave bridge rectifier doubling the fundamental ripple frequency to 4 rad/s."
  },
  {
    name: "Gaussian Odd Monocycle",
    formula: "-t * exp(-0.5 * t * t)",
    latex: "x(t) = -t e^{-t^2/2}",
    domain: "continuous",
    desc: "Anti-symmetric impulse with exact zero net DC area; ideal for ultra-wideband (UWB) antennas."
  },
  {
    name: "Discrete Moving Average Window",
    formula: "step(n) - step(n - 6)",
    latex: "x[n] = u[n] - u[n - 6]",
    domain: "discrete",
    desc: "Length-6 finite impulse response (FIR) boxcar filter kernel with sinc-like frequency response."
  },
  {
    name: "Discrete Damped Cosine Stem",
    formula: "pow(0.85, abs(n)) * cos(0.6 * n)",
    latex: "x[n] = (0.85)^{|n|} \cos(0.6n)",
    domain: "discrete",
    desc: "Two-sided exponentially decaying discrete stem sequence."
  },
  {
    name: "Discrete Comb Sampler",
    formula: "(Math.round(n) % 3 === 0) ? 1 : 0",
    latex: "x[n] = \sum_k \delta[n - 3k]",
    domain: "discrete",
    desc: "Periodic discrete impulse train modeling downsampling and spectral replica imaging."
  },
  {
    name: "Discrete Windowed Burst",
    formula: "abs(n) <= 6 ? sin(0.9 * n) * (1 - abs(n)/7) : 0",
    latex: "x[n] = \sin(0.9n)(1 - |n|/7)",
    domain: "discrete",
    desc: "Triangularly tapered finite-length discrete sinusoidal burst."
  },
  {
    name: "Logarithmic Compression Curve",
    formula: "t >= 0 ? log(1 + 2 * t) : -log(1 - 2 * t)",
    latex: "x(t) = \text{sgn}(t) \ln(1 + 2|t|)",
    domain: "continuous",
    desc: "Non-linear companding characteristic used in telecommunications audio quantization."
  }
];

export function compileSignalFunction(exprStr) {
  if (!exprStr) return null;
  try {
    let clean = exprStr
      .replace(/\^/g, "**")
      .replace(/sinc\(/g, "Math._sinc(")
      .replace(/rect\(/g, "Math._rect(")
      .replace(/step\(/g, "Math._step(")
      .replace(/sin\(/g, "Math.sin(")
      .replace(/cos\(/g, "Math.cos(")
      .replace(/tan\(/g, "Math.tan(")
      .replace(/exp\(/g, "Math.exp(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/log\(/g, "Math.log(")
      .replace(/sqrt\(/g, "Math.sqrt(")
      .replace(/abs\(/g, "Math.abs(")
      .replace(/sign\(/g, "Math.sign(")
      .replace(/pow\(/g, "Math.pow(")
      .replace(/max\(/g, "Math.max(")
      .replace(/min\(/g, "Math.min(")
      .replace(/\bpi\b/gi, "Math.PI")
      .replace(/\be\b/g, "Math.E");

    // Replace implicit multiplication like 2t, 3n, 5(
    clean = clean.replace(/(\d+)\s*([a-zA-Z\(])/g, "$1 * $2");

    return new Function("t", "n", `
      try {
        const _sinc = v => Math.abs(v) < 1e-9 ? 1 : Math.sin(Math.PI * v) / (Math.PI * v);
        const _rect = v => Math.abs(v) <= 0.5 ? 1 : 0;
        const _step = v => v >= 0 ? 1 : 0;
        Math._sinc = _sinc;
        Math._rect = _rect;
        Math._step = _step;
        with (Math) {
          const x = t !== undefined ? t : n;
          const val = ${clean};
          return Number.isFinite(val) ? val : 0;
        }
      } catch(e) {
        return 0;
      }
    `);
  } catch {
    return null;
  }
}

export function clientGenerateSignal({
  signalType = "step",
  customExpression = "",
  domain = "continuous",
  timeStart = -5,
  timeEnd = 5,
  amplitude = 1,
  frequency = 1,
  phase = 0,
  decay = -0.5,
  pulseWidth = 2,
  timeShift = 0,
  timeScaling = 1,
  timeReversal = false,
  ampScale = 1,
  animPhase = 0
}) {
  const isDiscrete = domain === "discrete";
  const t_start = Math.max(-50, Math.min(Number(timeStart), Number(timeEnd) - 0.1));
  const t_end = Math.min(50, Math.max(Number(timeEnd), Number(timeStart) + 0.1));

  let t_axis = [];
  if (isDiscrete) {
    const n_start = Math.floor(t_start);
    const n_end = Math.ceil(t_end);
    for (let n = n_start; n <= n_end; n++) {
      t_axis.push(n);
    }
  } else {
    const n_pts = 301;
    const step = (t_end - t_start) / (n_pts - 1);
    for (let i = 0; i < n_pts; i++) {
      t_axis.push(t_start + i * step);
    }
  }

  const customFn = (signalType === "custom" && customExpression)
    ? compileSignalFunction(customExpression)
    : null;

  const evalBase = (tVal) => {
    if (signalType === "custom" && customFn) {
      return customFn(tVal, tVal);
    }

    const st = signalType.toLowerCase();
    const amp = Number(amplitude);
    const freq = Number(frequency);
    const ph = Number(phase) + animPhase;
    const dec = Number(decay);
    const w = Number(pulseWidth);

    switch (st) {
      case "impulse":
        return isDiscrete
          ? (Math.abs(Math.round(tVal)) === 0 ? amp : 0)
          : (Math.abs(tVal) < 0.05 ? amp : 0);
      case "step":
        return tVal >= -1e-9 ? amp : 0;
      case "ramp":
        return tVal >= 0 ? amp * tVal : 0;
      case "rect":
        return Math.abs(tVal) <= (w / 2) + 1e-9 ? amp : 0;
      case "sine":
        return amp * Math.sin(freq * tVal + ph);
      case "cosine":
        return amp * Math.cos(freq * tVal + ph);
      case "exponential":
        return tVal >= -1e-9 ? amp * Math.exp(dec * tVal) : 0;
      case "sinc":
        return Math.abs(tVal) < 1e-9 ? amp : amp * Math.sin(Math.PI * tVal) / (Math.PI * tVal);
      case "chirp":
        return amp * Math.sin(0.7 * tVal * tVal + ph);
      case "damped_sine":
        return amp * Math.exp(-0.35 * Math.abs(tVal)) * Math.cos(freq * tVal + ph);
      case "gaussian":
        return amp * Math.exp(-0.5 * tVal * tVal);
      default:
        return tVal >= -1e-9 ? amp : 0;
    }
  };

  const scaleA = Number(timeScaling) !== 0 ? Number(timeScaling) : 1;
  const rev = Boolean(timeReversal);
  const shiftT0 = Number(timeShift);
  const A_mult = Number(ampScale);

  const original_samples = [];
  const transformed_samples = [];

  for (const t of t_axis) {
    const yOrig = evalBase(t);
    // Transformed: x(a*(t - t0)) or x(a*(-t - t0))
    const tPrime = scaleA * ((rev ? -t : t) - shiftT0);
    const yTrans = A_mult * evalBase(tPrime);

    original_samples.push({
      t: Number(t.toFixed(4)),
      y: Number(yOrig.toFixed(4))
    });
    transformed_samples.push({
      t: Number(t.toFixed(4)),
      y: Number(yTrans.toFixed(4))
    });
  }

  // Energy & Power estimation
  let energyOrig = 0;
  let energyTrans = 0;
  for (let i = 0; i < original_samples.length; i++) {
    const dt = isDiscrete ? 1 : (i > 0 ? original_samples[i].t - original_samples[i-1].t : 0.03);
    energyOrig += original_samples[i].y * original_samples[i].y * dt;
    energyTrans += transformed_samples[i].y * transformed_samples[i].y * dt;
  }

  return {
    success: true,
    domain,
    signal_type: signalType,
    original_samples,
    transformed_samples,
    energy_original: Number(energyOrig.toFixed(4)),
    energy_transformed: Number(energyTrans.toFixed(4)),
    is_client_eval: true
  };
}

// ----------------------------------------------------
// UNIVERSAL AI COPILOT REASONING ENGINE
// ----------------------------------------------------

export function clientSolveCopilotQuery(message, persona = "ada", level = "undergraduate") {
  const msg = (message || "").trim();
  const lower = msg.toLowerCase();
  const p = persona.toLowerCase();

  // Greetings & Persona voice
  const personaHeader = {
    gauss: "Carl Friedrich Gauss",
    fourier: "Joseph Fourier",
    concise: "Quick Solver Copilot",
    ada: "Ada Lovelace"
  }[p] || "Ada Lovelace";

  const tone = {
    gauss: "By formal axiomatic deduction and rigorous mathematical analysis:",
    fourier: "Decomposing this physical system across its harmonic orthogonal frequency spectrum:",
    concise: "Exact closed-form results and core formulas:",
    ada: "Let us explore the geometric intuition and analytical poetry behind your question!"
  }[p] || "Let us explore the analytical intuition behind your question!";

  // Domain classification
  const isDerivative = /derivative|differentiate|rate of change|slope|tangent/i.test(lower);
  const isIntegral = /integral|integrate|antiderivative|area under|riemann/i.test(lower);
  const isLimit = /limit|continuity|asymptote|l'hopital|indeterminate/i.test(lower);
  const isMVT = /mean value|mvt|secant|rolle/i.test(lower);
  const isFourier = /fourier|harmonic|square wave|gibbs|frequency|spectrum|dft|fft/i.test(lower);
  const isConvolution = /convolution|convolve|impulse response|lsim|filter/i.test(lower);
  const isLTI = /lti|linear|time-invariant|bibo|stability|causal/i.test(lower);
  const isVector3D = /multivariable|vector field|gradient|saddle|tangent plane|divergence|curl|stokes|green|hessian/i.test(lower);
  const isLaplace = /laplace|z-transform|transfer function|poles|zeros|roc/i.test(lower);
  const isODE = /differential equation|ode|pde|harmonic oscillator|dy\/dx/i.test(lower);
  const isEuler = /euler|complex|e\^\(i|polar form/i.test(lower);
  const isLinearAlg = /eigenvalue|eigenvector|matrix|determinant|vector space/i.test(lower);

  let reply = "";
  let steps = [];
  let actions = [];
  let suggested = [];

  if (isVector3D) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `In 3D multivariable calculus, for any differentiable scalar field $z = f(x, y)$, the **Gradient Vector** $\nabla f$ points in the exact direction of steepest ascent:\n\n` +
      `$$\nabla f(x, y) = \left\langle \frac{\partial f}{\partial x}, \frac{\partial f}{\partial y} \right\rangle$$\n\n` +
      `The affine **Tangent Plane** $T_p S$ at inspection coordinate $(x_0, y_0, z_0)$ provides the first-order linear approximation:\n\n` +
      `$$z - z_0 = f_x(x_0, y_0)(x - x_0) + f_y(x_0, y_0)(y - y_0)$$\n\n` +
      `The Hessian discriminant $D = f_{xx}f_{yy} - (f_{xy})^2$ classifies critical points into local minima ($D > 0, f_{xx} > 0$), local maxima ($D > 0, f_{xx} < 0$), or hyperbolic saddle points ($D < 0$).`;

    steps = [
      { title: "Compute Gradient Vector", latex: "\nabla f(x, y) = \left\langle \frac{\partial f}{\partial x}, \frac{\partial f}{\partial y} \right\rangle", notes: "Always orthogonal to level curves f(x, y) = c." },
      { title: "Construct Tangent Plane", latex: "z - z_0 = f_x(x_0, y_0)(x - x_0) + f_y(x_0, y_0)(y - y_0)", notes: "First-order Taylor linearization in R^3." },
      { title: "Hessian Second Derivative Test", latex: "D = f_{xx} f_{yy} - (f_{xy})^2", notes: "D < 0 immediately reveals a saddle point." }
    ];
    actions = [
      { label: "Launch 3D Vector Calculus Lab", domain: "calculus", page: "multivariable" },
      { label: "Critical Points Analyzer", domain: "calculus", page: "critical" }
    ];
    suggested = [
      "Why is the gradient vector perpendicular to level contours?",
      "How do Lagrange multipliers find constrained extrema?",
      "Explain the physical meaning of Curl and Divergence"
    ];
  } else if (isFourier) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `Joseph Fourier proved that any periodic signal $x(t) = x(t + T)$ with fundamental frequency $\omega_0 = 2\pi/T$ can be synthesized through an infinite sum of orthogonal harmonics:\n\n` +
      `$$x(t) = a_0 + \sum_{n=1}^\infty \left[ a_n \cos(n\omega_0 t) + b_n \sin(n\omega_0 t) \right]$$\n\n` +
      `Where the Fourier coefficients evaluate the inner product projections:\n\n` +
      `$$a_n = \frac{2}{T}\int_{-T/2}^{T/2} x(t)\cos(n\omega_0 t)\,dt, \quad b_n = \frac{2}{T}\int_{-T/2}^{T/2} x(t)\sin(n\omega_0 t)\,dt$$\n\n` +
      `At jump discontinuities, the truncated synthesis exhibits **Gibbs phenomenon**, producing an asymptotic $\approx 8.95\%$ peak overshoot regardless of harmonic count $N$!`;

    steps = [
      { title: "Orthogonal Basis Decomposition", latex: "x(t) = a_0 + \sum_{n=1}^N [a_n \cos(n\omega_0 t) + b_n \sin(n\omega_0 t)]", notes: "Basis functions satisfy <phi_m, phi_n> = 0 for m != n." },
      { title: "Gibbs Phenomenon Overshoot", latex: "\lim_{N \to \infty} \max |x_N(t)| \approx 1.0895 \cdot \text{Jump}", notes: "Result of non-uniform convergence near discontinuities." },
      { title: "Parseval's Power Theorem", latex: "\frac{1}{T}\int_0^T |x(t)|^2 dt = a_0^2 + \frac{1}{2}\sum_{n=1}^\infty (a_n^2 + b_n^2)", notes: "Total signal energy is conserved between time and frequency domains." }
    ];
    actions = [
      { label: "Launch Fourier Analysis Lab", domain: "signals", sub: "fourier" },
      { label: "Listen to Acoustic Harmonics", domain: "signals", sub: "fourier" }
    ];
    suggested = [
      "Synthesize a square wave with 9 harmonics",
      "Why do odd-symmetric signals have only sine terms?",
      "Explain the Continuous Fourier Transform integral"
    ];
  } else if (isConvolution) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `Continuous-time **Convolution** $(x * h)(t)$ determines the exact output of any Linear Time-Invariant (LTI) system excited by arbitrary input $x(t)$ with impulse response $h(t)$:\n\n` +
      `$$y(t) = (x * h)(t) = \int_{-\infty}^{\infty} x(\tau)\,h(t - \tau)\,d\tau$$\n\n` +
      `The four dynamic stages of convolution are:\n` +
      `1. **Dummy Variable Mapping:** Represent $x(\tau)$ and $h(\tau)$.\n` +
      `2. **Time-Reversal (Folding):** Reflect $h(\tau) \to h(-\tau)$.\n` +
      `3. **Time-Shift (Sliding):** Advance or delay $h(t - \tau)$.\n` +
      `4. **Product Integration:** Compute overlapping area $\int x(\tau)h(t - \tau)d\tau$.`;

    steps = [
      { title: "Continuous Convolution Integral", latex: "y(t) = \int_{-\infty}^{\infty} x(\tau) h(t - \tau)\,d\tau", notes: "Satisfies commutative property: x * h = h * x." },
      { title: "Discrete Convolution Sum", latex: "y[n] = \sum_{k=-\infty}^{\infty} x[k] h[n - k]", notes: "Discrete overlap-add evaluation for FIR/IIR systems." },
      { title: "Frequency Domain Multiplication", latex: "\mathcal{F}\{(x * h)(t)\} = X(\omega) \cdot H(\omega)", notes: "Convolution in time equals point-wise multiplication in frequency." }
    ];
    actions = [
      { label: "Launch 4-Track Convolution Lab", domain: "signals", sub: "convolution" },
      { label: "LTI System Analyzer", domain: "signals", sub: "lti" }
    ];
    suggested = [
      "Why is convolution commutative x * h = h * x?",
      "Convolve two identical rectangular pulses rect(t) * rect(t)",
      "How to determine the duration of convolved signals"
    ];
  } else if (isEuler) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `**Euler's Formula** bridges complex analysis, trigonometric oscillation, and exponential growth:\n\n` +
      `$$e^{i\theta} = \cos\theta + i\sin\theta$$\n\n` +
      `Evaluating at $\theta = \pi$ gives **Euler's Identity**, famously uniting the 5 fundamental mathematical constants $0, 1, e, i, \pi$ in a single equation:\n\n` +
      `$$e^{i\pi} + 1 = 0$$\n\n` +
      `In signal processing, Euler's formula permits complex exponential representation $e^{j\omega t}$, transforming calculus differential equations into algebraic polynomials!`;

    steps = [
      { title: "Euler's Formula Expansion", latex: "e^{i\theta} = \sum_{n=0}^\infty \frac{(i\theta)^n}{n!} = \cos\theta + i\sin\theta", notes: "Proved by matching Taylor series of exp, sin, and cos." },
      { title: "De Moivre's Theorem", latex: "(\cos\theta + i\sin\theta)^n = \cos(n\theta) + i\sin(n\theta)", notes: "Powers correspond to angle multiplication in the complex plane." },
      { title: "Phasor Representation", latex: "\cos(\omega t) = \frac{e^{j\omega t} + e^{-j\omega t}}{2}", notes: "Signals decomposed into counter-rotating complex vectors." }
    ];
    actions = [
      { label: "Fourier Analysis Lab", domain: "signals", sub: "fourier" },
      { label: "Signal Explorer", domain: "signals", sub: "explorer" }
    ];
    suggested = [
      "Prove Euler's formula using Taylor series",
      "What is the physical meaning of negative frequency -omega?",
      "How do phasors simplify AC circuit differential equations?"
    ];
  } else if (isODE) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `For **Ordinary Differential Equations (ODEs)**, consider the fundamental second-order homogeneous oscillator:\n\n` +
      `$$\frac{d^2 y}{dt^2} + 2\zeta\omega_n \frac{dy}{dt} + \omega_n^2 y = 0$$\n\n` +
      `Using the ansatz $y(t) = e^{rt}$, we obtain the characteristic quadratic equation:\n\n` +
      `$$r^2 + 2\zeta\omega_n r + \omega_n^2 = 0$$\n\n` +
      `- If $\zeta > 1$: Overdamped (two real negative roots, exponential decay).\n` +
      `- If $\zeta = 1$: Critically damped (fastest return to equilibrium without overshoot).\n` +
      `- If $0 \le \zeta < 1$: Underdamped ($y(t) = A e^{-\alpha t} \cos(\omega_d t - \phi)$, decaying sinusoidal ringing).`;

    steps = [
      { title: "Characteristic Polynomial", latex: "r^2 + 2\zeta\omega_n r + \omega_n^2 = 0", notes: "Algebraic root substitution for exponential modes." },
      { title: "General Homogeneous Solution", latex: "y_h(t) = c_1 e^{r_1 t} + c_2 e^{r_2 t}", notes: "Linear combination of linearly independent solutions." },
      { title: "Particular Integral", latex: "y(t) = y_h(t) + y_p(t)", notes: "Total response equals zero-input plus zero-state response." }
    ];
    actions = [
      { label: "Open LTI System Analyzer", domain: "signals", sub: "lti" },
      { label: "Symbolic Calculus Engine", domain: "calculus", page: "calculus" }
    ];
    suggested = [
      "Solve y' + 3y = e^(-2t) with integrating factor",
      "Explain the physical difference between damping ratios",
      "Find the Laplace transform of d^2y/dt^2"
    ];
  } else if (isLaplace) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `The **Bilateral Laplace Transform** $\mathcal{L}\{x(t)\}$ maps continuous-time signals from the time domain $t$ into the complex frequency $s$-plane ($s = \sigma + j\omega$):\n\n` +
      `$$X(s) = \int_{-\infty}^{\infty} x(t) e^{-st}\,dt$$\n\n` +
      `Key structural properties:\n` +
      `- **Transfer Function:** $H(s) = \frac{Y(s)}{X(s)} = \frac{B(s)}{A(s)}$ characterizes the system completely.\n` +
      `- **Poles & Zeros:** Roots of $A(s)$ (poles) dictate natural frequency modes and stability.\n` +
      `- **BIBO Stability:** An LTI system is bounded-input bounded-output stable if and only if all poles reside strictly in the open left half of the $s$-plane ($\text{Re}(p_k) < 0$).`;

    steps = [
      { title: "Laplace Transform Definition", latex: "X(s) = \int_0^\infty x(t) e^{-st}\,dt", notes: "Unilateral form assuming causal signals x(t) = 0 for t < 0." },
      { title: "Differentiation Property", latex: "\mathcal{L}\left\{ \frac{dx}{dt} \right\} = s X(s) - x(0^-)", notes: "Converts differential equations into simple algebra." },
      { title: "Region of Convergence (ROC)", latex: "\text{ROC}: \text{Re}(s) > \sigma_{\max}", notes: "Specifies the strip of convergence in the complex plane." }
    ];
    actions = [
      { label: "LTI System Analyzer", domain: "signals", sub: "lti" },
      { label: "Signal Explorer", domain: "signals", sub: "explorer" }
    ];
    suggested = [
      "Find the Laplace transform of e^(-at)u(t)",
      "Why must poles lie in the left-half s-plane for stability?",
      "How does Laplace transform relate to Fourier transform (s = jw)?"
    ];
  } else {
    // Universal general mathematical solver
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `Thank you for this insightful question regarding **"${msg}"**!\n\n` +
      `In pure and applied mathematics, solving such problems requires connecting three foundational pillars:\n` +
      `1. **Continuous Differential Geometry:** Understanding how local rates of change $\frac{df}{dx}$ shape global trajectory topology.\n` +
      `2. **Integral Accumulation:** Applying the Fundamental Theorem of Calculus $\int_a^b f'(x)dx = f(b) - f(a)$ to measure accumulated energy, flux, or mass.\n` +
      `3. **Harmonic Synthesis & Frequency Projections:** Decomposing complex phenomena into orthogonal eigenmodes $e^{i\omega t}$.\n\n` +
      `You can immediately explore and test closed-form formulas, plot curves, and examine interactive simulations across our laboratories below!`;

    steps = [
      { title: "Analytical Modeling", latex: "y = f(x) \\quad \\text{or} \\quad x(t) \\in L^2(\\mathbb{R})", notes: "Formalize mathematical hypotheses in appropriate function space." },
      { title: "Infinitesimal Calculus Evaluation", latex: "f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}", notes: "Examine continuity, differentiability, and critical stationary points." },
      { title: "Integral & Spectral Synthesis", latex: "F(\\omega) = \\int_{-\\infty}^\\infty f(t) e^{-j\\omega t}\\,dt", notes: "Analyze harmonic components and frequency conservation." }
    ];
    actions = [
      { label: "Symbolic Calculus Engine", domain: "calculus", page: "calculus" },
      { label: "3D MVT Explorer", domain: "calculus", page: "mvt" },
      { label: "Signal Explorer", domain: "signals", sub: "explorer" }
    ];
    suggested = [
      "Explain the fundamental theorem of calculus step-by-step",
      "How to find critical points of x^3 - 3x",
      "Why does Fourier transform decompose signals into sines and cosines?"
    ];
  }

  return {
    success: true,
    reply,
    persona_name: personaHeader,
    steps,
    actions,
    suggested_prompts: suggested
  };
}
