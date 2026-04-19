import { useState } from "react";
import type { Track, TrackEffects } from "../types";
import { DRUM_SOUNDS, SYNTH_SOUNDS, BANKS } from "../lib/constants";
import { EffectsPanel } from "./EffectsPanel";

interface TrackHeaderProps {
  track: Track;
  onSetSound: (sound: string) => void;
  onSetBank: (bank: string) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSetVolume: (volume: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onSetName: (name: string) => void;
  onAddDrumRow: (sound: string) => void;
  onSetEffects: (effects: Partial<TrackEffects>) => void;
}

export function TrackHeader({
  track,
  onSetSound,
  onSetBank,
  onToggleMute,
  onToggleSolo,
  onSetVolume,
  onRemove,
  onDuplicate,
  onSetName,
  onAddDrumRow,
  onSetEffects,
}: TrackHeaderProps) {
  const [showFx, setShowFx] = useState(false);
  const availableDrums = DRUM_SOUNDS.filter((d) => !track.rows.includes(d));

  return (
    <div className="track-header">
      <div className="track-header-top">
        <input
          className="track-name-input"
          value={track.name}
          onChange={(e) => onSetName(e.target.value)}
          spellCheck={false}
        />
        <div className="track-header-actions">
          <button
            className="track-dup-btn"
            onClick={onDuplicate}
            title="Duplicate track"
          >
            ⧉
          </button>
          <button
            className="track-remove-btn"
            onClick={onRemove}
            title="Remove track"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="track-controls">
        {track.type === "melodic" && (
          <select
            className="track-select"
            value={track.sound}
            onChange={(e) => onSetSound(e.target.value)}
          >
            {SYNTH_SOUNDS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        {track.type === "drums" && (
          <>
            <select
              className="track-select"
              value={track.bank}
              onChange={(e) => onSetBank(e.target.value)}
            >
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b || "Default"}
                </option>
              ))}
            </select>
            {availableDrums.length > 0 && (
              <select
                className="track-select add-row-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) onAddDrumRow(e.target.value);
                }}
              >
                <option value="">+ Add row</option>
                {availableDrums.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      <div className="track-toggles">
        <button
          className={`toggle-btn mute-btn ${track.muted ? "active" : ""}`}
          onClick={onToggleMute}
          title="Mute"
        >
          M
        </button>
        <button
          className={`toggle-btn solo-btn ${track.solo ? "active" : ""}`}
          onClick={onToggleSolo}
          title="Solo"
        >
          S
        </button>
        <input
          type="range"
          className="volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          onChange={(e) => onSetVolume(Number(e.target.value))}
          title={`Volume: ${Math.round(track.volume * 100)}%`}
        />
        <button
          className={`toggle-btn fx-btn ${showFx ? "active" : ""}`}
          onClick={() => setShowFx(!showFx)}
          title="Effects"
        >
          FX
        </button>
      </div>

      {showFx && (
        <EffectsPanel effects={track.effects} onChange={onSetEffects} />
      )}
    </div>
  );
}
