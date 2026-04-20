import type { TrackEffects } from "../types";

interface EffectsPanelProps {
  effects: TrackEffects;
  onChange: (effects: Partial<TrackEffects>) => void;
}

const EFFECT_DEFS: {
  key: keyof TrackEffects;
  label: string;
  tooltip: string;
  min: number;
  max: number;
  step: number;
  offValue: number;
  display: (v: number) => string;
}[] = [
  {
    key: "delay",
    label: "DLY",
    tooltip: "Delay – echo/repeat effect amount",
    min: 0,
    max: 1,
    step: 0.05,
    offValue: 0,
    display: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "delaytime",
    label: "D.T",
    tooltip: "Delay Time – interval between echoes",
    min: 0.05,
    max: 1,
    step: 0.05,
    offValue: 0.25,
    display: (v) => `${v.toFixed(2)}`,
  },
  {
    key: "room",
    label: "REV",
    tooltip: "Reverb – room size / space",
    min: 0,
    max: 1,
    step: 0.05,
    offValue: 0,
    display: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "lpf",
    label: "LPF",
    tooltip: "Low-Pass Filter – cuts high frequencies",
    min: 100,
    max: 20000,
    step: 100,
    offValue: 20000,
    display: (v) => (v >= 20000 ? "OFF" : `${v}Hz`),
  },
  {
    key: "distort",
    label: "DST",
    tooltip: "Distortion – overdrive / saturation",
    min: 0,
    max: 1,
    step: 0.05,
    offValue: 0,
    display: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "crush",
    label: "BIT",
    tooltip: "Bit Crush – lo-fi bit reduction",
    min: 0,
    max: 16,
    step: 1,
    offValue: 0,
    display: (v) => (v === 0 ? "OFF" : `${v}`),
  },
  {
    key: "pan",
    label: "PAN",
    tooltip: "Pan – stereo position (L/C/R)",
    min: 0,
    max: 1,
    step: 0.05,
    offValue: 0.5,
    display: (v) =>
      v < 0.45
        ? `L${Math.round((0.5 - v) * 200)}`
        : v > 0.55
          ? `R${Math.round((v - 0.5) * 200)}`
          : "C",
  },
  {
    key: "hpf",
    label: "HPF",
    tooltip: "High-Pass Filter – cuts low frequencies",
    min: 20,
    max: 20000,
    step: 100,
    offValue: 20,
    display: (v) => (v <= 20 ? "OFF" : `${v}Hz`),
  },
];

export function EffectsPanel({ effects, onChange }: EffectsPanelProps) {
  return (
    <div className="effects-panel">
      {EFFECT_DEFS.map((def) => (
        <div key={def.key} className="effect-knob" data-tooltip={def.tooltip}>
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
