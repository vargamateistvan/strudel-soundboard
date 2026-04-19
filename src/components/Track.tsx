import type {
  Track as TrackType,
  TrackEffects,
  TrackModifiers,
} from "../types";
import { TrackHeader } from "./TrackHeader";
import { StepGrid } from "./StepGrid";

interface TrackProps {
  track: TrackType;
  color: string;
  currentStep: number;
  stepCount: number;
  onToggleStep: (row: number, col: number) => void;
  onSetStep: (row: number, col: number, active: boolean) => void;
  onSetSound: (sound: string) => void;
  onSetBank: (bank: string) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSetVolume: (volume: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onSetName: (name: string) => void;
  onAddDrumRow: (sound: string) => void;
  onRemoveDrumRow: (rowIndex: number) => void;
  onPreviewRow: (rowLabel: string) => void;
  onSetVelocity: (row: number, col: number, velocity: number) => void;
  onSetEffects: (effects: Partial<TrackEffects>) => void;
  onSetModifiers: (modifiers: Partial<TrackModifiers>) => void;
  onSetLoopLength: (loopLength: number | undefined) => void;
  onCopySteps: () => void;
  onPasteSteps: () => void;
  onShiftPattern: (direction: 1 | -1) => void;
  onRandomizePattern: (density: number) => void;
  onClearTrack: () => void;
  onReverseSteps: () => void;
  onInsertAfter: (type: "drums" | "melodic") => void;
}

export function Track({
  track,
  color,
  currentStep,
  stepCount,
  onToggleStep,
  onSetStep,
  onSetSound,
  onSetBank,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onRemove,
  onDuplicate,
  onSetName,
  onAddDrumRow,
  onRemoveDrumRow,
  onPreviewRow,
  onSetVelocity,
  onSetEffects,
  onSetModifiers,
  onSetLoopLength,
  onCopySteps,
  onPasteSteps,
  onShiftPattern,
  onRandomizePattern,
  onClearTrack,
  onReverseSteps,
  onInsertAfter,
}: TrackProps) {
  // VU meter: calculate activity level at current step
  let vuLevel = 0;
  if (currentStep >= 0 && !track.muted) {
    for (const row of track.steps) {
      const step = row[currentStep];
      if (step?.active) {
        vuLevel = Math.max(vuLevel, step.velocity * track.volume);
      }
    }
  }

  return (
    <div
      className={`track ${track.muted ? "track-muted" : ""}`}
      style={{ "--track-color": color } as React.CSSProperties}
    >
      <div
        className="track-vu"
        style={{ width: `${vuLevel * 100}%`, opacity: vuLevel > 0 ? 1 : 0 }}
      />
      <TrackHeader
        track={track}
        stepCount={stepCount}
        onSetSound={onSetSound}
        onSetBank={onSetBank}
        onToggleMute={onToggleMute}
        onToggleSolo={onToggleSolo}
        onSetVolume={onSetVolume}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onSetName={onSetName}
        onAddDrumRow={onAddDrumRow}
        onSetEffects={onSetEffects}
        onSetModifiers={onSetModifiers}
        onSetLoopLength={onSetLoopLength}
        onCopySteps={onCopySteps}
        onPasteSteps={onPasteSteps}
        onShiftPattern={onShiftPattern}
        onRandomizePattern={onRandomizePattern}
        onClearTrack={onClearTrack}
        onReverseSteps={onReverseSteps}
      />
      <StepGrid
        track={track}
        color={color}
        currentStep={currentStep}
        onToggleStep={onToggleStep}
        onSetStep={onSetStep}
        onRemoveDrumRow={onRemoveDrumRow}
        onPreviewRow={onPreviewRow}
        onSetVelocity={onSetVelocity}
      />
      <div className="insert-after-bar">
        <select
          className="insert-after-select"
          value=""
          onChange={(e) => {
            if (e.target.value)
              onInsertAfter(e.target.value as "drums" | "melodic");
          }}
          title="Insert track after"
        >
          <option value="" disabled>
            +
          </option>
          <option value="drums">🥁 Drum</option>
          <option value="melodic">🎹 Synth</option>
        </select>
      </div>
    </div>
  );
}
