import type { Project } from "../types";
import { Track } from "./Track";
import { getTrackColor } from "../lib/constants";

interface TrackListProps {
  project: Project;
  currentStep: number;
  onAddTrack: (type: "drums" | "melodic") => void;
  onRemoveTrack: (trackId: string) => void;
  onToggleStep: (trackId: string, row: number, col: number) => void;
  onSetSound: (trackId: string, sound: string) => void;
  onSetBank: (trackId: string, bank: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onSetVolume: (trackId: string, volume: number) => void;
  onSetTrackName: (trackId: string, name: string) => void;
  onAddDrumRow: (trackId: string, drumSound: string) => void;
  onRemoveDrumRow: (trackId: string, rowIndex: number) => void;
}

export function TrackList({
  project,
  currentStep,
  onAddTrack,
  onRemoveTrack,
  onToggleStep,
  onSetSound,
  onSetBank,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onSetTrackName,
  onAddDrumRow,
  onRemoveDrumRow,
}: TrackListProps) {
  return (
    <div className="track-list">
      {project.tracks.length === 0 && (
        <div className="empty-state">
          <p>No tracks yet. Add a drum or synth track to get started!</p>
        </div>
      )}

      {project.tracks.map((track, idx) => (
        <Track
          key={track.id}
          track={track}
          color={getTrackColor(idx)}
          currentStep={currentStep}
          onToggleStep={(row, col) => onToggleStep(track.id, row, col)}
          onSetSound={(sound) => onSetSound(track.id, sound)}
          onSetBank={(bank) => onSetBank(track.id, bank)}
          onToggleMute={() => onToggleMute(track.id)}
          onToggleSolo={() => onToggleSolo(track.id)}
          onSetVolume={(vol) => onSetVolume(track.id, vol)}
          onRemove={() => onRemoveTrack(track.id)}
          onSetName={(name) => onSetTrackName(track.id, name)}
          onAddDrumRow={(sound) => onAddDrumRow(track.id, sound)}
          onRemoveDrumRow={(idx) => onRemoveDrumRow(track.id, idx)}
        />
      ))}

      <div className="add-track-buttons">
        <button className="add-track-btn" onClick={() => onAddTrack("drums")}>
          🥁 Add Drum Track
        </button>
        <button className="add-track-btn" onClick={() => onAddTrack("melodic")}>
          🎹 Add Synth Track
        </button>
      </div>
    </div>
  );
}
