import type { Project, Step, Track } from "../types";
import { DEFAULT_EFFECTS } from "../types";

function steps(pattern: string, stepCount: number): Step[] {
  const chars = pattern.split("");
  return Array.from({ length: stepCount }, (_, i) => ({
    active: (chars[i % chars.length] ?? "0") !== "0",
    velocity: 1,
  }));
}

let presetId = 9000;

function drumTrack(
  name: string,
  rows: { sound: string; pattern: string }[],
  stepCount: number,
): Track {
  return {
    id: `track-${presetId++}`,
    name,
    type: "drums",
    sound: "bd",
    bank: "",
    steps: rows.map((r) => steps(r.pattern, stepCount)),
    rows: rows.map((r) => r.sound),
    muted: false,
    solo: false,
    volume: 1,
    effects: { ...DEFAULT_EFFECTS },
  };
}

export interface Preset {
  name: string;
  description: string;
  build: () => Project;
}

export const PRESETS: Preset[] = [
  {
    name: "Basic Rock",
    description: "Standard 4/4 rock beat with kick, snare, and hi-hat",
    build: () => ({
      bpm: 120,
      stepCount: 16,
      swing: 0,
      tracks: [
        drumTrack(
          "Rock Beat",
          [
            { sound: "bd", pattern: "1000100010001000" },
            { sound: "sd", pattern: "0000100000001000" },
            { sound: "hh", pattern: "1010101010101010" },
          ],
          16,
        ),
      ],
    }),
  },
  {
    name: "Hip Hop",
    description: "Boom-bap drum pattern with swing feel",
    build: () => ({
      bpm: 90,
      stepCount: 16,
      swing: 0.3,
      tracks: [
        drumTrack(
          "Boom Bap",
          [
            { sound: "bd", pattern: "1001000010010000" },
            { sound: "sd", pattern: "0000100000001010" },
            { sound: "hh", pattern: "1011101110111011" },
            { sound: "oh", pattern: "0000000100000001" },
          ],
          16,
        ),
      ],
    }),
  },
  {
    name: "Four on the Floor",
    description: "Classic dance/house kick pattern with open hi-hats",
    build: () => ({
      bpm: 128,
      stepCount: 16,
      swing: 0,
      tracks: [
        drumTrack(
          "House Beat",
          [
            { sound: "bd", pattern: "1000100010001000" },
            { sound: "sd", pattern: "0000100000001000" },
            { sound: "hh", pattern: "1010101010101010" },
            { sound: "oh", pattern: "0010001000100010" },
          ],
          16,
        ),
      ],
    }),
  },
  {
    name: "Breakbeat",
    description: "Classic breakbeat pattern with syncopation",
    build: () => ({
      bpm: 140,
      stepCount: 16,
      swing: 0,
      tracks: [
        drumTrack(
          "Break",
          [
            { sound: "bd", pattern: "1001001000101000" },
            { sound: "sd", pattern: "0000100001001010" },
            { sound: "hh", pattern: "1111111111111111" },
          ],
          16,
        ),
      ],
    }),
  },
  {
    name: "Reggaeton",
    description: "Dembow rhythm pattern",
    build: () => ({
      bpm: 95,
      stepCount: 16,
      swing: 0,
      tracks: [
        drumTrack(
          "Dembow",
          [
            { sound: "bd", pattern: "1000100010001000" },
            { sound: "sd", pattern: "0001000100010001" },
            { sound: "hh", pattern: "1010101010101010" },
          ],
          16,
        ),
      ],
    }),
  },
  {
    name: "Trap",
    description: "808 trap pattern with rapid hi-hats",
    build: () => ({
      bpm: 140,
      stepCount: 32,
      swing: 0,
      tracks: [
        drumTrack(
          "Trap 808",
          [
            { sound: "bd", pattern: "10000000000010001000000000001000" },
            { sound: "sd", pattern: "00001000000000000000100000000000" },
            { sound: "hh", pattern: "10101110101011101010111010101110" },
          ],
          32,
        ),
      ],
    }),
  },
];
