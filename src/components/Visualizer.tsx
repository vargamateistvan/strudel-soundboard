import { useRef, useEffect, useCallback, useState } from "react";
import type { Project } from "../types";
import { getTrackColor } from "../lib/constants";

type VizMode = "bars" | "spectrum" | "waveform";

interface VisualizerProps {
  project: Project;
  currentStep: number;
  isPlaying: boolean;
  analyserRef: React.RefObject<AnalyserNode | null>;
}

export function Visualizer({
  project,
  currentStep,
  isPlaying,
  analyserRef,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decayRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  const [mode, setMode] = useState<VizMode>("bars");

  // Collect all rows across all tracks with their colors and current velocity
  const getBarData = useCallback(() => {
    const bars: { color: string; velocity: number; muted: boolean }[] = [];
    project.tracks.forEach((track, ti) => {
      const color = getTrackColor(track.colorIndex ?? ti);
      for (let r = 0; r < track.steps.length; r++) {
        const step = currentStep >= 0 ? track.steps[r][currentStep] : undefined;
        const velocity = step?.active ? step.velocity * track.volume : 0;
        bars.push({ color, velocity, muted: track.muted });
      }
    });
    return bars;
  }, [project, currentStep]);

  const drawBars = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => {
      const bars = getBarData();
      if (bars.length === 0) {
        const borderColor =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--border")
            .trim() || "#1a1a3e";
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        return;
      }

      if (decayRef.current.length !== bars.length) {
        decayRef.current = new Array(bars.length).fill(0);
      }

      const gap = 3;
      const barWidth = Math.max(2, (w - gap * (bars.length - 1)) / bars.length);

      for (let i = 0; i < bars.length; i++) {
        const { color, velocity, muted } = bars[i];
        const target = muted ? 0 : velocity;
        if (target > decayRef.current[i]) {
          decayRef.current[i] = target;
        } else {
          decayRef.current[i] *= 0.88;
          if (decayRef.current[i] < 0.01) decayRef.current[i] = 0;
        }
        const level = decayRef.current[i];
        const barH = level * h * 0.85;
        const x = i * (barWidth + gap);
        const y = h - barH;

        if (barH > 0) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 + level * 12;
          const grad = ctx.createLinearGradient(x, h, x, y);
          grad.addColorStop(0, color);
          grad.addColorStop(1, color + "44");
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barH);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff";
          ctx.globalAlpha = 0.6 + level * 0.4;
          ctx.fillRect(x, y, barWidth, Math.max(2, barH * 0.06));
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = color + "18";
        ctx.fillRect(x, h - 2, barWidth, 2);
      }

      // Reflection
      ctx.globalAlpha = 0.08;
      ctx.scale(1, -1);
      ctx.drawImage(ctx.canvas, 0, -h * 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
    },
    [getBarData],
  );

  const drawSpectrum = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const node = analyserRef.current;
      if (!node) return;
      const bufLen = node.frequencyBinCount;
      const data = new Uint8Array(bufLen);
      node.getByteFrequencyData(data);

      const gap = 2;
      const barW = Math.max(2, (w - gap * (bufLen - 1)) / bufLen);

      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 255;
        const barH = v * h * 0.9;
        const x = i * (barW + gap);
        const y = h - barH;
        const hue = (i / bufLen) * 280 + 180; // cyan→magenta
        const color = `hsl(${hue}, 90%, 60%)`;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6 + v * 10;
        const grad = ctx.createLinearGradient(x, h, x, y);
        grad.addColorStop(0, color);
        grad.addColorStop(1, `hsla(${hue}, 90%, 60%, 0.2)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);
      }
      ctx.shadowBlur = 0;
    },
    [analyserRef],
  );

  const drawWaveform = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const node = analyserRef.current;
      if (!node) return;
      const bufLen = node.fftSize;
      const data = new Uint8Array(bufLen);
      node.getByteTimeDomainData(data);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00ffe5";
      ctx.shadowColor = "#00ffe5";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      const sliceW = w / bufLen;
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * sliceW, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    },
    [analyserRef],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const draw = () => {
      if (!running) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const newW = Math.round(rect.width * dpr);
      const newH = Math.round(rect.height * dpr);
      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW;
        canvas.height = newH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (mode === "bars") {
        drawBars(ctx, w, h, dpr);
        // Keep animating for decay even after stopping
        const hasDecay = decayRef.current.some((v) => v > 0.01);
        if (isPlaying || hasDecay) {
          rafRef.current = requestAnimationFrame(draw);
        }
      } else if (mode === "spectrum") {
        drawSpectrum(ctx, w, h);
        if (isPlaying) {
          rafRef.current = requestAnimationFrame(draw);
        }
      } else {
        drawWaveform(ctx, w, h);
        if (isPlaying) {
          rafRef.current = requestAnimationFrame(draw);
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [mode, drawBars, drawSpectrum, drawWaveform, isPlaying]);

  return (
    <div className="visualizer">
      <div className="visualizer-modes">
        {(["bars", "spectrum", "waveform"] as VizMode[]).map((m) => (
          <button
            key={m}
            className={`viz-mode-btn${mode === m ? " active" : ""}`}
            onClick={() => setMode(m)}
          >
            {m === "bars" ? "▥" : m === "spectrum" ? "▤" : "〜"}
          </button>
        ))}
      </div>
      <canvas ref={canvasRef} className="visualizer-canvas" />
    </div>
  );
}
