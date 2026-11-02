import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Compass, Sparkles, Layers, Sliders, Play, RotateCcw, Crosshair, ArrowUpRight } from "lucide-react";
import { toast } from "./sonner.jsx";

/**
 * MultivariableVisualizer Component
 * Advanced 3D Multivariable Calculus laboratory supporting:
 * - Arbitrary custom user mathematical expressions f(x, y)
 * - 10 curated preset scalar surfaces
 * - Tangent plane TpS, steepest gradient vector arrows (∇f)
 * - Level curve contours f(x, y) = c
 * - Base 2D/3D gradient vector field
 * - Hessian determinant D discriminant analysis
 */

function compileSurfaceFn(exprStr) {
  if (!exprStr) return (x, y) => x * x - y * y;
  try {
    let clean = exprStr
      .replace(/\^/g, "**")
      .replace(/sinc\(/g, "Math._sinc(")
      .replace(/sin\(/g, "Math.sin(")
      .replace(/cos\(/g, "Math.cos(")
      .replace(/tan\(/g, "Math.tan(")
      .replace(/exp\(/g, "Math.exp(")
      .replace(/sqrt\(/g, "Math.sqrt(")
      .replace(/abs\(/g, "Math.abs(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/log\(/g, "Math.log(")
      .replace(/\bpi\b/gi, "Math.PI")
      .replace(/\be\b/g, "Math.E");
    clean = clean.replace(/(\d+)\s*([a-zA-Z\(])/g, "$1 * $2");
    return new Function("x", "y", `
      try {
        const r = Math.sqrt(x * x + y * y);
        const _sinc = v => Math.abs(v) < 1e-9 ? 1 : Math.sin(Math.PI * v) / (Math.PI * v);
        Math._sinc = _sinc;
        const val = ${clean};
        return Number.isFinite(val) ? Math.max(Math.min(val, 6), -6) : 0;
      } catch (e) {
        return 0;
      }
    `);
  } catch {
    return (x, y) => x * x - y * y;
  }
}

export function MultivariableVisualizer({ MathFormula: MathFormulaProp }) {
  const MathFormula = MathFormulaProp || (({ tex }) => <code className="math-fallback">{tex}</code>);
  const mountRef = useRef(null);

  const [surfaceType, setSurfaceType] = useState("saddle");
  const [customExpr, setCustomExpr] = useState("sin(x) * cos(y)");
  const [x0, setX0] = useState(0.6);
  const [y0, setY0] = useState(0.4);

  // Visual toggles
  const [showTangentPlane, setShowTangentPlane] = useState(true);
  const [showGradient, setShowGradient] = useState(true);
  const [showContours, setShowContours] = useState(true);
  const [showVectorField, setShowVectorField] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [colorTheme, setColorTheme] = useState("thermal"); // "thermal" | "obsidian" | "spectral"

  // Curated surface presets
  const PRESET_SURFACES = {
    saddle: {
      title: "Hyperbolic Saddle Point",
      formula: "x^2 - y^2",
      latex: "f(x, y) = x^2 - y^2",
      range: 2.2,
      zScale: 0.7
    },
    paraboloid: {
      title: "Elliptic Paraboloid Bowl",
      formula: "x^2 + y^2",
      latex: "f(x, y) = x^2 + y^2",
      range: 2.2,
      zScale: 0.6
    },
    ripple: {
      title: "Concentric Waveform Ripple",
      formula: "sin(2.5 * sqrt(x^2 + y^2)) * 0.8",
      latex: "f(x, y) = 0.8\\sin\\left(2.5\\sqrt{x^2 + y^2}\\right)",
      range: 2.5,
      zScale: 1.0
    },
    monkey: {
      title: "Monkey Saddle Surface",
      formula: "0.35 * (x^3 - 3 * x * y^2)",
      latex: "f(x, y) = 0.35(x^3 - 3xy^2)",
      range: 2.0,
      zScale: 0.7
    },
    egg_crate: {
      title: "Egg Crate / 2D Periodic Peaks",
      formula: "sin(2 * x) * cos(2 * y) * 0.8",
      latex: "f(x, y) = 0.8\\sin(2x)\\cos(2y)",
      range: 2.5,
      zScale: 0.9
    },
    sombrero: {
      title: "Sombrero / 2D Sinc Wave",
      formula: "sin(3 * sqrt(x^2 + y^2)) / (3 * sqrt(x^2 + y^2) + 0.2) * 1.5",
      latex: "f(x, y) = 1.5\\frac{\\sin(3r)}{3r + 0.2}",
      range: 2.5,
      zScale: 0.9
    },
    gaussian_peaks: {
      title: "Bimodal Gaussian Peaks",
      formula: "1.4 * exp(-(x^2 + y^2)) - 0.9 * exp(-((x-1)^2 + (y-1)^2))",
      latex: "f(x, y) = 1.4e^{-(x^2+y^2)} - 0.9e^{-((x-1)^2+(y-1)^2)}",
      range: 2.4,
      zScale: 1.1
    },
    rosenbrock: {
      title: "Rosenbrock Valley Landscape",
      formula: "0.2 * ((1 - x)^2 + 3 * (y - x^2)^2)",
      latex: "f(x, y) = 0.2\\left[(1-x)^2 + 3(y - x^2)^2\\right]",
      range: 2.0,
      zScale: 0.6
    },
    double_well: {
      title: "Double Well Potential",
      formula: "0.6 * ((x^2 - 1)^2 + y^2)",
      latex: "f(x, y) = 0.6\\left[(x^2 - 1)^2 + y^2\\right]",
      range: 2.2,
      zScale: 0.7
    },
    custom: {
      title: "Custom Mathematical Surface",
      formula: customExpr,
      latex: `f(x, y) = ${customExpr}`,
      range: 2.2,
      zScale: 0.8
    }
  };

  const activeSurface = PRESET_SURFACES[surfaceType] || PRESET_SURFACES.saddle;
  const rawFn = useMemo(() => {
    const expr = surfaceType === "custom" ? customExpr : activeSurface.formula;
    return compileSurfaceFn(expr);
  }, [surfaceType, customExpr, activeSurface.formula]);

  // Numerical central-difference derivatives
  const h = 1e-4;
  const fn = (x, y) => rawFn(x, y);
  const dfdx = (x, y) => (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  const dfdy = (x, y) => (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  const d2fdx2 = (x, y) => (fn(x + h, y) - 2 * fn(x, y) + fn(x - h, y)) / (h * h);
  const d2fdy2 = (x, y) => (fn(x, y + h) - 2 * fn(x, y) + fn(x, y - h)) / (h * h);
  const d2fdxdy = (x, y) =>
    (fn(x + h, y + h) - fn(x + h, y - h) - fn(x - h, y + h) + fn(x - h, y - h)) / (4 * h * h);

  // Evaluate at inspection coordinate (x0, y0)
  const z0 = fn(x0, y0);
  const fx = dfdx(x0, y0);
  const fy = dfdy(x0, y0);
  const gradMag = Math.sqrt(fx * fx + fy * fy);

  // Hessian determinant: D = f_xx * f_yy - (f_xy)^2
  const fxx = d2fdx2(x0, y0);
  const fyy = d2fdy2(x0, y0);
  const fxy = d2fdxdy(x0, y0);
  const hessianD = fxx * fyy - fxy * fxy;

  let pointClassification = "Regular Slope Point";
  if (gradMag < 0.08) {
    if (hessianD > 0 && fxx > 0) pointClassification = "Local Minimum Extrema";
    else if (hessianD > 0 && fxx < 0) pointClassification = "Local Maximum Extrema";
    else if (hessianD < 0) pointClassification = "Stationary Saddle Point";
    else pointClassification = "Inconclusive Critical Point";
  }

  // 3D Three.js Scene Setup & Render
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    let renderer;
    let reqId;

    try {
      const width = Math.max(mount.clientWidth || 0, 320);
      const height = Math.max(mount.clientHeight || 0, 480);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#0a080c");

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(4.8, 4.4, 5.8);

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 0, 0);

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.85));
      const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight1.position.set(6, 12, 8);
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0x50e3c2, 0.4);
      dirLight2.position.set(-6, -4, -6);
      scene.add(dirLight2);

      const group = new THREE.Group();
      scene.add(group);

      // 1. Generate 3D Surface Mesh
      const segments = 52;
      const range = activeSurface.range;
      const zScale = activeSurface.zScale;
      const geometry = new THREE.PlaneGeometry(range * 2, range * 2, segments, segments);
      const pos = geometry.attributes.position;
      const colors = [];

      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = fn(px, py) * zScale;
        pos.setZ(i, pz);

        const normZ = (pz + 1.8) / 3.6;
        const c = new THREE.Color();

        if (colorTheme === "spectral") {
          c.setHSL(0.7 - normZ * 0.7, 0.85, 0.55);
        } else if (colorTheme === "obsidian") {
          c.lerpColors(new THREE.Color("#1a151e"), new THREE.Color("#8A9E8C"), normZ);
        } else {
          // Rich Noir Thermal: Deep Burgundy -> Nordic Sage -> Warm Cream
          if (normZ > 0.5) {
            c.lerpColors(new THREE.Color("#8A9E8C"), new THREE.Color("#F5EFE6"), (normZ - 0.5) * 2);
          } else {
            c.lerpColors(new THREE.Color("#781D39"), new THREE.Color("#8A9E8C"), normZ * 2);
          }
        }
        colors.push(c.r, c.g, c.b);
      }

      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const surfaceMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.32,
        metalness: 0.15,
        wireframe: wireframe
      });
      const surfaceMesh = new THREE.Mesh(geometry, surfaceMat);
      surfaceMesh.rotation.x = -Math.PI / 2; // Orient z axis upwards
      group.add(surfaceMesh);

      // Coordinate Grid at z = -1.3 base plane
      const baseHeight = -1.3;
      const grid = new THREE.GridHelper(range * 2, 16, 0x8a9e8c, 0x221a24);
      grid.position.y = baseHeight;
      group.add(grid);

      // 2. Level Curve Contours (f(x, y) = c)
      if (showContours) {
        const contourLevels = [-1.0, -0.5, 0.0, 0.5, 1.0];
        contourLevels.forEach(lvl => {
          const contourPoints = [];
          const step = (range * 2) / 30;
          for (let cx = -range; cx <= range; cx += step) {
            for (let cy = -range; cy <= range; cy += step) {
              const val = fn(cx, cy);
              if (Math.abs(val - lvl) < 0.12) {
                contourPoints.push(new THREE.Vector3(cx, baseHeight + 0.02, -cy));
              }
            }
          }
          if (contourPoints.length > 0) {
            const contourGeo = new THREE.BufferGeometry().setFromPoints(contourPoints);
            const contourMat = new THREE.PointsMaterial({
              color: lvl >= 0 ? 0x50e3c2 : 0xc23b60,
              size: 0.05,
              transparent: true,
              opacity: 0.6
            });
            group.add(new THREE.Points(contourGeo, contourMat));
          }
        });
      }

      // 3. Inspection Point Marker (x0, y0, z0)
      const pointPos = new THREE.Vector3(x0, z0 * zScale, -y0);
      const pointSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc23b60, emissiveIntensity: 2.2 })
      );
      pointSphere.position.copy(pointPos);
      group.add(pointSphere);

      // Drop Line from Surface Point to Base Grid
      const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
        pointPos,
        new THREE.Vector3(x0, baseHeight, -y0)
      ]);
      const dropLineMat = new THREE.LineDashedMaterial({ color: 0x8a9e8c, dashSize: 0.08, gapSize: 0.04 });
      const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
      dropLine.computeLineDistances();
      group.add(dropLine);

      // 4. Tangent Plane Mesh: z - z0 = fx*(x - x0) + fy*(y - y0)
      if (showTangentPlane) {
        const planeSpan = 0.95;
        const planeSegments = 10;
        const tPlaneGeo = new THREE.PlaneGeometry(planeSpan * 2, planeSpan * 2, planeSegments, planeSegments);
        const tPos = tPlaneGeo.attributes.position;

        for (let i = 0; i < tPos.count; i++) {
          const u = tPos.getX(i);
          const v = tPos.getY(i);
          const curX = x0 + u;
          const curY = y0 + v;
          const curZ = (z0 + fx * u + fy * v) * zScale;
          tPos.setX(i, curX);
          tPos.setY(i, curY);
          tPos.setZ(i, curZ);
        }
        tPlaneGeo.computeVertexNormals();

        const tPlaneMat = new THREE.MeshStandardMaterial({
          color: 0xc23b60,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide
        });
        const tPlaneMesh = new THREE.Mesh(tPlaneGeo, tPlaneMat);
        tPlaneMesh.rotation.x = -Math.PI / 2;
        group.add(tPlaneMesh);
      }

      // 5. Steepest Gradient Vector Arrow (∇f = <fx, fy>)
      if (showGradient && gradMag > 0.001) {
        const gradDir = new THREE.Vector3(fx, (fx * fx + fy * fy) * 0.15, -fy).normalize();
        const arrowLength = Math.min(Math.max(gradMag * 0.45, 0.4), 1.6);
        const arrowHelper = new THREE.ArrowHelper(gradDir, pointPos, arrowLength, 0x50e3c2, 0.22, 0.12);
        group.add(arrowHelper);
      }

      // 6. Base 2D Vector Field Flow Arrows
      if (showVectorField) {
        const step = 0.75;
        for (let vx = -1.5; vx <= 1.5; vx += step) {
          for (let vy = -1.5; vy <= 1.5; vy += step) {
            const vfx = dfdx(vx, vy);
            const vfy = dfdy(vx, vy);
            const vlen = Math.sqrt(vfx * vfx + vfy * vfy) || 1e-4;
            const vDir = new THREE.Vector3(vfx / vlen, 0, -vfy / vlen);
            const vOrigin = new THREE.Vector3(vx, baseHeight + 0.02, -vy);
            const vArrow = new THREE.ArrowHelper(vDir, vOrigin, 0.32, 0x8a9e8c, 0.08, 0.05);
            group.add(vArrow);
          }
        }
      }

      const animate = () => {
        reqId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        if (!mount) return;
        const newW = Math.max(mount.clientWidth || 0, 320);
        const newH = Math.max(mount.clientHeight || 0, 480);
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        cancelAnimationFrame(reqId);
        window.removeEventListener("resize", handleResize);
        try {
          renderer.dispose();
        } catch (_) {}
      };
    } catch (err) {
      console.error("Three.js setup error in MultivariableVisualizer:", err);
    }
  }, [activeSurface, rawFn, x0, y0, z0, fx, fy, gradMag, showTangentPlane, showGradient, showContours, showVectorField, wireframe, colorTheme]);

  const handleSelectPreset = (key) => {
    setSurfaceType(key);
    toast.info("3D Surface Loaded", {
      description: `${PRESET_SURFACES[key]?.title || key}`
    });
  };

  return (
    <div className="multivariable-workspace" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <section className="title-row">
        <div>
          <span className="section-code">PILLAR 01 · MODULE 11 · 3D VECTOR CALCULUS</span>
          <h1>Multivariable Calculus &amp; 3D Vector Fields</h1>
          <p>
            Explore arbitrary 3D surfaces $z = f(x, y)$, analytical tangent planes $T_p S$, level curves, and steepest gradient vectors $\nabla f$.
          </p>
        </div>
        <div className="formula">
          <MathFormula tex="\nabla f(x, y) = \left\langle \frac{\partial f}{\partial x}, \frac{\partial f}{\partial y} \right\rangle \quad \perp \quad \text{Contour Level Curves}" />
        </div>
      </section>

      <div className="workspace" style={{ display: "grid", gridTemplateColumns: "330px 1fr 340px", gap: "20px" }}>
        {/* Left Controls Panel */}
        <aside className="controls panel">
          <div className="panel-title">
            <span>11</span>
            <div>
              <h2>Surface Selector</h2>
              <p>Choose preset or enter arbitrary $f(x, y)$.</p>
            </div>
          </div>

          <div className="calculus-field">
            <label>SURFACE GEOMETRY</label>
            <select value={surfaceType} onChange={(e) => handleSelectPreset(e.target.value)}>
              <optgroup label="Curated Classical Surfaces">
                <option value="saddle">Hyperbolic Saddle (z = x² - y²)</option>
                <option value="paraboloid">Elliptic Paraboloid (z = x² + y²)</option>
                <option value="ripple">Concentric Ripple (sin(r))</option>
                <option value="monkey">Monkey Saddle (x³ - 3xy²)</option>
                <option value="egg_crate">Egg Crate Peaks (sin(x)cos(y))</option>
                <option value="sombrero">Sombrero / 2D Sinc Wave</option>
                <option value="gaussian_peaks">Bimodal Gaussian Peaks</option>
                <option value="rosenbrock">Rosenbrock Valley</option>
                <option value="double_well">Double Well Potential</option>
              </optgroup>
              <optgroup label="Custom Expression">
                <option value="custom">✨ Custom User Formula f(x, y)</option>
              </optgroup>
            </select>
          </div>

          {surfaceType === "custom" && (
            <div className="calculus-field" style={{ marginTop: "12px" }}>
              <label>CUSTOM FORMULA f(x, y)</label>
              <input
                value={customExpr}
                onChange={(e) => setCustomExpr(e.target.value)}
                placeholder="sin(x) * cos(y)"
                style={{ fontFamily: "var(--font-mono)" }}
              />
              <small style={{ color: "var(--text-dim)", fontSize: "11px", display: "block", marginTop: "4px" }}>
                Supports +, -, *, /, ^, sin, cos, exp, sqrt, abs, r
              </small>
            </div>
          )}

          {/* Inspection Coordinates Slider */}
          <div className="bounds" style={{ marginTop: "14px" }}>
            <div>
              <label>INSPECT x₀ = {x0.toFixed(2)}</label>
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.05"
                value={x0}
                onChange={(e) => setX0(Number(e.target.value))}
                style={{ accentColor: "var(--accent-crimson)" }}
              />
            </div>
            <div>
              <label>INSPECT y₀ = {y0.toFixed(2)}</label>
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.05"
                value={y0}
                onChange={(e) => setY0(Number(e.target.value))}
                style={{ accentColor: "var(--accent-sage)" }}
              />
            </div>
          </div>

          {/* Color Mapping Theme */}
          <div className="calculus-field" style={{ marginTop: "12px" }}>
            <label>COLOR SHADING</label>
            <select value={colorTheme} onChange={(e) => setColorTheme(e.target.value)}>
              <option value="thermal">Rich Noir Thermal (Burgundy → Sage → Cream)</option>
              <option value="obsidian">Obsidian Minimalist</option>
              <option value="spectral">Spectral Height Gradient</option>
            </select>
          </div>

          {/* Visualization Layer Toggles */}
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700" }}>
              Visual Layers &amp; Overlays:
            </span>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showTangentPlane}
                onChange={(e) => setShowTangentPlane(e.target.checked)}
                style={{ accentColor: "var(--accent-crimson)" }}
              />
              <span>Tangent Plane (T_p S)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showGradient}
                onChange={(e) => setShowGradient(e.target.checked)}
                style={{ accentColor: "#50e3c2" }}
              />
              <span>Steepest Ascent Gradient Arrow (∇f)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showContours}
                onChange={(e) => setShowContours(e.target.checked)}
                style={{ accentColor: "var(--accent-sage)" }}
              />
              <span>Level Curve Contours f(x, y) = c</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={showVectorField}
                onChange={(e) => setShowVectorField(e.target.checked)}
                style={{ accentColor: "var(--accent-sage)" }}
              />
              <span>Base 2D Vector Field Flow Arrows</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={wireframe}
                onChange={(e) => setWireframe(e.target.checked)}
              />
              <span>Wireframe Grid Mesh</span>
            </label>
          </div>
        </aside>

        {/* Center 3D WebGL Viewport */}
        <section className="visual panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="plot-header">
            <div>
              <span className="badge-tag">THREE.JS 3D WEBGL ENGINE</span>
              <h2>{activeSurface.title}</h2>
            </div>
            <div className="card-meta">Drag to rotate • Scroll to zoom • Orbit controls</div>
          </div>

          <div
            ref={mountRef}
            style={{
              width: "100%",
              height: "480px",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              position: "relative"
            }}
          />

          <div className="plot-foot" style={{ marginTop: "12px", display: "flex", justifyContent: "space-between" }}>
            <span>Active Point: P({x0.toFixed(2)}, {y0.toFixed(2)}, {z0.toFixed(3)})</span>
            <span style={{ color: "#50e3c2", fontFamily: "var(--font-mono)" }}>
              ∇f = ⟨{fx.toFixed(3)}, {fy.toFixed(3)}⟩
            </span>
          </div>
        </section>

        {/* Right Multivariable Analytics Panel */}
        <aside className="results panel">
          <div className="panel-title">
            <span>02</span>
            <div>
              <h2>Multivariable Analytics</h2>
              <p>Partial differentials &amp; Hessian classification.</p>
            </div>
          </div>

          <div className="verified-box">
            <span>TANGENT PLANE EQUATION</span>
            <div style={{ marginTop: "6px" }}>
              <MathFormula
                tex={`z - (${z0.toFixed(2)}) = ${fx.toFixed(2)}(x - ${x0.toFixed(2)}) + ${fy.toFixed(2)}(y - ${y0.toFixed(2)})`}
                block={true}
              />
            </div>
            <small style={{ display: "block", marginTop: "6px" }}>
              Linearization approximation L(x, y) around ({x0.toFixed(2)}, {y0.toFixed(2)})
            </small>
          </div>

          <div className="result-row">
            <span>Partial ∂f/∂x</span>
            <b>{fx.toFixed(4)}</b>
          </div>

          <div className="result-row">
            <span>Partial ∂f/∂y</span>
            <b>{fy.toFixed(4)}</b>
          </div>

          <div className="result-row">
            <span>Gradient Magnitude |∇f|</span>
            <b style={{ color: "#50e3c2" }}>{gradMag.toFixed(4)}</b>
          </div>

          <div className="result-row">
            <span>Second Partial f_xx</span>
            <b>{fxx.toFixed(3)}</b>
          </div>

          <div className="result-row">
            <span>Hessian Determinant D</span>
            <b>{hessianD.toFixed(3)}</b>
          </div>

          <div className="result-row highlight-row" style={{ marginTop: "10px" }}>
            <span>Critical Point State</span>
            <b>{pointClassification}</b>
          </div>

          <div className="detected" style={{ marginTop: "16px" }}>
            <span>GEOMETRIC INTUITION</span>
            <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.6", marginTop: "4px" }}>
              The gradient vector \u2207f always points perpendicular to the level curve f(x, y) = c, in the direction of steepest ascent. Its magnitude equals the maximum directional derivative |\u2207f|!
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
