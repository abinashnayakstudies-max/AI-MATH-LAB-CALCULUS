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
