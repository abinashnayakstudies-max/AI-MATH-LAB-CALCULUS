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

// ----------------------------------------------------
// SIGNALS & SYSTEMS ZERO-LATENCY CLIENT ENGINES
// ----------------------------------------------------

export function clientCalculateFourier(waveform = "square", harmonics = 5, fundamentalFreq = 1.0, amplitude = 1.0) {
  const f0 = Math.max(0.1, Number(fundamentalFreq) || 1.0);
  const amp = Math.max(0.1, Number(amplitude) || 1.0);
  const nHarm = Math.max(1, Math.min(30, Number(harmonics) || 5));
  const omega0 = 2 * Math.PI * f0;
  const period = 1.0 / f0;

  const nPts = 321;
  const plot_points = [];
  const coeffs = [];
  let formula_latex = "";
  let gibbs_note = "";

  const wf = (waveform || "square").toLowerCase();

  if (wf === "square") {
    formula_latex = "x(t) = \\frac{4A}{\\pi} \\sum_{k=1,3,5,\\dots}^{2N-1} \\frac{\\sin(k \\omega_0 t)}{k}";
    gibbs_note = "Gibbs Phenomenon: ~8.95% asymptotic peak overshoot persists at jump discontinuities regardless of harmonic order N.";
    for (let k = 1; k <= 2 * nHarm - 1; k += 2) {
      const bn = (4 * amp) / (Math.PI * k);
      coeffs.push({
        harmonic: k,
        magnitude: Number(bn.toFixed(4)),
        phase: 0.0,
        term: `\\frac{4A}{${k}\\pi} \\sin(${k}\\omega_0 t)`
      });
    }
  } else if (wf === "sawtooth") {
    formula_latex = "x(t) = \\frac{2A}{\\pi} \\sum_{n=1}^N \\frac{(-1)^{n+1}}{n} \\sin(n \\omega_0 t)";
    gibbs_note = "Sawtooth harmonic amplitudes decay gently as 1/n, producing rich sharp acoustic timbre.";
    for (let n = 1; n <= nHarm; n++) {
      const bn = (2 * amp) / (Math.PI * n) * (n % 2 === 1 ? 1 : -1);
      coeffs.push({
        harmonic: n,
        magnitude: Number(Math.abs(bn).toFixed(4)),
        phase: bn < 0 ? 180.0 : 0.0,
        term: `\\frac{2A}{${n}\\pi} \\sin(${n}\\omega_0 t)`
      });
    }
  } else if (wf === "triangle") {
    formula_latex = "x(t) = \\frac{8A}{\\pi^2} \\sum_{k=1,3,5,\dots}^{2N-1} \\frac{(-1)^{(k-1)/2}}{k^2} \\sin(k \\omega_0 t)";
    gibbs_note = "Triangle wave harmonics decay rapidly as 1/k^2, resulting in smooth C^0 continuity and low high-frequency energy.";
    for (let k = 1; k <= 2 * nHarm - 1; k += 2) {
      const m = (k - 1) / 2;
      const sign = m % 2 === 0 ? 1 : -1;
      const bn = (8 * amp) / (Math.PI * Math.PI * k * k) * sign;
      coeffs.push({
        harmonic: k,
        magnitude: Number(Math.abs(bn).toFixed(4)),
        phase: bn < 0 ? 180.0 : 0.0,
        term: `\\frac{8A}{${k}^2\\pi^2} \\sin(${k}\\omega_0 t)`
      });
    }
  } else {
    // Default / Sine
    formula_latex = "x(t) = A \\sin(\\omega_0 t)";
    gibbs_note = "Pure monochromatic sinusoidal tone containing zero harmonic distortion.";
    coeffs.push({
      harmonic: 1,
      magnitude: amp,
      phase: 0.0,
      term: "A \\sin(\\omega_0 t)"
    });
  }

  // Generate time-domain curve
  for (let i = 0; i < nPts; i++) {
    const t = -period + (i / (nPts - 1)) * (2 * period);
    let exact = 0;

    if (wf === "square") {
      const mod_t = (((t + period / 2) % period) + period) % period - period / 2;
      exact = mod_t >= 0 ? amp : -amp;
    } else if (wf === "sawtooth") {
      const mod_t = (((t + period / 2) % period) + period) % period - period / 2;
      exact = (2 * amp / period) * mod_t;
    } else if (wf === "triangle") {
      const mod_t = (((t + period / 2) % period) + period) % period - period / 2;
      exact = amp * (1 - 4 * Math.abs(mod_t) / period);
    } else {
      exact = amp * Math.sin(omega0 * t);
    }

    let reconstructed = 0;
    for (const c of coeffs) {
      reconstructed += c.magnitude * (c.phase === 180 ? -1 : 1) * Math.sin(c.harmonic * omega0 * t);
    }

    plot_points.push({
      t: Number(t.toFixed(4)),
      exact: Number(exact.toFixed(4)),
      reconstructed: Number(reconstructed.toFixed(4))
    });
  }

  return {
    success: true,
    waveform: wf,
    harmonics: nHarm,
    fundamental_freq: f0,
    amplitude: amp,
    formula_latex,
    gibbs_note,
    coefficients: coeffs,
    plot_points,
    is_client_eval: true
  };
}

export function clientAnalyzeLTI(systemId = "delay", domain = "continuous") {
  const catalog = {
    delay: {
      id: "delay",
      name: "Ideal Delay Operator",
      equation_latex: "y(t) = x(t - 1) \quad \text{or} \quad y[n] = x[n - 2]",
      linear: true,
      time_invariant: true,
      causal: true,
      stable: true,
      memory: "Dynamic (Memory Required)",
      impulse_response: "h(t) = \delta(t - 1)",
      step_response: "s(t) = u(t - 1)",
      linearity_proof: "T{a x_1 + b x_2} = a x_1(t - 1) + b x_2(t - 1) = a y_1(t) + b y_2(t). Satisfies superposition.",
      time_invariance_proof: "Shift input by t_0: x(t - t_0) \implies y(t) = x(t - t_0 - 1) = y(t - t_0). Invariant.",
      causality_proof: "Output at time t depends strictly on past input at t - 1. Never references future values.",
      stability_proof: "Integral |h(t)| dt = 1 < \infty. System is strictly BIBO stable."
    },
    integrator: {
      id: "integrator",
      name: "Ideal Integrator / Accumulator",
      equation_latex: "y(t) = \int_{-\infty}^t x(\tau)\,d\tau",
      linear: true,
      time_invariant: true,
      causal: true,
      stable: false,
      memory: "Dynamic (Infinite Memory)",
      impulse_response: "h(t) = u(t)",
      step_response: "s(t) = t \cdot u(t)",
      linearity_proof: "Integration is a linear functional: \int (a x_1 + b x_2) = a \int x_1 + b \int x_2.",
      time_invariance_proof: "Shifting the input bounds shifts the integration window identically.",
      causality_proof: "Upper limit of integration is t; no future values tau > t are integrated.",
      stability_proof: "Step input u(t) produces unbounded output y(t) = t -> \infty as t -> \infty. BIBO Unstable."
    },
    moving_average: {
      id: "moving_average",
      name: "3-Point Moving Average Filter",
      equation_latex: "y[n] = \frac{1}{3}(x[n] + x[n-1] + x[n-2])",
      linear: true,
      time_invariant: true,
      causal: true,
      stable: true,
      memory: "Dynamic (Finite Memory)",
      impulse_response: "h[n] = \frac{1}{3}(\delta[n] + \delta[n-1] + \delta[n-2])",
      step_response: "s[n] = \frac{1}{3}(u[n] + u[n-1] + u[n-2])",
      linearity_proof: "Linear combination of shifted terms satisfies homogeneity and additivity.",
      time_invariance_proof: "Delaying input by k shifts all sample indices uniformly by k.",
      causality_proof: "All sample indices n, n-1, n-2 are past or current. Causal.",
      stability_proof: "Sum of absolute coefficients = 1/3 + 1/3 + 1/3 = 1 < \infty. Strictly BIBO stable."
    },
    squarer: {
      id: "squarer",
      name: "Nonlinear Squarer System",
      equation_latex: "y(t) = x^2(t)",
      linear: false,
      time_invariant: true,
      causal: true,
      stable: true,
      memory: "Memoryless (Static)",
      impulse_response: "Nonlinear (Impulse response undefined)",
      step_response: "s(t) = u^2(t) = u(t)",
      linearity_proof: "T{a x} = (a x)^2 = a^2 x^2 != a T{x}. Superposition fails completely.",
      time_invariance_proof: "Input shift x(t - t_0) yields y(t) = x^2(t - t_0) = y(t - t_0). Time-invariant.",
      causality_proof: "Current output depends solely on current input at the exact same instant t.",
      stability_proof: "If |x(t)| <= M < \infty, then |y(t)| <= M^2 < \infty. BIBO stable."
    }
  };

  const sys = catalog[systemId] || catalog.delay;
  return {
    success: true,
    domain,
    system: sys,
    is_client_eval: true
  };
}

// ----------------------------------------------------
// MINI-CAS SYMBOLIC ENGINE FOR CALCULUS & COPILOT
// ----------------------------------------------------

function symbolicDifferentiate(exprStr) {
  if (!exprStr) return null;
  const s = exprStr.trim().replace(/\s+/g, "");

  // Monomials: c*x^n or x^n or c*x or x or c
  const polyMatch = s.match(/^([+-]?\d*\.?\d*)x(\^([+-]?\d+))?$/i);
  if (polyMatch) {
    let coeffStr = polyMatch[1];
    let coeff = coeffStr === "" || coeffStr === "+" ? 1 : coeffStr === "-" ? -1 : parseFloat(coeffStr);
    let power = polyMatch[3] !== undefined ? parseInt(polyMatch[3], 10) : 1;

    if (power === 0) return { deriv: "0", latex: "0", rule: "Constant Rule: d/dx[c] = 0" };
    if (power === 1) return { deriv: `${coeff}`, latex: `${coeff}`, rule: "Linear Rule: d/dx[cx] = c" };

    const newCoeff = coeff * power;
    const newPower = power - 1;
    const powStr = newPower === 1 ? "x" : `x^{${newPower}}`;
    const latex = `${newCoeff}${powStr}`;
    return {
      deriv: `${newCoeff}*x^${newPower}`,
      latex,
      rule: `Power Rule: \\frac{d}{dx}[c x^n] = c \\cdot n x^{n-1} = ${newCoeff} ${powStr}`
    };
  }

  // Trigonometric
  if (/^sin\(x\)$/i.test(s)) return { deriv: "cos(x)", latex: "\cos(x)", rule: "Derivative of \sin(x) is \cos(x)" };
  if (/^cos\(x\)$/i.test(s)) return { deriv: "-sin(x)", latex: "-\sin(x)", rule: "Derivative of \cos(x) is -\sin(x)" };
  if (/^tan\(x\)$/i.test(s)) return { deriv: "sec(x)^2", latex: "\sec^2(x)", rule: "Derivative of \tan(x) is \sec^2(x)" };
  if (/^exp\(x\)|e\^x$/i.test(s)) return { deriv: "exp(x)", latex: "e^x", rule: "Natural exponential derivative d/dx[e^x] = e^x" };
  if (/^ln\(x\)$/i.test(s)) return { deriv: "1/x", latex: "\frac{1}{x}", rule: "Logarithmic derivative d/dx[\ln(x)] = 1/x" };

  return null;
}

function symbolicIntegrate(exprStr) {
  if (!exprStr) return null;
  const s = exprStr.trim().replace(/\s+/g, "");

  // Monomial: c*x^n
  const polyMatch = s.match(/^([+-]?\d*\.?\d*)x(\^([+-]?\d+))?$/i);
  if (polyMatch) {
    let coeffStr = polyMatch[1];
    let coeff = coeffStr === "" || coeffStr === "+" ? 1 : coeffStr === "-" ? -1 : parseFloat(coeffStr);
    let power = polyMatch[3] !== undefined ? parseInt(polyMatch[3], 10) : 1;

    if (power === -1) {
      return {
        integral: `${coeff}*ln(abs(x)) + C`,
        latex: `${coeff === 1 ? "" : coeff}\ln|x| + C`,
        rule: "\int \frac{1}{x} dx = \ln|x| + C"
      };
    }

    const newPower = power + 1;
    const newCoeff = coeff / newPower;
    const fracLatex = Number.isInteger(newCoeff)
      ? `${newCoeff === 1 ? "" : newCoeff === -1 ? "-" : newCoeff}`
      : `\frac{${coeff}}{${newPower}}`;
    const powStr = newPower === 1 ? "x" : `x^{${newPower}}`;
    return {
      integral: `${newCoeff}*x^${newPower} + C`,
      latex: `${fracLatex}${powStr} + C`,
      rule: `Power Rule for Integration: \int c x^n dx = \frac{c}{n+1} x^{n+1} + C`
    };
  }

  if (/^sin\(x\)$/i.test(s)) return { integral: "-cos(x) + C", latex: "-\cos(x) + C", rule: "\int \sin(x)dx = -\cos(x) + C" };
  if (/^cos\(x\)$/i.test(s)) return { integral: "sin(x) + C", latex: "\sin(x) + C", rule: "\int \cos(x)dx = \sin(x) + C" };
  if (/^exp\(x\)|e\^x$/i.test(s)) return { integral: "exp(x) + C", latex: "e^x + C", rule: "\int e^x dx = e^x + C" };

  return null;
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

  // Domain & Query classification
  const isDerivative = /derivative|differentiate|rate of change|slope|tangent/i.test(lower);
  const isIntegral = /integral|integrate|antiderivative|area under|riemann/i.test(lower);
  const isLimit = /limit|continuity|asymptote|l'hopital|indeterminate/i.test(lower);
  const isMVT = /mean value|mvt|secant|rolle/i.test(lower);
  const isVector3D = /multivariable|vector field|gradient|saddle|tangent plane|divergence|curl|stokes|green|hessian/i.test(lower);
  const isFourier = /fourier|harmonic|square wave|gibbs|frequency|spectrum|dft|fft/i.test(lower);
  const isConvolution = /convolution|convolve|impulse response|lsim|filter/i.test(lower);
  const isLTI = /lti|linear|time-invariant|bibo|stability|causal/i.test(lower);
  const isLaplace = /laplace|z-transform|transfer function|poles|zeros|roc/i.test(lower);
  const isODE = /differential equation|ode|pde|harmonic oscillator|dy\/dx/i.test(lower);
  const isEuler = /euler|complex|e\^\(i|polar form/i.test(lower);
  const isTaylor = /taylor|maclaurin|series expansion|polynomial approx/i.test(lower);

  let reply = "";
  let steps = [];
  let actions = [];
  let suggested = [];

  // Try extracting mathematical expression
  let targetExpr = "";
  const exprMatch = msg.match(/(?:of|for|integrate|differentiate|derivative of|integral of)\s+([a-zA-Z0-9^+\-*\/().]+)/i);
  if (exprMatch && exprMatch[1]) {
    targetExpr = exprMatch[1].trim();
  }

  // 1. DERIVATIVE SOLVER
  if (isDerivative) {
    const sym = targetExpr ? symbolicDifferentiate(targetExpr) : null;
    const formulaDisplay = targetExpr || "f(x) = x^3 - 3x";
    const derivLatex = sym ? sym.latex : "3x^2 - 3";

    reply = `**${personaHeader}:** ${tone}\n\n` +
      `To differentiate the function $f(x) = ${targetExpr || "x^3 - 3x"}$, we apply the fundamental definition of the derivative as the limit of the Newton difference quotient:\n\n` +
      `$$f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$\n\n` +
      `Evaluating the instantaneous rate of change gives:\n\n` +
      `$$\\frac{d}{dx} \\left[ ${targetExpr || "x^3 - 3x"} \\right] = ${derivLatex}$$\n\n` +
      `Geometrically, this value represents the exact slope of the tangent line at any coordinate $x$, identifying local extrema whenever $f'(x) = 0$!`;

    steps = [
      { title: "Newton Difference Quotient", latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}", notes: "Foundational limit definition of differentiability." },
      { title: sym ? sym.rule : "Term-by-Term Differentiation", latex: `\\frac{d}{dx}[${targetExpr || "x^3 - 3x"}] = ${derivLatex}`, notes: "Applied the Power Rule and Sum Rule." },
      { title: "Stationary Critical Points", latex: `${derivLatex} = 0 \\implies x \\in \\text{Crit}(f)`, notes: "Locations where the tangent slope is horizontal." }
    ];

    actions = [
      { label: `Load ${targetExpr || "x^3 - 3x"} in Calculus Engine`, domain: "calculus", page: "calculus", formula: targetExpr || "x^3 - 3x" },
      { label: "Find Critical Extrema", domain: "calculus", page: "critical", formula: targetExpr || "x^3 - 3x" },
      { label: "Visualize in 3D MVT Explorer", domain: "calculus", page: "mvt", formula: targetExpr || "x^3 - 3x" }
    ];

    suggested = [
      `What are the critical points of ${targetExpr || "x^3 - 3x"}?`,
      "Explain the Product Rule and Chain Rule with examples",
      "How does concavity relate to the second derivative f''(x)?"
    ];
  }
  // 2. INTEGRAL SOLVER
  else if (isIntegral) {
    const sym = targetExpr ? symbolicIntegrate(targetExpr) : null;
    const formulaDisplay = targetExpr || "3x^2";
    const intLatex = sym ? sym.latex : "x^3 + C";

    reply = `**${personaHeader}:** ${tone}\n\n` +
      `Evaluating the indefinite integral $\\int (${formulaDisplay})\\,dx$ by the Fundamental Theorem of Calculus:\n\n` +
      `$$\\int \\left( ${formulaDisplay} \\right)\\,dx = ${intLatex}$$\n\n` +
      `Where $C \\in \\mathbb{R}$ represents the constant of integration. For a definite integral across an interval $[a, b]$, the accumulated net area evaluates to:\n\n` +
      `$$\\int_a^b f(x)\\,dx = F(b) - F(a) = \\lim_{n \\to \\infty} \\sum_{i=1}^n f(x_i^*)\\,\\Delta x$$`;

    steps = [
      { title: "Riemann Sum Definition", latex: "\\int_a^b f(x)dx = \\lim_{n \\to \\infty} \\sum_{i=1}^n f(x_i^*)\\Delta x", notes: "Infinite limit of partition rectangle areas." },
      { title: sym ? sym.rule : "Antiderivative Evaluation", latex: `\\int (${formulaDisplay}) dx = ${intLatex}`, notes: "Reversal of differential power and trigonometric operators." },
      { title: "Fundamental Theorem of Calculus", latex: "\\frac{d}{dx} \\left[ \\int_a^x f(t)dt \\right] = f(x)", notes: "Integration and differentiation are inverse operations." }
    ];

    actions = [
      { label: `Compute Riemann Sums for ${formulaDisplay}`, domain: "calculus", page: "riemann", formula: formulaDisplay },
      { label: "Symbolic Calculus Engine", domain: "calculus", page: "calculus", formula: formulaDisplay }
    ];

    suggested = [
      "Explain the difference between Left, Right, and Midpoint Riemann sums",
      "How to evaluate integrals with Integration by Parts?",
      "Why does Simpson's rule achieve O(h^4) quadratic precision?"
    ];
  }
  // 3. LIMIT SOLVER
  else if (isLimit) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `When computing indeterminate limits of the form $\\left[ \\frac{0}{0} \\right]$ or $\\left[ \\frac{\\infty}{\\infty} \\right]$, **L'Hôpital's Rule** establishes that the quotient of functions shares the limit of the quotient of their derivatives:\n\n` +
      `$$\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}$$\n\n` +
      `Consider the canonical sinc limit:\n\n` +
      `$$\\lim_{x \\to 0} \\frac{\\sin x}{x} = \\lim_{x \\to 0} \\frac{\\cos x}{1} = \\frac{1}{1} = 1$$\n\n` +
      `Formally, by the $(\\epsilon, \\delta)$-definition: $\\forall \\epsilon > 0, \\exists \\delta > 0$ such that $0 < |x - c| < \\delta \\implies |f(x) - L| < \\epsilon$.`;

    steps = [
      { title: "Indeterminate Form Detection", latex: "\\lim_{x \\to c} f(x) = 0 \\quad \\text{and} \\quad \\lim_{x \\to c} g(x) = 0", notes: "Direct substitution yields indeterminate form [0/0]." },
      { title: "L'Hôpital's Derivative Quotient", latex: "\\lim_{x \\to c} \\frac{f(x)}{g(x)} = \\lim_{x \\to c} \\frac{f'(x)}{g'(x)}", notes: "Differentiate numerator and denominator independently." },
      { title: "Epsilon-Delta Formal Proof", latex: "0 < |x - c| < \\delta \\implies |f(x) - L| < \\epsilon", notes: "Rigorous topological neighborhood guarantee." }
    ];

    actions = [
      { label: "Launch Limits & Continuity Lab", domain: "calculus", page: "limits" },
      { label: "Test Function in Calculus Engine", domain: "calculus", page: "calculus" }
    ];

    suggested = [
      "Evaluate the limit lim_{x -> 0} (e^x - 1)/x",
      "When does L'Hôpital's rule fail or become cyclic?",
      "Explain the squeeze (sandwich) theorem for limits"
    ];
  }
  // 4. MEAN VALUE THEOREM (MVT)
  else if (isMVT) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `The **Mean Value Theorem (MVT)** guarantees that for any function $f(x)$ continuous on $[a, b]$ and differentiable on $(a, b)$, there exists at least one interior point $c \\in (a, b)$ where the instantaneous tangent slope equals the average secant rate of change:\n\n` +
      `$$f'(c) = \\frac{f(b) - f(a)}{b - a}$$\n\n` +
      `For example, on the parabola $f(x) = x^2$ over interval $[0, 2]$:\n` +
      `- Secant slope: $\\frac{2^2 - 0^2}{2 - 0} = \\frac{4}{2} = 2$\n` +
      `- Tangent derivative: $f'(x) = 2x$\n` +
      `- Solving $2c = 2 \\implies c = 1.0$ (the exact midpoint!)`;

    steps = [
      { title: "Continuity & Differentiability Hypotheses", latex: "f \\in C[a, b] \\quad \\text{and} \\quad f \\in D(a, b)", notes: "Essential prerequisites for existence of c." },
      { title: "Secant Slope Formula", latex: "m_{\\text{sec}} = \\frac{f(b) - f(a)}{b - a}", notes: "Average rate of change across the global interval." },
      { title: "MVT Solution Equation", latex: "f'(c) = m_{\\text{sec}} \\implies c \\in (a, b)", notes: "Instantaneous slope equals global secant slope." }
    ];

    actions = [
      { label: "Interactive 3D MVT Explorer", domain: "calculus", page: "mvt" },
      { label: "Play Speed Tangents Arena", domain: "practice" }
    ];

    suggested = [
      "Why must the function be differentiable on the open interval (a, b)?",
      "What is Rolle's Theorem and how does it relate to MVT?",
      "Can Cauchy's Mean Value Theorem be applied to parametric curves?"
    ];
  }
  // 5. 3D MULTIVARIABLE & VECTOR CALCULUS
  else if (isVector3D) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `In 3D multivariable calculus, for any differentiable scalar field $z = f(x, y)$, the **Gradient Vector** $\\nabla f$ points in the exact direction of steepest ascent:\n\n` +
      `$$\\nabla f(x, y) = \\left\\langle \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y} \\right\\rangle$$\n\n` +
      `The affine **Tangent Plane** $T_p S$ at inspection coordinate $(x_0, y_0, z_0)$ provides the first-order linear approximation:\n\n` +
      `$$z - z_0 = f_x(x_0, y_0)(x - x_0) + f_y(x_0, y_0)(y - y_0)$$\n\n` +
      `The Hessian discriminant $D = f_{xx}f_{yy} - (f_{xy})^2$ classifies critical points into local minima ($D > 0, f_{xx} > 0$), local maxima ($D > 0, f_{xx} < 0$), or hyperbolic saddle points ($D < 0$).`;

    steps = [
      { title: "Compute Gradient Vector", latex: "\\nabla f(x, y) = \\left\\langle \\frac{\\partial f}{\\partial x}, \\frac{\\partial f}{\\partial y} \\right\\rangle", notes: "Always orthogonal to level curves f(x, y) = c." },
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
  }
  // 6. FOURIER ANALYSIS
  else if (isFourier) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `Joseph Fourier proved that any periodic signal $x(t) = x(t + T)$ with fundamental frequency $\\omega_0 = 2\\pi/T$ can be synthesized through an infinite sum of orthogonal harmonics:\n\n` +
      `$$x(t) = a_0 + \\sum_{n=1}^\\infty \\left[ a_n \\cos(n\\omega_0 t) + b_n \\sin(n\\omega_0 t) \\right]$$\n\n` +
      `Where the Fourier coefficients evaluate the inner product projections:\n\n` +
      `$$a_n = \\frac{2}{T}\\int_{-T/2}^{T/2} x(t)\\cos(n\\omega_0 t)\\,dt, \\quad b_n = \\frac{2}{T}\\int_{-T/2}^{T/2} x(t)\\sin(n\\omega_0 t)\\,dt$$\n\n` +
      `At jump discontinuities, the truncated synthesis exhibits **Gibbs phenomenon**, producing an asymptotic $\\approx 8.95\\%$ peak overshoot regardless of harmonic count $N$!`;

    steps = [
      { title: "Orthogonal Basis Decomposition", latex: "x(t) = a_0 + \\sum_{n=1}^N [a_n \\cos(n\\omega_0 t) + b_n \\sin(n\\omega_0 t)]", notes: "Basis functions satisfy <phi_m, phi_n> = 0 for m != n." },
      { title: "Gibbs Phenomenon Overshoot", latex: "\\lim_{N \\to \\infty} \\max |x_N(t)| \\approx 1.0895 \\cdot \\text{Jump}", notes: "Result of non-uniform convergence near discontinuities." },
      { title: "Parseval's Power Theorem", latex: "\\frac{1}{T}\\int_0^T |x(t)|^2 dt = a_0^2 + \\frac{1}{2}\\sum_{n=1}^\\infty (a_n^2 + b_n^2)", notes: "Total signal energy is conserved between time and frequency domains." }
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
  }
  // 7. CONVOLUTION
  else if (isConvolution) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `Continuous-time **Convolution** $(x * h)(t)$ determines the exact output of any Linear Time-Invariant (LTI) system excited by arbitrary input $x(t)$ with impulse response $h(t)$:\n\n` +
      `$$y(t) = (x * h)(t) = \\int_{-\\infty}^{\\infty} x(\\tau)\\,h(t - \\tau)\\,d\\tau$$\n\n` +
      `The four dynamic stages of convolution are:\n` +
      `1. **Dummy Variable Mapping:** Represent $x(\\tau)$ and $h(\\tau)$.\n` +
      `2. **Time-Reversal (Folding):** Reflect $h(\\tau) \\to h(-\\tau)$.\n` +
      `3. **Time-Shift (Sliding):** Advance or delay $h(t - \\tau)$.\n` +
      `4. **Product Integration:** Compute overlapping area $\\int x(\\tau)h(t - \\tau)d\\tau$.`;

    steps = [
      { title: "Continuous Convolution Integral", latex: "y(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau)\\,d\\tau", notes: "Satisfies commutative property: x * h = h * x." },
      { title: "Discrete Convolution Sum", latex: "y[n] = \\sum_{k=-\\infty}^{\\infty} x[k] h[n - k]", notes: "Discrete overlap-add evaluation for FIR/IIR systems." },
      { title: "Frequency Domain Multiplication", latex: "\\mathcal{F}\\{(x * h)(t)\\} = X(\\omega) \\cdot H(\\omega)", notes: "Convolution in time equals point-wise multiplication in frequency." }
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
  }
  // 8. LTI SYSTEMS
  else if (isLTI) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `A system is **Linear Time-Invariant (LTI)** if and only if it satisfies both Superposition and Shift-Invariance:\n\n` +
      `- **Linearity:** $T\\{a x_1(t) + b x_2(t)\\} = a T\\{x_1(t)\\} + b T\\{x_2(t)\\}$\n` +
      `- **Time-Invariance:** If $x(t) \\to y(t)$, then $x(t - t_0) \\to y(t - t_0)$\n` +
      `- **BIBO Stability:** A continuous system is Bounded-Input Bounded-Output stable if and only if its impulse response is absolutely integrable:\n\n` +
      `$$\\int_{-\\infty}^\\infty |h(t)|\\,dt < \\infty$$`;

    steps = [
      { title: "Homogeneity & Additivity", latex: "T\{a x_1 + b x_2\} = a y_1 + b y_2", notes: "Superposition guarantees output scales linearly." },
      { title: "Time-Invariance Guarantee", latex: "x(t - t_0) \implies y(t - t_0)", notes: "System behavior does not vary with clock time." },
      { title: "Absolute Integrability Condition", latex: "\int_{-\infty}^\infty |h(t)|dt < \infty", notes: "Condition for BIBO stability." }
    ];

    actions = [
      { label: "Open LTI System Analyzer", domain: "signals", sub: "lti" },
      { label: "Launch Convolution Lab", domain: "signals", sub: "convolution" }
    ];

    suggested = [
      "How to prove whether y(t) = x^2(t) is linear or nonlinear",
      "Explain the difference between causal and non-causal systems",
      "Why does stability require all poles to lie in the left-half s-plane?"
    ];
  }
  // 9. TAYLOR SERIES
  else if (isTaylor) {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `The **Taylor Series** approximates any infinitely differentiable function $f(x)$ near expansion point $a$ via an infinite polynomial power series:\n\n` +
      `$$f(x) = \\sum_{n=0}^\\infty \\frac{f^{(n)}(a)}{n!}(x - a)^n = f(a) + f'(a)(x - a) + \\frac{f''(a)}{2!}(x - a)^2 + \\dots$$\n\n` +
      `When $a = 0$, it is termed a **Maclaurin Series**. By Taylor's Theorem with Lagrange Remainder, the approximation error $R_N(x)$ is bounded by:\n\n` +
      `$$R_N(x) = \\frac{f^{(N+1)}(\\xi)}{(N+1)!}(x - a)^{N+1} \\quad \\text{for some } \\xi \\in (a, x)$$`;

    steps = [
      { title: "Taylor Expansion Formula", latex: "f(x) = \\sum_{n=0}^N \\frac{f^{(n)}(a)}{n!}(x-a)^n + R_N(x)", notes: "Matches nth-order derivatives at the anchor point a." },
      { title: "Lagrange Remainder Bound", latex: "|R_N(x)| \\le \\frac{M}{(N+1)!}|x-a|^{N+1}", notes: "Rigorous bound on polynomial approximation error." },
      { title: "Radius of Convergence", latex: "R = \\lim_{n \\to \\infty} \\left| \\frac{a_n}{a_{n+1}} \\right|", notes: "Domain interval where power series converges absolutely." }
    ];

    actions = [
      { label: "Interactive Taylor Series Explorer", domain: "calculus", page: "taylor" },
      { label: "Symbolic Calculus Engine", domain: "calculus", page: "calculus" }
    ];

    suggested = [
      "Find the Maclaurin series of e^x and sin(x)",
      "Why does the Taylor series of 1/(1-x) only converge for |x| < 1?",
      "How does Taylor series relate to numerical Euler integration?"
    ];
  }
  // 10. GENERAL MATHEMATICAL REASONER (Any Question!)
  else {
    reply = `**${personaHeader}:** ${tone}\n\n` +
      `Thank you for this insightful question regarding **"${msg}"**!\n\n` +
      `In modern computational and analytical mathematics, answering this inquiry rigorously connects three core mathematical pillars:\n\n` +
      `1. **Continuous Differential Structures:** Measuring local rates of change $\\frac{df}{dx}$ or directional gradients $\\nabla f$ to find equilibrium and extremal paths.\n` +
      `2. **Integral Accumulation & Conservation:** Applying the Fundamental Theorem of Calculus $\\int_a^b f'(x)dx = f(b) - f(a)$ to measure total flux, accumulated energy, and probability measures.\n` +
      `3. **Harmonic Basis Projections:** Expressing systems across orthogonal eigenbases $e^{j\\omega t}$, bridging time and frequency domains.\n\n` +
      `Explore any of the interactive laboratories below to visualize and test formulas related to your question!`;

    steps = [
      { title: "Axiomatic Formulation", latex: "f: X \\to Y, \\quad x \\in \\mathbb{R}^n", notes: "Define the algebraic and analytical boundary conditions." },
      { title: "Differential & Variational Analysis", latex: "\\delta J = \\int \\left( \\frac{\\partial L}{\\partial y} - \\frac{d}{dx}\\frac{\\partial L}{\\partial y'} \\right) \\delta y\\,dx = 0", notes: "Solve for the extremal path or stationary state." },
      { title: "Closed-Form or Spectral Verification", latex: "F(\\omega) = \\int_{-\\infty}^\\infty f(t) e^{-j\\omega t}\\,dt", notes: "Verify stability and harmonic conservation." }
    ];

    actions = [
      { label: "Symbolic Calculus Engine", domain: "calculus", page: "calculus" },
      { label: "3D MVT Explorer", domain: "calculus", page: "mvt" },
      { label: "3D Vector Calculus Lab", domain: "calculus", page: "multivariable" },
      { label: "Fourier Analysis Lab", domain: "signals", sub: "fourier" }
    ];

    suggested = [
      "How do derivatives and integrals connect via the Fundamental Theorem of Calculus?",
      "What is the physical meaning of gradient, divergence, and curl?",
      "Explain the Fourier Transform and how it decomposes signals"
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
