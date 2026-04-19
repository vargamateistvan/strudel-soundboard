import type { Track as TrackType } from "../types";
import { TrackHeader } from "./TrackHeader";
import { StepGrid } from "./StepGrid";

interface TrackProps {
  track: TrackType;
  color: string;
  currentStep: number;
  onToggleStep: (row: number, col: number) => void;
  onSetSound: (sound: string) => void;
  onSetBank: (bank: string) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSetVolume: (volume: number) => void;
  onRemove: () => void;
  onSetName: (name: string) => void;
  onAddDrumRow: (sound: string) => void;
  onRemoveDrumRow: (rowIndex: number) => void;
  onPreviewRow: (rowLabel: string) => void;
}

export function Track({
  track,
  color,
  currentStep,
  onToggleStep,
  onSetSound,
  onSetBank,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onRemove,
  onSetName,
  onAddDrumRow,
  onRemoveDrumRow,
  onPreviewRow,
}: TrackProps) {
  return (
    <div
      className={`track ${track.muted ? "track-muted" : ""}`}
      style={{ "--track-color": color } as React.CSSProperties}
    >
      <TrackHeader
        track={track}
        onSetSound={onSetSound}
        onSetBank={onSetBank}
        onToggleMute={onToggleMute}
        onToggleSolo={onToggleSolo}
        onSetVolume={onSetVolume}
        onRemove={onRemove}
        onSetName={onSetName}
        onAddDrumRow={onAddDrumRow}
      />
      <StepGrid
        track={track}
        color={color}
        currentStep={currentStep}
        onToggleStep={onToggleStep}
        onRemoveDrumRow={onRemoveDrumRow}
        onPreviewRow={onPreviewRow}
      />
    </div>
  );
}
