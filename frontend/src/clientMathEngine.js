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
