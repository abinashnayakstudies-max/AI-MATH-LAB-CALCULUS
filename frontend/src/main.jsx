import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Check,
  CircleHelp,
  Crosshair,
  FlaskConical,
  Play,
  Pause,
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
  ArrowRight,
  Radio,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Home,
  LayoutDashboard,
  SlidersHorizontal,
  ExternalLink,
  Waves,
  Bot,
  MessageSquare,
  Send,
  User
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./style.css";

const API = (import.meta.env.VITE_API_BASE_URL || "https://ai-math-lab-backend.onrender.com").replace(/\/$/, "");

// ----------------------------------------------------
// Safe KaTeX Helper (Never emits raw red KaTeX parse error HTML)
// ----------------------------------------------------
function renderSafeKatex(tex, isBlock = false) {
  try {
    return katex.renderToString(tex, {
      displayMode: isBlock,
      throwOnError: true
    });
  } catch (err) {
    return null;
  }
}

// ----------------------------------------------------
// KaTeX Math Rendering Component (Synchronous & Bundled)
// ----------------------------------------------------
function MathFormula({ tex, block = false }) {
  const content = String(tex || "");
  if (!content) return null;

  // If text contains $...$ or $$...$$ delimiters, parse mixed prose + LaTeX
  if (content.includes("$")) {
    const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^\$]+?\$)/g);
    return (
      <span className={block ? "math-block" : "math-inline"}>
        {parts.map((part, idx) => {
          if (part.startsWith("$$") && part.endsWith("$$")) {
            const math = part.slice(2, -2).trim();
            const html = renderSafeKatex(math, true);
            return html ? (
              <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <span key={idx} className="math-fallback">{math}</span>
            );
          } else if (part.startsWith("$") && part.endsWith("$")) {
            const math = part.slice(1, -1).trim();
            const html = renderSafeKatex(math, false);
            return html ? (
              <span key={idx} dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <span key={idx} className="math-fallback">{math}</span>
            );
          } else {
            return <span key={idx}>{part}</span>;
          }
        })}
      </span>
    );
  }

  // If there are no $ delimiters, check if this is plain prose rather than LaTeX math
  const isLikelyProse =
    !content.includes("\\") &&
    !content.includes("^") &&
    !content.includes("_") &&
    content.includes(" ") &&
    !content.includes("=");

  if (isLikelyProse) {
    return <span className={block ? "math-block" : "math-inline"}>{content}</span>;
  }

  const html = renderSafeKatex(content, block);
  if (html) {
    return (
      <span
        className={block ? "math-block" : "math-inline"}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span className={block ? "math-block math-fallback" : "math-inline math-fallback"}>
      {content}
    </span>
  );
}

// ----------------------------------------------------
// Inline Rich Text Parser (Math + Bold + Code + Plain Text)
// ----------------------------------------------------
function InlineRichText({ text }) {
  if (!text) return null;
  const parts = String(text).split(/(\s*\$[^\$]+?\$\s*|\*\*[^*]+?\*\*|`[^`]+?`)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        const trimmed = part.trim();
        if (trimmed.startsWith("$") && trimmed.endsWith("$") && trimmed.length > 2) {
          const math = trimmed.slice(1, -1).trim();
          const html = renderSafeKatex(math, false);
          return html ? (
            <span key={idx} className="inline-math" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <span key={idx} className="inline-math-fallback">{math}</span>
          );
        } else if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          const bold = part.slice(2, -2);
          return <strong key={idx} className="rich-bold">{bold}</strong>;
        } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          const code = part.slice(1, -1);
          return <code key={idx} className="rich-code">{code}</code>;
        } else {
          return <span key={idx}>{part}</span>;
        }
      })}
    </>
  );
}

// ----------------------------------------------------
// Full Rich Math & Markdown Text Component
// ----------------------------------------------------
function RichMathText({ content }) {
  if (!content) return null;
  const str = String(content).replace(/\r\n/g, "\n");
  const blocks = str.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <div className="rich-math-content">
      {blocks.map((block, bIdx) => {
        if (!block) return null;
        if (block.startsWith("$$") && block.endsWith("$$")) {
          const math = block.slice(2, -2).trim();
          const html = renderSafeKatex(math, true);
          return html ? (
            <div key={bIdx} className="rich-math-display" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div key={bIdx} className="rich-math-display fallback">
              <code>{math}</code>
            </div>
          );
        }

        const paras = block.split(/\n\s*\n/);
        return (
          <div key={bIdx} className="rich-text-block">
            {paras.map((p, pIdx) => {
              const lines = p.split("\n").filter((l) => l.trim().length > 0);
              if (lines.length === 0) return null;

              const hasBullets = lines.some((l) => /^\s*[-*]\s+/.test(l));
              if (hasBullets) {
                return (
                  <ul key={pIdx} className="rich-bullet-list">
                    {lines.map((line, lIdx) => {
                      const cleanLine = line.replace(/^\s*[-*]\s+/, "");
                      return (
                        <li key={lIdx} className="rich-bullet-item">
                          <InlineRichText text={cleanLine} />
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              return (
                <p key={pIdx} className="rich-para">
                  {lines.map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      <InlineRichText text={line} />
                      {lIdx < lines.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
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

// ====================================================
// SIGNALS & SYSTEMS: SIGNAL PLOT (CONTINUOUS & STEM)
// ====================================================
function SignalPlot({ originalSamples, transformedSamples, domain, signalType }) {
  const [hoverPt, setHoverPt] = useState(null);
  const isDiscrete = domain === "discrete";

  const allPts = useMemo(() => {
    return [...(originalSamples || []), ...(transformedSamples || [])];
  }, [originalSamples, transformedSamples]);

  if (!originalSamples?.length) {
    return <div className="result-empty">Configure parameters and click "Generate & Transform" to render signal.</div>;
  }

  const xs = allPts.map(p => p.t);
  const ys = allPts.map(p => p.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 0);
  let minY = Math.min(...ys, 0);
  let maxY = Math.max(...ys, 0);

  if (Math.abs(maxY - minY) < 0.1) {
    minY -= 1;
    maxY += 1;
  } else {
    const pad = (maxY - minY) * 0.18;
    minY -= pad;
    maxY += pad;
  }

  const svgW = 760;
  const svgH = 340;
  const margin = { left: 55, right: 35, top: 25, bottom: 45 };
  const plotW = svgW - margin.left - margin.right;
  const plotH = svgH - margin.top - margin.bottom;

  const mapX = val => margin.left + ((val - minX) / (maxX - minX || 1)) * plotW;
  const mapY = val => margin.top + ((maxY - val) / (maxY - minY || 1)) * plotH;

  const yZero = mapY(0);
  const xZero = mapX(0);

  const xTicks = [];
  const xStep = Math.max(1, Math.round((maxX - minX) / 8));
  for (let xVal = Math.ceil(minX); xVal <= Math.floor(maxX); xVal += xStep) {
    xTicks.push(xVal);
  }

  const yTicks = [
    minY + (maxY - minY) * 0.1,
    minY + (maxY - minY) * 0.35,
    0,
    minY + (maxY - minY) * 0.65,
    minY + (maxY - minY) * 0.9
  ].filter((v, i, self) => self.findIndex(t => Math.abs(t - v) < 0.05) === i);

  const buildPath = samples => {
    if (!samples?.length) return "";
    return samples.reduce(
      (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${mapX(pt.t).toFixed(1)} ${mapY(pt.y).toFixed(1)}`,
      ""
    );
  };

  const origPath = !isDiscrete ? buildPath(originalSamples) : "";
  const transPath = !isDiscrete ? buildPath(transformedSamples) : "";

  return (
    <div className="signal-plot-wrapper">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="signal-svg"
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const svgX = (mouseX / rect.width) * svgW;
          const tVal = minX + ((svgX - margin.left) / plotW) * (maxX - minX);
          if (originalSamples?.length) {
            let closest = originalSamples[0];
            let closestDist = Math.abs(closest.t - tVal);
            for (const pt of originalSamples) {
              const d = Math.abs(pt.t - tVal);
              if (d < closestDist) {
                closest = pt;
                closestDist = d;
              }
            }
            const transMatch = transformedSamples?.find(tp => Math.abs(tp.t - closest.t) < 0.001);
            setHoverPt({ t: closest.t, yOrig: closest.y, yTrans: transMatch?.y ?? null });
          }
        }}
        onMouseLeave={() => setHoverPt(null)}
      >
        {/* Horizontal grid lines & ticks */}
        {yTicks.map((yVal, i) => {
          const py = mapY(yVal);
          return (
            <g key={`ygrid-${i}`}>
              <line
                x1={margin.left}
                y1={py}
                x2={svgW - margin.right}
                y2={py}
                stroke="rgba(245, 239, 230, 0.06)"
                strokeDasharray="3 3"
              />
              <text
                x={margin.left - 10}
                y={py + 4}
                fill="#a3b5a5"
                fontSize="11"
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
              >
                {yVal.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Vertical grid lines & ticks */}
        {xTicks.map((xVal, i) => {
          const px = mapX(xVal);
          return (
            <g key={`xgrid-${i}`}>
              <line
                x1={px}
                y1={margin.top}
                x2={px}
                y2={svgH - margin.bottom}
                stroke="rgba(245, 239, 230, 0.06)"
                strokeDasharray="3 3"
              />
              <text
                x={px}
                y={svgH - margin.bottom + 20}
                fill="#a3b5a5"
                fontSize="11"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {xVal}
              </text>
            </g>
          );
        })}

        {/* Zero Axes */}
        {yZero >= margin.top && yZero <= svgH - margin.bottom && (
          <line
            x1={margin.left}
            y1={yZero}
            x2={svgW - margin.right}
            y2={yZero}
            stroke="rgba(245, 239, 230, 0.3)"
            strokeWidth="1.5"
          />
        )}
        {xZero >= margin.left && xZero <= svgW - margin.right && (
          <line
            x1={xZero}
            y1={margin.top}
            x2={xZero}
            y2={svgH - margin.bottom}
            stroke="rgba(245, 239, 230, 0.3)"
            strokeWidth="1.5"
          />
        )}

        {/* Axis Labels */}
        <text
          x={svgW - margin.right}
          y={yZero - 8}
          fill="#f5efe6"
          fontSize="12"
          textAnchor="end"
          fontFamily="JetBrains Mono, monospace"
        >
          {isDiscrete ? "n" : "t"}
        </text>
        <text
          x={xZero + 8}
          y={margin.top + 10}
          fill="#f5efe6"
          fontSize="12"
          fontFamily="JetBrains Mono, monospace"
        >
          Amplitude
        </text>

        {/* CONTINUOUS CURVES */}
        {!isDiscrete && (
          <>
            {origPath && (
              <path
                d={origPath}
                fill="none"
                stroke="#f5efe6"
                strokeWidth="2.0"
                opacity="0.75"
                strokeDasharray="5 3"
              />
            )}
            {transPath && (
              <path
                d={transPath}
                fill="none"
                stroke="#c23b60"
                strokeWidth="2.8"
              />
            )}
          </>
        )}

        {/* DISCRETE STEM PLOT */}
        {isDiscrete && (
          <>
            {/* Original Signal Stems */}
            {originalSamples.map((pt, i) => {
              const cx = mapX(pt.t);
              const cy = mapY(pt.y);
              return (
                <g key={`orig-stem-${i}`} opacity="0.6">
                  <line
                    x1={cx}
                    y1={yZero}
                    x2={cx}
                    y2={cy}
                    stroke="#f5efe6"
                    strokeWidth="1.8"
                    strokeDasharray="3 2"
                  />
                  <circle cx={cx} cy={cy} r="3.5" fill="#f5efe6" />
                </g>
              );
            })}
            {/* Transformed Signal Stems */}
            {transformedSamples.map((pt, i) => {
              const cx = mapX(pt.t);
              const cy = mapY(pt.y);
              return (
                <g key={`trans-stem-${i}`}>
                  <line
                    x1={cx}
                    y1={yZero}
                    x2={cx}
                    y2={cy}
                    stroke="#c23b60"
                    strokeWidth="2.4"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill="#c23b60"
                    stroke="#781d39"
                    strokeWidth="1.2"
                  />
                </g>
              );
            })}
          </>
        )}

        {/* Hover Crosshair */}
        {hoverPt && (
          <g>
            <line
              x1={mapX(hoverPt.t)}
              y1={margin.top}
              x2={mapX(hoverPt.t)}
              y2={svgH - margin.bottom}
              stroke="rgba(194, 59, 96, 0.6)"
              strokeDasharray="3 3"
            />
            <circle
              cx={mapX(hoverPt.t)}
              cy={mapY(hoverPt.yOrig)}
              r="5"
              fill="#f5efe6"
              stroke="#0d0b0e"
              strokeWidth="2"
            />
            {hoverPt.yTrans != null && (
              <circle
                cx={mapX(hoverPt.t)}
                cy={mapY(hoverPt.yTrans)}
                r="6"
                fill="#c23b60"
                stroke="#f5efe6"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {/* Legend & Hover Info */}
      <div className="signal-plot-footer">
        <div className="plot-legend">
          <div className="legend-item">
            <span className="legend-marker base-marker" />
            <span>Base Signal x({isDiscrete ? "n" : "t"})</span>
          </div>
          <div className="legend-item">
            <span className="legend-marker trans-marker" />
            <span>Transformed Signal y({isDiscrete ? "n" : "t"})</span>
          </div>
        </div>

        {hoverPt && (
          <div className="hover-badge">
            <span>{isDiscrete ? `n = ${hoverPt.t}` : `t = ${hoverPt.t.toFixed(2)}`}</span>
            <span>x = {hoverPt.yOrig.toFixed(3)}</span>
            {hoverPt.yTrans != null && <span>y = {hoverPt.yTrans.toFixed(3)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ====================================================
// CONVOLUTION SUB-TRACK SVG COMPONENT
// ====================================================
function ConvTrackSvg({ points, domain, strokeColor, fillColor, showArea = false, activePoint = null }) {
  if (!points?.length) return <div className="result-empty">No data points.</div>;
  const isDisc = domain === "discrete";
  const xs = points.map(p => (isDisc ? (p.k ?? p.n) : p.t));
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 0);
  let minY = Math.min(...ys, 0);
  let maxY = Math.max(...ys, 0);

  if (Math.abs(maxY - minY) < 0.1) {
    minY -= 1;
    maxY += 1;
  } else {
    const pad = (maxY - minY) * 0.2;
    minY -= pad;
    maxY += pad;
  }

  const svgW = 440;
  const svgH = 140;
  const margin = { left: 40, right: 25, top: 15, bottom: 25 };
  const plotW = svgW - margin.left - margin.right;
  const plotH = svgH - margin.top - margin.bottom;

  const mapX = val => margin.left + ((val - minX) / (maxX - minX || 1)) * plotW;
  const mapY = val => margin.top + ((maxY - val) / (maxY - minY || 1)) * plotH;
  const yZero = mapY(0);
  const xZero = mapX(0);

  let pathD = "";
  let areaD = "";
  if (!isDisc) {
    pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${mapX(p.t).toFixed(1)} ${mapY(p.y).toFixed(1)}`, "");
    if (showArea && points.length > 1) {
      areaD = `${pathD} L ${mapX(points[points.length - 1].t).toFixed(1)} ${yZero} L ${mapX(points[0].t).toFixed(1)} ${yZero} Z`;
    }
  }

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="conv-track-svg">
      <line x1={margin.left} y1={yZero} x2={svgW - margin.right} y2={yZero} stroke="rgba(245, 239, 230, 0.2)" strokeWidth="1" />
      <line x1={xZero} y1={margin.top} x2={xZero} y2={svgH - margin.bottom} stroke="rgba(245, 239, 230, 0.2)" strokeWidth="1" />

      {showArea && areaD && <path d={areaD} fill={fillColor || "rgba(194, 59, 96, 0.25)"} />}
      {!isDisc && pathD && <path d={pathD} fill="none" stroke={strokeColor || "#f5efe6"} strokeWidth="2" />}

      {isDisc && points.map((p, i) => {
        const valX = p.k ?? p.n;
        const cx = mapX(valX);
        const cy = mapY(p.y);
        return (
          <g key={i}>
            <line x1={cx} y1={yZero} x2={cx} y2={cy} stroke={strokeColor || "#c23b60"} strokeWidth="1.8" />
            <circle cx={cx} cy={cy} r="3.5" fill={strokeColor || "#c23b60"} />
          </g>
        );
      })}

      {activePoint != null && (
        <g>
          <line
            x1={mapX(activePoint.x)}
            y1={margin.top}
            x2={mapX(activePoint.x)}
            y2={svgH - margin.bottom}
            stroke="rgba(194, 59, 96, 0.8)"
            strokeDasharray="3 3"
          />
          <circle cx={mapX(activePoint.x)} cy={mapY(activePoint.y)} r="5.5" fill="#c23b60" stroke="#f5efe6" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

// ====================================================
// MODULE 07: SIGNAL EXPLORER COMPONENT
// ====================================================
function SignalExplorer() {
  const [signalType, setSignalType] = useState("step");
  const [domain, setDomain] = useState("continuous");
  const [timeStart, setTimeStart] = useState("-5");
  const [timeEnd, setTimeEnd] = useState("5");
  const [amplitude, setAmplitude] = useState("1");
  const [frequency, setFrequency] = useState("1");
  const [phase, setPhase] = useState("0");
  const [decay, setDecay] = useState("-0.5");
  const [pulseWidth, setPulseWidth] = useState("2");
  const [timeShift, setTimeShift] = useState("0");
  const [timeScaling, setTimeScaling] = useState("1");
  const [timeReversal, setTimeReversal] = useState(false);
  const [ampScale, setAmpScale] = useState("1");

  const [signalResult, setSignalResult] = useState(null);
  const [signalLoading, setSignalLoading] = useState(false);

  const generateSignal = useCallback(async () => {
    setSignalLoading(true);
    try {
      const response = await fetch(`${API}/signals/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal_type: signalType,
          domain: domain,
          time_start: Number(timeStart),
          time_end: Number(timeEnd),
          amplitude: Number(amplitude),
          frequency: Number(frequency),
          phase: Number(phase),
          decay: Number(decay),
          pulse_width: Number(pulseWidth),
          time_shift: Number(timeShift),
          time_scaling: Number(timeScaling),
          time_reversal: Boolean(timeReversal),
          amp_scale: Number(ampScale)
        })
      });
      const data = await response.json();
      setSignalResult(data);
    } catch {
      setSignalResult({ error: "Signals service connection error." });
    } finally {
      setSignalLoading(false);
    }
  }, [signalType, domain, timeStart, timeEnd, amplitude, frequency, phase, decay, pulseWidth, timeShift, timeScaling, timeReversal, ampScale]);

  useEffect(() => {
    generateSignal();
  }, []);

  return (
    <div className="signals-workspace">
      {/* Parameter Controls Panel */}
      <aside className="controls panel">
        <div className="panel-title">
          <span>01</span>
          <div>
            <h2>Signal Generator</h2>
            <p>Select waveform and transformations.</p>
          </div>
        </div>

        <div className="calculus-field">
          <label>SIGNAL FAMILY</label>
          <select value={signalType} onChange={e => setSignalType(e.target.value)}>
            <option value="step">Unit Step u(t) / u[n]</option>
            <option value="impulse">Unit Impulse δ(t) / δ[n]</option>
            <option value="ramp">Unit Ramp r(t) / r[n]</option>
            <option value="rect">Rectangular Pulse rect(t/τ)</option>
            <option value="sine">Sinusoid sin(ωt)</option>
            <option value="cosine">Cos Waveform cos(ωt)</option>
            <option value="exponential">Decaying Exponential exp(-at)</option>
            <option value="sinc">Sinc Pulse sinc(t)</option>
          </select>
        </div>

        <div className="calculus-field">
          <label>DOMAIN</label>
          <div className="option-row">
            <button
              type="button"
              className={domain === "continuous" ? "active" : ""}
              onClick={() => setDomain("continuous")}
            >
              Continuous (t)
            </button>
            <button
              type="button"
              className={domain === "discrete" ? "active" : ""}
              onClick={() => setDomain("discrete")}
            >
              Discrete [n] Stem
            </button>
          </div>
        </div>

        <div className="bounds">
          <div>
            <label>TIME START</label>
            <input
              value={timeStart}
              onChange={e => setTimeStart(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
            />
          </div>
          <div>
            <label>TIME END</label>
            <input
              value={timeEnd}
              onChange={e => setTimeEnd(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
            />
          </div>
        </div>

        <div className="bounds">
          <div>
            <label>AMPLITUDE A</label>
            <input
              value={amplitude}
              onChange={e => setAmplitude(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
            />
          </div>
          {(signalType === "sine" || signalType === "cosine") && (
            <div>
              <label>FREQUENCY ω</label>
              <input
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
              />
            </div>
          )}
          {signalType === "rect" && (
            <div>
              <label>PULSE WIDTH τ</label>
              <input
                value={pulseWidth}
                onChange={e => setPulseWidth(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
              />
            </div>
          )}
          {signalType === "exponential" && (
            <div>
              <label>DECAY RATE α</label>
              <input
                value={decay}
                onChange={e => setDecay(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
              />
            </div>
          )}
        </div>

        <div className="panel-title" style={{ marginTop: "16px" }}>
          <span>02</span>
          <div>
            <h2>Transformations y(t) = A·x(a(t - t₀))</h2>
            <p>Shift, time scaling, reversal, amplitude.</p>
          </div>
        </div>

        <div className="bounds">
          <div>
            <label>TIME SHIFT t₀ (Delay &gt; 0, Advance &lt; 0)</label>
            <input
              value={timeShift}
              onChange={e => setTimeShift(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
            />
          </div>
          <div>
            <label>TIME SCALE a (Compress &gt; 1, Expand &lt; 1)</label>
            <input
              value={timeScaling}
              onChange={e => setTimeScaling(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
            />
          </div>
        </div>

        <div className="bounds">
          <div>
            <label>AMPLITUDE SCALE A</label>
            <input
              value={ampScale}
              onChange={e => setAmpScale(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") generateSignal(); }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: "4px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={timeReversal}
                onChange={e => setTimeReversal(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--accent-crimson)" }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-main)" }}>Time Reversal x(-t)</span>
            </label>
          </div>
        </div>

        <button className="primary-button" onClick={generateSignal} disabled={signalLoading}>
          <Play size={15} />
          {signalLoading ? "Generating Waveform…" : "Generate & Transform"}
        </button>

        {/* Quick presets */}
        <div className="presets-strip" style={{ marginTop: "14px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Presets:</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setSignalType("step");
                setTimeShift("2");
                setTimeScaling("1");
                setTimeReversal(false);
              }}
            >
              Delayed Step u(t-2)
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setSignalType("rect");
                setPulseWidth("3");
                setTimeShift("0");
                setTimeScaling("2");
                setTimeReversal(false);
              }}
            >
              Compressed Rect rect(2t)
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setSignalType("ramp");
                setTimeShift("0");
                setTimeScaling("1");
                setTimeReversal(true);
              }}
            >
              Reversed Ramp r(-t)
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setSignalType("exponential");
                setDecay("-0.8");
                setTimeShift("0");
                setTimeScaling("1");
                setTimeReversal(false);
              }}
            >
              Exp Decay exp(-0.8t)
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                setSignalType("sinc");
                setTimeShift("0");
                setTimeScaling("1");
                setTimeReversal(false);
              }}
            >
              Sinc Pulse sinc(t)
            </button>
          </div>
        </div>
      </aside>

      {/* SVG Plot Center Stage */}
      <section className="visual-panel panel">
        <div className="plot-header">
          <div>
            <span className="badge-tag">INTERACTIVE SIGNAL VISUALIZER</span>
            <h2>{domain === "discrete" ? "Discrete Stem Plot [n]" : "Continuous Waveform (t)"}</h2>
          </div>
          <span className="drag-note">Hover over waveform to inspect sample coordinates</span>
        </div>

        <SignalPlot
          originalSamples={signalResult?.original_samples}
          transformedSamples={signalResult?.transformed_samples}
          domain={domain}
          signalType={signalType}
        />

        <div className="plot-foot">
          <span>Dual overlay: Base x({domain === "discrete" ? "n" : "t"}) vs Transformed y({domain === "discrete" ? "n" : "t"})</span>
          <span>{signalResult?.original_samples ? `${signalResult.original_samples.length} points sampled` : "Awaiting run"}</span>
        </div>
      </section>

      {/* Analytics & Metrics Sidebar */}
      <aside className="results panel">
        <div className="panel-title">
          <span>03</span>
          <div>
            <h2>Analytical Properties</h2>
            <p>Signal metrics &amp; KaTeX definitions.</p>
          </div>
        </div>

        {!signalResult ? (
          <div className="result-empty">Run signal generation to evaluate energy and transformation formulas.</div>
        ) : signalResult.error ? (
          <div className="error">{signalResult.error}</div>
        ) : (
          <>
            <div className="verified-box">
              <span>BASE SIGNAL x({domain === "discrete" ? "n" : "t"})</span>
              <div style={{ marginTop: "6px" }}>
                <MathFormula tex={signalResult.base_latex} block={true} />
              </div>
            </div>

            <div className="verified-box" style={{ borderColor: "rgba(194, 59, 96, 0.4)", background: "rgba(120, 29, 57, 0.12)" }}>
              <span style={{ color: "var(--accent-crimson)" }}>TRANSFORMED SIGNAL y({domain === "discrete" ? "n" : "t"})</span>
              <div style={{ marginTop: "6px" }}>
                <MathFormula tex={signalResult.transformed_latex} block={true} />
              </div>
            </div>

            <div className="result-row highlight-row">
              <span>Signal Energy E</span>
              <b>{signalResult.energy != null ? signalResult.energy.toFixed(4) : "—"}</b>
            </div>
            <div className="result-row">
              <span>Domain Classification</span>
              <b>{domain === "discrete" ? "Discrete-Time [n]" : "Continuous-Time (t)"}</b>
            </div>
            <div className="result-row">
              <span>Waveform Family</span>
              <b style={{ textTransform: "capitalize" }}>{signalType}</b>
            </div>

            <div className="method-note" style={{ marginTop: "14px" }}>
              <CircleHelp size={15} />
              <span>
                Energy is defined as {domain === "discrete" ? "E = ∑ |x[n]|²" : "E = ∫ |x(t)|² dt"}.
                A signal is classified as an Energy Signal if 0 &lt; E &lt; ∞.
              </span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

// ====================================================
// MODULE 08: CONVOLUTION VISUALIZER COMPONENT
// ====================================================
function ConvolutionVisualizer() {
  const [presetX, setPresetX] = useState("rect");
  const [presetH, setPresetH] = useState("rect");
  const [domain, setDomain] = useState("continuous");
  const [currentShift, setCurrentShift] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [convResult, setConvResult] = useState(null);
  const [convLoading, setConvLoading] = useState(false);

  const computeConv = useCallback(async (shiftVal) => {
    setConvLoading(true);
    try {
      const response = await fetch(`${API}/signals/convolution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset_x: presetX,
          preset_h: presetH,
          domain: domain,
          current_shift: Number(shiftVal)
        })
      });
      const data = await response.json();
      setConvResult(data);
    } catch {
      setConvResult({ error: "Convolution service connection error." });
    } finally {
      setConvLoading(false);
    }
  }, [presetX, presetH, domain]);

  useEffect(() => {
    computeConv(currentShift);
  }, [presetX, presetH, domain]);

  // Animation player
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentShift(prev => {
        const step = domain === "discrete" ? 1 : 0.25;
        let next = prev + step;
        if (next > 4.5) next = -4.5;
        const rounded = Math.round(next * 10) / 10;
        computeConv(rounded);
        return rounded;
      });
    }, 180);
    return () => clearInterval(interval);
  }, [isPlaying, domain, computeConv]);

  return (
    <div className="convolution-container">
      {/* Control bar */}
      <div className="conv-control-bar">
        <div className="calculus-field" style={{ minWidth: "150px" }}>
          <label>INPUT SIGNAL x</label>
          <select value={presetX} onChange={e => setPresetX(e.target.value)}>
            <option value="rect">Rectangular Pulse</option>
            <option value="step">Unit Step</option>
            <option value="exponential">Decaying Exponential</option>
            <option value="ramp">Ramp</option>
            <option value="impulse">Unit Impulse</option>
          </select>
        </div>

        <div className="calculus-field" style={{ minWidth: "150px" }}>
          <label>IMPULSE RESPONSE h</label>
          <select value={presetH} onChange={e => setPresetH(e.target.value)}>
            <option value="rect">Rectangular Pulse</option>
            <option value="step">Unit Step</option>
            <option value="exponential">Decaying Exponential</option>
            <option value="ramp">Ramp</option>
            <option value="impulse">Unit Impulse</option>
          </select>
        </div>

        <div className="calculus-field" style={{ minWidth: "140px" }}>
          <label>DOMAIN</label>
          <select value={domain} onChange={e => { setDomain(e.target.value); setCurrentShift(0); }}>
            <option value="continuous">Continuous (t)</option>
            <option value="discrete">Discrete [n]</option>
          </select>
        </div>

        {/* Shift Slider */}
        <div className="conv-slider-group">
          <label>
            SHIFT PARAMETER {domain === "discrete" ? "n" : "t"} = {currentShift.toFixed(2)}
          </label>
          <div className="conv-slider-row">
            <input
              type="range"
              min="-5"
              max="5"
              step={domain === "discrete" ? "1" : "0.1"}
              value={currentShift}
              onChange={e => {
                const val = Number(e.target.value);
                setCurrentShift(val);
                computeConv(val);
              }}
            />
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                const step = domain === "discrete" ? 1 : 0.25;
                const next = Math.max(-5, Math.round((currentShift - step) * 10) / 10);
                setCurrentShift(next);
                computeConv(next);
              }}
            >
              - Step
            </button>
            <button
              type="button"
              className="filter-btn"
              onClick={() => {
                const step = domain === "discrete" ? 1 : 0.25;
                const next = Math.min(5, Math.round((currentShift + step) * 10) / 10);
                setCurrentShift(next);
                computeConv(next);
              }}
            >
              + Step
            </button>
            <button
              type="button"
              className="primary-button"
              style={{ padding: "6px 14px", height: "auto" }}
              onClick={() => setIsPlaying(p => !p)}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              {isPlaying ? "Pause" : "Play Sweep"}
            </button>
          </div>
        </div>

        {/* Readout metric */}
        <div className="verified-box" style={{ padding: "10px 18px", minWidth: "200px" }}>
          <span style={{ fontSize: "11px" }}>INSTANT CONVOLUTION y({domain === "discrete" ? currentShift : currentShift.toFixed(2)})</span>
          <strong style={{ fontSize: "20px" }}>{convResult?.instant_value?.toFixed(4) ?? "—"}</strong>
        </div>
      </div>

      {/* 2x2 Synchronized Visualization Grid */}
      <div className="conv-tracks">
        {/* Track 1: Stationary x */}
        <div className="conv-track-card">
          <div className="conv-track-header">
            <span>1. Stationary Input x({domain === "discrete" ? "k" : "τ"})</span>
            <span style={{ color: "var(--accent-cream)", fontSize: "11px" }}>Reference Signal</span>
          </div>
          <ConvTrackSvg
            points={convResult?.x_points}
            domain={domain}
            strokeColor="#f5efe6"
          />
        </div>

        {/* Track 2: Folded and Shifted h */}
        <div className="conv-track-card">
          <div className="conv-track-header">
            <span>2. Folded &amp; Shifted h({domain === "discrete" ? `${currentShift} - k` : `${currentShift.toFixed(1)} - τ`})</span>
            <span style={{ color: "var(--accent-sage)", fontSize: "11px" }}>Sliding Kernel</span>
          </div>
          <ConvTrackSvg
            points={convResult?.h_folded_points}
            domain={domain}
            strokeColor="#8a9e8c"
          />
        </div>

        {/* Track 3: Product of Overlap */}
        <div className="conv-track-card">
          <div className="conv-track-header">
            <span>3. Product x({domain === "discrete" ? "k" : "τ"}) · h({domain === "discrete" ? `${currentShift} - k` : `${currentShift.toFixed(1)} - τ`})</span>
            <span style={{ color: "var(--accent-crimson)", fontSize: "11px" }}>Overlap Area = y({currentShift})</span>
          </div>
          <ConvTrackSvg
            points={convResult?.product_points}
            domain={domain}
            strokeColor="#c23b60"
            fillColor="rgba(194, 59, 96, 0.35)"
            showArea={true}
          />
        </div>

        {/* Track 4: Accumulated Output y */}
        <div className="conv-track-card">
          <div className="conv-track-header">
            <span>4. Convolved Output y({domain === "discrete" ? "n" : "t"}) = (x * h)</span>
            <span style={{ color: "var(--accent-crimson)", fontSize: "11px" }}>Full Trajectory</span>
          </div>
          <ConvTrackSvg
            points={convResult?.output_points}
            domain={domain}
            strokeColor="#f5efe6"
            activePoint={{ x: currentShift, y: convResult?.instant_value ?? 0 }}
          />
        </div>
      </div>
    </div>
  );
}

// ====================================================
// MODULE 09: STEP-BY-STEP SOLVER & PRACTICE MODE
// ====================================================
function PracticeSolver() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [verifications, setVerifications] = useState({});
  const [showHints, setShowHints] = useState({});
  const [showSolutions, setShowSolutions] = useState({});
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/practice/problems`);
      const data = await response.json();
      if (data?.problems) {
        setProblems(data.problems);
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  const selectOption = (problemId, optIndex) => {
    setSelectedAnswers(prev => ({ ...prev, [problemId]: optIndex }));
  };

  const toggleHint = problemId => {
    setShowHints(prev => ({ ...prev, [problemId]: !prev[problemId] }));
  };

  const toggleSolution = problemId => {
    setShowSolutions(prev => ({ ...prev, [problemId]: !prev[problemId] }));
  };

  const verifyProblem = async (problemId) => {
    const selectedIdx = selectedAnswers[problemId];
    if (selectedIdx === undefined) return;
    setVerifyingId(problemId);
    try {
      const response = await fetch(`${API}/practice/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_id: problemId, selected_index: selectedIdx })
      });
      const data = await response.json();
      setVerifications(prev => ({ ...prev, [problemId]: data }));
    } catch {
      // handle error
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const matchCat = categoryFilter === "all" || p.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchDiff = difficultyFilter === "all" || p.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
      return matchCat && matchDiff;
    });
  }, [problems, categoryFilter, difficultyFilter]);

  return (
    <div className="practice-layout">
      {/* Category & Difficulty Filter Bar */}
      <div className="practice-filters">
        <div className="filter-group">
          <span className="filter-label">DISCIPLINE:</span>
          <button
            type="button"
            className={`filter-btn ${categoryFilter === "all" ? "active" : ""}`}
            onClick={() => setCategoryFilter("all")}
          >
            All Disciplines
          </button>
          <button
            type="button"
            className={`filter-btn ${categoryFilter === "calculus" ? "active" : ""}`}
            onClick={() => setCategoryFilter("calculus")}
          >
            Calculus Lab
          </button>
          <button
            type="button"
            className={`filter-btn ${categoryFilter === "signals" ? "active" : ""}`}
            onClick={() => setCategoryFilter("signals")}
          >
            Signals &amp; Systems
          </button>
        </div>

        <div className="filter-group">
          <span className="filter-label">DIFFICULTY:</span>
          <button
            type="button"
            className={`filter-btn ${difficultyFilter === "all" ? "active" : ""}`}
            onClick={() => setDifficultyFilter("all")}
          >
            All Tiers
          </button>
          <button
            type="button"
            className={`filter-btn ${difficultyFilter === "fundamentals" ? "active" : ""}`}
            onClick={() => setDifficultyFilter("fundamentals")}
          >
            Fundamentals
          </button>
          <button
            type="button"
            className={`filter-btn ${difficultyFilter === "standard" ? "active" : ""}`}
            onClick={() => setDifficultyFilter("standard")}
          >
            Standard
          </button>
          <button
            type="button"
            className={`filter-btn ${difficultyFilter === "challenge" ? "active" : ""}`}
            onClick={() => setDifficultyFilter("challenge")}
          >
            Challenge
          </button>
        </div>
      </div>

      {/* Problem Cards List */}
      <div className="practice-cards-list">
        {loading ? (
          <div className="result-empty">Loading curated mathematical problem sets…</div>
        ) : filteredProblems.length === 0 ? (
          <div className="result-empty">No problems found matching active filters.</div>
        ) : (
          filteredProblems.map(prob => {
            const verification = verifications[prob.id];
            const isCorrect = verification?.is_correct;
            const hasVerified = verification != null;
            const isSolutionOpen = showSolutions[prob.id];
            const isHintOpen = showHints[prob.id];
            const selectedIdx = selectedAnswers[prob.id];

            return (
              <div
                key={prob.id}
                className={`practice-card ${hasVerified ? (isCorrect ? "is-correct" : "is-incorrect") : ""}`}
              >
                {/* Header */}
                <div className="practice-card-header">
                  <div className="practice-meta">
                    <span className="badge-tag">{prob.topic}</span>
                    <span className={`difficulty-badge ${prob.difficulty.toLowerCase()}`}>
                      {prob.difficulty}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    {prob.category === "calculus" ? "Calculus Core" : "Signal Theory"}
                  </span>
                </div>

                {/* Question */}
                <div className="practice-question">
                  <MathFormula tex={prob.question} />
                </div>

                {/* Multiple Choice Options */}
                <div className="practice-options">
                  {prob.options.map((opt, optIdx) => {
                    const isSelected = selectedIdx === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        className={`practice-option-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => selectOption(prob.id, optIdx)}
                      >
                        <span className="option-circle">{String.fromCharCode(65 + optIdx)}</span>
                        <span><MathFormula tex={opt} /></span>
                      </button>
                    );
                  })}
                </div>

                {/* Actions & Verification Bar */}
                <div className="practice-actions">
                  <button
                    type="button"
                    className="primary-button"
                    style={{ padding: "8px 18px", height: "auto" }}
                    onClick={() => verifyProblem(prob.id)}
                    disabled={selectedIdx === undefined || verifyingId === prob.id}
                  >
                    <Check size={14} />
                    {verifyingId === prob.id ? "Verifying…" : "Verify Answer"}
                  </button>

                  <button
                    type="button"
                    className="filter-btn"
                    onClick={() => toggleHint(prob.id)}
                  >
                    <Lightbulb size={13} />
                    {isHintOpen ? "Hide Hint" : "Need a Hint?"}
                  </button>

                  {hasVerified && (
                    <button
                      type="button"
                      className="filter-btn"
                      onClick={() => toggleSolution(prob.id)}
                      style={{ marginLeft: "auto", borderColor: "rgba(194, 59, 96, 0.4)" }}
                    >
                      <BookOpen size={13} />
                      {isSolutionOpen ? "Collapse Steps" : "View Step-by-Step Solution"}
                      {isSolutionOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>

                {/* Hint Drawer */}
                {isHintOpen && (
                  <div className="hint-box">
                    <strong>Pedagogical Hint:</strong> <MathFormula tex={prob.hint} />
                  </div>
                )}

                {/* Verification Result Banner */}
                {hasVerified && (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: isCorrect ? "rgba(138, 158, 140, 0.15)" : "rgba(194, 59, 96, 0.15)",
                      color: isCorrect ? "#a8bca9" : "#e07a93",
                      fontSize: "13px"
                    }}
                  >
                    {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span>
                      {isCorrect
                        ? "Correct! Excellent mathematical reasoning."
                        : "Not quite — review the hint or expand the step-by-step solution below."}
                    </span>
                  </div>
                )}

                {/* Step-by-Step Solution Breakdown */}
                {isSolutionOpen && verification?.steps && (
                  <div className="solution-steps">
                    <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      VERIFIED STEP-BY-STEP DERIVATION:
                    </span>
                    {verification.steps.map((st, sIdx) => (
                      <div key={sIdx} className="step-item">
                        <div className="step-item-title">Step {sIdx + 1}: {st.title}</div>
                        <div className="step-item-content">
                          <MathFormula tex={st.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Main Application Component
// ----------------------------------------------------

function LTIAnalyzer() {
  const [systemId, setSystemId] = useState("delay");
  const [domain, setDomain] = useState("discrete");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openProofs, setOpenProofs] = useState({});

  const fetchLti = useCallback(async (sysId, dom) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/signals/lti`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_id: sysId, domain: dom })
      });
      const d = await res.json();
      setData(d);
    } catch {
      setData({ error: "LTI Analyzer service connection error." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLti(systemId, domain);
  }, [systemId, domain, fetchLti]);

  const toggleProof = key => {
    setOpenProofs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sys = data?.system;

  return (
    <div className="signals-workspace">
      {/* System Selection & Block Diagram */}
      <aside className="controls panel">
        <div className="panel-title">
          <span>01</span>
          <div>
            <h2>System Selector</h2>
            <p>Choose an LTI or non-LTI system.</p>
          </div>
        </div>

        <div className="calculus-field">
          <label>SYSTEM MODEL</label>
          <select value={systemId} onChange={e => setSystemId(e.target.value)}>
            <option value="delay">Ideal Delay: y[n] = x[n - 2]</option>
            <option value="accumulator">Accumulator: y[n] = ∑ x[k]</option>
            <option value="moving_average">Moving Average: y[n] = ⅓(x[n]+x[n-1]+x[n-2])</option>
            <option value="squarer">Squarer: y[n] = (x[n])² (Non-Linear)</option>
            <option value="time_compressor">Time Scaler: y[n] = x[2n] (Time-Varying)</option>
          </select>
        </div>

        <div className="calculus-field">
          <label>REPRESENTATION</label>
          <div className="option-row">
            <button
              type="button"
              className={domain === "discrete" ? "active" : ""}
              onClick={() => setDomain("discrete")}
            >
              Discrete [n]
            </button>
            <button
              type="button"
              className={domain === "continuous" ? "active" : ""}
              onClick={() => setDomain("continuous")}
            >
              Continuous (t)
            </button>
          </div>
        </div>

        {/* System Block Diagram SVG */}
        <div className="block-diagram-card" style={{ marginTop: "18px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "8px" }}>
            SYSTEM BLOCK DIAGRAM:
          </span>
          <svg viewBox="0 0 320 90" style={{ width: "100%", height: "auto", display: "block", background: "rgba(13, 11, 14, 0.7)", borderRadius: "var(--radius-sm)" }}>
            <line x1="20" y1="45" x2="100" y2="45" stroke="#f5efe6" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="50" y="36" fill="#f5efe6" fontSize="11" fontFamily="JetBrains Mono, monospace">x[n]</text>

            <rect x="100" y="20" width="120" height="50" rx="8" fill="rgba(120, 29, 57, 0.3)" stroke="var(--accent-crimson)" strokeWidth="1.5" />
            <text x="160" y="44" fill="#f5efe6" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="Inter, sans-serif">
              {systemId === "delay" ? "z⁻² Delay" : systemId === "accumulator" ? "1/(1 - z⁻¹)" : systemId === "moving_average" ? "FIR Filter" : systemId === "squarer" ? "( • )²" : "Downsampler"}
            </text>
            <text x="160" y="58" fill="#a3b5a5" fontSize="10" textAnchor="middle">System T{'{•}'}</text>

            <line x1="220" y1="45" x2="300" y2="45" stroke="#c23b60" strokeWidth="2" />
            <polygon points="296,41 304,45 296,49" fill="#c23b60" />
            <text x="250" y="36" fill="#c23b60" fontSize="11" fontFamily="JetBrains Mono, monospace">y[n]</text>
          </svg>
        </div>

        <div className="method-note" style={{ marginTop: "16px" }}>
          <CircleHelp size={15} />
          <span>
            Linear Time-Invariant (LTI) systems are completely characterized by their impulse response h.
            If a system is non-linear or time-varying, convolution cannot represent its input-output mapping.
          </span>
        </div>
      </aside>

      {/* Property Cards Stage */}
      <section className="visual-panel panel">
        <div className="plot-header">
          <div>
            <span className="badge-tag">SYSTEM PROPERTY CLASSIFICATION</span>
            <h2>{sys?.name ?? "LTI System Analyzer"}</h2>
          </div>
          <span className="drag-note">Click "View Proof" on any property to expand formal mathematical derivation</span>
        </div>

        {!sys ? (
          <div className="result-empty">Loading system properties…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" }}>
            {/* System Equation Banner */}
            <div className="verified-box" style={{ background: "rgba(16, 13, 17, 0.8)", borderColor: "var(--border-subtle)" }}>
              <span style={{ fontSize: "11px" }}>GOVERNING INPUT-OUTPUT RELATION</span>
              <div style={{ marginTop: "6px" }}>
                <MathFormula tex={sys.equation_latex} block={true} />
              </div>
            </div>

            {/* 1. Linearity */}
            <div className="property-card">
              <div className="property-header">
                <div>
                  <strong>Linearity</strong>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-dim)" }}>
                    Satisfies homogeneity T{'{ax}'} = aT{'{x}'} and additivity T{'{x₁+x₂}'} = T{'{x₁}'} + T{'{x₂}'}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`difficulty-badge ${sys.linear ? "fundamentals" : "challenge"}`}>
                    {sys.linear ? "Linear" : "Non-Linear"}
                  </span>
                  <button type="button" className="filter-btn" onClick={() => toggleProof("linear")}>
                    {openProofs["linear"] ? "Hide Proof" : "View Proof"}
                  </button>
                </div>
              </div>
              {openProofs["linear"] && (
                <div className="proof-drawer">
                  <MathFormula tex={sys.linearity_proof} />
                </div>
              )}
            </div>

            {/* 2. Time-Invariance */}
            <div className="property-card">
              <div className="property-header">
                <div>
                  <strong>Time-Invariance</strong>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-dim)" }}>
                    Time shift in input produces identical time shift in output: T{'{x(t - t₀)}'} = y(t - t₀)
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`difficulty-badge ${sys.time_invariant ? "fundamentals" : "challenge"}`}>
                    {sys.time_invariant ? "Time-Invariant" : "Time-Varying"}
                  </span>
                  <button type="button" className="filter-btn" onClick={() => toggleProof("time_invariant")}>
                    {openProofs["time_invariant"] ? "Hide Proof" : "View Proof"}
                  </button>
                </div>
              </div>
              {openProofs["time_invariant"] && (
                <div className="proof-drawer">
                  <MathFormula tex={sys.time_invariance_proof} />
                </div>
              )}
            </div>

            {/* 3. Causality */}
            <div className="property-card">
              <div className="property-header">
                <div>
                  <strong>Causality</strong>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-dim)" }}>
                    Output at time t depends only on present and past inputs (t ≤ t₀); never on future inputs
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`difficulty-badge ${sys.causal ? "fundamentals" : "challenge"}`}>
                    {sys.causal ? "Causal" : "Non-Causal"}
                  </span>
                  <button type="button" className="filter-btn" onClick={() => toggleProof("causal")}>
                    {openProofs["causal"] ? "Hide Proof" : "View Proof"}
                  </button>
                </div>
              </div>
              {openProofs["causal"] && (
                <div className="proof-drawer">
                  <MathFormula tex={sys.causality_proof} />
                </div>
              )}
            </div>

            {/* 4. BIBO Stability */}
            <div className="property-card">
              <div className="property-header">
                <div>
                  <strong>BIBO Stability</strong>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-dim)" }}>
                    Bounded Input Bounded Output: Every finite input |x| ≤ B produces bounded output |y| &lt; ∞
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`difficulty-badge ${sys.stable ? "fundamentals" : "challenge"}`}>
                    {sys.stable ? "BIBO Stable" : "Unstable"}
                  </span>
                  <button type="button" className="filter-btn" onClick={() => toggleProof("stable")}>
                    {openProofs["stable"] ? "Hide Proof" : "View Proof"}
                  </button>
                </div>
              </div>
              {openProofs["stable"] && (
                <div className="proof-drawer">
                  <MathFormula tex={sys.stability_proof} />
                </div>
              )}
            </div>

            {/* 5. Memory */}
            <div className="property-card">
              <div className="property-header">
                <div>
                  <strong>Memory (Static vs Dynamic)</strong>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-dim)" }}>
                    Memoryless if output depends strictly on instantaneous present value; Dynamic if state is required
                  </span>
                </div>
                <span className="difficulty-badge standard">
                  {sys.memory}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="plot-foot">
          <span>Mathematical Reliability: Verified against Oppenheim &amp; Willsky LTI standard theorems</span>
          <span>{sys ? `Classified as ${sys.linear && sys.time_invariant ? "Strict LTI System" : "General System"}` : "—"}</span>
        </div>
      </section>

      {/* Impulse & Step Response Sidebar */}
      <aside className="results panel">
        <div className="panel-title">
          <span>03</span>
          <div>
            <h2>Response Metrics</h2>
            <p>Impulse response h &amp; step response s.</p>
          </div>
        </div>

        {!sys ? (
          <div className="result-empty">Select a system to inspect response characteristics.</div>
        ) : (
          <>
            <div className="verified-box">
              <span>IMPULSE RESPONSE h({domain === "discrete" ? "n" : "t"})</span>
              <div style={{ marginTop: "6px" }}>
                <MathFormula tex={sys.impulse_response} block={true} />
              </div>
            </div>

            <div className="verified-box" style={{ borderColor: "rgba(138, 158, 140, 0.4)", background: "rgba(22, 28, 23, 0.4)" }}>
              <span style={{ color: "var(--accent-sage)" }}>STEP RESPONSE s({domain === "discrete" ? "n" : "t"})</span>
              <div style={{ marginTop: "6px" }}>
                <MathFormula tex={sys.step_response} block={true} />
              </div>
            </div>

            <div className="result-row highlight-row">
              <span>Overall LTI Classification</span>
              <b>{sys.linear && sys.time_invariant ? "Strict LTI" : "Non-LTI"}</b>
            </div>
            <div className="result-row">
              <span>Stability Criterion</span>
              <b>{sys.stable ? "∑ |h[n]| < ∞" : "∑ |h[n]| = ∞"}</b>
            </div>
            <div className="result-row">
              <span>Memory Order</span>
              <b>{sys.memory}</b>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}


function FourierLab() {
  const [waveform, setWaveform] = useState("square");
  const [harmonics, setHarmonics] = useState(5);
  const [fundamentalFreq, setFundamentalFreq] = useState(1.0);
  const [amplitude, setAmplitude] = useState(1.0);
  const [activeTab, setActiveTab] = useState("time"); // "time" | "frequency"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateFourier = useCallback(async (wf, nHarm, f0, amp) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/signals/fourier`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waveform: wf,
          harmonics: Number(nHarm),
          fundamental_freq: Number(f0),
          amplitude: Number(amp)
        })
      });
      const d = await res.json();
      setData(d);
    } catch {
      setData({ error: "Fourier analysis service connection error." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateFourier(waveform, harmonics, fundamentalFreq, amplitude);
  }, [waveform, harmonics, fundamentalFreq, amplitude, calculateFourier]);

  // SVG Time-Domain plot dimensions
  const svgW = 740;
  const svgH = 320;
  const margin = { left: 50, right: 30, top: 25, bottom: 40 };
  const plotW = svgW - margin.left - margin.right;
  const plotH = svgH - margin.top - margin.bottom;

  const pts = data?.plot_points || [];
  const minT = pts.length ? Math.min(...pts.map(p => p.t)) : -1;
  const maxT = pts.length ? Math.max(...pts.map(p => p.t)) : 1;
  const minY = -1.6 * amplitude;
  const maxY = 1.6 * amplitude;

  const mapX = t => margin.left + ((t - minT) / (maxT - minT || 1)) * plotW;
  const mapY = y => margin.top + ((maxY - y) / (maxY - minY || 1)) * plotH;
  const yZero = mapY(0);

  const exactPath = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${mapX(p.t).toFixed(1)} ${mapY(p.exact).toFixed(1)}`, "");
  const reconPath = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${mapX(p.t).toFixed(1)} ${mapY(p.reconstructed).toFixed(1)}`, "");

  // Frequency-domain bar chart
  const coeffs = data?.coefficients || [];
  const maxMag = coeffs.length ? Math.max(...coeffs.map(c => c.magnitude), 1e-4) : 1;

  return (
    <div className="signals-workspace">
      {/* Fourier Controls Sidebar */}
      <aside className="controls panel">
        <div className="panel-title">
          <span>01</span>
          <div>
            <h2>Fourier Controls</h2>
            <p>Select periodic waveform and harmonics N.</p>
          </div>
        </div>

        <div className="calculus-field">
          <label>WAVEFORM TARGET</label>
          <select value={waveform} onChange={e => setWaveform(e.target.value)}>
            <option value="square">Square Wave (Odd Harmonics 1/n)</option>
            <option value="triangle">Triangle Wave (Fast Decay 1/n²)</option>
            <option value="sawtooth">Sawtooth Wave (All Harmonics 1/n)</option>
          </select>
        </div>

        <div className="calculus-field">
          <label>ACTIVE HARMONICS N = {harmonics}</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={harmonics}
              onChange={e => setHarmonics(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent-crimson)", cursor: "pointer" }}
            />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", minWidth: "30px", textAlign: "right" }}>
              {harmonics}
            </span>
          </div>
        </div>

        <div className="bounds">
          <div>
            <label>FREQUENCY f₀ (Hz)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="5"
              value={fundamentalFreq}
              onChange={e => setFundamentalFreq(Number(e.target.value))}
            />
          </div>
          <div>
            <label>AMPLITUDE A</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="5"
              value={amplitude}
              onChange={e => setAmplitude(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          className="primary-button"
          onClick={() => calculateFourier(waveform, harmonics, fundamentalFreq, amplitude)}
          disabled={loading}
          style={{ marginTop: "8px" }}
        >
          <Play size={15} />
          {loading ? "Synthesizing…" : "Synthesize Fourier Series"}
        </button>

        {/* Quick Harmonics Presets */}
        <div className="presets-strip" style={{ marginTop: "16px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Quick Harmonics:</span>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            <button type="button" className={`filter-btn ${harmonics === 1 ? "active" : ""}`} onClick={() => setHarmonics(1)}>N=1 (Fundamental)</button>
            <button type="button" className={`filter-btn ${harmonics === 3 ? "active" : ""}`} onClick={() => setHarmonics(3)}>N=3</button>
            <button type="button" className={`filter-btn ${harmonics === 7 ? "active" : ""}`} onClick={() => setHarmonics(7)}>N=7</button>
            <button type="button" className={`filter-btn ${harmonics === 15 ? "active" : ""}`} onClick={() => setHarmonics(15)}>N=15</button>
          </div>
        </div>
      </aside>

      {/* Main Plot Stage: Time Domain vs Frequency Domain */}
      <section className="visual-panel panel">
        <div className="plot-header">
          <div>
            <span className="badge-tag">FOURIER SYNTHESIS &amp; SPECTRUM</span>
            <h2>{activeTab === "time" ? "Time-Domain Approximation f_N(t)" : "Frequency-Domain Line Spectrum |b_n|"}</h2>
          </div>
          <div className="option-row" style={{ margin: 0 }}>
            <button
              type="button"
              className={activeTab === "time" ? "active" : ""}
              onClick={() => setActiveTab("time")}
            >
              Time Domain
            </button>
            <button
              type="button"
              className={activeTab === "frequency" ? "active" : ""}
              onClick={() => setActiveTab("frequency")}
            >
              Frequency Spectrum
            </button>
          </div>
        </div>

        {/* TIME DOMAIN SVG */}
        {activeTab === "time" && (
          <div className="signal-plot-wrapper">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="signal-svg">
              {/* Zero line */}
              <line x1={margin.left} y1={yZero} x2={svgW - margin.right} y2={yZero} stroke="rgba(245, 239, 230, 0.25)" strokeWidth="1.5" />
              <line x1={mapX(0)} y1={margin.top} x2={mapX(0)} y2={svgH - margin.bottom} stroke="rgba(245, 239, 230, 0.25)" strokeWidth="1.5" />

              {/* Exact periodic wave */}
              {exactPath && <path d={exactPath} fill="none" stroke="#f5efe6" strokeWidth="1.8" opacity="0.6" strokeDasharray="4 4" />}

              {/* Truncated Fourier Series synthesis */}
              {reconPath && <path d={reconPath} fill="none" stroke="#c23b60" strokeWidth="2.8" />}

              {/* Axis labels */}
              <text x={svgW - margin.right} y={yZero - 8} fill="#f5efe6" fontSize="12" textAnchor="end" fontFamily="JetBrains Mono, monospace">t (s)</text>
              <text x={mapX(0) + 8} y={margin.top + 10} fill="#f5efe6" fontSize="12" fontFamily="JetBrains Mono, monospace">x(t)</text>
            </svg>

            <div className="signal-plot-footer">
              <div className="plot-legend">
                <div className="legend-item">
                  <span className="legend-marker base-marker" />
                  <span>Exact Target Periodic Wave</span>
                </div>
                <div className="legend-item">
                  <span className="legend-marker trans-marker" />
                  <span>Fourier Series Approximation f_{harmonics}(t)</span>
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "var(--accent-crimson)", fontFamily: "var(--font-mono)" }}>
                {waveform === "square" ? "Gibbs Ripples (~8.95% overshoot)" : "Harmonic Convergence"}
              </span>
            </div>
          </div>
        )}

        {/* FREQUENCY DOMAIN SPECTRUM BAR CHART */}
        {activeTab === "frequency" && (
          <div className="signal-plot-wrapper">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="signal-svg">
              <line x1={margin.left} y1={svgH - margin.bottom} x2={svgW - margin.right} y2={svgH - margin.bottom} stroke="rgba(245, 239, 230, 0.3)" strokeWidth="1.5" />
              <line x1={margin.left} y1={margin.top} x2={margin.left} y2={svgH - margin.bottom} stroke="rgba(245, 239, 230, 0.3)" strokeWidth="1.5" />

              {coeffs.map((c, i) => {
                const barSpacing = plotW / (coeffs.length + 1);
                const bx = margin.left + (i + 1) * barSpacing;
                const barHeight = (c.magnitude / maxMag) * (plotH - 20);
                const by = svgH - margin.bottom - barHeight;

                return (
                  <g key={i}>
                    {/* Stem line */}
                    <line x1={bx} y1={svgH - margin.bottom} x2={bx} y2={by} stroke="#c23b60" strokeWidth="3" />
                    {/* Harmonic dot */}
                    <circle cx={bx} cy={by} r="5" fill="#c23b60" stroke="#f5efe6" strokeWidth="1.5" />
                    {/* Amplitude label */}
                    <text x={bx} y={by - 8} fill="#f5efe6" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                      {c.magnitude.toFixed(2)}
                    </text>
                    {/* Harmonic index */}
                    <text x={bx} y={svgH - margin.bottom + 18} fill="#a3b5a5" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                      {c.harmonic}ω₀
                    </text>
                  </g>
                );
              })}

              <text x={svgW - margin.right} y={svgH - margin.bottom - 8} fill="#f5efe6" fontSize="12" textAnchor="end" fontFamily="JetBrains Mono, monospace">Frequency (rad/s)</text>
              <text x={margin.left + 8} y={margin.top + 10} fill="#f5efe6" fontSize="12" fontFamily="JetBrains Mono, monospace">|b_n|</text>
            </svg>

            <div className="signal-plot-footer">
              <div className="plot-legend">
                <div className="legend-item">
                  <span className="legend-marker trans-marker" />
                  <span>Discrete Line Spectrum Magnitudes |b_n|</span>
                </div>
              </div>
              <span style={{ fontSize: "11px", color: "var(--accent-sage)", fontFamily: "var(--font-mono)" }}>
                Fundamental ω₀ = {(2 * Math.PI * fundamentalFreq).toFixed(2)} rad/s
              </span>
            </div>
          </div>
        )}

        <div className="plot-foot">
          <span>Fourier Analysis: Decomposition of periodic signals into orthogonal harmonically-related sinusoids</span>
          <span>{data ? `${coeffs.length} harmonic components active` : "—"}</span>
        </div>
      </section>

      {/* Analytics & Metrics Sidebar */}
      <aside className="results panel">
        <div className="panel-title">
          <span>03</span>
          <div>
            <h2>Series Analytics</h2>
            <p>Harmonic formula &amp; error metrics.</p>
          </div>
        </div>

        {!data ? (
          <div className="result-empty">Synthesizing Fourier harmonics…</div>
        ) : (
          <>
            <div className="verified-box">
              <span>ANALYTICAL FOURIER SERIES</span>
              <div style={{ marginTop: "6px" }}>
                <MathFormula tex={data.formula_latex} block={true} />
              </div>
            </div>

            <div className="result-row highlight-row">
              <span>Mean Squared Error (MSE)</span>
              <b>{data.mse_error?.toFixed(5) ?? "—"}</b>
            </div>
            <div className="result-row">
              <span>Active Harmonic Count</span>
              <b>{coeffs.length} terms</b>
            </div>
            <div className="result-row">
              <span>Fundamental Frequency f₀</span>
              <b>{data.fundamental_freq} Hz (T = {(1 / data.fundamental_freq).toFixed(2)}s)</b>
            </div>

            <div className="method-note" style={{ marginTop: "16px" }}>
              <CircleHelp size={15} />
              <span>
                <strong>{data.gibbs_note}</strong>
                <br />
                As N → ∞, the mean squared error converges to 0 everywhere except at jump discontinuities where the overshoot remains strictly bounded at 8.95%.
              </span>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function AboutView() {
  return (
    <div className="about-layout" style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "40px" }}>
      <section className="title-row" style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "24px" }}>
        <div>
          <span className="section-code">PRODUCT BLUEPRINT ARCHITECTURE</span>
          <h1>AI Math Lab · Core Principles &amp; Technical Foundation</h1>
          <p>
            An engineering-grade, interactive learning and computation platform combining symbolic mathematics,
            rigorous numerical solvers, and signals analysis. Built according to the Final Master Website Blueprint.
          </p>
        </div>
        <div className="formula">
          <MathFormula tex="\text{Symbolic Math} \oplus \text{Numerical Solvers} \oplus \text{Interactive WebGL/SVG}" />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "24px" }}>
        <div className="practice-card">
          <h2 style={{ fontSize: "16px", color: "var(--accent-cream)", marginBottom: "10px" }}>📐 Pillar 1: Calculus Core</h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-main)", lineHeight: "1.6" }}>
            Comprehensive symbolic and numerical calculus engines supporting Mean Value Theorem with hybrid AI/Brent root solving,
            symbolic derivatives up to 5th order, indefinite and definite integration with step-by-step KaTeX explanations,
            two-sided and directional limits with continuity verification, critical points detection, Taylor/Maclaurin polynomial expansions,
            and Riemann sum partitions.
          </p>
        </div>

        <div className="practice-card">
          <h2 style={{ fontSize: "16px", color: "var(--accent-crimson)", marginBottom: "10px" }}>📡 Pillar 2: Signals &amp; Systems</h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-main)", lineHeight: "1.6" }}>
            Engineering module featuring continuous-time (t) and discrete-time stem ([n]) Signal Explorer with full transformation algebra,
            4-tier synchronized Convolution Visualizer with interactive sliding and overlap integration, LTI System Analyzer with formal
            proofs for Linearity, Time-Invariance, Causality, and BIBO Stability, and Fourier Analysis Lab with harmonic synthesis and Gibbs phenomenon.
          </p>
        </div>

        <div className="practice-card">
          <h2 style={{ fontSize: "16px", color: "var(--accent-sage)", marginBottom: "10px" }}>🛡️ Mathematical Reliability Standard</h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-main)", lineHeight: "1.6" }}>
            Every calculation adheres to a strict five-step reliability protocol:
            <br />
            1. <strong>Validate:</strong> Parse AST expressions and enforce interval bounds.
            <br />
            2. <strong>Compute:</strong> SymPy exact symbolic algorithms and SciPy/NumPy numerical solvers.
            <br />
            3. <strong>Verify:</strong> Independent residual checks (e.g. Brent root refinement on MVT).
            <br />
            4. <strong>No Keystroke Auto-Calculations:</strong> Heavy calculations only trigger on explicit action or Enter key.
          </p>
        </div>

        <div className="practice-card">
          <h2 style={{ fontSize: "16px", color: "var(--accent-amber)", marginBottom: "10px" }}>⚡ Technical Architecture</h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-main)", lineHeight: "1.6" }}>
            <strong>Frontend:</strong> React 18, Vite, Three.js 3D WebGL, KaTeX bundled math renderer, Lucide icons, Rich Dark Noir design system.
            <br />
            <strong>Backend:</strong> FastAPI, SymPy, NumPy, SciPy, PyTorch.
            <br />
            <strong>Routing:</strong> Full URL hash deep-linking (`/#/mvt`, `/#/signals/fourier`, `/#/practice`) surviving browser refreshes and history navigation.
          </p>
        </div>
      </div>
    </div>
  );
}



// ----------------------------------------------------
// 0. INTERACTIVE HOMEPAGE & SIDEBAR SYSTEM
// ----------------------------------------------------

function InteractiveWaveCanvas({ preset = "harmonic", freq = 1.2, harmonics = 4, damping = 0.2 }) {
  const canvasRef = useRef(null);
  const mousePosRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let t = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      };
    };

    const onMouseLeave = () => {
      mousePosRef.current.active = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const render = () => {
      t += 0.024;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (!W || !H) {
        animId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, W, H);

      // Subtle Background Matrix Grid
      ctx.strokeStyle = "rgba(138, 158, 140, 0.08)";
      ctx.lineWidth = 1;
      const step = 36;
      for (let x = 0; x <= W; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      const centerY = H / 2;
      const amp = Math.min(H * 0.32, 95);

      const computeY = (x, time) => {
        const normX = (x / W) * 2 - 1; // [-1, 1]
        let yVal = 0;

        if (preset === "harmonic") {
          yVal = Math.sin(normX * Math.PI * 2 * freq - time) +
                 0.45 * Math.sin(normX * Math.PI * 4 * freq + time * 1.3) +
                 0.25 * Math.cos(normX * Math.PI * 6 * freq - time * 0.7);
          yVal = yVal / 1.7;
        } else if (preset === "fourier") {
          for (let k = 1; k <= Math.min(harmonics * 2, 17); k += 2) {
            yVal += (4 / (k * Math.PI)) * Math.sin(k * normX * Math.PI * 2 * freq - time * 1.1);
          }
        } else if (preset === "damped") {
          const envelope = Math.exp(-damping * 7 * (normX * normX));
          yVal = envelope * Math.cos(normX * Math.PI * 8 * freq - time * 2);
        } else if (preset === "taylor") {
          const p = normX * Math.PI * 1.4;
          const term1 = p;
          const term3 = Math.pow(p, 3) / 6;
          const term5 = Math.pow(p, 5) / 120;
          const blend = (Math.sin(time) + 1) / 2;
          yVal = Math.sin(p) * blend + (term1 - term3 + term5 * 0.6) * (1 - blend);
          yVal = Math.tanh(yVal * 0.75);
        }

        // Magnetic mouse ripple distortion
        if (mousePosRef.current.active) {
          const dx = x - mousePosRef.current.x;
          const dist = Math.abs(dx);
          const influenceRadius = 140;
          if (dist < influenceRadius) {
            const factor = Math.cos((dist / influenceRadius) * (Math.PI / 2));
            const mouseOffset = ((mousePosRef.current.y - centerY) / amp) * 0.65;
            yVal += mouseOffset * factor;
          }
        }

        return centerY - yVal * amp;
      };

      // Secondary Faint Harmonic Guide Waves
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(138, 158, 140, 0.22)";
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = centerY - Math.sin((x / W) * Math.PI * 4 * freq - t * 0.9) * (amp * 0.35);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(212, 163, 115, 0.18)";
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const y = centerY - Math.cos((x / W) * Math.PI * 6 * freq + t * 0.6) * (amp * 0.25);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Primary Wave with Deep Burgundy to Sage Gradient Glow
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "#C23B60");
      grad.addColorStop(0.35, "#F5EFE6");
      grad.addColorStop(0.7, "#8A9E8C");
      grad.addColorStop(1, "#C23B60");

      // Shaded area under the curve
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 2) {
        ctx.lineTo(x, computeY(x, t));
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, centerY - amp, 0, H);
      fillGrad.addColorStop(0, "rgba(194, 59, 96, 0.18)");
      fillGrad.addColorStop(1, "rgba(13, 11, 14, 0.0)");
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Primary stroke line
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const y = computeY(x, t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.6;
      ctx.shadowColor = "rgba(194, 59, 96, 0.6)";
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dynamic Node Markers
      [0.2, 0.5, 0.8].forEach((ratio, i) => {
        const nx = ratio * W;
        const ny = computeY(nx, t);
        ctx.fillStyle = i === 1 ? "#F5EFE6" : "#C23B60";
        ctx.beginPath();
        ctx.arc(nx, ny, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(245, 239, 230, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, 8.5, 0, Math.PI * 2);
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [preset, freq, harmonics, damping]);

  return <canvas ref={canvasRef} className="interactive-hero-canvas" />;
}

function InteractiveQuickSandbox({ onLaunchModule }) {
  const [expr, setExpr] = useState("x^3 - 3*x");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const presets = [
    { label: "Cubic Extrema", val: "x^3 - 3*x" },
    { label: "Sinc Function", val: "sin(x)/x" },
    { label: "Gaussian Bell", val: "exp(-x^2)" },
    { label: "Rational Witch", val: "x/(x^2 + 1)" },
    { label: "Damped Oscillation", val: "exp(-0.3*x)*sin(3*x)" }
  ];

  const handleQuickAnalyze = async (targetExpr = expr) => {
    const fn = (targetExpr || expr).trim();
    if (!fn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/calculus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expression: fn, operation: "differentiate", order: 1 })
      });
      if (!res.ok) throw new Error("Backend analytical computation failed");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to analyze function");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleQuickAnalyze("x^3 - 3*x");
  }, []);

  return (
    <section className="sandbox-panel panel">
      <div className="sandbox-header">
        <div className="sandbox-tag">
          <Sparkles size={14} />
          <span>INSTANT MATHEMATICAL WORKBENCH</span>
        </div>
        <h2>Instant Formula Analytical Workbench</h2>
        <p>Type any real-valued function to calculate instant exact derivatives, closed-form antiderivatives, and visual geometry.</p>
      </div>

      <div className="sandbox-input-row">
        <div className="sandbox-input-wrapper">
          <span className="sandbox-prefix">f(x) =</span>
          <input
            className="sandbox-input"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuickAnalyze(); }}
            placeholder="e.g. x^3 - 3*x or sin(x)/x"
          />
        </div>
        <button
          className="sandbox-analyze-btn"
          onClick={() => handleQuickAnalyze()}
          disabled={loading}
        >
          <Play size={15} />
          {loading ? "Analyzing…" : "Analyze Instantly"}
        </button>
      </div>

      <div className="sandbox-presets">
        <span className="preset-label">Instant Presets:</span>
        {presets.map((p) => (
          <button
            key={p.val}
            type="button"
            className={`preset-chip ${expr === p.val ? "active" : ""}`}
            onClick={() => {
              setExpr(p.val);
              handleQuickAnalyze(p.val);
            }}
          >
            {p.label} (<code>{p.val}</code>)
          </button>
        ))}
      </div>

      {error && <div className="sandbox-error">{error}</div>}

      {result && (
        <div className="sandbox-results-grid">
          <div className="sandbox-result-card">
            <div className="card-badge">FIRST DERIVATIVE</div>
            <div className="card-math">
              <MathFormula tex={`f'(x) = ${result.derivative}`} block={true} />
            </div>
            <span className="card-meta">Exact analytical SymPy derivative</span>
          </div>

          <div className="sandbox-result-card">
            <div className="card-badge">INDEFINITE INTEGRAL</div>
            <div className="card-math">
              <MathFormula tex={`\\int f(x)\\,dx = ${result.integral}`} block={true} />
            </div>
            <span className="card-meta">Closed-form primitive with + C</span>
          </div>

          <div className="sandbox-result-card action-card">
            <div className="card-badge">DEEP WORKSPACE</div>
            <p>Inspect higher-order derivatives (1st–5th), definite integral steps, and Taylor series expansion.</p>
            <button
              className="sandbox-launch-btn"
              onClick={() => onLaunchModule("calculus", "calculus")}
            >
              Open Full Symbolic Engine <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function InteractiveHome({ onNavigate, apiStatus }) {
  const [wavePreset, setWavePreset] = useState("harmonic");
  const [freq, setFreq] = useState(1.2);
  const [harmonics, setHarmonics] = useState(5);
  const [damping, setDamping] = useState(0.2);

  const modules = [
    {
      id: "mvt",
      domain: "calculus",
      code: "MODULE 01",
      title: "3D Mean Value Theorem",
      category: "Calculus Core",
      desc: "Interactive 3D secant and tangent slope alignment with Brent numerical root verification.",
      formula: "f'(c) = \\frac{f(b) - f(a)}{b - a}",
      icon: Compass,
      accent: "burgundy"
    },
    {
      id: "calculus",
      domain: "calculus",
      code: "MODULE 02",
      title: "Symbolic Calculus Engine",
      category: "Calculus Core",
      desc: "Exact 1st–5th order derivatives, closed-form antiderivatives, and definite integrals with KaTeX proofs.",
      formula: "\\frac{d}{dx}\\left[\\int f(x)\\,dx\\right] = f(x)",
      icon: Cpu,
      accent: "cream"
    },
    {
      id: "taylor",
      domain: "calculus",
      code: "MODULE 03",
      title: "Taylor Series Approximator",
      category: "Calculus Core",
      desc: "Dynamic polynomial expansion around center point a with term-by-term convergence overlay.",
      formula: "P_n(x) = \\sum_{k=0}^n \\frac{f^{(k)}(a)}{k!}(x - a)^k",
      icon: Sparkles,
      accent: "sage"
    },
    {
      id: "riemann",
      domain: "calculus",
      code: "MODULE 04",
      title: "Riemann Sums Visualizer",
      category: "Calculus Core",
      desc: "Left, right, midpoint, and trapezoidal geometric partition area simulations converging to the integral.",
      formula: "\\int_a^b f(x)\\,dx \\approx \\sum_{i=1}^n f(x_i^*)\\,\\Delta x",
      icon: BarChart3,
      accent: "burgundy"
    },
    {
      id: "critical",
      domain: "calculus",
      code: "MODULE 05",
      title: "Critical Points & Extrema",
      category: "Calculus Core",
      desc: "Stationary point solver, local max/min classification, inflection points, and global bounds on [a, b].",
      formula: "f'(x) = 0, \\quad f''(x) \\neq 0",
      icon: TrendingUp,
      accent: "sage"
    },
    {
      id: "limits",
      domain: "calculus",
      code: "MODULE 06",
      title: "Limits & Continuity",
      category: "Calculus Core",
      desc: "Directional one-sided limits, limits at infinity, removable & jump discontinuities, and L'Hôpital steps.",
      formula: "\\lim_{x \\to a^-} f(x) = \\lim_{x \\to a^+} f(x) = L",
      icon: InfinityIcon,
      accent: "cream"
    },
    {
      id: "signals-explorer",
      domain: "signals",
      sub: "explorer",
      code: "MODULE 07",
      title: "Waveform & Signal Explorer",
      category: "Signals & Systems",
      desc: "Continuous-time t and discrete-time n stem waveforms, energy/power metrics, and affine transformations.",
      formula: "y(t) = A \\cdot x(a(t - t_0))",
      icon: Activity,
      accent: "burgundy"
    },
    {
      id: "signals-convolution",
      domain: "signals",
      sub: "convolution",
      code: "MODULE 08",
      title: "4-Track Convolution Visualizer",
      category: "Signals & Systems",
      desc: "Continuous integration & discrete sliding summation across 4 synchronized visual inspection tracks.",
      formula: "(x * h)(t) = \\int_{-\\infty}^\\infty x(\\tau)h(t - \\tau)\\,d\\tau",
      icon: RotateCcw,
      accent: "sage"
    },
    {
      id: "signals-lti",
      domain: "signals",
      sub: "lti",
      code: "MODULE 09",
      title: "LTI System Analyzer & Proofs",
      category: "Signals & Systems",
      desc: "Formal mathematical proofs for Linearity, Time-Invariance, Causality, and BIBO Stability.",
      formula: "\\mathcal{T}\\{a x_1 + b x_2\\} = a\\mathcal{T}\\{x_1\\} + b\\mathcal{T}\\{x_2\\}",
      icon: CheckCircle2,
      accent: "cream"
    },
    {
      id: "signals-fourier",
      domain: "signals",
      sub: "fourier",
      code: "MODULE 10",
      title: "Fourier Analysis & Harmonic Lab",
      category: "Signals & Systems",
      desc: "Harmonic synthesis of square, sawtooth, and triangle waves with interactive line spectrum inspector.",
      formula: "x(t) = a_0 + \\sum_{n=1}^N [a_n\\cos(n\\omega_0 t) + b_n\\sin(n\\omega_0 t)]",
      icon: Waves,
      accent: "burgundy"
    }
  ];

  return (
    <div className="interactive-home">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-pill">
            <span className="hero-pill-dot" />
            <span>AI COMPUTATIONAL ENGINE · 10 EXPERIMENTAL LABS</span>
          </div>

          <h1 className="hero-title">
            Computational Mathematics <br />
            <span className="hero-title-accent">&amp; Signal Intelligence</span>
          </h1>

          <p className="hero-subtitle">
            An advanced interactive laboratory blending exact closed-form calculus, real-time 3D Mean Value Theorem geometry, dynamic polynomial expansions, 4-track convolution, and formal LTI stability proofs.
          </p>

          <div className="hero-cta-group">
            <button
              className="hero-btn primary"
              onClick={() => onNavigate("calculus", "mvt")}
            >
              <Compass size={16} />
              <span>Launch 3D MVT Lab</span>
            </button>

            <button
              className="hero-btn secondary"
              onClick={() => onNavigate("signals", "fourier")}
            >
              <Waves size={16} />
              <span>Fourier Analysis</span>
            </button>

            <button
              className="hero-btn tertiary"
              onClick={() => onNavigate("practice")}
            >
              <BookOpen size={16} />
              <span>Practice Arena</span>
            </button>
          </div>
        </div>

        {/* Interactive Wave Canvas Card */}
        <div className="hero-canvas-card">
          <div className="canvas-header">
            <div className="canvas-title">
              <Activity size={14} />
              <span>INTERACTIVE WAVE DYNAMICS</span>
            </div>
            <div className="canvas-mode-chips">
              <button
                type="button"
                className={`canvas-chip ${wavePreset === "harmonic" ? "active" : ""}`}
                onClick={() => setWavePreset("harmonic")}
              >
                Harmonics
              </button>
              <button
                type="button"
                className={`canvas-chip ${wavePreset === "fourier" ? "active" : ""}`}
                onClick={() => setWavePreset("fourier")}
              >
                Fourier
              </button>
              <button
                type="button"
                className={`canvas-chip ${wavePreset === "damped" ? "active" : ""}`}
                onClick={() => setWavePreset("damped")}
              >
                Damped
              </button>
              <button
                type="button"
                className={`canvas-chip ${wavePreset === "taylor" ? "active" : ""}`}
                onClick={() => setWavePreset("taylor")}
              >
                Taylor
              </button>
            </div>
          </div>

          <div className="canvas-viewport">
            <InteractiveWaveCanvas
              preset={wavePreset}
              freq={freq}
              harmonics={harmonics}
              damping={damping}
            />
            <div className="canvas-formula-overlay">
              {wavePreset === "harmonic" && <MathFormula tex="y(x,t) = \\sum A_k \\sin(k\\omega x \\mp \\omega t)" />}
              {wavePreset === "fourier" && <MathFormula tex="y(t) = \\sum_{k=1,3...}^N \\frac{4}{k\\pi}\\sin(k\\omega t)" />}
              {wavePreset === "damped" && <MathFormula tex="y(x,t) = e^{-\\zeta x^2} \\cos(\\omega x - v t)" />}
              {wavePreset === "taylor" && <MathFormula tex="y(x) \\approx x - \\frac{x^3}{6} + \\frac{x^5}{120}" />}
            </div>
          </div>

          <div className="canvas-controls-bar">
            <div className="canvas-control-slider">
              <label>Frequency (ω): {freq.toFixed(1)}</label>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={freq}
                onChange={(e) => setFreq(parseFloat(e.target.value))}
              />
            </div>
            <div className="canvas-control-slider">
              <label>Harmonics (N): {harmonics}</label>
              <input
                type="range"
                min="1"
                max="11"
                step="2"
                value={harmonics}
                onChange={(e) => setHarmonics(parseInt(e.target.value, 10))}
              />
            </div>
            <div className="canvas-hint">
              <span>Hover mouse over wave to apply dynamic gravitational ripple</span>
            </div>
          </div>
        </div>
      </section>

      {/* Instant Sandbox Evaluator */}
      <InteractiveQuickSandbox
        onLaunchModule={(dom, sub) => onNavigate(dom, sub)}
      />

      {/* Bento Grid: 10 Core Modules */}
      <section className="bento-section">
        <div className="bento-header">
          <span className="bento-badge">COMPREHENSIVE CURRICULUM</span>
          <h2>The 10 Computational Laboratories</h2>
          <p>Explore both pillars: foundational calculus and time/frequency signals &amp; systems.</p>
        </div>

        <div className="bento-grid">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className={`bento-card accent-${m.accent}`}
                onClick={() => onNavigate(m.domain, m.sub || m.id)}
              >
                <div className="bento-card-top">
                  <div className="bento-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <span className="bento-code">{m.code}</span>
                </div>

                <h3 className="bento-card-title">{m.title}</h3>
                <span className="bento-category">{m.category}</span>
                <p className="bento-card-desc">{m.desc}</p>

                <div className="bento-formula-box">
                  <MathFormula tex={m.formula} />
                </div>

                <div className="bento-card-footer">
                  <span>Enter Lab</span>
                  <ArrowRight size={14} className="bento-arrow" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Practice Arena Featured Banner */}
      <section className="featured-banner-section">
        <div className="featured-banner">
          <div className="featured-banner-text">
            <div className="banner-tag">
              <GraduationCap size={16} />
              <span>PILLAR 03 · VERIFIED STEP-BY-STEP SOLVER</span>
            </div>
            <h2>Master Mathematical Problem Sets with KaTeX Proofs</h2>
            <p>
              Test your understanding across Chain Rule, Mean Value Theorem, Taylor Series, Definite Integrals, Continuous Convolution, and LTI Stability with instant verification and formal derivations.
            </p>
          </div>
          <button
            className="featured-banner-btn"
            onClick={() => onNavigate("practice")}
          >
            <BookOpen size={16} />
            <span>Open Problem Bank &amp; Solver</span>
          </button>
        </div>
      </section>

      {/* System Telemetry & Architecture Specs */}
      <section className="system-telemetry-section">
        <div className="telemetry-grid">
          <div className="telemetry-card">
            <strong>11</strong>
            <span>Verified Endpoints</span>
            <p>100% analytically tested symbolic and numerical APIs.</p>
          </div>
          <div className="telemetry-card">
            <strong>Exact</strong>
            <span>SymPy Precision</span>
            <p>Zero numerical truncation on symbolic derivations.</p>
          </div>
          <div className="telemetry-card">
            <strong>3D WebGL</strong>
            <span>Three.js Engine</span>
            <p>Hardware-accelerated dynamic geometry with OrbitControls.</p>
          </div>
          <div className="telemetry-card">
            <strong>Formal</strong>
            <span>LTI Proofs</span>
            <p>Linearity, Time-Invariance, and BIBO Stability theorems.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AppSidebar({
  domainMode,
  activePage,
  signalsTab,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  apiStatus
}) {
  const calculusItems = [
    { id: "mvt", label: "3D MVT Explorer", code: "01", icon: Compass },
    { id: "calculus", label: "Calculus Engine", code: "02", icon: Cpu },
    { id: "taylor", label: "Taylor Series", code: "03", icon: Sparkles },
    { id: "riemann", label: "Riemann Sums", code: "04", icon: BarChart3 },
    { id: "critical", label: "Critical Points", code: "05", icon: TrendingUp },
    { id: "limits", label: "Limits & Continuity", code: "06", icon: InfinityIcon }
  ];

  const signalsItems = [
    { id: "explorer", label: "Signal Explorer", code: "07", icon: Activity },
    { id: "convolution", label: "Convolution Lab", code: "08", icon: RotateCcw },
    { id: "lti", label: "LTI System Analyzer", code: "09", icon: CheckCircle2 },
    { id: "fourier", label: "Fourier Analysis", code: "10", icon: Waves }
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => onNavigate("home")}>
            <div className="brand-icon-box">
              <FlaskConical size={18} />
            </div>
            {!collapsed && (
              <div className="brand-text">
                <strong>AI MATH LAB</strong>
                <span>Calculus &amp; Signals</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div className="sidebar-nav-scroll">
          {/* Section: Overview */}
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-section-title">OVERVIEW</div>}
            <button
              type="button"
              className={`sidebar-nav-item ${domainMode === "home" ? "active" : ""}`}
              onClick={() => onNavigate("home")}
              title="Dashboard & Overview"
            >
              <Home size={16} />
              {!collapsed && <span>Interactive Overview</span>}
            </button>
          </div>

          {/* Section: Pillar 01 - Calculus */}
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-section-title">CALCULUS CORE</div>}
            {calculusItems.map((item) => {
              const Icon = item.icon;
              const isActive = domainMode === "calculus" && activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => onNavigate("calculus", item.id)}
                  title={item.label}
                >
                  <Icon size={16} />
                  {!collapsed && (
                    <>
                      <span className="item-label">{item.label}</span>
                      <span className="item-code">{item.code}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section: Pillar 02 - Signals */}
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-section-title">SIGNALS &amp; SYSTEMS</div>}
            {signalsItems.map((item) => {
              const Icon = item.icon;
              const isActive = domainMode === "signals" && signalsTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => onNavigate("signals", item.id)}
                  title={item.label}
                >
                  <Icon size={16} />
                  {!collapsed && (
                    <>
                      <span className="item-label">{item.label}</span>
                      <span className="item-code">{item.code}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section: AI Copilot */}
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-section-title">INTELLIGENCE</div>}
            <button
              type="button"
              className={`sidebar-nav-item ${domainMode === "copilot" ? "active" : ""}`}
              onClick={() => onNavigate("copilot")}
              title="AI Math Copilot & Analyzer"
            >
              <Bot size={16} />
              {!collapsed && (
                <>
                  <span className="item-label">AI Math Copilot</span>
                  <span className="item-badge-pill" style={{ background: "rgba(80, 227, 194, 0.18)", borderColor: "rgba(80, 227, 194, 0.45)", color: "#50e3c2" }}>AI</span>
                </>
              )}
            </button>
          </div>

          {/* Section: Practice & Solver */}
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-section-title">PRACTICE ARENA</div>}
            <button
              type="button"
              className={`sidebar-nav-item ${domainMode === "practice" ? "active" : ""}`}
              onClick={() => onNavigate("practice")}
              title="Problem Bank & Step-by-Step Solver"
            >
              <BookOpen size={16} />
              {!collapsed && (
                <>
                  <span className="item-label">Problem Solver</span>
                  <span className="item-badge-pill">SOLVER</span>
                </>
              )}
            </button>
          </div>

          {/* Section: Architecture */}
          <div className="sidebar-section">
            {!collapsed && <div className="sidebar-section-title">SYSTEM</div>}
            <button
              type="button"
              className={`sidebar-nav-item ${domainMode === "about" ? "active" : ""}`}
              onClick={() => onNavigate("about")}
              title="Architecture Specifications"
            >
              <CircleHelp size={16} />
              {!collapsed && <span className="item-label">Architecture</span>}
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-status-pill">
            <i className={apiStatus === "online" ? "online" : "pulse"} />
            {!collapsed && (
              <span>{apiStatus === "online" ? "API ONLINE" : "CONNECTING…"}</span>
            )}
          </div>
          {!collapsed && <span className="sidebar-version">v2.5 · Rich Noir</span>}
        </div>
      </aside>
    </>
  );
}

function AppNavbar({
  domainMode,
  activePage,
  signalsTab,
  apiStatus,
  onOpenMobile,
  onNavigate
}) {
  const getBreadcrumbs = () => {
    if (domainMode === "home") {
      return { pillar: "Dashboard", module: "Interactive Overview" };
    }
    if (domainMode === "copilot") {
      return { pillar: "AI Intelligence", module: "Personalized Math Analyzer & Copilot" };
    }
    if (domainMode === "practice") {
      return { pillar: "Practice Arena", module: "Problem Bank & Step-by-Step Solver" };
    }
    if (domainMode === "about") {
      return { pillar: "System Architecture", module: "Engine Specifications" };
    }
    if (domainMode === "signals") {
      const names = {
        explorer: "Module 07 · Waveform Dynamics",
        convolution: "Module 08 · Convolution Visualizer",
        lti: "Module 09 · LTI System Analyzer",
        fourier: "Module 10 · Fourier Analysis Lab"
      };
      return { pillar: "Signals & Systems", module: names[signalsTab] || "Lab" };
    }
    const names = {
      mvt: "Module 01 · 3D Mean Value Theorem",
      calculus: "Module 02 · Symbolic Calculus Engine",
      taylor: "Module 03 · Taylor Series Approximator",
      riemann: "Module 04 · Riemann Sums Visualizer",
      critical: "Module 05 · Critical Points & Extrema",
      limits: "Module 06 · Limits & Continuity"
    };
    return { pillar: "Calculus Core", module: names[activePage] || "Lab" };
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobile}
          title="Open Menu"
        >
          <Menu size={18} />
        </button>

        <div className="navbar-breadcrumbs">
          <span className="crumb-pillar" onClick={() => onNavigate("home")}>
            AI Math Lab
          </span>
          <span className="crumb-sep">/</span>
          <span className="crumb-section">{breadcrumbs.pillar}</span>
          <span className="crumb-sep">/</span>
          <strong className="crumb-module">{breadcrumbs.module}</strong>
        </div>
      </div>

      <div className="navbar-right">
        <button
          type="button"
          className="navbar-quick-btn"
          onClick={() => onNavigate("copilot")}
          title="Open AI Math Copilot"
        >
          <Bot size={14} />
          <span>AI Copilot</span>
        </button>
        <button
          type="button"
          className="navbar-quick-btn"
          onClick={() => onNavigate("home")}
          title="Return to Overview"
        >
          <Home size={14} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className="navbar-quick-btn"
          onClick={() => onNavigate("practice")}
          title="Open Problem Solver"
        >
          <BookOpen size={14} />
          <span>Solver</span>
        </button>

        <div className="navbar-status-badge">
          <i className={apiStatus === "online" ? "online" : "pulse"} />
          <span>{apiStatus === "online" ? "API ONLINE" : "CONNECTING"}</span>
        </div>
      </div>
    </header>
  );
}



// ----------------------------------------------------
// PERSONALIZED AI MATH ANALYZER & COPILOT COMPONENT
// ----------------------------------------------------

function AICopilotView({ onNavigate, initialFormula }) {
  const [persona, setPersona] = useState("ada");
  const [level, setLevel] = useState("undergraduate");
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const personas = [
    {
      id: "ada",
      name: "Ada Lovelace",
      role: "Intuitive & Visual Tutor",
      desc: "Metaphors, visual curves, step-by-step encouragement.",
      icon: "💡"
    },
    {
      id: "gauss",
      name: "Carl Friedrich Gauss",
      role: "Formal Analytical Rigor",
      desc: "Delta-epsilon proofs, formal theorems, strict deduction.",
      icon: "🎓"
    },
    {
      id: "fourier",
      name: "Joseph Fourier",
      role: "Signals & Transforms Physicist",
      desc: "Frequency response, harmonic synthesis, LTI theorems.",
      icon: "⚡"
    },
    {
      id: "concise",
      name: "Quick Solver",
      role: "Direct Closed-Form Engine",
      desc: "Instant formulas, bulleted derivation steps, zero fluff.",
      icon: "🚀"
    }
  ];

  const levels = [
    { id: "foundational", label: "Foundational (AP / High School)" },
    { id: "undergraduate", label: "Undergraduate (STEM)" },
    { id: "advanced", label: "Advanced (Graduate / Pure Math)" }
  ];

  const starterPrompts = [
    "Differentiate sin(x)/x with quotient rule",
    "Explain why the Mean Value Theorem guarantees a parallel tangent",
    "Prove whether y(t) = t * x(t) is an LTI system",
    "Why does Gibbs phenomenon occur in Fourier square waves?",
    "Find critical points and inflection of x^3 - 3*x"
  ];

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Greetings! I am your personalized **AI Math Copilot**, connected to the exact SymPy computational engine and 10 interactive mathematics laboratories.\n\nSelect a persona above, or ask me any question about derivatives, integrals, limits, critical points, LTI stability, or Fourier harmonics!",
      actions: [
        { label: "Launch 3D MVT Lab", domain: "calculus", page: "mvt" },
        { label: "Fourier Analysis Lab", domain: "signals", sub: "fourier" },
        { label: "Curated Problem Solver", domain: "practice" }
      ],
      suggested_prompts: starterPrompts.slice(0, 3)
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText = inputMsg) => {
    const text = (queryText || inputMsg).trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), sender: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInputMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          persona,
          level,
          active_formula: initialFormula || null
        })
      });

      if (!res.ok) throw new Error("AI analysis service temporarily unreachable");
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      const aiMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: data.reply,
        steps: data.steps || [],
        actions: data.actions || [],
        suggested_prompts: data.suggested_prompts || []
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      // Offline fallback pedagogical response
      const fallbackMsg = {
        id: Date.now() + 1,
        sender: "ai",
        text: `**Notice:** AI service connecting to local analyzer. For query "${text}", you can explore direct closed-form computations in **Module 02 (Symbolic Engine)** or test mathematical proofs in **Module 09 (LTI System Analyzer)**.`,
        actions: [
          { label: "Open Symbolic Calculus Engine", domain: "calculus", page: "calculus" },
          { label: "Open 3D MVT Explorer", domain: "calculus", page: "mvt" }
        ],
        suggested_prompts: starterPrompts.slice(0, 3)
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="copilot-container">
      {/* Header & Personalization Bar */}
      <div className="copilot-header panel">
        <div className="copilot-title-row">
          <div className="copilot-title">
            <div className="copilot-avatar">
              <Bot size={22} />
            </div>
            <div>
              <h2>AI Math Copilot &amp; Analytical Advisor</h2>
              <p>Personalized artificial intelligence grounded in exact SymPy symbolic computation.</p>
            </div>
          </div>

          <div className="copilot-level-select">
            <span className="level-label">Level:</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="level-dropdown"
            >
              {levels.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Persona Selector Tabs */}
        <div className="copilot-persona-grid">
          {personas.map(p => (
            <button
              key={p.id}
              type="button"
              className={`persona-card ${persona === p.id ? "active" : ""}`}
              onClick={() => setPersona(p.id)}
            >
              <span className="persona-icon">{p.icon}</span>
              <div className="persona-info">
                <strong>{p.name}</strong>
                <span className="persona-role">{p.role}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="copilot-chat-log panel">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.sender}`}>
            <div className="chat-avatar">
              {m.sender === "ai" ? <Bot size={16} /> : <User size={16} />}
            </div>

            <div className="chat-bubble-content">
              <div className="chat-text">
                <RichMathText content={m.text} />
              </div>

              {/* Step Breakdown Cards */}
              {m.steps && m.steps.length > 0 && (
                <div className="chat-steps-container">
                  {m.steps.map((st, sIdx) => (
                    <div key={sIdx} className="chat-step-card">
                      <div className="step-title">{st.title}</div>
                      <div className="step-formula">
                        <MathFormula tex={st.latex} block={true} />
                      </div>
                      {st.notes && <div className="step-notes">{st.notes}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Action Bridge Links */}
              {m.actions && m.actions.length > 0 && (
                <div className="chat-actions-row">
                  {m.actions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      type="button"
                      className="chat-action-btn"
                      onClick={() => onNavigate(act.domain, act.page || act.sub, act.formula)}
                    >
                      <Sparkles size={13} />
                      <span>{act.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              )}

              {/* Follow-up Prompts */}
              {m.suggested_prompts && m.suggested_prompts.length > 0 && (
                <div className="chat-suggestions">
                  <span className="suggestions-label">Explore next:</span>
                  <div className="suggestions-list">
                    {m.suggested_prompts.map((prm, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleSend(prm)}
                      >
                        {prm}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row ai loading">
            <div className="chat-avatar"><Bot size={16} /></div>
            <div className="chat-loading-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="copilot-input-bar panel">
        <input
          className="copilot-text-input"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Ask a question, request a proof, or type a formula (e.g. sin(x)/x)..."
          disabled={loading}
        />
        <button
          className="copilot-send-btn"
          onClick={() => handleSend()}
          disabled={loading || !inputMsg.trim()}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}

function FloatingAICopilot({ onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [quickInput, setQuickInput] = useState("");
  const [quickMessages, setQuickMessages] = useState([
    { sender: "ai", text: "Hi! Need a quick formula check, derivative, or proof? Ask below or open full workspace!" }
  ]);
  const [loading, setLoading] = useState(false);

  const handleQuickSend = async () => {
    const text = quickInput.trim();
    if (!text || loading) return;
    setQuickMessages(prev => [...prev, { sender: "user", text }]);
    setQuickInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, persona: "ada", level: "undergraduate" })
      });
      const data = await res.json();
      setQuickMessages(prev => [...prev, {
        sender: "ai",
        text: data.reply || "Computation completed.",
        actions: data.actions || []
      }]);
    } catch (e) {
      setQuickMessages(prev => [...prev, {
        sender: "ai",
        text: `Analysis ready in **AI Copilot** workspace.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="floating-copilot-container">
      {isOpen && (
        <div className="floating-copilot-card panel">
          <div className="floating-card-header">
            <div className="card-brand">
              <Bot size={16} />
              <strong>AI Math Copilot</strong>
            </div>
            <div className="card-actions">
              <button
                type="button"
                className="card-action-icon"
                onClick={() => { setIsOpen(false); onNavigate("copilot"); }}
                title="Open Full Workspace"
              >
                <Maximize2 size={14} />
              </button>
              <button
                type="button"
                className="card-action-icon"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="floating-card-body">
            {quickMessages.map((m, i) => (
              <div key={i} className={`floating-msg ${m.sender}`}>
                <RichMathText content={m.text} />
                {m.actions && (
                  <div className="floating-actions">
                    {m.actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        type="button"
                        className="floating-act-btn"
                        onClick={() => { setIsOpen(false); onNavigate(act.domain, act.page || act.sub); }}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="floating-msg ai">Analyzing...</div>}
          </div>

          <div className="floating-card-footer">
            <input
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleQuickSend(); }}
              placeholder="Ask formula question..."
              className="floating-input"
            />
            <button
              onClick={handleQuickSend}
              className="floating-send-btn"
              disabled={loading || !quickInput.trim()}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`floating-copilot-btn ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Math Assistant"
      >
        <Bot size={20} />
        <span className="floating-btn-text">AI Copilot</span>
        <span className="floating-dot" />
      </button>
    </div>
  );
}


function parseHash() {
  if (typeof window === "undefined") return { domain: "home" };
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (!hash || hash === "home") return { domain: "home" };
  if (hash.startsWith("signals/convolution")) return { domain: "signals", signalsTab: "convolution" };
  if (hash.startsWith("signals/lti")) return { domain: "signals", signalsTab: "lti" };
  if (hash.startsWith("signals/fourier")) return { domain: "signals", signalsTab: "fourier" };
  if (hash.startsWith("signals")) return { domain: "signals", signalsTab: "explorer" };
  if (hash.startsWith("copilot") || hash.startsWith("chat") || hash.startsWith("ai")) return { domain: "copilot" };
  if (hash.startsWith("practice") || hash.startsWith("solver")) return { domain: "practice" };
  if (hash.startsWith("about")) return { domain: "about" };
  if (hash.startsWith("mvt")) return { domain: "calculus", page: "mvt" };
  if (hash.startsWith("calculus")) return { domain: "calculus", page: "calculus" };
  if (hash.startsWith("taylor")) return { domain: "calculus", page: "taylor" };
  if (hash.startsWith("riemann")) return { domain: "calculus", page: "riemann" };
  if (hash.startsWith("critical")) return { domain: "calculus", page: "critical" };
  if (hash.startsWith("limits")) return { domain: "calculus", page: "limits" };
  return { domain: "home" };
}

function App() {
  const [apiStatus, setApiStatus] = useState("checking");
  const initialRoute = parseHash();
  const [domainMode, setDomainMode] = useState(initialRoute.domain || "home");
  const [signalsTab, setSignalsTab] = useState(initialRoute.signalsTab || "explorer");
  const [activePage, setActivePage] = useState(initialRoute.page || "mvt");
  const [showSteps, setShowSteps] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTo = (domain, sub = null) => {
    setDomainMode(domain);
    if (domain === "calculus" && sub) setActivePage(sub);
    if (domain === "signals" && sub) setSignalsTab(sub);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sync URL hash with active mode and tab
  useEffect(() => {
    let target = "";
    if (domainMode === "home") target = `#/home`;
    else if (domainMode === "signals") target = `#/signals/${signalsTab}`;
    else if (domainMode === "copilot") target = `#/copilot`;
    else if (domainMode === "practice") target = `#/practice`;
    else if (domainMode === "about") target = `#/about`;
    else target = `#/${activePage}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [domainMode, signalsTab, activePage]);

  // Handle browser Back / Forward history navigation
  useEffect(() => {
    const handleHash = () => {
      const r = parseHash();
      setDomainMode(r.domain);
      if (r.signalsTab) setSignalsTab(r.signalsTab);
      if (r.page) setActivePage(r.page);
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

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

  // Initial default calculations on mount
  useEffect(() => {
    calculateMVT();
  }, []);

  // Compute tab default once when opening an uncalculated tab
  useEffect(() => {
    if (activePage === "mvt" && !result) calculateMVT();
    else if (activePage === "calculus" && !calculusResult) calculateCalculus();
    else if (activePage === "taylor" && !taylorResult) calculateTaylor();
    else if (activePage === "riemann" && !riemannResult) calculateRiemann();
    else if (activePage === "critical" && !criticalResult) calculateCriticalPoints();
    else if (activePage === "limits" && !limitResult) calculateLimit();
  }, [activePage]);

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
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
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

      {/* Modern Collapsible Left Sidebar */}
      <AppSidebar
        domainMode={domainMode}
        activePage={activePage}
        signalsTab={signalsTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigate={navigateTo}
        apiStatus={apiStatus}
      />

      {/* Main Content Area */}
      <div className="app-main-content">
        <AppNavbar
          domainMode={domainMode}
          activePage={activePage}
          signalsTab={signalsTab}
          apiStatus={apiStatus}
          onOpenMobile={() => setMobileMenuOpen(true)}
          onNavigate={navigateTo}
        />

        <div className="app-content-body">
          {/* 0. Interactive Homepage */}
          {domainMode === "home" && (
            <InteractiveHome onNavigate={navigateTo} apiStatus={apiStatus} />
          )}

      {domainMode === "calculus" && (
        <>
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
                onKeyDown={e => { if (e.key === "Enter") calculateMVT(); }}
                placeholder="x^2 + sin(x)"
              />

              <div className="bounds">
                <div>
                  <label>LOWER a</label>
                  <input value={a} onChange={e => setA(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateMVT(); }} />
                </div>
                <div>
                  <label>UPPER b</label>
                  <input value={b} onChange={e => setB(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateMVT(); }} />
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
              <input value={valueX} onChange={e => setValueX(e.target.value)} onKeyDown={e => { if (e.key === "Enter") findValue(); }} />
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
                onKeyDown={e => { if (e.key === "Enter") calculateCalculus(); }}
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
                  <input type="number" value={calculusA} onChange={e => setCalculusA(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateCalculus(); }} />
                </div>
                <div className="calculus-field limit-field">
                  <label>UPPER LIMIT (b)</label>
                  <input type="number" value={calculusB} onChange={e => setCalculusB(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateCalculus(); }} />
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
                onKeyDown={e => { if (e.key === "Enter") calculateTaylor(); }}
                placeholder="sin(x)"
              />
            </div>
            <div className="calculus-field limit-field">
              <label>EXPANSION CENTER (a)</label>
              <input value={taylorPoint} onChange={e => setTaylorPoint(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateTaylor(); }} placeholder="0 for Maclaurin" />
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
                onKeyDown={e => { if (e.key === "Enter") calculateRiemann(); }}
                placeholder="x^2"
              />
            </div>
            <div className="calculus-field limit-field">
              <label>LOWER BOUND a</label>
              <input value={riemannA} onChange={e => setRiemannA(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateRiemann(); }} />
            </div>
            <div className="calculus-field limit-field">
              <label>UPPER BOUND b</label>
              <input value={riemannB} onChange={e => setRiemannB(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateRiemann(); }} />
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
                onKeyDown={e => { if (e.key === "Enter") calculateCriticalPoints(); }}
                placeholder="x^3 - 3x"
              />
            </div>
            <div className="calculus-field limit-field">
              <label>INTERVAL LOWER BOUND</label>
              <input type="number" value={criticalA} onChange={e => setCriticalA(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateCriticalPoints(); }} />
            </div>
            <div className="calculus-field limit-field">
              <label>INTERVAL UPPER BOUND</label>
              <input type="number" value={criticalB} onChange={e => setCriticalB(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateCriticalPoints(); }} />
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
                onKeyDown={e => { if (e.key === "Enter") calculateLimit(); }}
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
              <input value={limitPoint} onChange={e => setLimitPoint(e.target.value)} onKeyDown={e => { if (e.key === "Enter") calculateLimit(); }} placeholder="0, oo, -oo" />
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
        </>
      )}

      {/* ======================================================== */}
      {/* SIGNALS & SYSTEMS LAB                                    */}
      {/* ======================================================== */}
      {domainMode === "signals" && (
        <>
          <section className="title-row">
            <div>
              <span className="section-code">
                {signalsTab === "explorer" && "PILLAR 02 · MODULE 07 · WAVEFORMS"}
                {signalsTab === "convolution" && "PILLAR 02 · MODULE 08 · DYNAMICS"}
              </span>
              <h1>
                {signalsTab === "explorer" && "Signal Explorer & Continuous/Discrete Transformations"}
                {signalsTab === "convolution" && "Convolution Visualizer (Continuous & Discrete)"}
              </h1>
              <p>
                {signalsTab === "explorer" &&
                  "Explore standard continuous-time t and discrete-time n stem waveforms, energy metrics, and fundamental transformations y(t) = A·x(a(t - t₀))."}
                {signalsTab === "convolution" &&
                  "Step-by-step interactive folding, sliding kernel, overlap product area, and accumulated output for continuous integrals and discrete sums."}
              </p>
            </div>
            <div className="formula">
              {signalsTab === "explorer" && (
                <MathFormula tex="y(t) = A \cdot x(a(t - t_0)) \quad \text{or} \quad y[n] = A \cdot x[a(n - n_0)]" />
              )}
              {signalsTab === "convolution" && (
                <MathFormula tex="y(t) = \int_{-\infty}^{\infty} x(\tau) h(t - \tau) d\tau \quad \iff \quad y[n] = \sum_k x[k] h[n - k]" />
              )}
            </div>
          </section>

          {signalsTab === "explorer" && <SignalExplorer />}
          {signalsTab === "convolution" && <ConvolutionVisualizer />}
          {signalsTab === "lti" && <LTIAnalyzer />}
          {signalsTab === "fourier" && <FourierLab />}
        </>
      )}

      {/* ======================================================== */}
      {/* ABOUT & ARCHITECTURE VIEW                                */}
      {/* ======================================================== */}
      {domainMode === "about" && <AboutView />}

      {/* ======================================================== */}
      {/* PRACTICE MODE & STEP-BY-STEP SOLVER                      */}
      {/* ======================================================== */}
      {domainMode === "practice" && (
        <>
          <section className="title-row">
            <div>
              <span className="section-code">PILLAR 03 · STEP-BY-STEP SOLVER</span>
              <h1>Curated Mathematical Problem Bank &amp; Step-by-Step Solver</h1>
              <p>
                Challenge yourself across Calculus and Signals &amp; Systems with tiered difficulty (Fundamentals, Standard, Challenge).
                Includes hints, instant verification, and detailed KaTeX worked solutions.
              </p>
            </div>
            <div className="formula">
              <MathFormula tex="\text{Select Answer} \implies \text{Instant Verify} \implies \text{KaTeX Step-by-Step Proof}" />
            </div>
          </section>

          <PracticeSolver />
        </>
      )}

        </div>

        {/* Floating Quick Assistant */}
        <FloatingAICopilot onNavigate={navigateTo} />

        {/* Global Minimal Footer */}
        <footer className="app-footer">
          <div className="footer-content">
            <span>AI MATH LAB · Next-Generation Computational Mathematics Platform</span>
            <span>FastAPI · PyTorch · SymPy · Three.js · React · KaTeX</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
