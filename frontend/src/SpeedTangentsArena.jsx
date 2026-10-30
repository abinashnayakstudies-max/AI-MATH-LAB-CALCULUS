import React, { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Trophy, Timer, Play, RotateCcw, Award, CheckCircle, Crosshair, Sparkles } from "lucide-react";

/**
 * SpeedTangentsArena Component
 * Gamified Calculus Challenge: Test visual intuition for derivatives and MVT tangency
 * under a 15-second countdown timer with combos and high scores.
 */
export function SpeedTangentsArena({ MathFormula }) {
  const [gameState, setGameState] = useState("idle"); // "idle" | "playing" | "result"
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return Number(localStorage.getItem("ai_math_lab_high_score") || 0);
  });
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [userGuess, setUserGuess] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [lastRoundResult, setLastRoundResult] = useState(null);

  // Problem definition
  const [problem, setProblem] = useState({
    fnName: "x^2 - 2",
    f: (x) => x * x - 2,
    df: (x) => 2 * x,
    a: -1.5,
    b: 2.5,
    trueC: 0.5
  });

  const timerRef = useRef(null);

  // Generate a new random smooth calculus curve
  const generateProblem = useCallback(() => {
    const types = [
      {
        name: "x^2 - 1.5",
        f: (x) => x * x - 1.5,
        df: (x) => 2 * x,
        a: -2,
        b: 2.5,
        solveC: (a, b) => (a + b) / 2
      },
      {
        name: "-x^2 + 3",
        f: (x) => -x * x + 3,
        df: (x) => -2 * x,
        a: -1.5,
        b: 2,
        solveC: (a, b) => (a + b) / 2
      },
      {
        name: "x^3 - 3x",
        f: (x) => 0.5 * (x * x * x - 3 * x),
        df: (x) => 0.5 * (3 * x * x - 3),
        a: -1.8,
        b: 1.8,
        solveC: (a, b) => {
          // Secant slope = (f(b)-f(a))/(b-a) = 0.5 * (b^2 + ab + a^2 - 3)
          // 0.5 * (3c^2 - 3) = slope => c = sqrt((b^2 + ab + a^2)/3)
          const slope = (0.5 * (b * b * b - 3 * b) - 0.5 * (a * a * a - 3 * a)) / (b - a);
          return Math.sqrt(Math.max((2 * slope + 3) / 3, 0));
        }
      },
      {
        name: "sin(1.2x)",
        f: (x) => Math.sin(1.2 * x) * 1.5,
        df: (x) => 1.5 * 1.2 * Math.cos(1.2 * x),
        a: -1.5,
        b: 2.0,
        solveC: (a, b) => {
          const secant = (Math.sin(1.2 * b) * 1.5 - Math.sin(1.2 * a) * 1.5) / (b - a);
          // 1.8 * cos(1.2c) = secant => c = acos(secant / 1.8) / 1.2
          const val = Math.min(Math.max(secant / 1.8, -1), 1);
          return Math.acos(val) / 1.2;
        }
      }
    ];

    const pick = types[Math.floor(Math.random() * types.length)];
    const trueC = pick.solveC(pick.a, pick.b);
    const mid = (pick.a + pick.b) / 2;

    setProblem({
      fnName: pick.name,
      f: pick.f,
      df: pick.df,
      a: pick.a,
      b: pick.b,
      trueC: Number.isFinite(trueC) ? trueC : mid
    });
    setUserGuess(mid);
    setTimeLeft(15);
  }, []);

  // Timer loop
  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            submitGuess(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setCurrentRound(1);
    setLastRoundResult(null);
    generateProblem();
    setGameState("playing");
  };

  const submitGuess = (isTimeOut = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const error = Math.abs(userGuess - problem.trueC);
    let pts = 0;
    let rank = "Missed";

    if (error < 0.08) {
      rank = "🎯 Bullseye! Exact Tangent";
      pts = 1000 + timeLeft * 40;
    } else if (error < 0.2) {
      rank = "✨ Excellent Alignment";
      pts = 750 + timeLeft * 20;
    } else if (error < 0.45) {
      rank = "👍 Close Approximation";
      pts = 400;
    } else {
      rank = "❌ Tangent Slope Mismatch";
      pts = 50;
    }

    const newStreak = error < 0.45 ? streak + 1 : 0;
    const totalRoundScore = pts * (1 + newStreak * 0.1);
    const newScore = Math.round(score + totalRoundScore);

    setScore(newScore);
    setStreak(newStreak);
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem("ai_math_lab_high_score", String(newScore));
    }

    setLastRoundResult({
      rank,
      error: error.toFixed(3),
      pointsAdded: Math.round(totalRoundScore),
      trueC: problem.trueC.toFixed(3),
      userGuess: userGuess.toFixed(3)
    });

    setGameState("result");
  };

  const nextRound = () => {
    setCurrentRound((r) => r + 1);
    generateProblem();
    setGameState("playing");
  };

  // SVG dimensions for curve
  const svgW = 600;
  const svgH = 260;
  const pad = 40;
  const { a, b, f, trueC } = problem;

  // Samples
  const pts = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const x = a + (i / steps) * (b - a);
    pts.push({ x, y: f(x) });
  }

  const ys = pts.map((p) => p.y);
  const minY = Math.min(...ys, f(a), f(b));
  const maxY = Math.max(...ys, f(a), f(b));

  const mapX = (x) => pad + ((x - a) / (b - a || 1)) * (svgW - 2 * pad);
  const mapY = (y) => svgH - pad - ((y - minY) / (maxY - minY || 1)) * (svgH - 2 * pad);

  const curveD = pts.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${mapX(p.x)} ${mapY(p.y)}`, "");

  // Secant endpoints
  const paX = mapX(a), paY = mapY(f(a));
  const pbX = mapX(b), pbY = mapY(f(b));
  const secantSlope = (f(b) - f(a)) / (b - a);

  // Tangent at user guess
  const guessX = mapX(userGuess);
  const guessY = mapY(f(userGuess));
  const guessSlope = problem.df(userGuess);

  // Tangent line segment
  const tSpan = (b - a) * 0.25;
  const tX1 = mapX(userGuess - tSpan);
  const tY1 = mapY(f(userGuess) - guessSlope * tSpan);
  const tX2 = mapX(userGuess + tSpan);
  const tY2 = mapY(f(userGuess) + guessSlope * tSpan);

  return (
    <div className="speed-tangents-container panel" style={{ marginTop: "24px", background: "rgba(18, 14, 19, 0.75)" }}>
      {/* Top Gamification Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "16px",
          marginBottom: "18px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Zap size={22} style={{ color: "var(--accent-crimson)" }} />
          <div>
            <h2 style={{ fontSize: "17px", color: "#f5efe6", margin: 0, fontWeight: "700" }}>
              Speed Tangents Challenge: Calculus Intuition Arena
            </h2>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              Can you visually pinpoint where the tangent slope matches the secant slope?
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Trophy size={16} style={{ color: "var(--accent-amber)" }} />
            <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>High Score:</span>
            <b style={{ color: "var(--accent-amber)", fontFamily: "var(--font-mono)" }}>{highScore}</b>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Sparkles size={16} style={{ color: "#50e3c2" }} />
            <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>Current:</span>
            <b style={{ color: "#f5efe6", fontFamily: "var(--font-mono)", fontSize: "15px" }}>{score}</b>
          </div>

          {streak > 1 && (
            <span
              style={{
                background: "rgba(194, 59, 96, 0.25)",
                border: "1px solid var(--accent-crimson)",
                color: "#ff8fa3",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                fontSize: "11px",
                fontWeight: "700"
              }}
            >
              🔥 {streak}x STREAK
            </span>
          )}
        </div>
      </div>

      {gameState === "idle" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <Trophy size={48} style={{ color: "var(--accent-crimson)", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "20px", color: "#f5efe6", marginBottom: "8px" }}>
            Ready to test your instantaneous derivative reflexes?
          </h3>
          <p style={{ maxWidth: "520px", margin: "0 auto 24px", color: "var(--text-dim)", fontSize: "13px", lineHeight: "1.6" }}>
            According to the <b>Mean Value Theorem</b>, every smooth curve on $[a, b]$ has at least one point $c$ where the tangent line is perfectly parallel to the secant line. Find it before the 15-second timer runs out!
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={startGame}
            style={{ padding: "12px 28px", fontSize: "14px", margin: "0 auto" }}
          >
            <Play size={16} />
            <span>Start Speed Tangents (Round 1)</span>
          </button>
        </div>
      )}

      {(gameState === "playing" || gameState === "result") && (
        <div>
          {/* Round & Timer Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent-sage)" }}>
              ROUND {currentRound}: $f(x) = {problem.fnName}$ on $[{a}, {b}]$
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                background: timeLeft <= 5 ? "rgba(194, 59, 96, 0.35)" : "rgba(255,255,255,0.06)",
                border: timeLeft <= 5 ? "1px solid var(--accent-crimson)" : "1px solid var(--border-subtle)"
              }}
            >
              <Timer size={14} style={{ color: timeLeft <= 5 ? "var(--accent-crimson)" : "#f5efe6" }} />
              <b style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: timeLeft <= 5 ? "var(--accent-crimson)" : "#f5efe6" }}>
                {timeLeft}s
              </b>
            </div>
          </div>

          {/* Interactive SVG Curve with Tangent & Secant */}
          <div
            style={{
              background: "#080709",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              overflow: "hidden"
            }}
          >
            <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: "auto", display: "block" }}>
              {/* Secant line */}
              <line x1={paX} y1={paY} x2={pbX} y2={pbY} stroke="#8a9e8c" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.85" />

              {/* Curve */}
              <path d={curveD} fill="none" stroke="#f5efe6" strokeWidth="2.6" />

              {/* Endpoints A and B */}
              <circle cx={paX} cy={paY} r="5" fill="#8a9e8c" />
              <circle cx={pbX} cy={pbY} r="5" fill="#8a9e8c" />

              {/* User Tangent Line */}
              <line x1={tX1} y1={tY1} x2={tX2} y2={tY2} stroke="#c23b60" strokeWidth="3" />
              <circle cx={guessX} cy={guessY} r="6" fill="#c23b60" />

              {/* Result State: Show True C */}
              {gameState === "result" && (
                <>
                  <circle cx={mapX(trueC)} cy={mapY(f(trueC))} r="7" fill="#50e3c2" />
                  <text x={mapX(trueC)} y={mapY(f(trueC)) - 12} fill="#50e3c2" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                    True c = {trueC.toFixed(2)}
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* User Slider & Lock Button */}
          {gameState === "playing" && (
            <div style={{ marginTop: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  DRAG SLIDER TO POSITION TANGENT AT ESTIMATED POINT c
                </label>
                <b style={{ color: "var(--accent-crimson)", fontFamily: "var(--font-mono)", fontSize: "14px" }}>
                  Your Guess: c = {userGuess.toFixed(2)}
                </b>
              </div>

              <input
                type="range"
                min={a + 0.05}
                max={b - 0.05}
                step="0.02"
                value={userGuess}
                onChange={(e) => setUserGuess(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-crimson)", cursor: "pointer" }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => submitGuess(false)}
                  style={{ padding: "10px 24px" }}
                >
                  <Crosshair size={15} />
                  <span>Lock In Guess</span>
                </button>
              </div>
            </div>
          )}

          {/* Result Card */}
          {gameState === "result" && lastRoundResult && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(120, 29, 57, 0.2)",
                border: "1px solid rgba(194, 59, 96, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <h4 style={{ fontSize: "15px", color: "#f5efe6", margin: "0 0 4px 0" }}>
                  {lastRoundResult.rank} (+{lastRoundResult.pointsAdded} pts)
                </h4>
                <div style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                  Your Guess: <b>c = {lastRoundResult.userGuess}</b> • True MVT: <b style={{ color: "#50e3c2" }}>c = {lastRoundResult.trueC}</b> (Error: {lastRoundResult.error})
                </div>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={nextRound}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span>Next Round</span>
                <Play size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
