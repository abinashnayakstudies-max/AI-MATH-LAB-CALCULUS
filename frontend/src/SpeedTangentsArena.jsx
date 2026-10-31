import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Zap,
  Trophy,
  Timer,
  Play,
  RotateCcw,
  Sparkles,
  Award,
  Volume2,
  VolumeX,
  Crosshair,
  CheckCircle2,
  Flame,
  BarChart2,
  ChevronRight,
  TrendingUp,
  Maximize2
} from "lucide-react";

/**
 * Sound FX Synthesizer using Web Audio API
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type = "sine", duration = 0.15, gainVal = 0.12) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  success() {
    if (this.muted) return;
    this.playTone(523.25, "triangle", 0.12, 0.15); // C5
    setTimeout(() => this.playTone(659.25, "triangle", 0.12, 0.15), 80); // E5
    setTimeout(() => this.playTone(783.99, "sine", 0.25, 0.18), 160); // G5
  }

  bullseye() {
    if (this.muted) return;
    this.playTone(523.25, "triangle", 0.1, 0.15);
    setTimeout(() => this.playTone(659.25, "triangle", 0.1, 0.15), 60);
    setTimeout(() => this.playTone(783.99, "triangle", 0.1, 0.18), 120);
    setTimeout(() => this.playTone(1046.5, "sine", 0.35, 0.2), 180); // C6
  }

  miss() {
    if (this.muted) return;
    this.playTone(220, "sawtooth", 0.2, 0.08);
    setTimeout(() => this.playTone(185, "sawtooth", 0.25, 0.08), 100);
  }

  tick() {
    this.playTone(880, "sine", 0.04, 0.04);
  }
}

const sounds = new SoundEngine();

export function SpeedTangentsArena({ MathFormula }) {
  // Game Modes: "mvt" (Speed Tangents) | "extrema" (Critical Point Sniper) | "riemann" (Area Estimator)
  const [gameMode, setGameMode] = useState("mvt");
  const [gameState, setGameState] = useState("idle"); // "idle" | "playing" | "round_result" | "game_over"
  const [round, setRound] = useState(1);
  const totalRounds = 5;

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem("ai_math_arena_high_score") || 0));
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [timeLeft, setTimeLeft] = useState(15);
  const [userGuess, setUserGuess] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [roundHistory, setRoundHistory] = useState([]);

  // Mode 2 (Extrema Sniper) clicked points
  const [extremaFound, setExtremaFound] = useState([]);

  const timerRef = useRef(null);

  // Sound mute sync
  useEffect(() => {
    sounds.muted = !soundEnabled;
  }, [soundEnabled]);

  // Problem generator based on selected mode
  const [problem, setProblem] = useState(() => createProblem("mvt"));

  function createProblem(mode) {
    if (mode === "mvt") {
      const bank = [
        {
          name: "f(x) = x^2 - 1.5",
          latex: "f(x) = x^2 - 1.5",
          f: (x) => x * x - 1.5,
          df: (x) => 2 * x,
          a: -2.0,
          b: 2.2,
          solveC: (a, b) => (a + b) / 2
        },
        {
          name: "f(x) = -0.7x^2 + 2.5",
          latex: "f(x) = -0.7x^2 + 2.5",
          f: (x) => -0.7 * x * x + 2.5,
          df: (x) => -1.4 * x,
          a: -1.6,
          b: 2.4,
          solveC: (a, b) => (a + b) / 2
        },
        {
          name: "f(x) = 0.4(x^3 - 3x)",
          latex: "f(x) = 0.4(x^3 - 3x)",
          f: (x) => 0.4 * (x * x * x - 3 * x),
          df: (x) => 0.4 * (3 * x * x - 3),
          a: -1.8,
          b: 1.8,
          solveC: (a, b) => {
            const slope = (0.4 * (b * b * b - 3 * b) - 0.4 * (a * a * a - 3 * a)) / (b - a);
            const val = (slope / 0.4 + 3) / 3;
            return Math.sqrt(Math.max(val, 0));
          }
        },
        {
          name: "f(x) = 1.6\\sin(1.2x)",
          latex: "f(x) = 1.6\\sin(1.2x)",
          f: (x) => 1.6 * Math.sin(1.2 * x),
          df: (x) => 1.6 * 1.2 * Math.cos(1.2 * x),
          a: -1.2,
          b: 2.2,
          solveC: (a, b) => {
            const secant = (1.6 * Math.sin(1.2 * b) - 1.6 * Math.sin(1.2 * a)) / (b - a);
            const ratio = Math.min(Math.max(secant / (1.6 * 1.2), -1), 1);
            return Math.acos(ratio) / 1.2;
          }
        }
      ];
      const p = bank[Math.floor(Math.random() * bank.length)];
      return {
        ...p,
        trueC: p.solveC(p.a, p.b),
        secantSlope: (p.f(p.b) - p.f(p.a)) / (p.b - p.a)
      };
    } else if (mode === "extrema") {
      // Extrema sniper: Cubic with stationary points at x = -1 and x = +1
      return {
        name: "f(x) = 0.5(x^3 - 3x)",
        latex: "f(x) = 0.5(x^3 - 3x)",
        f: (x) => 0.5 * (x * x * x - 3 * x),
        df: (x) => 0.5 * (3 * x * x - 3),
        a: -2.3,
        b: 2.3,
        targets: [
          { x: -1.0, type: "Local Maximum", y: 1.0 },
          { x: 1.0, type: "Local Minimum", y: -1.0 }
        ]
      };
    } else {
      // Riemann area blitz
      const areaVal = (1 / 3) * (Math.pow(2.0, 3) - Math.pow(0, 3));
      return {
        name: "f(x) = x^2 on [0, 2]",
        latex: "\\int_0^2 x^2\\,dx = \\frac{8}{3} \\approx 2.67",
        f: (x) => x * x,
        a: 0,
        b: 2.0,
        trueArea: areaVal
      };
    }
  }

  // Timer loop
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            sounds.miss();
            handleTimeout();
            return 0;
          }
          if (prev <= 4) {
            sounds.tick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const handleTimeout = () => {
    submitGuess(true);
  };

  const startNewGame = (mode = gameMode) => {
    setGameMode(mode);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setRound(1);
    setRoundHistory([]);
    setLastResult(null);
    setExtremaFound([]);

    const newP = createProblem(mode);
    setProblem(newP);
    setUserGuess((newP.a + newP.b) / 2);
    setTimeLeft(mode === "extrema" ? 20 : 15);
    setGameState("playing");
  };

  const submitGuess = (isTimeOut = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (gameMode === "mvt") {
      const error = Math.abs(userGuess - problem.trueC);
      let accuracy = Math.max(0, 100 - error * 55);
      let rank = "Missed";
      let basePts = 50;

      if (accuracy >= 94) {
        rank = "🎯 BULLSEYE! PERFECT TANGENT";
        basePts = 1200 + timeLeft * 50;
        sounds.bullseye();
      } else if (accuracy >= 80) {
        rank = "✨ EXCELLENT PARALLELISM";
        basePts = 850 + timeLeft * 25;
        sounds.success();
      } else if (accuracy >= 60) {
        rank = "👍 CLOSE FIT";
        basePts = 450;
        sounds.success();
      } else {
        rank = "❌ SLOPE MISMATCH";
        basePts = isTimeOut ? 0 : 50;
        sounds.miss();
      }

      const curStreak = accuracy >= 60 ? streak + 1 : 0;
      setStreak(curStreak);
      if (curStreak > maxStreak) setMaxStreak(curStreak);

      const multiplier = 1 + (curStreak > 1 ? (curStreak - 1) * 0.15 : 0);
      const earned = Math.round(basePts * multiplier);
      const newScore = score + earned;
      setScore(newScore);

      if (newScore > highScore) {
        setHighScore(newScore);
        localStorage.setItem("ai_math_arena_high_score", String(newScore));
      }

      const roundSummary = {
        round,
        rank,
        accuracy: accuracy.toFixed(1),
        error: error.toFixed(3),
        userGuess: userGuess.toFixed(2),
        trueVal: problem.trueC.toFixed(2),
        points: earned
      };

      setLastResult(roundSummary);
      setRoundHistory((prev) => [...prev, roundSummary]);
      setGameState("round_result");
    } else if (gameMode === "extrema") {
      // Extrema sniper evaluation
      const targets = problem.targets || [];
      const foundCount = extremaFound.length;
      let earned = foundCount * 600 + timeLeft * 30;
      if (foundCount === targets.length) {
        sounds.bullseye();
      } else {
        sounds.miss();
      }

      const roundSummary = {
        round,
        rank: foundCount === targets.length ? "🎯 ALL CRITICAL POINTS SNIPED" : "PARTIAL DISCOVERY",
        accuracy: ((foundCount / (targets.length || 1)) * 100).toFixed(0),
        points: earned
      };
      setScore((s) => s + earned);
      setLastResult(roundSummary);
      setRoundHistory((prev) => [...prev, roundSummary]);
      setGameState("round_result");
    }
  };

  const nextRound = () => {
    if (round >= totalRounds) {
      setGameState("game_over");
      return;
    }
    const nextR = round + 1;
    setRound(nextR);
    const newP = createProblem(gameMode);
    setProblem(newP);
    setUserGuess((newP.a + newP.b) / 2);
    setExtremaFound([]);
    setTimeLeft(gameMode === "extrema" ? 20 : 15);
    setLastResult(null);
    setGameState("playing");
  };

  // SVG Geometry Calculations
  const svgW = 620;
  const svgH = 280;
  const pad = 44;
  const { a, b, f } = problem;

  const pts = [];
  const steps = 70;
  for (let i = 0; i <= steps; i++) {
    const x = a + (i / steps) * (b - a);
    pts.push({ x, y: f(x) });
  }

  const ys = pts.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const mapX = (x) => pad + ((x - a) / (b - a || 1)) * (svgW - 2 * pad);
  const mapY = (y) => svgH - pad - ((y - minY) / (maxY - minY || 1)) * (svgH - 2 * pad);
  const curvePath = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${mapX(p.x)} ${mapY(p.y)}`, "");

  // Secant Line
  const secX1 = mapX(a), secY1 = mapY(f(a));
  const secX2 = mapX(b), secY2 = mapY(f(b));

  // User Tangent Line
  const currentTangentSlope = problem.df ? problem.df(userGuess) : 0;
  const tangentSpan = (b - a) * 0.28;
  const tanX1 = mapX(userGuess - tangentSpan);
  const tanY1 = mapY(f(userGuess) - currentTangentSlope * tangentSpan);
  const tanX2 = mapX(userGuess + tangentSpan);
  const tanY2 = mapY(f(userGuess) + currentTangentSlope * tangentSpan);

  // Instant accuracy percentage for live dial
  const liveError = Math.abs(userGuess - (problem.trueC ?? (a + b) / 2));
  const liveAccuracy = Math.max(0, Math.min(100, Math.round(100 - liveError * 55)));

  // Click on SVG to position tangent
  const handleSvgClick = (e) => {
    if (gameState !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const norm = (clickX - pad) / (svgW - 2 * pad);
    const clampedX = Math.min(Math.max(a + norm * (b - a), a + 0.05), b - 0.05);

    if (gameMode === "mvt") {
      setUserGuess(clampedX);
      sounds.tick();
    } else if (gameMode === "extrema") {
      // Check if near any target
      const targets = problem.targets || [];
      const hit = targets.find((t) => Math.abs(t.x - clampedX) < 0.25);
      if (hit && !extremaFound.includes(hit.type)) {
        sounds.success();
        setExtremaFound((prev) => [...prev, hit.type]);
      } else {
        sounds.miss();
      }
    }
  };

  return (
    <div
      className="speed-tangents-arena panel"
      style={{
        marginTop: "16px",
        background: "linear-gradient(180deg, rgba(20, 16, 22, 0.95) 0%, rgba(13, 11, 14, 0.98) 100%)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Top Header & Mode Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "16px",
          marginBottom: "18px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(194, 59, 96, 0.4), rgba(120, 29, 57, 0.2))",
              border: "1px solid var(--accent-crimson)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "17px", color: "#f5efe6", margin: 0, fontWeight: "700" }}>
                Calculus Arcade: Precision Duel &amp; Speed Arena
              </h2>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  background: "rgba(80, 227, 194, 0.15)",
                  color: "#50e3c2",
                  border: "1px solid rgba(80, 227, 194, 0.35)",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}
              >
                PRO EDITION
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              Sharpen your geometric intuition under speed countdowns with instant feedback
            </span>
          </div>
        </div>

        {/* Global Gamification Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)"
            }}
          >
            <Trophy size={15} style={{ color: "var(--accent-amber)" }} />
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Best:</span>
            <b style={{ color: "var(--accent-amber)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>{highScore}</b>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(194, 59, 96, 0.2)",
              border: "1px solid rgba(194, 59, 96, 0.45)"
            }}
          >
            <Sparkles size={15} style={{ color: "#fff" }} />
            <span style={{ fontSize: "12px", color: "#f5efe6" }}>Score:</span>
            <b style={{ color: "#fff", fontFamily: "var(--font-mono)", fontSize: "15px" }}>{score}</b>
          </div>

          {streak > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                background: "linear-gradient(90deg, #781d39, #c23b60)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "700"
              }}
            >
              <Flame size={14} />
              <span>{streak}x COMBO</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Arcade Audio" : "Enable Arcade Audio"}
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: soundEnabled ? "var(--accent-sage)" : "var(--text-dim)",
              padding: "6px 10px",
              cursor: "pointer"
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Mode Selector Strip */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          type="button"
          className={`filter-btn ${gameMode === "mvt" ? "active" : ""}`}
          onClick={() => startNewGame("mvt")}
          style={{ padding: "8px 16px", fontSize: "12px" }}
        >
          ⚡ Mode 1: Speed Tangents (MVT Rush)
        </button>
        <button
          type="button"
          className={`filter-btn ${gameMode === "extrema" ? "active" : ""}`}
          onClick={() => startNewGame("extrema")}
          style={{ padding: "8px 16px", fontSize: "12px" }}
        >
          🎯 Mode 2: Extrema Sniper (f'(x) = 0)
        </button>
      </div>

      {/* IDLE SPLASH SCREEN */}
      {gameState === "idle" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(194, 59, 96, 0.4), rgba(120, 29, 57, 0.1))",
              border: "2px solid var(--accent-crimson)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              color: "var(--accent-crimson)"
            }}
          >
            <Trophy size={32} />
          </div>
          <h3 style={{ fontSize: "22px", color: "#f5efe6", marginBottom: "8px" }}>
            The Calculus Arena is Ready
          </h3>
          <p style={{ maxWidth: "560px", margin: "0 auto 24px", color: "var(--text-dim)", fontSize: "13px", lineHeight: "1.6" }}>
            Test your visual speed and derivative precision across <b>5 rapid rounds</b>. Find the point $c$ guaranteed by the Mean Value Theorem before the 15-second fuse expires!
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => startNewGame(gameMode)}
            style={{ padding: "12px 32px", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <Play size={16} />
            <span>Enter the Arena (Start Round 1)</span>
          </button>
        </div>
      )}

      {/* ACTIVE PLAYING OR ROUND RESULT SCREEN */}
      {(gameState === "playing" || gameState === "round_result") && (
        <div>
          {/* Active Round Info Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: "rgba(138, 158, 140, 0.2)",
                  color: "var(--accent-sage)",
                  border: "1px solid rgba(138, 158, 140, 0.35)",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "700"
                }}
              >
                ROUND {round} OF {totalRounds}
              </span>
              <span style={{ fontSize: "13px", color: "#f5efe6", fontWeight: "600" }}>
                Target: <code>{problem.name}</code> on $[{a}, {b}]$
              </span>
            </div>

            {/* Countdown Timer with Pulsing Alert */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: timeLeft <= 5 ? "rgba(194, 59, 96, 0.4)" : "rgba(255,255,255,0.06)",
                border: timeLeft <= 5 ? "1px solid var(--accent-crimson)" : "1px solid var(--border-subtle)",
                animation: timeLeft <= 5 ? "pulse-border 1s infinite" : "none"
              }}
            >
              <Timer size={15} style={{ color: timeLeft <= 5 ? "#ff8fa3" : "#f5efe6" }} />
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>TIME:</span>
              <b style={{ fontFamily: "var(--font-mono)", fontSize: "15px", color: timeLeft <= 5 ? "#fff" : "var(--accent-sage)" }}>
                {timeLeft}s
              </b>
            </div>
          </div>

          {/* Interactive SVG Game Curve */}
          <div
            style={{
              position: "relative",
              background: "#080709",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              overflow: "hidden",
              cursor: "crosshair"
            }}
            onClick={handleSvgClick}
          >
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "auto", display: "block" }}>
              {/* Background Reference Lines */}
              <line x1={pad} y1={mapY(0)} x2={svgW - pad} y2={mapY(0)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />

              {/* Mode 1: Secant Line (Dashed Sage) */}
              {gameMode === "mvt" && (
                <line x1={secX1} y1={secY1} x2={secX2} y2={secY2} stroke="#8a9e8c" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.85" />
              )}

              {/* Smooth Function Curve (Cream) */}
              <path d={curvePath} fill="none" stroke="#f5efe6" strokeWidth="2.8" />

              {/* Endpoints A and B */}
              <circle cx={secX1} cy={secY1} r="5" fill="#8a9e8c" />
              <circle cx={secX2} cy={secY2} r="5" fill="#8a9e8c" />
              <text x={secX1 - 10} y={secY1 - 8} fill="#8a9e8c" fontSize="11" fontFamily="JetBrains Mono, monospace">a</text>
              <text x={secX2 + 8} y={secY2 - 8} fill="#8a9e8c" fontSize="11" fontFamily="JetBrains Mono, monospace">b</text>

              {/* User Tangent Line (Radiant Crimson) */}
              {gameMode === "mvt" && (
                <>
                  <line x1={tanX1} y1={tanY1} x2={tanX2} y2={tanY2} stroke="#c23b60" strokeWidth="3" />
                  <circle cx={mapX(userGuess)} cy={mapY(f(userGuess))} r="7" fill="#c23b60" />
                  <line
                    x1={mapX(userGuess)}
                    y1={mapY(f(userGuess))}
                    x2={mapX(userGuess)}
                    y2={mapY(0)}
                    stroke="rgba(194, 59, 96, 0.4)"
                    strokeDasharray="2 2"
                  />
                </>
              )}

              {/* Mode 2: Extrema Targets */}
              {gameMode === "extrema" &&
                (problem.targets || []).map((tgt, i) => {
                  const isFound = extremaFound.includes(tgt.type);
                  return (
                    <g key={i}>
                      <circle
                        cx={mapX(tgt.x)}
                        cy={mapY(tgt.y)}
                        r={isFound ? 8 : 12}
                        fill={isFound ? "#50e3c2" : "rgba(194, 59, 96, 0.25)"}
                        stroke={isFound ? "#50e3c2" : "#c23b60"}
                        strokeWidth="2"
                      />
                      {isFound && (
                        <text x={mapX(tgt.x)} y={mapY(tgt.y) - 12} fill="#50e3c2" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                          {tgt.type} Sniped!
                        </text>
                      )}
                    </g>
                  );
                })}

              {/* Reveal Phase: True Analytical C Marker */}
              {gameState === "round_result" && gameMode === "mvt" && (
                <g>
                  <circle cx={mapX(problem.trueC)} cy={mapY(f(problem.trueC))} r="8" fill="#50e3c2" />
                  <text
                    x={mapX(problem.trueC)}
                    y={mapY(f(problem.trueC)) - 14}
                    fill="#50e3c2"
                    fontSize="11"
                    fontWeight="700"
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Exact MVT c = {problem.trueC.toFixed(2)}
                  </text>
                </g>
              )}
            </svg>

            {/* In-Plot Instruction Overlay */}
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "12px",
                background: "rgba(10, 8, 12, 0.75)",
                backdropFilter: "blur(4px)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                color: "var(--text-dim)"
              }}
            >
              Click anywhere on curve or drag slider
            </div>
          </div>

          {/* Controls Bar & Real-Time Precision Meter */}
          {gameState === "playing" && gameMode === "mvt" && (
            <div style={{ marginTop: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>
                    POSITION ESTIMATOR SLIDER:
                  </span>
                  <span style={{ marginLeft: "8px", color: "var(--accent-crimson)", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
                    c = {userGuess.toFixed(2)}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>Live Precision:</span>
                  <div
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "12px",
                      fontWeight: "700",
                      fontFamily: "var(--font-mono)",
                      background: liveAccuracy >= 80 ? "rgba(80, 227, 194, 0.2)" : "rgba(194, 59, 96, 0.2)",
                      color: liveAccuracy >= 80 ? "#50e3c2" : "var(--accent-crimson)",
                      border: `1px solid ${liveAccuracy >= 80 ? "#50e3c2" : "var(--accent-crimson)"}`
                    }}
                  >
                    {liveAccuracy}%
                  </div>
                </div>
              </div>

              <input
                type="range"
                min={a + 0.05}
                max={b - 0.05}
                step="0.01"
                value={userGuess}
                onChange={(e) => {
                  setUserGuess(Number(e.target.value));
                  sounds.tick();
                }}
                style={{ width: "100%", accentColor: "var(--accent-crimson)", cursor: "pointer" }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-dim)", display: "flex", gap: "16px" }}>
                  <span>Secant Slope $m = {problem.secantSlope?.toFixed(2)}$</span>
                  <span>Tangent Slope $f'(c) = {currentTangentSlope.toFixed(2)}$</span>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => submitGuess(false)}
                  style={{ padding: "10px 24px", display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Crosshair size={16} />
                  <span>Lock in Tangent Point</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Extrema Sniper Target List */}
          {gameState === "playing" && gameMode === "extrema" && (
            <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                {(problem.targets || []).map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: extremaFound.includes(t.type) ? "rgba(80, 227, 194, 0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${extremaFound.includes(t.type) ? "#50e3c2" : "var(--border-subtle)"}`,
                      fontSize: "12px",
                      color: extremaFound.includes(t.type) ? "#50e3c2" : "#f5efe6"
                    }}
                  >
                    {extremaFound.includes(t.type) ? "✓ " : "🎯 "} Click {t.type}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={() => submitGuess(false)}
                style={{ padding: "8px 20px" }}
              >
                Finish Round
              </button>
            </div>
          )}

          {/* ROUND RESULT OVERLAY CARD */}
          {gameState === "round_result" && lastResult && (
            <div
              style={{
                marginTop: "18px",
                padding: "18px 24px",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(90deg, rgba(120, 29, 57, 0.35) 0%, rgba(20, 16, 22, 0.9) 100%)",
                border: "1px solid var(--accent-crimson)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h4 style={{ fontSize: "16px", color: "#f5efe6", margin: 0, fontWeight: "700" }}>
                    {lastResult.rank}
                  </h4>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      color: "#50e3c2",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "700"
                    }}
                  >
                    +{lastResult.points} PTS
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "4px" }}>
                  Accuracy: <b style={{ color: "#f5efe6" }}>{lastResult.accuracy}%</b> • Your Guess: <b>c = {lastResult.userGuess}</b> • True MVT: <b style={{ color: "#50e3c2" }}>c = {lastResult.trueVal}</b>
                </div>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={nextRound}
                style={{ padding: "10px 22px", display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <span>{round >= totalRounds ? "View Final Results" : `Advance to Round ${round + 1}`}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME OVER GRAND SUMMARY SCREEN */}
      {gameState === "game_over" && (
        <div style={{ textAlign: "center", padding: "36px 20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(80, 227, 194, 0.35), rgba(120, 29, 57, 0.35))",
              border: "2px solid #50e3c2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#50e3c2"
            }}
          >
            <Award size={36} />
          </div>

          <h3 style={{ fontSize: "24px", color: "#f5efe6", marginBottom: "6px" }}>
            Calculus Arena Duel Completed!
          </h3>
          <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px" }}>
            Rank Achieved: <b style={{ color: score >= 4000 ? "#50e3c2" : score >= 2500 ? "var(--accent-amber)" : "var(--accent-crimson)" }}>
              {score >= 4500 ? "🏆 Grandmaster of Analysis (S-Rank)" : score >= 3000 ? "⭐ Calculus Virtuoso (A-Rank)" : "🌱 Adept Apprentice (B-Rank)"}
            </b>
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "14px",
              maxWidth: "500px",
              margin: "0 auto 28px"
            }}
          >
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "14px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>FINAL SCORE</span>
              <div style={{ fontSize: "20px", color: "#f5efe6", fontFamily: "var(--font-mono)", fontWeight: "700" }}>{score}</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", padding: "14px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>MAX STREAK</span>
              <div style={{ fontSize: "20px", color: "var(--accent-crimson)", fontFamily: "var(--font-mono)", fontWeight: "700" }}>
                {maxStreak}x
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", padding: "14px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>HIGH SCORE</span>
              <div style={{ fontSize: "20px", color: "var(--accent-amber)", fontFamily: "var(--font-mono)", fontWeight: "700" }}>{highScore}</div>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => startNewGame(gameMode)}
            style={{ padding: "12px 30px", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <RotateCcw size={16} />
            <span>Play Again</span>
          </button>
        </div>
      )}
    </div>
  );
}
