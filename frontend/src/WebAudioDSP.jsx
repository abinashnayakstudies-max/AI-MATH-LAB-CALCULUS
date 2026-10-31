import React, { useEffect, useRef, useState, useCallback } from "react";
import { Volume2, VolumeX, Mic, MicOff, Sliders, Activity, Radio } from "lucide-react";

/**
 * WebAudioDSP Component
 * Provides real-time interactive audio synthesis of Fourier harmonics,
 * Biquad filtering (LPF / HPF), and live microphone FFT spectrum visualization.
 */
export function WebAudioDSP({ waveform, harmonics, fundamentalFreq, amplitude }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [pitchHz, setPitchHz] = useState(220); // Standard A3 pitch base
  const [filterType, setFilterType] = useState("lowpass"); // "lowpass" | "highpass" | "allpass"
  const [filterCutoff, setFilterCutoff] = useState(4000); // Hz
  const [filterResonance, setFilterResonance] = useState(1.0); // Q
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioError, setAudioError] = useState(null);

  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainNodeRef = useRef(null);
  const filterNodeRef = useRef(null);
  const micStreamRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize or get AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Compute Fourier coefficients table for PeriodicWave
  const computePeriodicWave = useCallback((ctx, wf, nHarm) => {
    const tableLength = Math.max(nHarm + 1, 32);
    const real = new Float32Array(tableLength);
    const imag = new Float32Array(tableLength);

    // DC component is 0
    real[0] = 0;
    imag[0] = 0;

    for (let n = 1; n <= nHarm; n++) {
      if (wf === "square") {
        // Odd harmonics: 4 / (n * pi)
        if (n % 2 !== 0) {
          imag[n] = 4 / (n * Math.PI);
        }
      } else if (wf === "triangle") {
        // Odd harmonics with alternating sign and 1/n^2 decay: (8 / (pi^2)) * (-1)^((n-1)/2) / n^2
        if (n % 2 !== 0) {
          const k = (n - 1) / 2;
          imag[n] = ((8 / (Math.PI * Math.PI)) * Math.pow(-1, k)) / (n * n);
        }
      } else if (wf === "sawtooth") {
        // All harmonics: 2 * (-1)^(n+1) / (n * pi)
        imag[n] = (2 * Math.pow(-1, n + 1)) / (n * Math.PI);
      } else {
        // Standard sine
        if (n === 1) imag[1] = 1.0;
      }
    }

    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }, []);

  // Update existing oscillator parameters in real-time
  useEffect(() => {
    if (!isPlaying || !oscRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    try {
      const wave = computePeriodicWave(ctx, waveform, harmonics);
      oscRef.current.setPeriodicWave(wave);
      oscRef.current.frequency.setTargetAtTime(pitchHz, ctx.currentTime, 0.04);
    } catch (err) {
      console.warn("Waveform update error:", err);
    }
  }, [waveform, harmonics, pitchHz, isPlaying, computePeriodicWave]);

  // Update Filter in real-time
  useEffect(() => {
    if (!filterNodeRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    filterNodeRef.current.type = filterType;
    filterNodeRef.current.frequency.setTargetAtTime(filterCutoff, ctx.currentTime, 0.03);
    filterNodeRef.current.Q.setTargetAtTime(filterResonance, ctx.currentTime, 0.03);
  }, [filterType, filterCutoff, filterResonance]);

  // Start sound synthesis
  const startAudio = useCallback(() => {
    setAudioError(null);
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        setAudioError("Web Audio API is not supported in this browser environment.");
        return;
      }

      // Filter
      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterCutoff, ctx.currentTime);
      filter.Q.setValueAtTime(filterResonance, ctx.currentTime);
      filterNodeRef.current = filter;

      // Master Gain for smooth volume control & ear protection
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25 * Math.min(Math.max(amplitude, 0.2), 1.5), ctx.currentTime + 0.08);
      gainNodeRef.current = gain;

      // Custom Fourier PeriodicWave Oscillator
      const wave = computePeriodicWave(ctx, waveform, harmonics);
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(wave);
      osc.frequency.setValueAtTime(pitchHz, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      oscRef.current = osc;
      setIsPlaying(true);
    } catch (e) {
      setAudioError("Unable to start audio engine: " + e.message);
    }
  }, [getAudioContext, filterType, filterCutoff, filterResonance, amplitude, computePeriodicWave, waveform, harmonics, pitchHz]);

  // Stop sound synthesis
  const stopAudio = useCallback(() => {
    if (gainNodeRef.current && audioCtxRef.current && oscRef.current) {
      const ctx = audioCtxRef.current;
      gainNodeRef.current.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      setTimeout(() => {
        try {
          oscRef.current?.stop();
          oscRef.current?.disconnect();
        } catch (_) {}
        oscRef.current = null;
        setIsPlaying(false);
      }, 70);
    } else {
      setIsPlaying(false);
    }
  }, []);

  // Toggle Live Microphone Real-Time FFT
  const toggleMic = async () => {
    if (isMicActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsMicActive(false);
      return;
    }

    try {
      setAudioError(null);
      if (!navigator?.mediaDevices?.getUserMedia) {
        setAudioError("Microphone access is not supported in this browser environment or requires an HTTPS secure origin.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      setIsMicActive(true);
    } catch (err) {
      setAudioError("Microphone access denied or unavailable: " + err.message);
    }
  };

  // Draw Live Microphone FFT Canvas Loop
  useEffect(() => {
    if (!isMicActive || !micAnalyserRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const analyser = micAnalyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(10, 8, 12, 0.4)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        const percent = val / 255;
        const barHeight = percent * canvas.height;

        // Gradient from Sage to Radiant Crimson
        const r = Math.round(138 + percent * (194 - 138));
        const g = Math.round(158 - percent * 99);
        const b = Math.round(140 - percent * 44);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMicActive]);

  // Clean up audio nodes on unmount
  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
        } catch (_) {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="webaudio-dsp-card panel" style={{ marginTop: "16px", background: "rgba(18, 14, 19, 0.65)" }}>
      <div className="panel-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Activity size={18} style={{ color: "var(--accent-crimson)" }} />
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#f5efe6", margin: 0 }}>
              Real-Time Audio DSP &amp; Harmonic Acoustic Engine
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              Experience the physical sound of Fourier harmonics &amp; Biquad filtering
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`secondary-button ${isPlaying ? "active-audio-btn" : ""}`}
            onClick={isPlaying ? stopAudio : startAudio}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "12px",
              background: isPlaying ? "rgba(194, 59, 96, 0.3)" : undefined,
              borderColor: isPlaying ? "var(--accent-crimson)" : undefined
            }}
          >
            {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
            <span>{isPlaying ? "Mute Synthesizer" : "Listen to Harmonics"}</span>
          </button>

          <button
            type="button"
            className={`secondary-button ${isMicActive ? "active-audio-btn" : ""}`}
            onClick={toggleMic}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              fontSize: "12px",
              background: isMicActive ? "rgba(138, 158, 140, 0.3)" : undefined,
              borderColor: isMicActive ? "var(--accent-sage)" : undefined
            }}
          >
            {isMicActive ? <MicOff size={14} /> : <Mic size={14} />}
            <span>{isMicActive ? "Stop Mic" : "Live Mic FFT"}</span>
          </button>
        </div>
      </div>

      {audioError && (
        <div className="error" style={{ fontSize: "12px", marginTop: "10px" }}>
          {audioError}
        </div>
      )}

      {/* Real-time DSP Controls Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginTop: "14px",
          padding: "12px",
          borderRadius: "var(--radius-sm)",
          background: "rgba(0,0,0,0.25)"
        }}
      >
        {/* Base Pitch */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
            <span>BASE PITCH f₀</span>
            <b style={{ color: "#f5efe6", fontFamily: "var(--font-mono)" }}>{pitchHz} Hz ({pitchHz === 220 ? "A3" : pitchHz === 440 ? "A4" : `${pitchHz} Hz`})</b>
          </label>
          <input
            type="range"
            min="55"
            max="880"
            step="5"
            value={pitchHz}
            onChange={(e) => setPitchHz(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-crimson)", marginTop: "4px" }}
          />
        </div>

        {/* Filter Type */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-dim)" }}>BIQUAD FILTER TYPE</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              width: "100%",
              padding: "5px 8px",
              marginTop: "4px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              color: "#f5efe6",
              fontSize: "12px"
            }}
          >
            <option value="lowpass">Low-Pass Filter (Damps High Harmonics)</option>
            <option value="highpass">High-Pass Filter (Removes Fundamental)</option>
            <option value="allpass">All-Pass (Pure Fourier Harmonic Blend)</option>
          </select>
        </div>

        {/* Filter Cutoff */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--text-dim)", display: "flex", justifyContent: "space-between" }}>
            <span>FILTER CUTOFF</span>
            <b style={{ color: "var(--accent-sage)", fontFamily: "var(--font-mono)" }}>{filterCutoff} Hz</b>
          </label>
          <input
            type="range"
            min="100"
            max="12000"
            step="100"
            value={filterCutoff}
            onChange={(e) => setFilterCutoff(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent-sage)", marginTop: "4px" }}
          />
        </div>
      </div>

      {/* Live Microphone Real-time Spectrograph */}
      {isMicActive && (
        <div style={{ marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--accent-sage)", fontWeight: "600", letterSpacing: "0.04em" }}>
              LIVE MICROPHONE 128-BIN FFT SPECTROGRAPH (WHISTLE OR SING TO OBSERVE HARMONICS)
            </span>
            <span style={{ fontSize: "10px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>60 FPS Real-time</span>
          </div>
          <canvas
            ref={canvasRef}
            width={680}
            height={85}
            style={{
              width: "100%",
              height: "85px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "#0a080c",
              display: "block"
            }}
          />
        </div>
      )}
    </div>
  );
}
