import type { TrackEffects } from "../types";

interface EffectsPanelProps {
  effects: TrackEffects;
  onChange: (effects: Partial<TrackEffects>) => void;
}

const EFFECT_DEFS: {
  key: keyof TrackEffects;
  label: string;
  min: number;
  max: number;
  step: number;
  offValue: number;
  display: (v: number) => string;
}[] = [
  {
    key: "delay",
    label: "DLY",
    min: 0,
    max: 1,
    step: 0.05,
    offValue: 0,
    display: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "delaytime",
    label: "D.T",
    min: 0.05,
    max: 1,
    step: 0.05,
    offValue: 0.25,
    display: (v) => `${v.toFixed(2)}`,
  },
  {
    key: "room",
    label: "REV",
    min: 0,
    max: 1,
    step: 0.05,
    offValue: 0,
    display: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "lpf",
    label: "LPF",
    min: 100,
    max: 20000,
    step: 100,
    offValue: 20000,
    display: (v) => (v >= 20000 ? "OFF" : `${v}Hz`),
  },
  {
    key: "distort",
    label: "DST",
    min: 0,
    max: 1,
    step: 0.05,
    offValue: 0,
    display: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "crush",
    label: "BIT",
    min: 0,
    max: 16,
    step: 1,
    offValue: 0,
    display: (v) => (v === 0 ? "OFF" : `${v}`),
  },
];

export function EffectsPanel({ effects, onChange }: EffectsPanelProps) {
  return (
    <div className="effects-panel">
      {EFFECT_DEFS.map((def) => (
        <div key={def.key} className="effect-knob">
          <label className="effect-label">{def.label}</label>
          <input
            type="range"
            className="effect-slider"
            min={def.min}
            max={def.max}
            step={def.step}
            value={effects?.[def.key] ?? def.offValue}
            onChange={(e) => onChange({ [def.key]: Number(e.target.value) })}
          />
          <span className="effect-value">
            {def.display(effects?.[def.key] ?? def.offValue)}
          </span>
        </div>
      ))}
    </div>
  );
}
