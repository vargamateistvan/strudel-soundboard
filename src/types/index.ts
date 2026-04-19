export type TrackType = "drums" | "melodic";

export interface Step {
  active: boolean;
  velocity: number;
}

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
}

export interface Project {
  bpm: number;
  stepCount: number;
  tracks: Track[];
}

export interface ParseResult {
  project: Project;
  warnings: string[];
}
