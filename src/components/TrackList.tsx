import { useState, useCallback, useMemo } from "react";
import type {
  Project,
  Track as TrackType,
  TrackEffects,
  TrackModifiers,
} from "../types";
import { Track } from "./Track";
import { getTrackColor } from "../lib/constants";
import { PRESETS } from "../lib/presets";

interface TrackListProps {
  project: Project;
  currentStep: number;
  onAddTrack: (type: "drums" | "melodic" | "piano" | "guitar") => void;
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
  onSetProbability: (
    trackId: string,
    row: number,
    col: number,
    probability: number,
  ) => void;
  onSetEffects: (trackId: string, effects: Partial<TrackEffects>) => void;
  onSetModifiers: (trackId: string, modifiers: Partial<TrackModifiers>) => void;
  onAddPresetTracks: (tracks: TrackType[]) => void;
  onInsertTrackAfter: (
    afterTrackId: string,
    type: "drums" | "melodic" | "piano" | "guitar",
    customStepCount?: number,
  ) => void;
  onSetLoopLength: (trackId: string, loopLength: number | undefined) => void;
  onCopySteps: (trackId: string) => void;
  onPasteSteps: (trackId: string) => void;
  onShiftPattern: (trackId: string, direction: 1 | -1) => void;
  onRandomizePattern: (trackId: string, density: number) => void;
  onClearTrack: (trackId: string) => void;
  onReverseSteps: (trackId: string) => void;
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
  onSetProbability,
  onSetEffects,
  onSetModifiers,
  onAddPresetTracks,
  onInsertTrackAfter,
  onSetLoopLength,
  onCopySteps,
  onPasteSteps,
  onShiftPattern,
  onRandomizePattern,
  onClearTrack,
  onReverseSteps,
}: TrackListProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number, e: React.DragEvent) => {
    // Don't start drag from interactive elements
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "BUTTON") {
      e.preventDefault();
      return;
    }
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  const handleDrop = useCallback(
    (idx: number, e: React.DragEvent) => {
      e.preventDefault();
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

  // Compute polyrhythm alignment markers: for each track, collect loop-restart
  // positions of all OTHER tracks that have a different loop length.
  const polyrhythmMarkersPerTrack = useMemo(() => {
    const loopLengths = project.tracks.map(
      (t) => t.loopLength ?? project.stepCount,
    );
    const uniqueLengths = new Set(loopLengths);
    // Only compute if there are at least 2 different loop lengths
    if (uniqueLengths.size < 2) return undefined;

    return project.tracks.map((_, ti) => {
      const myLen = loopLengths[ti];
      const markers = new Set<number>();
      for (let oi = 0; oi < loopLengths.length; oi++) {
        if (oi === ti) continue;
        const otherLen = loopLengths[oi];
        if (otherLen === myLen) continue;
        // Mark positions where the other track's loop restarts
        for (let pos = otherLen; pos < project.stepCount; pos += otherLen) {
          markers.add(pos);
        }
      }
      return markers;
    });
  }, [project.tracks, project.stepCount]);

  // Group tracks into chain rows: root tracks and their chained children side-by-side
  const chainGroups = useMemo(() => {
    const groups: TrackType[][] = [];
    const chainedIds = new Set(
      project.tracks.filter((t) => t.chainedWith).map((t) => t.id),
    );

    for (const track of project.tracks) {
      if (chainedIds.has(track.id)) continue; // skip chained children, they'll be added to their parent group
      const group = [track];
      // Find all tracks chained to this one
      for (const t of project.tracks) {
        if (t.chainedWith === track.id) group.push(t);
      }
      groups.push(group);
    }
    return groups;
  }, [project.tracks]);

  return (
    <div className="track-list">
      {project.tracks.length === 0 && (
        <div className="empty-state">
          <p>No tracks yet. Add a drum or synth track to get started!</p>
        </div>
      )}

      {chainGroups.map((group) => {
        const rootTrack = group[0];
        const rootIdx = project.tracks.indexOf(rootTrack);

        if (group.length === 1) {
          // Single track — render as before
          const track = rootTrack;
          const idx = rootIdx;
          return (
            <div
              key={track.id}
              className={`track-drag-wrapper ${dragIdx === idx ? "dragging" : ""} ${overIdx === idx && dragIdx !== idx ? "drag-over" : ""}`}
              draggable
              onDragStart={(e) => handleDragStart(idx, e)}
              onDragOver={(e) => handleDragOver(idx, e)}
              onDrop={(e) => handleDrop(idx, e)}
              onDragEnd={handleDragEnd}
            >
              <Track
                track={track}
                color={getTrackColor(idx)}
                currentStep={currentStep}
                stepCount={project.stepCount}
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
                onSetProbability={(row, col, prob) =>
                  onSetProbability(track.id, row, col, prob)
                }
                polyrhythmMarkers={polyrhythmMarkersPerTrack?.[idx]}
                onSetEffects={(fx) => onSetEffects(track.id, fx)}
                onSetModifiers={(mods) => onSetModifiers(track.id, mods)}
                onSetLoopLength={(len) => onSetLoopLength(track.id, len)}
                onCopySteps={() => onCopySteps(track.id)}
                onPasteSteps={() => onPasteSteps(track.id)}
                onShiftPattern={(dir) => onShiftPattern(track.id, dir)}
                onRandomizePattern={(density) =>
                  onRandomizePattern(track.id, density)
                }
                onClearTrack={() => onClearTrack(track.id)}
                onReverseSteps={() => onReverseSteps(track.id)}
                onInsertAfter={(type, steps) =>
                  onInsertTrackAfter(track.id, type, steps)
                }
              />
            </div>
          );
        }

        // Chained group — render side-by-side
        const chainUsedSteps = group.reduce(
          (sum, t) => sum + (t.loopLength ?? project.stepCount),
          0,
        );
        const chainRemaining = Math.max(0, project.stepCount - chainUsedSteps);

        // Compute step offsets: each track plays after the previous finishes
        const offsets: number[] = [];
        let offset = 0;
        for (const t of group) {
          offsets.push(offset);
          offset += t.loopLength ?? project.stepCount;
        }

        return (
          <div key={rootTrack.id} className="chain-group">
            {group.map((track, groupIdx) => {
              const idx = project.tracks.indexOf(track);
              const isLast = groupIdx === group.length - 1;
              const trackLen = track.loopLength ?? project.stepCount;
              const trackOffset = offsets[groupIdx];
              // Only show beat indicator when this track is the one currently playing
              let chainStep = -1;
              if (currentStep >= 0) {
                const cyclePos = currentStep % chainUsedSteps;
                if (
                  cyclePos >= trackOffset &&
                  cyclePos < trackOffset + trackLen
                ) {
                  chainStep = cyclePos - trackOffset;
                }
              }
              return (
                <div key={track.id} className="chain-track-wrapper">
                  <Track
                    track={track}
                    color={getTrackColor(idx)}
                    currentStep={chainStep}
                    stepCount={project.stepCount}
                    onToggleStep={(row, col) =>
                      onToggleStep(track.id, row, col)
                    }
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
                    onPreviewRow={(rowLabel) =>
                      onPreviewRow(track.id, rowLabel)
                    }
                    onDuplicate={() => onDuplicateTrack(track.id)}
                    onSetVelocity={(row, col, vel) =>
                      onSetVelocity(track.id, row, col, vel)
                    }
                    onSetProbability={(row, col, prob) =>
                      onSetProbability(track.id, row, col, prob)
                    }
                    polyrhythmMarkers={polyrhythmMarkersPerTrack?.[idx]}
                    onSetEffects={(fx) => onSetEffects(track.id, fx)}
                    onSetModifiers={(mods) => onSetModifiers(track.id, mods)}
                    onSetLoopLength={(len) => onSetLoopLength(track.id, len)}
                    onCopySteps={() => onCopySteps(track.id)}
                    onPasteSteps={() => onPasteSteps(track.id)}
                    onShiftPattern={(dir) => onShiftPattern(track.id, dir)}
                    onRandomizePattern={(density) =>
                      onRandomizePattern(track.id, density)
                    }
                    onClearTrack={() => onClearTrack(track.id)}
                    onReverseSteps={() => onReverseSteps(track.id)}
                    onInsertAfter={(type) => onInsertTrackAfter(track.id, type)}
                    chainRemainingSteps={isLast ? chainRemaining : 0}
                  />
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="add-track-buttons">
        <button className="add-track-btn" onClick={() => onAddTrack("drums")}>
          🥁 Add Drum Track
        </button>
        <button className="add-track-btn" onClick={() => onAddTrack("melodic")}>
          🎹 Add Synth Track
        </button>
        <button className="add-track-btn" onClick={() => onAddTrack("piano")}>
          🎵 Add Piano Track
        </button>
        <button className="add-track-btn" onClick={() => onAddTrack("guitar")}>
          🎸 Add Guitar Track
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
