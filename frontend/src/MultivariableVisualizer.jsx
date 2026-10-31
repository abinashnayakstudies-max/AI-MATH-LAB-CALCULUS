import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Compass, Sparkles, Layers, Sliders, Play, RotateCcw, Crosshair } from "lucide-react";

/**
 * MultivariableVisualizer Component
 * Renders interactive 3D scalar fields z = f(x, y), exact analytical tangent planes,
 * gradient vector arrows (∇f), and vector field flows.
 */
export function MultivariableVisualizer({ MathFormula: MathFormulaProp }) {
  const MathFormula = MathFormulaProp || (({ tex }) => <code className="math-fallback">{tex}</code>);
  const mountRef = useRef(null);
  const [surfaceType, setSurfaceType] = useState("saddle");
  const [x0, setX0] = useState(0.6);
  const [y0, setY0] = useState(0.4);
  const [showTangentPlane, setShowTangentPlane] = useState(true);
  const [showGradient, setShowGradient] = useState(true);
  const [showVectorField, setShowVectorField] = useState(false);
  const [wireframe, setWireframe] = useState(false);

  // Surface definitions with analytical derivatives
  const surfaceDef = useMemo(() => {
    switch (surfaceType) {
      case "paraboloid":
        return {
          title: "Elliptic Paraboloid",
          formula: "z = x^2 + y^2",
          latex: "f(x, y) = x^2 + y^2",
          fn: (x, y) => x * x + y * y,
          dfdx: (x, y) => 2 * x,
          dfdy: (x, y) => 2 * y,
          d2fdx2: (x, y) => 2,
          d2fdy2: (x, y) => 2,
          d2fdxdy: (x, y) => 0,
          range: 2.2,
          zScale: 0.6
        };
      case "ripple":
        return {
          title: "Concentric Waveform Ripple",
          formula: "z = \\sin(\\sqrt{x^2 + y^2})",
          latex: "f(x, y) = \\sin\\left(\\sqrt{x^2 + y^2}\\right)",
          fn: (x, y) => {
            const r = Math.sqrt(x * x + y * y);
            return Math.sin(r * 2.5) * 0.8;
          },
          dfdx: (x, y) => {
            const r = Math.sqrt(x * x + y * y) || 1e-6;
            return 0.8 * 2.5 * Math.cos(r * 2.5) * (x / r);
          },
          dfdy: (x, y) => {
            const r = Math.sqrt(x * x + y * y) || 1e-6;
            return 0.8 * 2.5 * Math.cos(r * 2.5) * (y / r);
          },
          d2fdx2: () => 1,
          d2fdy2: () => 1,
          d2fdxdy: () => 0,
          range: 2.5,
          zScale: 1.0
        };
      case "monkey":
        return {
          title: "Monkey Saddle Surface",
          formula: "z = x^3 - 3xy^2",
          latex: "f(x, y) = x^3 - 3xy^2",
          fn: (x, y) => 0.35 * (x * x * x - 3 * x * y * y),
          dfdx: (x, y) => 0.35 * (3 * x * x - 3 * y * y),
          dfdy: (x, y) => 0.35 * (-6 * x * y),
          d2fdx2: (x, y) => 0.35 * 6 * x,
          d2fdy2: (x, y) => -0.35 * 6 * x,
          d2fdxdy: (x, y) => -0.35 * 6 * y,
          range: 2.0,
          zScale: 0.7
        };
      case "saddle":
      default:
        return {
          title: "Hyperbolic Saddle Point",
          formula: "z = x^2 - y^2",
          latex: "f(x, y) = x^2 - y^2",
          fn: (x, y) => x * x - y * y,
          dfdx: (x, y) => 2 * x,
          dfdy: (x, y) => -2 * y,
          d2fdx2: () => 2,
          d2fdy2: () => -2,
          d2fdxdy: () => 0,
          range: 2.2,
          zScale: 0.7
        };
    }
  }, [surfaceType]);

  // Evaluate at inspection point (x0, y0)
  const z0 = surfaceDef.fn(x0, y0);
  const fx = surfaceDef.dfdx(x0, y0);
  const fy = surfaceDef.dfdy(x0, y0);
  const gradMag = Math.sqrt(fx * fx + fy * fy);

  // Hessian determinant: D = f_xx * f_yy - (f_xy)^2
  const fxx = surfaceDef.d2fdx2(x0, y0);
  const fyy = surfaceDef.d2fdy2(x0, y0);
  const fxy = surfaceDef.d2fdxdy(x0, y0);
  const hessianD = fxx * fyy - fxy * fxy;

  let pointClassification = "Regular Slope Point";
  if (gradMag < 0.05) {
    if (hessianD > 0 && fxx > 0) pointClassification = "Local Minimum Extrema";
    else if (hessianD > 0 && fxx < 0) pointClassification = "Local Maximum Extrema";
    else if (hessianD < 0) pointClassification = "Stationary Saddle Point";
    else pointClassification = "Inconclusive Critical Point";
  }

  // Three.js 3D Scene construction
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    let renderer;
    let reqId;

    try {
      const width = Math.max(mount.clientWidth || 0, 320);
      const height = Math.max(mount.clientHeight || 0, 460);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#0a080c");

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(4.5, 4.2, 5.5);

      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 0, 0);

      // Ambient and directional lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
      dirLight.position.set(5, 10, 7);
      scene.add(dirLight);

      const group = new THREE.Group();
      scene.add(group);

      // 1. Generate 3D Surface Mesh
      const segments = 45;
      const range = surfaceDef.range;
      const geometry = new THREE.PlaneGeometry(range * 2, range * 2, segments, segments);
      const pos = geometry.attributes.position;
      const colors = [];

      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = surfaceDef.fn(px, py) * surfaceDef.zScale;
        pos.setZ(i, pz);

        // Height gradient color (Burgundy to Sage to Cream)
        const normZ = (pz + 1.5) / 3.0;
        const c = new THREE.Color();
        if (normZ > 0.5) {
          c.lerpColors(new THREE.Color("#8A9E8C"), new THREE.Color("#F5EFE6"), (normZ - 0.5) * 2);
        } else {
          c.lerpColors(new THREE.Color("#781D39"), new THREE.Color("#8A9E8C"), normZ * 2);
        }
        colors.push(c.r, c.g, c.b);
      }

      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const surfaceMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.15,
        wireframe: wireframe
      });
      const surfaceMesh = new THREE.Mesh(geometry, surfaceMat);
      surfaceMesh.rotation.x = -Math.PI / 2; // Orient z upwards
      group.add(surfaceMesh);

      // Coordinate Grid at z=0 plane
      const grid = new THREE.GridHelper(range * 2, 16, 0x8a9e8c, 0x221a24);
      grid.position.y = -1.2;
      group.add(grid);

      // 2. Inspection point marker (x0, y0, z0)
      const pointPos = new THREE.Vector3(x0, z0 * surfaceDef.zScale, -y0);
      const pointSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc23b60, emissiveIntensity: 2.0 })
      );
      pointSphere.position.copy(pointPos);
      group.add(pointSphere);

      // Drop line from surface to base
      const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
        pointPos,
        new THREE.Vector3(x0, -1.2, -y0)
      ]);
      const dropLineMat = new THREE.LineDashedMaterial({ color: 0x8a9e8c, dashSize: 0.08, gapSize: 0.04 });
      const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
      dropLine.computeLineDistances();
      group.add(dropLine);

      // 3. Tangent Plane Mesh: z - z0 = fx*(x - x0) + fy*(y - y0)
      if (showTangentPlane) {
        const planeSpan = 0.9;
        const planeSegments = 10;
        const tPlaneGeo = new THREE.PlaneGeometry(planeSpan * 2, planeSpan * 2, planeSegments, planeSegments);
        const tPos = tPlaneGeo.attributes.position;

        for (let i = 0; i < tPos.count; i++) {
          const u = tPos.getX(i);
          const v = tPos.getY(i);
          const curX = x0 + u;
          const curY = y0 + v;
          const curZ = (z0 + fx * u + fy * v) * surfaceDef.zScale;
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

      // 4. Gradient Vector Arrow (∇f = <fx, fy>)
      if (showGradient && gradMag > 0.001) {
        const gradDir = new THREE.Vector3(fx, (fx * fx + fy * fy) * 0.15, -fy).normalize();
        const arrowLength = Math.min(Math.max(gradMag * 0.45, 0.4), 1.6);
        const arrowHelper = new THREE.ArrowHelper(gradDir, pointPos, arrowLength, 0x50e3c2, 0.22, 0.12);
        group.add(arrowHelper);
      }

      // 5. 2D/3D Vector Field Arrows
      if (showVectorField) {
        const step = 0.8;
        for (let vx = -1.6; vx <= 1.6; vx += step) {
          for (let vy = -1.6; vy <= 1.6; vy += step) {
            const vfx = surfaceDef.dfdx(vx, vy);
            const vfy = surfaceDef.dfdy(vx, vy);
            const vlen = Math.sqrt(vfx * vfx + vfy * vfy) || 1e-4;
            const vDir = new THREE.Vector3(vfx / vlen, 0, -vfy / vlen);
            const vOrigin = new THREE.Vector3(vx, -1.18, -vy);
            const vArrow = new THREE.ArrowHelper(vDir, vOrigin, 0.35, 0x8a9e8c, 0.08, 0.05);
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
        const newH = Math.max(mount.clientHeight || 0, 460);
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
  }, [surfaceDef, x0, y0, z0, fx, fy, gradMag, showTangentPlane, showGradient, showVectorField, wireframe]);

  return (
    <div className="multivariable-workspace" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <section className="title-row">
        <div>
          <span className="section-code">PILLAR 01 · MODULE 11 · 3D VECTOR CALCULUS</span>
          <h1>Multivariable Calculus &amp; 3D Vector Fields</h1>
          <p>
            Explore 3D surfaces $z = f(x, y)$, analytical tangent planes, and gradient vectors $\nabla f$ pointing in the direction of steepest ascent.
          </p>
        </div>
        <div className="formula">
          <MathFormula tex="\nabla f(x, y) = \left\langle \frac{\partial f}{\partial x}, \frac{\partial f}{\partial y} \right\rangle \quad \perp \quad \text{Contour Level Curves}" />
        </div>
      </section>

      <div className="workspace" style={{ display: "grid", gridTemplateColumns: "320px 1fr 340px", gap: "20px" }}>
        {/* Left Controls */}
        <aside className="controls panel">
          <div className="panel-title">
            <span>11</span>
            <div>
              <h2>Surface Selector</h2>
              <p>Choose 3D scalar field geometry.</p>
            </div>
          </div>

          <div className="calculus-field">
            <label>SURFACE GEOMETRY</label>
            <select value={surfaceType} onChange={(e) => setSurfaceType(e.target.value)}>
              <option value="saddle">Hyperbolic Saddle (z = x² - y²)</option>
              <option value="paraboloid">Elliptic Paraboloid (z = x² + y²)</option>
              <option value="ripple">Concentric Waveform Ripple (sin(r))</option>
              <option value="monkey">Monkey Saddle (x³ - 3xy²)</option>
            </select>
          </div>

          <div className="bounds" style={{ marginTop: "12px" }}>
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

          {/* Visualization Layer Toggles */}
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Visual Overlays:</span>
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
              <span>Steepest Gradient Vector ($\nabla f$)</span>
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

        {/* Center 3D Three.js Viewport */}
        <section className="visual panel" style={{ display: "flex", flexDirection: "column" }}>
          <div className="plot-header">
            <div>
              <span className="badge-tag">THREE.JS 3D WEBGL RENDERING</span>
              <h2>{surfaceDef.title}</h2>
            </div>
            <div className="card-meta">Drag to rotate • Scroll to zoom</div>
          </div>

          <div
            ref={mountRef}
            style={{
              width: "100%",
              height: "460px",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              position: "relative"
            }}
          />

          <div className="plot-foot" style={{ marginTop: "12px", display: "flex", justifyContent: "space-between" }}>
            <span>Active Point: P({x0.toFixed(2)}, {y0.toFixed(2)}, {z0.toFixed(3)})</span>
            <span style={{ color: "#50e3c2" }}>∇f = ⟨{fx.toFixed(3)}, {fy.toFixed(3)}⟩</span>
          </div>
        </section>

        {/* Right Analytical Calculus Panel */}
        <aside className="results panel">
          <div className="panel-title">
            <span>02</span>
            <div>
              <h2>Multivariable Analytics</h2>
              <p>Partial differentials &amp; Hessian.</p>
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
            <span>Partial $\partial f / \partial x$</span>
            <b>{fx.toFixed(4)}</b>
          </div>

          <div className="result-row">
            <span>Partial $\partial f / \partial y$</span>
            <b>{fy.toFixed(4)}</b>
          </div>

          <div className="result-row">
            <span>Gradient Magnitude $|\nabla f|$</span>
            <b style={{ color: "#50e3c2" }}>{gradMag.toFixed(4)}</b>
          </div>

          <div className="result-row">
            <span>Hessian Determinant $D$</span>
            <b>{hessianD.toFixed(3)}</b>
          </div>

          <div className="result-row highlight-row" style={{ marginTop: "10px" }}>
            <span>Critical Point State</span>
            <b>{pointClassification}</b>
          </div>

          <div className="detected" style={{ marginTop: "16px" }}>
            <span>GEOMETRIC INTUITION</span>
            <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.6", marginTop: "4px" }}>
              The gradient vector $\nabla f$ always points perpendicular to the level curve $f(x, y) = c$, in the direction where the function rises fastest. Its magnitude is the maximum directional derivative!
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
