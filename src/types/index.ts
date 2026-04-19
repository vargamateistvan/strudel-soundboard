export type TrackType = "drums" | "melodic";

export interface Step {
  active: boolean;
  velocity: number;
}

export interface TrackEffects {
  delay: number; // 0-1
  delaytime: number; // 0-1 (in fractions)
  room: number; // 0-1 (reverb)
  lpf: number; // 20-20000 (hz), 20000 = off
  distort: number; // 0-1
  crush: number; // 0-16, 0 = off
}

export const DEFAULT_EFFECTS: TrackEffects = {
  delay: 0,
  delaytime: 0.25,
  room: 0,
  lpf: 20000,
  distort: 0,
  crush: 0,
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
