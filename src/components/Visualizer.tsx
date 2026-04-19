import { useRef, useEffect, useCallback } from "react";
import type { Project } from "../types";
import { getTrackColor } from "../lib/constants";

interface VisualizerProps {
  project: Project;
  currentStep: number;
  isPlaying: boolean;
}

export function Visualizer({
  project,
  currentStep,
  isPlaying,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const decayRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);

  // Collect all rows across all tracks with their colors and current velocity
  const getBarData = useCallback(() => {
    const bars: { color: string; velocity: number; muted: boolean }[] = [];
    project.tracks.forEach((track, ti) => {
      const color = getTrackColor(ti);
      for (let r = 0; r < track.steps.length; r++) {
        const step = currentStep >= 0 ? track.steps[r][currentStep] : undefined;
        const velocity = step?.active ? step.velocity * track.volume : 0;
        bars.push({ color, velocity, muted: track.muted });
      }
    });
    return bars;
  }, [project, currentStep]);

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
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const bars = getBarData();
      if (bars.length === 0) {
        // Draw idle state — flat line
        const style = getComputedStyle(document.documentElement);
        const borderColor =
          style.getPropertyValue("--border").trim() || "#1a1a3e";
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Ensure decay array matches bar count
      if (decayRef.current.length !== bars.length) {
        decayRef.current = new Array(bars.length).fill(0);
      }

      const gap = 3;
      const barWidth = Math.max(2, (w - gap * (bars.length - 1)) / bars.length);

      for (let i = 0; i < bars.length; i++) {
        const { color, velocity, muted } = bars[i];
        const target = muted ? 0 : velocity;

        // Smooth decay
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
          // Glow
          ctx.shadowColor = color;
          ctx.shadowBlur = 8 + level * 12;

          // Gradient bar
          const grad = ctx.createLinearGradient(x, h, x, y);
          grad.addColorStop(0, color);
          grad.addColorStop(1, color + "44");
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barH);

          // Bright cap
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff";
          ctx.globalAlpha = 0.6 + level * 0.4;
          ctx.fillRect(x, y, barWidth, Math.max(2, barH * 0.06));
          ctx.globalAlpha = 1;
        }

        // Subtle idle bar
        ctx.shadowBlur = 0;
        ctx.fillStyle = color + "18";
        ctx.fillRect(x, h - 2, barWidth, 2);
      }

      // Reflection effect
      ctx.globalAlpha = 0.08;
      ctx.scale(1, -1);
      ctx.drawImage(canvas, 0, -h * 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [getBarData, isPlaying]);

  return (
    <div className="visualizer">
      <canvas ref={canvasRef} className="visualizer-canvas" />
    </div>
  );
}
