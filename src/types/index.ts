export type TrackType = "drums" | "melodic" | "piano" | "guitar";

export interface Step {
  active: boolean;
  velocity: number;
}

export interface TrackEffects {
  delay: number; // 0-1
  delaytime: number; // 0-1 (in fractions)
  room: number; // 0-1 (reverb)
  lpf: number; // 20-20000 (hz), 20000 = off
  hpf: number; // 20-20000 (hz), 20 = off
  distort: number; // 0-1
  crush: number; // 0-16, 0 = off
  pan: number; // 0-1, 0.5 = center
}

export const DEFAULT_EFFECTS: TrackEffects = {
  delay: 0,
  delaytime: 0.25,
  room: 0,
  lpf: 20000,
  hpf: 20,
  distort: 0,
  crush: 0,
  pan: 0.5,
};

export interface TrackModifiers {
  reverse: boolean;
  speed: number; // 0.25-4, 1 = normal
  probability: number; // 0-1, 1 = always play
  every: { n: number; mod: "reverse" | "double" | "half" } | null;
}

export const DEFAULT_MODIFIERS: TrackModifiers = {
  reverse: false,
  speed: 1,
  probability: 1,
  every: null,
};

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  sound: string;
  bank: string;
  /** For drums: one row of steps per drum sound (e.g. bd, sd, hh). For melodic: one row per note pitch. */
  steps: Step[][];
  /** Row labels — drum names for drum tracks, note names for melodic tracks */
  rows: string[];
  muted: boolean;
  solo: boolean;
  volume: number;
  effects: TrackEffects;
  modifiers?: TrackModifiers;
  loopLength?: number; // if set, pattern loops at this many steps (e.g. 4, 8)
}

export interface Project {
  bpm: number;
  stepCount: number;
  tracks: Track[];
  swing: number; // 0-1, 0 = no swing
}

export interface ParseResult {
  project: Project;
  warnings: string[];
}
