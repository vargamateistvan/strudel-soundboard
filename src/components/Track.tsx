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
  onSetProbability: (row: number, col: number, probability: number) => void;
  polyrhythmMarkers?: Set<number>;
  onSetEffects: (effects: Partial<TrackEffects>) => void;
  onSetModifiers: (modifiers: Partial<TrackModifiers>) => void;
  onSetLoopLength: (loopLength: number | undefined) => void;
  onCopySteps: () => void;
  onPasteSteps: () => void;
  onShiftPattern: (direction: 1 | -1) => void;
  onRandomizePattern: (density: number) => void;
  onClearTrack: () => void;
  onReverseSteps: () => void;
  onInsertAfter: (
    type: "drums" | "melodic" | "piano" | "guitar",
    customStepCount?: number,
  ) => void;
  chainRemainingSteps?: number;
}

export function Track({
  track,
  color,
  currentStep,
  stepCount,
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
  onSetProbability,
  polyrhythmMarkers,
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
  chainRemainingSteps,
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
        onInsertAfter={onInsertAfter}
        chainRemainingSteps={chainRemainingSteps}
      />
      <StepGrid
        track={track}
        color={color}
        currentStep={currentStep}
        onSetStep={onSetStep}
        onRemoveDrumRow={onRemoveDrumRow}
        onPreviewRow={onPreviewRow}
        onSetVelocity={onSetVelocity}
        onSetProbability={onSetProbability}
        polyrhythmMarkers={polyrhythmMarkers}
      />
      <div className="insert-after-bar">
        <select
          className="insert-after-select"
          value=""
          onChange={(e) => {
            if (e.target.value)
              onInsertAfter(
                e.target.value as "drums" | "melodic" | "piano" | "guitar",
              );
          }}
          title="Insert track after"
        >
          <option value="" disabled>
            +
          </option>
          <option value="drums">🥁 Drum</option>
          <option value="melodic">🎹 Synth</option>
          <option value="piano">🎵 Piano</option>
          <option value="guitar">🎸 Guitar</option>
        </select>
      </div>
    </div>
  );
}
