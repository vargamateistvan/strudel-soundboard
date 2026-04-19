import { useState, useCallback } from "react";
import type { Track } from "../types";

interface StepGridProps {
  track: Track;
  color: string;
  currentStep: number;
  onToggleStep: (row: number, col: number) => void;
  onSetStep: (row: number, col: number, active: boolean) => void;
  onRemoveDrumRow: (rowIndex: number) => void;
  onPreviewRow: (rowLabel: string) => void;
  onSetVelocity: (row: number, col: number, velocity: number) => void;
}

export function StepGrid({
  track,
  color,
  currentStep,
  onSetStep,
  onRemoveDrumRow,
  onPreviewRow,
  onSetVelocity,
}: StepGridProps) {
  const stepCount = track.steps[0]?.length ?? 16;
  const loopLen = track.loopLength;
  const [painting, setPainting] = useState<boolean | null>(null);

  const handlePointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const current = track.steps[row]?.[col]?.active ?? false;
      const mode = !current;
      setPainting(mode);
      onSetStep(row, col, mode);
    },
    [track.steps, onSetStep],
  );

  const handlePointerEnter = useCallback(
    (row: number, col: number) => {
      if (painting === null) return;
      onSetStep(row, col, painting);
    },
    [painting, onSetStep],
  );

  const handlePointerUp = useCallback(() => {
    setPainting(null);
  }, []);

  const handleWheel = useCallback(
    (row: number, col: number, e: React.WheelEvent) => {
      const step = track.steps[row]?.[col];
      if (!step?.active) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const newVel =
        Math.round(Math.max(0.1, Math.min(1, step.velocity + delta)) * 10) / 10;
      if (newVel !== step.velocity) onSetVelocity(row, col, newVel);
    },
    [track.steps, onSetVelocity],
  );

  return (
    <div
      className="step-grid-container"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="step-grid">
        {track.rows.map((rowLabel, rowIdx) => (
          <div key={rowLabel} className="step-row">
            <div className="row-label">
              <button
                className="row-preview-btn"
                onClick={() => onPreviewRow(rowLabel)}
                title={`Preview ${rowLabel}`}
              >
                ▶
              </button>
              <span className="row-label-text">{rowLabel}</span>
              {track.type === "drums" && track.rows.length > 1 && (
                <button
                  className="row-remove-btn"
                  onClick={() => onRemoveDrumRow(rowIdx)}
                  title={`Remove ${rowLabel}`}
                >
                  ×
                </button>
              )}
            </div>
            <div className="step-cells">
              {track.steps[rowIdx]?.map((step, colIdx) => (
                <button
                  key={colIdx}
                  className={[
                    "step-cell",
                    step.active ? "step-active" : "",
                    colIdx === currentStep ? "step-current" : "",
                    colIdx % 4 === 0 ? "step-beat" : "",
                    loopLen && colIdx >= loopLen ? "step-outside-loop" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    step.active
                      ? {
                          backgroundColor: color,
                          opacity: 0.3 + step.velocity * 0.7,
                        }
                      : undefined
                  }
                  onPointerDown={(e) => handlePointerDown(rowIdx, colIdx, e)}
                  onPointerEnter={() => handlePointerEnter(rowIdx, colIdx)}
                  onWheel={(e) => handleWheel(rowIdx, colIdx, e)}
                  title={
                    step.active
                      ? `vel: ${Math.round(step.velocity * 100)}%`
                      : undefined
                  }
                  aria-label={`${rowLabel} step ${colIdx + 1} ${step.active ? "on" : "off"}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Step numbers / bar markers */}
      <div className="step-numbers">
        <div className="row-label" />
        <div className="step-cells">
          {Array.from({ length: stepCount }, (_, i) => {
            const showLabel = stepCount <= 32 || i % 4 === 0;
            return (
              <div
                key={i}
                className={`step-number ${i % 4 === 0 ? "step-beat-num" : ""} ${i % 16 === 0 ? "step-bar-num" : ""}`}
              >
                {showLabel ? i + 1 : ""}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
