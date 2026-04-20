import type { TrackModifiers } from "../types";
import { DEFAULT_MODIFIERS } from "../types";

interface ModifiersPanelProps {
  modifiers: TrackModifiers;
  onChange: (modifiers: Partial<TrackModifiers>) => void;
}

const EVERY_MODS = ["reverse", "double", "half"] as const;

export function ModifiersPanel({ modifiers, onChange }: ModifiersPanelProps) {
  const m = { ...DEFAULT_MODIFIERS, ...modifiers };

  return (
    <div className="modifiers-panel">
      <div
        className="effect-knob"
        data-tooltip="Reverse – play pattern backwards"
      >
        <label className="effect-label">REV</label>
        <button
          className={`mod-toggle ${m.reverse ? "active" : ""}`}
          onClick={() => onChange({ reverse: !m.reverse })}
        >
          {m.reverse ? "ON" : "OFF"}
        </button>
      </div>

      <div
        className="effect-knob"
        data-tooltip="Speed – playback rate multiplier"
      >
        <label className="effect-label">SPD</label>
        <input
          type="range"
          className="effect-slider"
          min={0.25}
          max={4}
          step={0.25}
          value={m.speed}
          onChange={(e) => onChange({ speed: Number(e.target.value) })}
        />
        <span className="effect-value">{m.speed}x</span>
      </div>

      <div
        className="effect-knob"
        data-tooltip="Probability – chance each step plays"
      >
        <label className="effect-label">PROB</label>
        <input
          type="range"
          className="effect-slider"
          min={0}
          max={1}
          step={0.05}
          value={m.probability}
          onChange={(e) => onChange({ probability: Number(e.target.value) })}
        />
        <span className="effect-value">{Math.round(m.probability * 100)}%</span>
      </div>

      <div
        className="effect-knob"
        data-tooltip="Every – apply change every Nth cycle"
      >
        <label className="effect-label">EVERY</label>
        <select
          className="mod-select"
          value={m.every ? `${m.every.n}:${m.every.mod}` : ""}
          onChange={(e) => {
            if (!e.target.value) {
              onChange({ every: null });
            } else {
              const [n, mod] = e.target.value.split(":");
              onChange({
                every: {
                  n: Number(n),
                  mod: mod as "reverse" | "double" | "half",
                },
              });
            }
          }}
        >
          <option value="">OFF</option>
          {[2, 3, 4, 8].map((n) =>
            EVERY_MODS.map((mod) => (
              <option key={`${n}:${mod}`} value={`${n}:${mod}`}>
                {n}th {mod}
              </option>
            )),
          )}
        </select>
      </div>
    </div>
  );
}
