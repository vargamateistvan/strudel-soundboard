export const DEFAULT_BPM = 120;
export const DEFAULT_STEP_COUNT = 16;

export const DRUM_SOUNDS = [
  "bd",
  "sd",
  "hh",
  "oh",
  "cp",
  "rim",
  "cr",
  "rd",
  "ht",
  "mt",
  "lt",
  "cb",
  "tb",
  "sh",
  "perc",
] as const;

export const DEFAULT_DRUM_ROWS = ["bd", "sd", "hh", "oh", "cp"];

export const SYNTH_SOUNDS = ["sine", "sawtooth", "square", "triangle"] as const;

export const BANKS = [
  "", // default (no bank)
  "RolandTR808",
  "RolandTR909",
  "RolandCR78",
  "AkaiLinn",
  "RhythmAce",
  "ViscoSpaceDrum",
] as const;

/** Two-octave range C3–C5 for the melodic piano roll */
export const MELODIC_NOTES = [
  "C5",
  "B4",
  "Bb4",
  "A4",
  "Ab4",
  "G4",
  "F#4",
  "F4",
  "E4",
  "Eb4",
  "D4",
  "C#4",
  "C4",
  "B3",
  "Bb3",
  "A3",
  "Ab3",
  "G3",
  "F#3",
  "F3",
  "E3",
  "Eb3",
  "D3",
  "C#3",
  "C3",
] as const;

export const TRACK_COLORS = [
  "#4fc3f7",
  "#81c784",
  "#ffb74d",
  "#e57373",
  "#ba68c8",
  "#4dd0e1",
  "#aed581",
  "#ff8a65",
  "#f06292",
  "#7986cb",
  "#dce775",
  "#a1887f",
];

export function getTrackColor(index: number): string {
  return TRACK_COLORS[index % TRACK_COLORS.length];
}
