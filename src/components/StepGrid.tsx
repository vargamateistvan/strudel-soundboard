import type { Track } from "../types";

interface StepGridProps {
  track: Track;
  color: string;
  currentStep: number;
  onToggleStep: (row: number, col: number) => void;
  onRemoveDrumRow: (rowIndex: number) => void;
}

export function StepGrid({
  track,
  color,
  currentStep,
  onToggleStep,
  onRemoveDrumRow,
}: StepGridProps) {
  const stepCount = track.steps[0]?.length ?? 16;

  return (
    <div className="step-grid-container">
      <div className="step-grid">
        {track.rows.map((rowLabel, rowIdx) => (
          <div key={rowLabel} className="step-row">
            <div className="row-label">
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
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={step.active ? { backgroundColor: color } : undefined}
                  onClick={() => onToggleStep(rowIdx, colIdx)}
                  aria-label={`${rowLabel} step ${colIdx + 1} ${step.active ? "on" : "off"}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Step numbers */}
      <div className="step-numbers">
        <div className="row-label" />
        <div className="step-cells">
          {Array.from({ length: stepCount }, (_, i) => (
            <div
              key={i}
              className={`step-number ${i % 4 === 0 ? "step-beat-num" : ""}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
