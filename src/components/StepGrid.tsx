import { useState, useCallback, useRef, useMemo } from "react";
import type { Track } from "../types";
import { PianoKeyboard } from "./PianoKeyboard";

function isBlackKey(note: string): boolean {
  const name = note.replace(/\d+$/, "");
  return name.length > 1; // "Bb", "F#", "Eb", "Ab", "C#" etc.
}

function isCNote(note: string): boolean {
  return /^C\d+$/.test(note);
}

interface StepGridProps {
  track: Track;
  color: string;
  currentStep: number;
  polyrhythmMarkers?: Set<number>;
  onToggleStep: (row: number, col: number) => void;
  onSetStep: (row: number, col: number, active: boolean) => void;
  onRemoveDrumRow: (rowIndex: number) => void;
  onPreviewRow: (rowLabel: string) => void;
  onSetVelocity: (row: number, col: number, velocity: number) => void;
  onSetProbability: (row: number, col: number, probability: number) => void;
}

export function StepGrid({
  track,
  color,
  currentStep,
  polyrhythmMarkers,
  onSetStep,
  onRemoveDrumRow,
  onPreviewRow,
  onSetVelocity,
  onSetProbability,
}: StepGridProps) {
  const stepCount = track.steps[0]?.length ?? 16;
  const rowCount = track.rows.length;
  const loopLen = track.loopLength;
  const [painting, setPainting] = useState<boolean | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const focusCell = useCallback((row: number, col: number) => {
    const cell = gridRef.current?.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    ) as HTMLElement | null;
    cell?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (row: number, col: number, e: React.KeyboardEvent) => {
      const { key } = e;
      let handled = true;
      if (key === "ArrowRight")
        focusCell(row, Math.min(col + 1, stepCount - 1));
      else if (key === "ArrowLeft") focusCell(row, Math.max(col - 1, 0));
      else if (key === "ArrowDown")
        focusCell(Math.min(row + 1, rowCount - 1), col);
      else if (key === "ArrowUp") focusCell(Math.max(row - 1, 0), col);
      else if (key === "Enter" || key === " ") {
        e.preventDefault();
        const current = track.steps[row]?.[col]?.active ?? false;
        onSetStep(row, col, !current);
      } else if (key >= "1" && key <= "9") {
        const step = track.steps[row]?.[col];
        if (step?.active) {
          const vel = parseInt(key) / 9;
          onSetVelocity(row, col, Math.round(vel * 10) / 10);
        }
      } else {
        handled = false;
      }
      if (handled) e.stopPropagation();
    },
    [stepCount, rowCount, track.steps, onSetStep, onSetVelocity, focusCell],
  );

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

      if (e.altKey) {
        // Alt + scroll: adjust probability
        const curProb = step.probability ?? 1;
        const newProb =
          Math.round(Math.max(0.1, Math.min(1, curProb + delta)) * 10) / 10;
        if (newProb !== curProb) onSetProbability(row, col, newProb);
      } else {
        // Normal scroll: adjust velocity
        const newVel =
          Math.round(Math.max(0.1, Math.min(1, step.velocity + delta)) * 10) /
          10;
        if (newVel !== step.velocity) onSetVelocity(row, col, newVel);
      }
    },
    [track.steps, onSetVelocity, onSetProbability],
  );

  // Compute which notes have any active steps (for piano keyboard highlights)
  const activeNotes = useMemo(() => {
    if (track.type !== "piano") return undefined;
    const set = new Set<string>();
    track.rows.forEach((note, rowIdx) => {
      if (track.steps[rowIdx]?.some((s) => s.active)) {
        set.add(note);
      }
    });
    return set;
  }, [track.type, track.rows, track.steps]);

  return (
    <div
      className="step-grid-container"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      ref={gridRef}
      role="grid"
    >
      <div
        className={`step-grid${track.type === "piano" ? " piano-grid" : ""}`}
      >
        {track.rows.map((rowLabel, rowIdx) => {
          const isPiano = track.type === "piano";
          const blackKey = isPiano && isBlackKey(rowLabel);
          const cNote = isPiano && isCNote(rowLabel);
          const rowClasses = [
            "step-row",
            blackKey ? "piano-black-key" : "",
            isPiano && !blackKey ? "piano-white-key" : "",
            cNote ? "piano-c-note" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div key={rowLabel} className={rowClasses}>
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
                {track.steps[rowIdx]?.map((step, colIdx) => {
                  const prob = step.probability ?? 1;
                  const hasProbability = step.active && prob < 1;
                  return (
                    <button
                      key={colIdx}
                      data-row={rowIdx}
                      data-col={colIdx}
                      tabIndex={rowIdx === 0 && colIdx === 0 ? 0 : -1}
                      className={[
                        "step-cell",
                        step.active ? "step-active" : "",
                        colIdx === currentStep ? "step-current" : "",
                        colIdx % 4 === 0 ? "step-beat" : "",
                        loopLen && colIdx >= loopLen ? "step-outside-loop" : "",
                        hasProbability ? "step-probability" : "",
                        polyrhythmMarkers?.has(colIdx)
                          ? "step-poly-marker"
                          : "",
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
                      onPointerDown={(e) =>
                        handlePointerDown(rowIdx, colIdx, e)
                      }
                      onPointerEnter={() => handlePointerEnter(rowIdx, colIdx)}
                      onKeyDown={(e) => handleKeyDown(rowIdx, colIdx, e)}
                      onWheel={(e) => handleWheel(rowIdx, colIdx, e)}
                      title={
                        step.active
                          ? `vel: ${Math.round(step.velocity * 100)}%${hasProbability ? ` | prob: ${Math.round(prob * 100)}%` : ""}`
                          : undefined
                      }
                      aria-label={`${rowLabel} step ${colIdx + 1} ${step.active ? "on" : "off"}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
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

      {/* Horizontal piano keyboard for piano tracks */}
      {track.type === "piano" && (
        <PianoKeyboard
          notes={track.rows}
          onKeyClick={onPreviewRow}
          activeNotes={activeNotes}
          color={color}
        />
      )}
    </div>
  );
}
