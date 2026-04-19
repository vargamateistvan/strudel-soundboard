import { useState, useCallback } from "react";
import type { Project, Track as TrackType, TrackEffects } from "../types";
import { Track } from "./Track";
import { getTrackColor } from "../lib/constants";
import { PRESETS } from "../lib/presets";

interface TrackListProps {
  project: Project;
  currentStep: number;
  onAddTrack: (type: "drums" | "melodic") => void;
  onRemoveTrack: (trackId: string) => void;
  onToggleStep: (trackId: string, row: number, col: number) => void;
  onSetStep: (
    trackId: string,
    row: number,
    col: number,
    active: boolean,
  ) => void;
  onSetSound: (trackId: string, sound: string) => void;
  onSetBank: (trackId: string, bank: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onSetVolume: (trackId: string, volume: number) => void;
  onSetTrackName: (trackId: string, name: string) => void;
  onAddDrumRow: (trackId: string, drumSound: string) => void;
  onRemoveDrumRow: (trackId: string, rowIndex: number) => void;
  onPreviewRow: (trackId: string, rowLabel: string) => void;
  onReorderTracks: (fromIndex: number, toIndex: number) => void;
  onDuplicateTrack: (trackId: string) => void;
  onSetVelocity: (
    trackId: string,
    row: number,
    col: number,
    velocity: number,
  ) => void;
  onSetEffects: (trackId: string, effects: Partial<TrackEffects>) => void;
  onAddPresetTracks: (tracks: TrackType[]) => void;
}

export function TrackList({
  project,
  currentStep,
  onAddTrack,
  onRemoveTrack,
  onToggleStep,
  onSetStep,
  onSetSound,
  onSetBank,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onSetTrackName,
  onAddDrumRow,
  onRemoveDrumRow,
  onPreviewRow,
  onReorderTracks,
  onDuplicateTrack,
  onSetVelocity,
  onSetEffects,
  onAddPresetTracks,
}: TrackListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  const handleDrop = useCallback(
    (idx: number) => {
      if (dragIdx !== null && dragIdx !== idx) {
        onReorderTracks(dragIdx, idx);
      }
      setDragIdx(null);
      setOverIdx(null);
    },
    [dragIdx, onReorderTracks],
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
  }, []);
  return (
    <div className="track-list">
      {project.tracks.length === 0 && (
        <div className="empty-state">
          <p>No tracks yet. Add a drum or synth track to get started!</p>
        </div>
      )}

      {project.tracks.map((track, idx) => (
        <div
          key={track.id}
          className={`track-drag-wrapper ${dragIdx === idx ? "dragging" : ""} ${overIdx === idx && dragIdx !== idx ? "drag-over" : ""}`}
          draggable
          onDragStart={(e) => handleDragStart(idx, e)}
          onDragOver={(e) => handleDragOver(idx, e)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
        >
          <Track
            track={track}
            color={getTrackColor(idx)}
            currentStep={currentStep}
            onToggleStep={(row, col) => onToggleStep(track.id, row, col)}
            onSetStep={(row, col, active) =>
              onSetStep(track.id, row, col, active)
            }
            onSetSound={(sound) => onSetSound(track.id, sound)}
            onSetBank={(bank) => onSetBank(track.id, bank)}
            onToggleMute={() => onToggleMute(track.id)}
            onToggleSolo={() => onToggleSolo(track.id)}
            onSetVolume={(vol) => onSetVolume(track.id, vol)}
            onRemove={() => onRemoveTrack(track.id)}
            onSetName={(name) => onSetTrackName(track.id, name)}
            onAddDrumRow={(sound) => onAddDrumRow(track.id, sound)}
            onRemoveDrumRow={(idx) => onRemoveDrumRow(track.id, idx)}
            onPreviewRow={(rowLabel) => onPreviewRow(track.id, rowLabel)}
            onDuplicate={() => onDuplicateTrack(track.id)}
            onSetVelocity={(row, col, vel) =>
              onSetVelocity(track.id, row, col, vel)
            }
            onSetEffects={(fx) => onSetEffects(track.id, fx)}
          />
        </div>
      ))}

      <div className="add-track-buttons">
        <button className="add-track-btn" onClick={() => onAddTrack("drums")}>
          🥁 Add Drum Track
        </button>
        <button className="add-track-btn" onClick={() => onAddTrack("melodic")}>
          🎹 Add Synth Track
        </button>
        <select
          className="add-track-btn add-preset-select"
          value=""
          onChange={(e) => {
            const idx = Number(e.target.value);
            if (!isNaN(idx)) {
              const preset = PRESETS[idx].build();
              onAddPresetTracks(preset.tracks);
            }
          }}
        >
          <option value="" disabled>
            🎵 Load Preset
          </option>
          {PRESETS.map((p, i) => (
            <option key={p.name} value={i}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
