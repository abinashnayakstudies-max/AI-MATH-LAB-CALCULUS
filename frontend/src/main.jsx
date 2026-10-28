import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  CircleHelp,
  Crosshair,
  FlaskConical,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  Compass,
  Sliders,
  Cpu,
  Zap,
  BarChart3,
  TrendingUp,
  Infinity as InfinityIcon,
  Maximize2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./style.css";

const API = (import.meta.env.VITE_API_BASE_URL || "https://ai-math-lab-backend.onrender.com").replace(/\/$/, "");

// ----------------------------------------------------
// KaTeX Math Rendering Component (Synchronous & Bundled)
// ----------------------------------------------------
function MathFormula({ tex, block = false }) {
  const html = useMemo(() => {
    if (!tex) return "";
    try {
      return katex.renderToString(String(tex), {
        displayMode: block,
        throwOnError: false
      });
    } catch (e) {
      return String(tex);
    }
  }, [tex, block]);

  return (
    <span
      className={block ? "math-block" : "math-inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ----------------------------------------------------
// 3D Three.js MVT Scene Component
// ----------------------------------------------------
function MVTScene({ result, inspectX, inspectValue, onInspectPoint }) {
  const mountRef = useRef(null);
  const onInspectPointRef = useRef(onInspectPoint);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [viewMode, setViewMode] = useState("3d");
  const [autoRotate, setAutoRotate] = useState(false);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    onInspectPointRef.current = onInspectPoint;
  }, [onInspectPoint]);

  const plot = useMemo(() => {
    if (!result?.plot_points?.length) return null;
    const pts = result.plot_points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!pts.length) return null;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const rawMinX = Math.min(...xs), rawMaxX = Math.max(...xs);
    const rawMinY = Math.min(...ys), rawMaxY = Math.max(...ys);
    const xSpan = Math.max(rawMaxX - rawMinX, 1e-9);
    const ySpan = Math.max(rawMaxY - rawMinY, Math.abs(rawMaxY) * 1e-9, 1e-9);

    const minX = Math.min(rawMinX, 0) - xSpan * 0.08;
    const maxX = Math.max(rawMaxX, 0) + xSpan * 0.08;
    const minY = Math.min(rawMinY, 0) - ySpan * 0.1;
    const maxY = Math.max(rawMaxY, 0) + ySpan * 0.1;
    return { pts, minX, maxX, minY, maxY };
  }, [result]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    while (mount.firstChild) mount.removeChild(mount.firstChild);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a080c");

    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 2000);
    camera.position.set(0.6, 3.2, 11.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0, 0);
    controls.minDistance = 3.5;
    controls.maxDistance = 30;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controlsRef.current = controls;

    const group = new THREE.Group();
    scene.add(group);

    // Subtle background ambient particle starfield (organic sage-grey stardust)
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 32;
      particlePositions[i + 1] = (Math.random() - 0.5) * 24;
      particlePositions[i + 2] = (Math.random() - 0.5) * 20 - 5;
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x8a9e8c,
      size: 0.06,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(particleGeometry, particleMaterial));

    let curveLine = null;
    const addLine = (points, color, opacity = 1) => {
      if (points.length < 2) return null;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
      const line = new THREE.Line(geometry, material);
      group.add(line);
      return line;
    };

    const addText = (text, position, color = "#94a3b8", size = 0.28) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "600 40px 'JetBrains Mono', Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(8, 9, 13, 0.95)";
      ctx.lineWidth = 8;
      ctx.strokeText(String(text), 256, 64);
      ctx.fillStyle = color;
      ctx.fillText(String(text), 256, 64);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(position);
      sprite.scale.set(size * 3.4, size * 0.85, 1);
      group.add(sprite);
      return sprite;
    };

    const fmt = val => {
      if (!Number.isFinite(val)) return "—";
      const abs = Math.abs(val);
      if (abs !== 0 && (abs >= 1e4 || abs < 1e-3)) return val.toExponential(1);
      return Number(val.toPrecision(3)).toString();
    };

    const worldW = 8.6, worldH = 5.2;
    const xRange = plot ? plot.maxX - plot.minX : 6;
    const yRange = plot ? plot.maxY - plot.minY : 4;
    const xMin = plot?.minX ?? -3, xMax = plot?.maxX ?? 3;
    const yMin = plot?.minY ?? -2, yMax = plot?.maxY ?? 2;
    const mapX = val => ((val - xMin) / Math.max(xRange, 1e-12) - 0.5) * worldW;
    const mapY = val => ((val - yMin) / Math.max(yRange, 1e-12) - 0.5) * worldH;
    const x0 = mapX(0), y0 = mapY(0);

    // Grid (subtle warm dark noir)
    const gridColor = 0x221a22;
    for (let i = 0; i <= 8; i++) {
      const gx = -worldW / 2 + (worldW * i) / 8;
      addLine([new THREE.Vector3(gx, -worldH / 2, -0.06), new THREE.Vector3(gx, worldH / 2, -0.06)], gridColor, 0.5);
    }
    for (let i = 0; i <= 6; i++) {
      const gy = -worldH / 2 + (worldH * i) / 6;
      addLine([new THREE.Vector3(-worldW / 2, gy, -0.06), new THREE.Vector3(worldW / 2, gy, -0.06)], gridColor, 0.5);
    }

    // Axes: Burgundy X, Sage Y, Cream Z
    const xAxisColor = 0x942646;
    const yAxisColor = 0x8a9e8c;
    const zAxisColor = 0xd4c7b5;
    addLine([new THREE.Vector3(-worldW / 2, y0, 0), new THREE.Vector3(worldW / 2, y0, 0)], xAxisColor, 0.9);
    addLine([new THREE.Vector3(x0, -worldH / 2, 0), new THREE.Vector3(x0, worldH / 2, 0)], yAxisColor, 0.9);
    addLine([new THREE.Vector3(x0, y0, -2.4), new THREE.Vector3(x0, y0, 2.4)], zAxisColor, 0.65);

    addText("X Axis", new THREE.Vector3(worldW / 2 - 0.4, y0 - 0.36, 0.08), "#e07a93", 0.3);
    addText("Y [f(x)]", new THREE.Vector3(x0 + 0.65, worldH / 2 - 0.12, 0.08), "#a3b5a5", 0.3);

    // Ticks
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const t = i / tickCount;
      const xv = xMin + t * xRange, xp = mapX(xv);
      addLine([new THREE.Vector3(xp, y0 - 0.07, 0.02), new THREE.Vector3(xp, y0 + 0.07, 0.02)], xAxisColor, 0.8);
      addText(fmt(xv), new THREE.Vector3(xp, y0 - 0.26, 0.04), "#a3b5a5", 0.25);

      const yv = yMin + t * yRange, yp = mapY(yv);
      addLine([new THREE.Vector3(x0 - 0.07, yp, 0.02), new THREE.Vector3(x0 + 0.07, yp, 0.02)], yAxisColor, 0.8);
      if (i !== Math.round(tickCount / 2)) {
        addText(fmt(yv), new THREE.Vector3(x0 - 0.52, yp, 0.04), "#a3b5a5", 0.25);
      }
    }

    if (plot) {
      const valid = plot.pts.filter(p => Number.isFinite(p.y));
      // Main function curve in luminous warm cream
      curveLine = addLine(valid.map(p => new THREE.Vector3(mapX(p.x), mapY(p.y), 0.12)), 0xf5efe6, 1);

      const nearest = target =>
        plot.pts.reduce((best, p) => (Math.abs(p.x - target) < Math.abs(best.x - target) ? p : best), plot.pts[0]);
      const pa = nearest(result.a), pb = nearest(result.b);

      // Secant line in refined sage-grey
      addLine(
        [new THREE.Vector3(mapX(result.a), mapY(pa.y), 0.16), new THREE.Vector3(mapX(result.b), mapY(pb.y), 0.16)],
        0x8a9e8c,
        0.95
      );

      const c = result.hybrid_c ?? result.canonical_c;
      const pc = nearest(c);

      // Tangent line at verified c in radiant deep burgundy
      const tangentSpan = Math.min((plot.maxX - plot.minX) * 0.16, Math.max(result.b - result.a, 0.1) * 0.22);
      const t1 = Math.max(plot.minX, c - tangentSpan);
      const t2 = Math.min(plot.maxX, c + tangentSpan);
      addLine(
        [
          new THREE.Vector3(mapX(t1), mapY(pc.y + result.secant_slope * (t1 - c)), 0.2),
          new THREE.Vector3(mapX(t2), mapY(pc.y + result.secant_slope * (t2 - c)), 0.2)
        ],
        0xc23b60,
        1
      );

      // Verified MVT Point in glowing burgundy
      const verifiedSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0x942646, emissive: 0x781d39, emissiveIntensity: 1.5 })
      );
      verifiedSphere.position.set(mapX(c), mapY(pc.y), 0.24);
      group.add(verifiedSphere);

      addLine([new THREE.Vector3(mapX(c), y0, 0.18), new THREE.Vector3(mapX(c), mapY(pc.y), 0.18)], 0xc23b60, 0.7);
      addText(`Verified c = ${fmt(c)}`, new THREE.Vector3(mapX(c), mapY(pc.y) + 0.36, 0.28), "#f5efe6", 0.28);

      // Other roots in sage-grey
      (result.mvt_points || []).forEach(root => {
        if (Math.abs(root - c) < 1e-5) return;
        const rp = nearest(root);
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xa3b5a5 })
        );
        marker.position.set(mapX(root), mapY(rp.y), 0.22);
        group.add(marker);
      });

      // AI predicted point in caramel amber
      if (Number.isFinite(result.ml_c)) {
        const mp = nearest(result.ml_c);
        const aiMarker = new THREE.Mesh(
          new THREE.SphereGeometry(0.1, 20, 20),
          new THREE.MeshBasicMaterial({ color: 0xd4a373 })
        );
        aiMarker.position.set(mapX(result.ml_c), mapY(mp.y), 0.26);
        group.add(aiMarker);
        addText(`AI c = ${fmt(result.ml_c)}`, new THREE.Vector3(mapX(result.ml_c), mapY(mp.y) + 0.34, 0.3), "#f5efe6", 0.25);
      }

      // Pinned coordinate in sage-grey
      if (inspectX != null && inspectValue != null && Number.isFinite(inspectX) && Number.isFinite(inspectValue)) {
        const pinMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.09, 20, 20),
          new THREE.MeshStandardMaterial({ color: 0x8a9e8c, emissive: 0x5a6d5c, emissiveIntensity: 1.0 })
        );
        pinMesh.position.set(mapX(inspectX), mapY(inspectValue), 0.28);
        group.add(pinMesh);
        addLine([new THREE.Vector3(mapX(inspectX), y0, 0.2), new THREE.Vector3(mapX(inspectX), mapY(inspectValue), 0.2)], 0x8a9e8c, 0.7);
        addText(`(${fmt(inspectX)}, ${fmt(inspectValue)})`, new THREE.Vector3(mapX(inspectX), mapY(inspectValue) + 0.32, 0.32), "#f5efe6", 0.26);
      }
    }

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));

    const raycaster = new THREE.Raycaster();
    raycaster.params.Line.threshold = 0.2;
    const pointer = new THREE.Vector2();

    const onPointerMove = event => {
      if (!curveLine || !plot) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(curveLine, false)[0];
      if (!hit || hit.index == null) {
        setHoveredPoint(null);
        renderer.domElement.style.cursor = "grab";
        return;
      }
      const pts = plot.pts.filter(p => Number.isFinite(p.y));
      const idx = Math.max(0, Math.min(pts.length - 1, hit.index));
      const sample = pts[idx];
      setHoveredPoint(sample);
      renderer.domElement.style.cursor = "crosshair";
    };

    const onPointerClick = event => {
      if (!curveLine || !plot) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(curveLine, false)[0];
      if (!hit || hit.index == null) return;
      const pts = plot.pts.filter(p => Number.isFinite(p.y));
      const sample = pts[Math.max(0, Math.min(pts.length - 1, hit.index))];
      if (sample) onInspectPointRef.current?.(sample.x, sample.y);
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onPointerClick);

    const resize = () => {
      const w = mount.clientWidth, h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", resize);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onPointerClick);
      controls.dispose();
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [plot, result, inspectX, inspectValue, autoRotate]);

  const setCameraView = mode => {
    setViewMode(mode);
    if (!cameraRef.current || !controlsRef.current) return;
    if (mode === "2d") {
      cameraRef.current.position.set(0, 0, 10.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.enableRotate = false;
    } else {
      cameraRef.current.position.set(0.6, 3.2, 11.0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.enableRotate = true;
    }
  };

  return (
    <div className="scene-wrap">
      <div ref={mountRef} className="three-canvas" />

      {/* Floating Toolbar */}
      <div className="canvas-toolbar">
        <button
          type="button"
          className={viewMode === "3d" ? "active" : ""}
          onClick={() => setCameraView("3d")}
        >
          <Compass size={13} /> 3D View
        </button>
        <button
          type="button"
          className={viewMode === "2d" ? "active" : ""}
          onClick={() => setCameraView("2d")}
        >
          <Maximize2 size={13} /> 2D Planar
        </button>
        <button
          type="button"
          className={autoRotate ? "active" : ""}
          onClick={() => setAutoRotate(!autoRotate)}
        >
          <Activity size={13} /> Rotate
        </button>
        <button type="button" onClick={() => setCameraView("3d")}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="axis-key">
        <span><i className="axis-x" />X = input</span>
        <span><i className="axis-y" />Y = f(x)</span>
        <span><i className="axis-z" />Z = depth</span>
      </div>

      <div className="scene-labels">
        <span><i className="line-key curve-key" />f(x)</span>
        <span><i className="line-key secant-key" />Secant</span>
        <span><i className="line-key tangent-key" />Tangent</span>
        <span><i className="point-key" />Verified c</span>
        <span><i className="ai-key" />AI c</span>
        {inspectX != null && <span><i className="inspect-key" />Pinned</span>}
      </div>

      {hoveredPoint && (
        <div className="coordinate-readout">
          <span>COORDINATE HUD</span>
          <strong>({Number(hoveredPoint.x).toFixed(4)}, {Number(hoveredPoint.y).toFixed(4)})</strong>
          <small>Click curve to pin this coordinate</small>
        </div>
      )}

      {!result && (
        <div className="scene-empty">
          <Crosshair size={20} />
          <span>Enter a function and interval to view the 3D MVT scene.</span>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 2D Calculus Mini Plot
// ----------------------------------------------------
function CalculusMiniPlot({ points, derivativePoints }) {
  const width = 640, height = 220, pad = 28;
  const all = [...(points || []), ...(derivativePoints || [])].filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!all.length) {
    return <div className="calculus-plot-empty">Run a calculation to preview curve and derivative.</div>;
  }
  const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
  const rawMinY = Math.min(...all.map(p => p.y)), rawMaxY = Math.max(...all.map(p => p.y));
  const spanY = Math.max(rawMaxY - rawMinY, 1e-6);
  const minY = rawMinY - spanY * 0.08, maxY = rawMaxY + spanY * 0.08;

  const xy = p =>
    `${pad + ((p.x - minX) / Math.max(maxX - minX, 1e-9)) * (width - 2 * pad)},${
      height - pad - ((p.y - minY) / Math.max(maxY - minY, 1e-9)) * (height - 2 * pad)
    }`;
  const line = arr => (arr || []).map(xy).join(" ");
  const zeroY = minY <= 0 && maxY >= 0 ? height - pad - ((0 - minY) / (maxY - minY)) * (height - 2 * pad) : null;
  const zeroX = minX <= 0 && maxX >= 0 ? pad + ((0 - minX) / (maxX - minX)) * (width - 2 * pad) : null;

  return (
    <svg className="calculus-plot" viewBox={`0 0 ${width} ${height}`} role="img">
      {zeroY !== null && <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} className="plot-axis" />}
      {zeroX !== null && <line x1={zeroX} y1={pad} x2={zeroX} y2={height - pad} className="plot-axis" />}
      <polyline points={line(points)} className="plot-original" />
      <polyline points={line(derivativePoints)} className="plot-derivative" />
    </svg>
  );
}

// ----------------------------------------------------
// Riemann Sums Geometric Area Plot Component
// ----------------------------------------------------
function RiemannAreaPlot({ rectangles, plotPoints, a, b }) {
  const width = 640, height = 240, pad = 30;
  if (!rectangles?.length || !plotPoints?.length) {
    return <div className="calculus-plot-empty">Select bounds and partitions to render area slices.</div>;
  }

  const allX = plotPoints.map(p => p.x);
  const allY = [...plotPoints.map(p => p.y), ...rectangles.map(r => r.height), 0];
  const minX = Math.min(...allX, a);
  const maxX = Math.max(...allX, b);
  const rawMinY = Math.min(...allY);
  const rawMaxY = Math.max(...allY);
  const spanY = Math.max(rawMaxY - rawMinY, 1e-6);
  const minY = Math.min(rawMinY - spanY * 0.08, 0);
  const maxY = Math.max(rawMaxY + spanY * 0.08, 0.1);

  const scaleX = xVal => pad + ((xVal - minX) / Math.max(maxX - minX, 1e-9)) * (width - 2 * pad);
  const scaleY = yVal => height - pad - ((yVal - minY) / Math.max(maxY - minY, 1e-9)) * (height - 2 * pad);
  const zeroY = scaleY(0);

  const curvePath = plotPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${scaleX(p.x)} ${scaleY(p.y)}`)
    .join(" ");

  return (
    <svg className="calculus-plot riemann-svg" viewBox={`0 0 ${width} ${height}`}>
      <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} className="plot-axis" />
      {rectangles.map((rect, idx) => {
        const x1 = scaleX(rect.x_left);
        const x2 = scaleX(rect.x_right);
        const rectW = Math.max(x2 - x1, 1);
        const yTop = scaleY(Math.max(rect.height, 0));
        const rectH = Math.abs(scaleY(rect.height) - zeroY);
        const yPos = rect.height >= 0 ? yTop : zeroY;

        return (
          <g key={idx} className="riemann-bar-group">
            <rect x={x1} y={yPos} width={rectW} height={Math.max(rectH, 1)} className="riemann-rect" />
            <line x1={x1} y1={zeroY} x2={x1} y2={scaleY(rect.height)} stroke="rgba(194, 59, 96, 0.4)" strokeWidth="1" />
            <line x1={x2} y1={zeroY} x2={x2} y2={scaleY(rect.height)} stroke="rgba(194, 59, 96, 0.4)" strokeWidth="1" />
            <line x1={x1} y1={scaleY(rect.height)} x2={x2} y2={scaleY(rect.height)} stroke="#c23b60" strokeWidth="1.5" />
          </g>
        );
      })}
      <path d={curvePath} fill="none" stroke="#f5efe6" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ----------------------------------------------------
// Taylor Series Visualizer Plot
// ----------------------------------------------------
function TaylorPlot({ originalPoints, taylorPoints }) {
  const width = 640, height = 220, pad = 28;
  const all = [...(originalPoints || []), ...(taylorPoints || [])].filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!all.length) {
    return <div className="calculus-plot-empty">Calculate Taylor series to inspect polynomial approximation.</div>;
  }
  const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x));
  const rawMinY = Math.min(...all.map(p => p.y)), rawMaxY = Math.max(...all.map(p => p.y));
  const spanY = Math.max(rawMaxY - rawMinY, 1e-6);
  const minY = rawMinY - spanY * 0.08, maxY = rawMaxY + spanY * 0.08;

  const xy = p =>
    `${pad + ((p.x - minX) / Math.max(maxX - minX, 1e-9)) * (width - 2 * pad)},${
      height - pad - ((p.y - minY) / Math.max(maxY - minY, 1e-9)) * (height - 2 * pad)
    }`;
  const line = arr => (arr || []).map(xy).join(" ");
  const zeroY = minY <= 0 && maxY >= 0 ? height - pad - ((0 - minY) / (maxY - minY)) * (height - 2 * pad) : null;
  const zeroX = minX <= 0 && maxX >= 0 ? pad + ((0 - minX) / (maxX - minX)) * (width - 2 * pad) : null;

  return (
    <svg className="calculus-plot" viewBox={`0 0 ${width} ${height}`}>
      {zeroY !== null && <line x1={pad} y1={zeroY} x2={width - pad} y2={zeroY} className="plot-axis" />}
      {zeroX !== null && <line x1={zeroX} y1={pad} x2={zeroX} y2={height - pad} className="plot-axis" />}
      <polyline points={line(originalPoints)} stroke="#f5efe6" strokeWidth="2.5" fill="none" />
      <polyline points={line(taylorPoints)} stroke="#c23b60" strokeWidth="2.5" strokeDasharray="6 4" fill="none" />
    </svg>
  );
}

// ----------------------------------------------------
// Math Quick-Pad Chips Toolbar
// ----------------------------------------------------
function MathKeypad({ onInsert }) {
  const tokens = [
    { label: "x²", val: "x^2" },
    { label: "x³", val: "x^3" },
    { label: "√x", val: "sqrt(x)" },
    { label: "sin", val: "sin(" },
    { label: "cos", val: "cos(" },
    { label: "tan", val: "tan(" },
    { label: "eˣ", val: "exp(x)" },
    { label: "ln", val: "ln(" },
    { label: "π", val: "pi" },
    { label: "+", val: " + " },
    { label: "−", val: " - " },
    { label: "×", val: "*" },
    { label: "÷", val: "/" },
    { label: "^", val: "^" },
    { label: "( )", val: "()" }
  ];

  return (
    <div className="math-keypad" role="toolbar" aria-label="Math quick keypad">
      <span className="keypad-title">QUICK INPUT:</span>
      <div className="keypad-chips">
        {tokens.map((tok, i) => (
          <button key={i} type="button" onClick={() => onInsert(tok.val)}>
            {tok.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Main Application Component
// ----------------------------------------------------
function App() {
  const [activePage, setActivePage] = useState("mvt");
  const [apiStatus, setApiStatus] = useState("checking");
  const [showSteps, setShowSteps] = useState(true);

  // MVT Explorer state
  const [expression, setExpression] = useState("x^2");
  const [a, setA] = useState("-2");
  const [b, setB] = useState("3");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [valueX, setValueX] = useState("1");
  const [valueResult, setValueResult] = useState(null);
  const [valueLoading, setValueLoading] = useState(false);

  // Calculus Engine state
  const [calculusExpression, setCalculusExpression] = useState("3x^3 - 2x + 1");
  const [calculusOperation, setCalculusOperation] = useState("differentiate");
  const [calculusOrder, setCalculusOrder] = useState("1");
  const [calculusA, setCalculusA] = useState("0");
  const [calculusB, setCalculusB] = useState("3");
  const [calculusResult, setCalculusResult] = useState(null);
  const [calculusLoading, setCalculusLoading] = useState(false);

  // Taylor Series state
  const [taylorExpression, setTaylorExpression] = useState("sin(x)");
  const [taylorPoint, setTaylorPoint] = useState("0");
  const [taylorOrder, setTaylorOrder] = useState(5);
  const [taylorResult, setTaylorResult] = useState(null);
  const [taylorLoading, setTaylorLoading] = useState(false);

  // Riemann Sums state
  const [riemannExpression, setRiemannExpression] = useState("x^2");
  const [riemannA, setRiemannA] = useState("0");
  const [riemannB, setRiemannB] = useState("3");
  const [riemannN, setRiemannN] = useState(8);
  const [riemannMethod, setRiemannMethod] = useState("midpoint");
  const [riemannResult, setRiemannResult] = useState(null);
  const [riemannLoading, setRiemannLoading] = useState(false);

  // Limits & Continuity state
  const [limitExpression, setLimitExpression] = useState("sin(x)/x");
  const [limitPoint, setLimitPoint] = useState("0");
  const [limitOperation, setLimitOperation] = useState("limit");
  const [limitDirection, setLimitDirection] = useState("both");
  const [limitResult, setLimitResult] = useState(null);
  const [limitLoading, setLimitLoading] = useState(false);

  // Critical Points state
  const [criticalExpression, setCriticalExpression] = useState("x^3 - 3x");
  const [criticalA, setCriticalA] = useState("-2");
  const [criticalB, setCriticalB] = useState("2");
  const [criticalResult, setCriticalResult] = useState(null);
  const [criticalLoading, setCriticalLoading] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API}/health`, { method: "GET" });
        if (res.ok) setApiStatus("online");
        else setApiStatus("error");
      } catch {
        setApiStatus("sleeping");
      }
    }
    checkHealth();
  }, []);

  const insertToken = val => {
    if (activePage === "mvt") setExpression(prev => prev + val);
    else if (activePage === "calculus") setCalculusExpression(prev => prev + val);
    else if (activePage === "taylor") setTaylorExpression(prev => prev + val);
    else if (activePage === "riemann") setRiemannExpression(prev => prev + val);
    else if (activePage === "critical") setCriticalExpression(prev => prev + val);
    else if (activePage === "limits") setLimitExpression(prev => prev + val);
  };

  // API Call Handlers
  const calculateMVT = useCallback(async () => {
    if (!expression.trim() || isNaN(Number(a)) || isNaN(Number(b)) || Number(a) >= Number(b)) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/mvt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression, a: Number(a), b: Number(b) })
      });
      const data = await r.json();
      setResult(data);
    } catch {
      setResult({ error: "Could not connect to backend. The instance might be starting up." });
    } finally {
      setLoading(false);
    }
  }, [expression, a, b]);

  const calculateCalculus = useCallback(async () => {
    if (!calculusExpression.trim()) return;
    setCalculusLoading(true);
    const payload = { expression: calculusExpression, operation: calculusOperation, order: Number(calculusOrder) };
    if (calculusOperation === "definite_integral") {
      payload.a = Number(calculusA);
      payload.b = Number(calculusB);
    }
    try {
      const response = await fetch(`${API}/calculus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setCalculusResult(data);
    } catch {
      setCalculusResult({ error: "Calculus service connection error." });
    } finally {
      setCalculusLoading(false);
    }
  }, [calculusExpression, calculusOperation, calculusOrder, calculusA, calculusB]);

  const calculateTaylor = useCallback(async () => {
    if (!taylorExpression.trim()) return;
    setTaylorLoading(true);
    try {
      const response = await fetch(`${API}/taylor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression: taylorExpression,
          point: Number(taylorPoint),
          order: Number(taylorOrder)
        })
      });
      const data = await response.json();
      setTaylorResult(data);
    } catch {
      setTaylorResult({ error: "Taylor expansion service connection error." });
    } finally {
      setTaylorLoading(false);
    }
  }, [taylorExpression, taylorPoint, taylorOrder]);

  const calculateRiemann = useCallback(async () => {
    if (!riemannExpression.trim() || Number(riemannA) >= Number(riemannB)) return;
    setRiemannLoading(true);
    try {
      const response = await fetch(`${API}/riemann-sum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression: riemannExpression,
          a: Number(riemannA),
          b: Number(riemannB),
          n: Number(riemannN),
          method: riemannMethod
        })
      });
      const data = await response.json();
      setRiemannResult(data);
    } catch {
      setRiemannResult({ error: "Riemann sum service connection error." });
    } finally {
      setRiemannLoading(false);
    }
  }, [riemannExpression, riemannA, riemannB, riemannN, riemannMethod]);

  const calculateLimit = useCallback(async () => {
    if (!limitExpression.trim()) return;
    setLimitLoading(true);
    try {
      const response = await fetch(`${API}/limits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expression: limitExpression,
          point: limitPoint,
          operation: limitOperation,
          direction: limitDirection
        })
      });
      const data = await response.json();
      setLimitResult(data);
    } catch {
      setLimitResult({ error: "Limits calculation connection error." });
    } finally {
      setLimitLoading(false);
    }
  }, [limitExpression, limitPoint, limitOperation, limitDirection]);

  const calculateCriticalPoints = useCallback(async () => {
    const lower = Number(criticalA);
    const upper = Number(criticalB);
    if (!criticalExpression.trim() || lower >= upper) return;
    setCriticalLoading(true);
    try {
      const response = await fetch(`${API}/critical-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: criticalExpression, a: lower, b: upper })
      });
      const data = await response.json();
      setCriticalResult(data);
    } catch {
      setCriticalResult({ error: "Critical points service connection error." });
    } finally {
      setCriticalLoading(false);
    }
  }, [criticalExpression, criticalA, criticalB]);

  // Desmos-Style Reactive Debounced Auto-Compute
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activePage === "mvt") calculateMVT();
      else if (activePage === "calculus") calculateCalculus();
      else if (activePage === "taylor") calculateTaylor();
      else if (activePage === "riemann") calculateRiemann();
      else if (activePage === "critical") calculateCriticalPoints();
      else if (activePage === "limits") calculateLimit();
    }, 550);
    return () => clearTimeout(timer);
  }, [
    activePage,
    expression, a, b,
    calculusExpression, calculusOperation, calculusOrder, calculusA, calculusB,
    taylorExpression, taylorPoint, taylorOrder,
    riemannExpression, riemannA, riemannB, riemannN, riemannMethod,
    criticalExpression, criticalA, criticalB,
    limitExpression, limitPoint, limitOperation, limitDirection
  ]);

  async function findValue() {
    setValueLoading(true);
    try {
      const r = await fetch(`${API}/function-value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression, x: Number(valueX) })
      });
      const data = await r.json();
      setValueResult(data);
    } catch {
      setValueResult({ error: "Function Value Finder is currently unavailable." });
    } finally {
      setValueLoading(false);
    }
  }

  const pinPoint = (px, pval) => {
    setValueX(String(px));
    setValueResult({ x: px, value: pval });
  };

  const numerical = result?.canonical_c;
  const ml = result?.ml_c;
  const hybrid = result?.hybrid_c;
  const predictionError = numerical != null && ml != null ? Math.abs(ml - numerical) : null;

  return (
    <main className="app">
      <div className="ambient-glow ambient-glow-one" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-two" aria-hidden="true" />
      <div className="background-grid" aria-hidden="true" />

      {apiStatus === "sleeping" && (
        <div className="cloud-wake-banner">
          <Zap size={14} className="banner-icon-pulse" />
          <span>
            <strong>Cloud Instance Waking:</strong> Free tier Render instances sleep after inactivity and take ~30–45s to wake. Requests will succeed once online.
          </span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="topbar">
        <div className="brand-mark">
          <div className="brand-icon">
            <FlaskConical size={20} />
          </div>
          <div>
            <strong>AI MATH LAB</strong>
            <span>Computational Mathematics &amp; Calculus</span>
          </div>
        </div>

        <nav className="page-nav" aria-label="Math Lab Modules">
          <button
            type="button"
            className={activePage === "mvt" ? "active" : ""}
            onClick={() => setActivePage("mvt")}
          >
            <Compass size={14} /> MVT Explorer
          </button>
          <button
            type="button"
            className={activePage === "calculus" ? "active" : ""}
            onClick={() => setActivePage("calculus")}
          >
            <Cpu size={14} /> Calculus Engine
          </button>
          <button
            type="button"
            className={activePage === "taylor" ? "active" : ""}
            onClick={() => setActivePage("taylor")}
          >
            <Sparkles size={14} /> Taylor Series
          </button>
          <button
            type="button"
            className={activePage === "riemann" ? "active" : ""}
            onClick={() => setActivePage("riemann")}
          >
            <BarChart3 size={14} /> Riemann Sums
          </button>
          <button
            type="button"
            className={activePage === "critical" ? "active" : ""}
            onClick={() => setActivePage("critical")}
          >
            <TrendingUp size={14} /> Critical Points
          </button>
          <button
            type="button"
            className={activePage === "limits" ? "active" : ""}
            onClick={() => setActivePage("limits")}
          >
            <InfinityIcon size={14} /> Limits
          </button>
        </nav>

        <div className="status">
          <i className={apiStatus === "online" ? "online" : "pulse"} />
          {apiStatus === "online" ? "API ONLINE" : "CONNECTING"}
        </div>
      </header>

      {/* Hero Section with KaTeX Header Formula */}
      <section className="title-row">
        <div>
          <span className="section-code">
            {activePage === "mvt" && "MODULE 01 · 3D DYNAMICS"}
            {activePage === "calculus" && "MODULE 02 · SYMBOLIC COMPUTATION"}
            {activePage === "taylor" && "MODULE 03 · POLYNOMIAL APPROXIMATION"}
            {activePage === "riemann" && "MODULE 04 · NUMERICAL INTEGRATION"}
            {activePage === "critical" && "MODULE 05 · EXTREMA & INFLECTION"}
            {activePage === "limits" && "MODULE 06 · ASYMPTOTIC ANALYSIS"}
          </span>
          <h1>
            {activePage === "mvt" && "Generalized Mean Value Theorem"}
            {activePage === "calculus" && "Symbolic Calculus Engine"}
            {activePage === "taylor" && "Taylor & Maclaurin Series"}
            {activePage === "riemann" && "Riemann Sums Area Visualizer"}
            {activePage === "critical" && "Critical Points & Extrema"}
            {activePage === "limits" && "Limits & Continuity"}
          </h1>
          <p>
            {activePage === "mvt" && "Explore 3D curves, tangent/secant slope alignment, and AI candidate verification on [a, b]."}
            {activePage === "calculus" && "Exact symbolic differentiation (1st–5th order), indefinite integration, and definite integrals."}
            {activePage === "taylor" && "Compute polynomial expansions around center point a, observe term convergence, and inspect plots."}
            {activePage === "riemann" && "Approximate definite integrals with left, right, midpoint, and trapezoidal geometric partitions."}
            {activePage === "critical" && "Detect stationary points, local extrema, global extrema on [a, b], and inflection points."}
            {activePage === "limits" && "Examine one-sided limits, limits at infinity, and test function continuity with L'Hôpital insights."}
          </p>
        </div>

        <div className="formula">
          {activePage === "mvt" && (
            <MathFormula tex="f'(c) = \frac{f(b) - f(a)}{b - a}" />
          )}
          {activePage === "calculus" && (
            <MathFormula tex="\frac{d}{dx} \left[ \int f(x)\,dx \right] = f(x)" />
          )}
          {activePage === "taylor" && (
            <MathFormula tex="P_n(x) = \sum_{k=0}^n \frac{f^{(k)}(a)}{k!} (x - a)^k" />
          )}
          {activePage === "riemann" && (
            <MathFormula tex="\int_a^b f(x)\,dx \approx \sum_{i=1}^n f(x_i^*)\,\Delta x" />
          )}
          {activePage === "critical" && (
            <MathFormula tex="f'(x) = 0 \quad \text{and} \quad f''(x) \neq 0" />
          )}
          {activePage === "limits" && (
            <MathFormula tex="\lim_{x \to a} f(x) = L" />
          )}
        </div>
      </section>

      {/* Universal Math Quick-Pad */}
      <MathKeypad onInsert={insertToken} />

      {/* ======================================================== */}
      {/* 1. MVT EXPLORER MODULE                                   */}
      {/* ======================================================== */}
      {activePage === "mvt" && (
        <>
          <section className="workspace" id="mvt-workspace">
            <aside className="controls panel">
              <div className="panel-title">
                <span>01</span>
                <div>
                  <h2>Problem Input</h2>
                  <p>Function and interval bounds.</p>
                </div>
              </div>

              <label>FUNCTION f(x)</label>
              <input
                className="function-input"
                value={expression}
                onChange={e => setExpression(e.target.value)}
                placeholder="x^2 + sin(x)"
              />

              <div className="bounds">
                <div>
                  <label>LOWER a</label>
                  <input value={a} onChange={e => setA(e.target.value)} />
                </div>
                <div>
                  <label>UPPER b</label>
                  <input value={b} onChange={e => setB(e.target.value)} />
                </div>
              </div>

              <button className="primary-button" onClick={calculateMVT} disabled={loading}>
                <Play size={15} />
                {loading ? "Computing Solution…" : "Recalculate MVT"}
              </button>

              <div className="examples">
                <span>PRESET EXAMPLES</span>
                <button onClick={() => { setExpression("x^2"); setA("-2"); setB("3"); }}>x²</button>
                <button onClick={() => { setExpression("sin(x)"); setA("-2"); setB("2"); }}>sin(x)</button>
                <button onClick={() => { setExpression("x^3 - 3x"); setA("-2"); setB("2"); }}>x³ − 3x</button>
                <button onClick={() => { setExpression("exp(-x^2)"); setA("-2"); setB("2"); }}>e⁻ˣ²</button>
                <button onClick={() => { setExpression("2x^3 - 4x + 1"); setA("-1"); setB("2"); }}>2x³ − 4x</button>
              </div>

              <div className="method-note">
                <CircleHelp size={15} />
                <span>AI model predicts candidate root. Hybrid refinement guarantees verified precision.</span>
              </div>
            </aside>

            <section className="visual-panel panel">
              <div className="plot-header">
                <div>
                  <span className="badge-tag">THREE.JS 3D CANVAS</span>
                  <h2>Function Curve, Secant &amp; Tangents</h2>
                </div>
                <span className="drag-note">Drag to orbit · Scroll to zoom · Click curve to pin</span>
              </div>

              <MVTScene
                result={result}
                inspectX={valueResult?.x}
                inspectValue={valueResult?.value}
                onInspectPoint={pinPoint}
              />

              <div className="plot-foot">
                <span>Interactive 3D WebGL render</span>
                <span>{result ? `${result.mvt_points?.length ?? 0} MVT root(s) found` : "Awaiting calculation"}</span>
              </div>
            </section>

            <aside className="results panel">
              <div className="panel-title">
                <span>02</span>
                <div>
                  <h2>MVT Analytics</h2>
                  <p>AI vs Brent verification.</p>
                </div>
              </div>

              {!result ? (
                <div className="result-empty">
                  Run an MVT calculation to inspect canonical root, secant slope, and AI predictions.
                </div>
              ) : result.error ? (
                <div className="error">{result.error}</div>
              ) : (
                <>
                  <div className="verified-box">
                    <span>FINAL VERIFIED MVT POINT</span>
                    <strong>{hybrid?.toFixed(6)}</strong>
                    <small>
                      <Check size={12} /> Derivative matches secant slope
                    </small>
                  </div>

                  <div className="result-row">
                    <span>Numerical Canonical c</span>
                    <b>{numerical?.toFixed(6)}</b>
                  </div>
                  <div className="result-row">
                    <span>AI Predicted c</span>
                    <b>{ml?.toFixed(6) ?? "—"}</b>
                  </div>
                  <div className="result-row">
                    <span>AI Prediction Error</span>
                    <b>{predictionError ? predictionError.toFixed(6) : "—"}</b>
                  </div>
                  <div className="result-row">
                    <span>Secant Slope</span>
                    <b>{result.secant_slope?.toFixed(6)}</b>
                  </div>
                  <div className="result-row">
                    <span>Hybrid Residual</span>
                    <b>{result.hybrid_residual ? result.hybrid_residual.toExponential(2) : "0.0"}</b>
                  </div>

                  <div className="detected">
                    <span>DETECTED ROOTS · CLICK TO PIN</span>
                    <div className="coordinate-list">
                      {result.mvt_points.map((cVal, i) => {
                        const pts = result.plot_points || [];
                        const p = pts.reduce(
                          (best, pt) => (Math.abs(pt.x - cVal) < Math.abs(best.x - cVal) ? pt : best),
                          pts[0] || { x: cVal, y: NaN }
                        );
                        return (
                          <button
                            type="button"
                            key={i}
                            title="Click to pin this coordinate"
                            onClick={() => pinPoint(cVal, p.y)}
                          >
                            <b>c = {cVal.toFixed(5)}</b>
                            <span>f(c) ≈ {Number.isFinite(p.y) ? p.y.toFixed(5) : "—"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </aside>
          </section>

          {/* Coordinate Pinner */}
          <section className="finder panel">
            <div className="finder-copy">
              <span>03 / COORDINATE PINNER</span>
              <h2>Evaluate Any Point on the Curve</h2>
              <p>Type an x coordinate or click directly on the 3D curve above.</p>
            </div>
            <div className="finder-form">
              <label>INPUT x</label>
              <input value={valueX} onChange={e => setValueX(e.target.value)} />
              <button className="secondary-button" onClick={findValue} disabled={valueLoading}>
                {valueLoading ? "Evaluating…" : "Evaluate f(x)"}
              </button>
            </div>
            <div className="finder-result">
              {valueResult?.error ? (
                <span className="error-inline">{valueResult.error}</span>
              ) : valueResult ? (
                <>
                  <span>EVALUATED COORDINATE</span>
                  <strong>({Number(valueResult.x).toFixed(4)}, {Number(valueResult.value).toFixed(4)})</strong>
                </>
              ) : (
                <span className="muted">No coordinate pinned yet.</span>
              )}
            </div>
          </section>
        </>
      )}

      {/* ======================================================== */}
      {/* 2. CALCULUS ENGINE MODULE WITH STEP-BY-STEP BREAKDOWN    */}
      {/* ======================================================== */}
      {activePage === "calculus" && (
        <section className="calculus-engine panel">
          <div className="calculus-heading">
            <div>
              <span>SYMBOLIC CALCULUS WORKSPACE</span>
              <h2>Derivatives &amp; Integrals</h2>
              <p>Exact closed-form mathematical solutions computed with SymPy and rendered in KaTeX.</p>
            </div>
            <div className="calculus-badge">EXACT ANALYTICAL ENGINE</div>
          </div>

          <div className="calculus-controls">
            <div className="calculus-field expression-field">
              <label>FUNCTION f(x)</label>
              <input
                value={calculusExpression}
                onChange={e => setCalculusExpression(e.target.value)}
                placeholder="3x^3 - 2x + 1"
              />
            </div>
            <div className="calculus-field">
              <label>OPERATION</label>
              <select value={calculusOperation} onChange={e => setCalculusOperation(e.target.value)}>
                <option value="differentiate">Differentiate (d/dx)</option>
                <option value="integrate">Indefinite Integral (∫)</option>
                <option value="definite_integral">Definite Integral (∫ a..b)</option>
              </select>
            </div>
            {calculusOperation === "differentiate" && (
              <div className="calculus-field order-field">
                <label>ORDER</label>
                <select value={calculusOrder} onChange={e => setCalculusOrder(e.target.value)}>
                  <option value="1">1st Derivative (f′)</option>
                  <option value="2">2nd Derivative (f″)</option>
                  <option value="3">3rd Derivative (f‴)</option>
                  <option value="4">4th Derivative (f⁽⁴⁾)</option>
                  <option value="5">5th Derivative (f⁽⁵⁾)</option>
                </select>
              </div>
            )}
            {calculusOperation === "definite_integral" && (
              <>
                <div className="calculus-field limit-field">
                  <label>LOWER LIMIT (a)</label>
                  <input type="number" value={calculusA} onChange={e => setCalculusA(e.target.value)} />
                </div>
                <div className="calculus-field limit-field">
                  <label>UPPER LIMIT (b)</label>
                  <input type="number" value={calculusB} onChange={e => setCalculusB(e.target.value)} />
                </div>
              </>
            )}
            <button className="primary-button calculus-run" onClick={calculateCalculus} disabled={calculusLoading}>
              <Play size={15} />
              {calculusLoading ? "Calculating…" : "Execute"}
            </button>
          </div>

          <div className="calculus-body">
            <div className="calculus-answer">
              {!calculusResult ? (
                <div className="result-empty">Enter a function expression to view the closed-form result.</div>
              ) : calculusResult.error ? (
                <div className="error">{calculusResult.error}</div>
              ) : (
                <>
                  <span className="answer-label">{String(calculusResult.operation).toUpperCase()}</span>
                  
                  {/* KaTeX Rendered Big Formula */}
                  <div className="answer-expression">
                    <MathFormula tex={calculusResult.latex + (calculusResult.integration_constant_note ? " + C" : "")} block={true} />
                  </div>

                  <div className="answer-source">
                    Input: <MathFormula tex={`f(x) = ${calculusResult.original_latex || calculusResult.expression}`} />
                  </div>
                  {calculusResult.derivative && (
                    <div className="answer-source">
                      First derivative: <MathFormula tex={`f'(x) = ${calculusResult.derivative}`} />
                    </div>
                  )}

                  {/* Step-by-Step Breakdown Accordion */}
                  {calculusResult.steps?.length > 0 && (
                    <div className="steps-container">
                      <div className="steps-header" onClick={() => setShowSteps(!showSteps)}>
                        <span className="steps-title">
                          <BookOpen size={14} /> STEP-BY-STEP SOLUTION BREAKDOWN ({calculusResult.steps.length} STEPS)
                        </span>
                        {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>

                      {showSteps && (
                        <div className="steps-list">
                          {calculusResult.steps.map((st, idx) => (
                            <div key={idx} className="step-card">
                              <div className="step-number">{idx + 1}</div>
                              <div className="step-content">
                                <strong>{st.title}</strong>
                                <p>{st.description}</p>
                                {st.latex && (
                                  <div className="step-formula">
                                    <MathFormula tex={st.latex} block={true} />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="calculus-visual">
              <div className="calculus-visual-head">
                <span>GRAPH PREVIEW</span>
                <small>
                  <i className="original-dot" /> f(x) <i className="derivative-dot" /> f′(x)
                </small>
              </div>
              <CalculusMiniPlot
                points={calculusResult?.plot_points}
                derivativePoints={calculusResult?.derivative_plot_points}
              />
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. TAYLOR SERIES MODULE WITH DUAL PLOT                   */}
      {/* ======================================================== */}
      {activePage === "taylor" && (
        <section className="calculus-engine panel">
          <div className="calculus-heading">
            <div>
              <span>TAYLOR &amp; MACLAURIN EXPANSIONS</span>
              <h2>Polynomial Series Approximator</h2>
              <p>Approximate smooth functions around expansion center a with dynamic polynomial order.</p>
            </div>
            <div className="calculus-badge">SERIES ANALYSIS</div>
          </div>

          <div className="calculus-controls">
            <div className="calculus-field expression-field">
              <label>FUNCTION f(x)</label>
              <input
                value={taylorExpression}
                onChange={e => setTaylorExpression(e.target.value)}
                placeholder="sin(x)"
              />
            </div>
            <div className="calculus-field limit-field">
              <label>EXPANSION CENTER (a)</label>
              <input value={taylorPoint} onChange={e => setTaylorPoint(e.target.value)} placeholder="0 for Maclaurin" />
            </div>
            <div className="calculus-field">
              <label>ORDER N ({taylorOrder})</label>
              <input
                type="range"
                min="1"
                max="10"
                value={taylorOrder}
                onChange={e => setTaylorOrder(Number(e.target.value))}
                className="range-slider"
              />
            </div>
            <button className="primary-button calculus-run" onClick={calculateTaylor} disabled={taylorLoading}>
              <Play size={15} />
              {taylorLoading ? "Expanding…" : "Expand Series"}
            </button>
          </div>

          <div className="calculus-body">
            <div className="calculus-answer">
              {!taylorResult ? (
                <div className="result-empty">
                  Enter an analytical function and order N to calculate its Taylor expansion.
                </div>
              ) : taylorResult.error ? (
                <div className="error">{taylorResult.error}</div>
              ) : (
                <>
                  <span className="answer-label">TAYLOR POLYNOMIAL P_{taylorResult.order}(x)</span>
                  <div className="answer-expression">
                    <MathFormula tex={`P_{${taylorResult.order}}(x) = ${taylorResult.latex}`} block={true} />
                  </div>
                  <div className="answer-source">Expansion Center: a = {taylorResult.point}</div>

                  <div className="detected">
                    <span>STEP-BY-STEP DERIVATIVE COEFFICIENTS</span>
                    <div className="taylor-terms-table">
                      <div className="taylor-table-header">
                        <span>Degree</span>
                        <span>Derivative Value</span>
                        <span style={{ textAlign: "right" }}>Polynomial Term</span>
                      </div>
                      {taylorResult.terms?.map((term, i) => (
                        <div key={i} className="taylor-table-row">
                          <div className="taylor-order-pill">n = {term.order}</div>
                          <div className="taylor-deriv-cell">
                            <MathFormula tex={`f^{(${term.order})}(${taylorResult.point}) = ${term.derivative_value}`} />
                          </div>
                          <div className="taylor-term-cell">
                            <MathFormula tex={term.latex.trim().startsWith('-') ? term.latex : `+ ${term.latex}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="calculus-visual">
              <div className="calculus-visual-head">
                <span>CONVERGENCE GRAPH</span>
                <small>
                  <i className="original-dot" /> Exact f(x) <i className="taylor-dot" /> Taylor P_{taylorOrder}(x)
                </small>
              </div>
              <TaylorPlot
                originalPoints={taylorResult?.original_plot_points}
                taylorPoints={taylorResult?.taylor_plot_points}
              />
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 4. RIEMANN SUMS MODULE WITH INTERACTIVE PARTITIONS       */}
      {/* ======================================================== */}
      {activePage === "riemann" && (
        <section className="calculus-engine panel">
          <div className="calculus-heading">
            <div>
              <span>INTEGRAL AREA APPROXIMATION</span>
              <h2>Riemann Sums Visualizer</h2>
              <p>Simulate rectangular area partitions converging to the true definite integral.</p>
            </div>
            <div className="calculus-badge">GEOMETRIC INTEGRATION</div>
          </div>

          <div className="calculus-controls">
            <div className="calculus-field expression-field">
              <label>FUNCTION f(x)</label>
              <input
                value={riemannExpression}
                onChange={e => setRiemannExpression(e.target.value)}
                placeholder="x^2"
              />
            </div>
            <div className="calculus-field limit-field">
              <label>LOWER BOUND a</label>
              <input value={riemannA} onChange={e => setRiemannA(e.target.value)} />
            </div>
            <div className="calculus-field limit-field">
              <label>UPPER BOUND b</label>
              <input value={riemannB} onChange={e => setRiemannB(e.target.value)} />
            </div>
            <div className="calculus-field">
              <label>METHOD</label>
              <select value={riemannMethod} onChange={e => setRiemannMethod(e.target.value)}>
                <option value="midpoint">Midpoint Rule</option>
                <option value="left">Left Riemann Sum</option>
                <option value="right">Right Riemann Sum</option>
                <option value="trapezoid">Trapezoidal Rule</option>
              </select>
            </div>
            <div className="calculus-field">
              <label>PARTITIONS n = {riemannN}</label>
              <input
                type="range"
                min="4"
                max="50"
                value={riemannN}
                onChange={e => setRiemannN(Number(e.target.value))}
                className="range-slider"
              />
            </div>
            <button className="primary-button calculus-run" onClick={calculateRiemann} disabled={riemannLoading}>
              <Play size={15} />
              {riemannLoading ? "Partitioning…" : "Compute Sum"}
            </button>
          </div>

          <div className="calculus-body">
            <div className="calculus-answer">
              {!riemannResult ? (
                <div className="result-empty">Configure interval and partition count to compute the Riemann sum.</div>
              ) : riemannResult.error ? (
                <div className="error">{riemannResult.error}</div>
              ) : (
                <>
                  <span className="answer-label">SUM APPROXIMATION RESULT</span>
                  <div className="answer-expression">
                    <MathFormula tex={`\\sum_{i=1}^{${riemannResult.n}} f(x_i^*)\\,\\Delta x \\approx ${riemannResult.riemann_sum}`} block={true} />
                  </div>
                  <div className="result-row">
                    <span>Exact Definite Integral</span>
                    <b>{riemannResult.exact_integral ?? "—"}</b>
                  </div>
                  <div className="result-row">
                    <span>Absolute Error |Sum − Exact|</span>
                    <b>{riemannResult.error ?? "—"}</b>
                  </div>
                  <div className="result-row">
                    <span>Subinterval Width (Δx)</span>
                    <b>{riemannResult.dx}</b>
                  </div>
                  <div className="result-row">
                    <span>Number of Partitions (n)</span>
                    <b>{riemannResult.n}</b>
                  </div>
                </>
              )}
            </div>

            <div className="calculus-visual">
              <div className="calculus-visual-head">
                <span>AREA UNDER CURVE</span>
                <small>
                  <i className="secant-key" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2 }} /> f(x)
                  <i className="curve-key" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, marginLeft: 8 }} /> Rectangles
                </small>
              </div>
              <RiemannAreaPlot
                rectangles={riemannResult?.rectangles}
                plotPoints={riemannResult?.plot_points}
                a={Number(riemannA)}
                b={Number(riemannB)}
              />
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 5. CRITICAL POINTS & EXTREMA MODULE                      */}
      {/* ======================================================== */}
      {activePage === "critical" && (
        <section className="calculus-engine panel" id="critical-points">
          <div className="calculus-heading">
            <div>
              <span>APPLICATIONS OF DERIVATIVES</span>
              <h2>Critical Points, Extrema &amp; Inflections</h2>
              <p>Locate stationary points, classify local max/min, identify inflection points, and find global bounds.</p>
            </div>
            <div className="calculus-badge">OPTIMIZATION ENGINE</div>
          </div>

          <div className="calculus-controls">
            <div className="calculus-field expression-field">
              <label>FUNCTION f(x)</label>
              <input
                value={criticalExpression}
                onChange={e => setCriticalExpression(e.target.value)}
                placeholder="x^3 - 3x"
              />
            </div>
            <div className="calculus-field limit-field">
              <label>INTERVAL LOWER BOUND</label>
              <input type="number" value={criticalA} onChange={e => setCriticalA(e.target.value)} />
            </div>
            <div className="calculus-field limit-field">
              <label>INTERVAL UPPER BOUND</label>
              <input type="number" value={criticalB} onChange={e => setCriticalB(e.target.value)} />
            </div>
            <button className="primary-button calculus-run" onClick={calculateCriticalPoints} disabled={criticalLoading}>
              <Play size={15} />
              {criticalLoading ? "Finding Extrema…" : "Locate Extrema"}
            </button>
          </div>

          <div className="calculus-body">
            <div className="calculus-answer">
              {!criticalResult ? (
                <div className="result-empty">Enter a function and bounds to locate critical points.</div>
              ) : criticalResult.error ? (
                <div className="error">{criticalResult.error}</div>
              ) : (
                <>
                  <span className="answer-label">EXTREMA ANALYSIS REPORT</span>
                  <div className="answer-source">
                    First derivative: <MathFormula tex={`f'(x) = ${criticalResult.first_derivative}`} />
                  </div>
                  <div className="answer-source">
                    Second derivative: <MathFormula tex={`f''(x) = ${criticalResult.second_derivative}`} />
                  </div>

                  {criticalResult.global_maximum && (
                    <div className="result-row highlight-row">
                      <span>Global Maximum on [{criticalA}, {criticalB}]</span>
                      <b>f({criticalResult.global_maximum.x}) = {criticalResult.global_maximum.y}</b>
                    </div>
                  )}

                  {criticalResult.global_minimum && (
                    <div className="result-row highlight-row">
                      <span>Global Minimum on [{criticalA}, {criticalB}]</span>
                      <b>f({criticalResult.global_minimum.x}) = {criticalResult.global_minimum.y}</b>
                    </div>
                  )}

                  <div className="detected">
                    <span>CRITICAL POINTS FOUND ({criticalResult.critical_points?.length || 0})</span>
                    <div className="critical-point-list">
                      {criticalResult.critical_points?.map((pt, idx) => (
                        <div key={idx} className="critical-point-card">
                          <span className="critical-point-kind">{pt.classification}</span>
                          <strong>x = {pt.x}, f(x) = {pt.y}</strong>
                          <small>f″({pt.x}) = {pt.second_derivative}</small>
                        </div>
                      ))}
                    </div>
                  </div>

                  {criticalResult.inflection_points?.length > 0 && (
                    <div className="detected">
                      <span>INFLECTION POINTS [f″(x) = 0]</span>
                      <div className="coordinate-list">
                        {criticalResult.inflection_points.map((inf, i) => (
                          <div key={i} className="term-chip">
                            <b>Inflection Point:</b>
                            <span>({inf.x}, {inf.y})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="calculus-visual">
              <div className="calculus-visual-head">
                <span>CURVE PREVIEW</span>
              </div>
              <CalculusMiniPlot points={criticalResult?.plot_points} />
            </div>
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 6. LIMITS & CONTINUITY MODULE                            */}
      {/* ======================================================== */}
      {activePage === "limits" && (
        <section className="calculus-engine panel limits-module" id="limits-continuity">
          <div className="calculus-heading">
            <div>
              <span>ASYMPTOTIC BEHAVIOR &amp; LIMITS</span>
              <h2>Limits &amp; Continuity</h2>
              <p>Solve two-sided and one-sided limits, limits at infinity, and check point continuity.</p>
            </div>
            <div className="calculus-badge">LIMIT CALCULATOR</div>
          </div>

          <div className="calculus-controls">
            <div className="calculus-field expression-field">
              <label>FUNCTION f(x)</label>
              <input
                value={limitExpression}
                onChange={e => setLimitExpression(e.target.value)}
                placeholder="sin(x)/x"
              />
            </div>
            <div className="calculus-field">
              <label>OPERATION</label>
              <select value={limitOperation} onChange={e => setLimitOperation(e.target.value)}>
                <option value="limit">Calculate Limit</option>
                <option value="continuity">Verify Continuity</option>
              </select>
            </div>
            <div className="calculus-field limit-field">
              <label>TARGET POINT x →</label>
              <input value={limitPoint} onChange={e => setLimitPoint(e.target.value)} placeholder="0, oo, -oo" />
            </div>
            {limitOperation === "limit" && (
              <div className="calculus-field">
                <label>DIRECTION</label>
                <select value={limitDirection} onChange={e => setLimitDirection(e.target.value)}>
                  <option value="both">Two-sided (x → a)</option>
                  <option value="left">Left-hand (x → a⁻)</option>
                  <option value="right">Right-hand (x → a⁺)</option>
                </select>
              </div>
            )}
            <button className="primary-button calculus-run" onClick={calculateLimit} disabled={limitLoading}>
              <Play size={15} />
              {limitLoading ? "Calculating…" : "Evaluate Limit"}
            </button>
          </div>

          <div className="calculus-body">
            <div className="calculus-answer">
              {!limitResult ? (
                <div className="result-empty">Enter a function and approaching point to compute the limit.</div>
              ) : limitResult.error ? (
                <div className="error">{limitResult.error}</div>
              ) : (
                <>
                  <span className="answer-label">{String(limitResult.operation).toUpperCase()}</span>
                  <div className="answer-expression">
                    <MathFormula tex={`\\lim_{x \\to ${limitResult.point}} f(x) = ${limitResult.latex || limitResult.result}`} block={true} />
                  </div>
                  <div className="answer-source">Approaching: x → {String(limitResult.point)}</div>
                  {limitResult.left_limit != null && (
                    <div className="answer-source">
                      Left limit: <MathFormula tex={`\\lim_{x \\to ${limitResult.point}^-} = ${limitResult.left_limit}`} />
                    </div>
                  )}
                  {limitResult.right_limit != null && (
                    <div className="answer-source">
                      Right limit: <MathFormula tex={`\\lim_{x \\to ${limitResult.point}^+} = ${limitResult.right_limit}`} />
                    </div>
                  )}
                  {limitResult.continuous != null && (
                    <div className="result-row highlight-row">
                      <span>Continuity Status</span>
                      <b>{limitResult.continuous ? "Continuous" : "Discontinuous"}</b>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="calculus-visual">
              <div className="calculus-visual-head">
                <span>QUICK LIMIT PRESETS</span>
              </div>
              <div className="limit-examples">
                <button
                  type="button"
                  onClick={() => {
                    setLimitExpression("sin(x)/x");
                    setLimitPoint("0");
                    setLimitOperation("limit");
                    setLimitDirection("both");
                  }}
                >
                  <strong>sin(x)/x</strong>
                  <span>x → 0 (Standard trig limit = 1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLimitExpression("(1 + 1/x)^x");
                    setLimitPoint("oo");
                    setLimitOperation("limit");
                    setLimitDirection("both");
                  }}
                >
                  <strong>(1 + 1/x)ˣ</strong>
                  <span>x → ∞ (Euler's e)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLimitExpression("abs(x)/x");
                    setLimitPoint("0");
                    setLimitOperation("limit");
                    setLimitDirection("both");
                  }}
                >
                  <strong>|x|/x</strong>
                  <span>x → 0 (Jump discontinuity)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLimitExpression("1/x");
                    setLimitPoint("0");
                    setLimitOperation("limit");
                    setLimitDirection("right");
                  }}
                >
                  <strong>1/x</strong>
                  <span>x → 0⁺ (Infinite asymptote)</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer>
        <div className="footer-content">
          <span>AI MATH LAB · Next-Generation Computational Mathematics Platform</span>
          <span>FastAPI · PyTorch · SymPy · Three.js · React · KaTeX</span>
        </div>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
