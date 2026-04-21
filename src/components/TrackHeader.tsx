import { useState } from "react";
import type { Track, TrackEffects, TrackModifiers } from "../types";
import { DEFAULT_MODIFIERS } from "../types";
import {
  DRUM_SOUNDS,
  SYNTH_SOUNDS,
  PIANO_SOUNDS,
  GUITAR_SOUNDS,
  BANKS,
} from "../lib/constants";
import { EffectsPanel } from "./EffectsPanel";
import { ModifiersPanel } from "./ModifiersPanel";

interface TrackHeaderProps {
  track: Track;
  stepCount: number;
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
  onSetModifiers: (modifiers: Partial<TrackModifiers>) => void;
  onSetLoopLength: (loopLength: number | undefined) => void;
  onCopySteps: () => void;
  onPasteSteps: () => void;
  onShiftPattern: (direction: 1 | -1) => void;
  onRandomizePattern: (density: number) => void;
  onClearTrack: () => void;
  onReverseSteps: () => void;
}

export function TrackHeader({
  track,
  stepCount,
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
  onSetModifiers,
  onSetLoopLength,
  onCopySteps,
  onPasteSteps,
  onShiftPattern,
  onRandomizePattern,
  onClearTrack,
  onReverseSteps,
}: TrackHeaderProps) {
  const [showFx, setShowFx] = useState(false);
  const [showMod, setShowMod] = useState(false);
  const [showTools, setShowTools] = useState(false);
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
            data-tooltip="Duplicate track"
            aria-label="Duplicate track"
          >
            ⧉
          </button>
          <button
            className="track-remove-btn"
            onClick={onRemove}
            data-tooltip="Remove track"
            aria-label="Remove track"
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

        {track.type === "piano" && (
          <select
            className="track-select"
            value={track.sound}
            onChange={(e) => onSetSound(e.target.value)}
          >
            {PIANO_SOUNDS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        {track.type === "guitar" && (
          <select
            className="track-select"
            value={track.sound}
            onChange={(e) => onSetSound(e.target.value)}
          >
            {GUITAR_SOUNDS.map((s) => (
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
          data-tooltip={track.muted ? "Unmute" : "Mute"}
          aria-label={track.muted ? "Unmute" : "Mute"}
        >
          M
        </button>
        <button
          className={`toggle-btn solo-btn ${track.solo ? "active" : ""}`}
          onClick={onToggleSolo}
          data-tooltip={track.solo ? "Unsolo" : "Solo – only this track"}
          aria-label={track.solo ? "Unsolo" : "Solo"}
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
          data-tooltip="Effects: delay, reverb, filter, distortion"
          aria-label="Toggle effects panel"
        >
          FX
        </button>
        <button
          className={`toggle-btn mod-btn ${showMod ? "active" : ""}`}
          onClick={() => setShowMod(!showMod)}
          data-tooltip="Modifiers: speed, degrade, euclidean"
          aria-label="Toggle modifiers panel"
        >
          MOD
        </button>
        <button
          className={`toggle-btn tools-btn ${showTools ? "active" : ""}`}
          onClick={() => setShowTools(!showTools)}
          data-tooltip="Tools: copy, paste, shift, randomize"
          aria-label="Toggle tools panel"
        >
          ✂
        </button>
        <select
          className="track-select loop-select"
          value={track.loopLength ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onSetLoopLength(val ? Number(val) : undefined);
          }}
          data-tooltip="Loop length"
        >
          <option value="">🔁 All</option>
          {[4, 8, 12, 16, 24, 32, 48, 64, 128].map((n) => (
            <option key={n} value={n}>
              🔁 {n}
            </option>
          ))}
        </select>
      </div>

      {showFx && (
        <EffectsPanel effects={track.effects} onChange={onSetEffects} />
      )}

      {showMod && (
        <ModifiersPanel
          modifiers={track.modifiers ?? DEFAULT_MODIFIERS}
          onChange={onSetModifiers}
        />
      )}

      {showTools && (
        <div className="pattern-tools">
          <button
            className="pattern-tool-btn"
            onClick={onCopySteps}
            data-tooltip="Copy pattern"
          >
            📋 Copy
          </button>
          <button
            className="pattern-tool-btn"
            onClick={onPasteSteps}
            data-tooltip="Paste pattern"
          >
            📌 Paste
          </button>
          <button
            className="pattern-tool-btn"
            onClick={() => onShiftPattern(-1)}
            data-tooltip="Shift pattern left"
          >
            ◀ Shift
          </button>
          <button
            className="pattern-tool-btn"
            onClick={() => onShiftPattern(1)}
            data-tooltip="Shift pattern right"
          >
            Shift ▶
          </button>
          <button
            className="pattern-tool-btn"
            onClick={() => onRandomizePattern(0.3)}
            data-tooltip="Randomize at 30% density"
          >
            🎲 Random
          </button>
          <button
            className="pattern-tool-btn"
            onClick={onReverseSteps}
            data-tooltip="Reverse step order"
          >
            ↔ Reverse
          </button>
          <button
            className="pattern-tool-btn"
            onClick={onClearTrack}
            data-tooltip="Clear all steps"
          >
            🗑 Clear
          </button>
        </div>
      )}
    </div>
  );
}
