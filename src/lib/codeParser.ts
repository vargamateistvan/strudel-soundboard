import type { Track, Step, ParseResult } from "../types";
import { DEFAULT_EFFECTS } from "../types";
import {
  DEFAULT_BPM,
  DEFAULT_STEP_COUNT,
  MELODIC_NOTES,
  DEFAULT_DRUM_ROWS,
} from "./constants";

/**
 * Parse Strudel mini-notation code into a Project.
 * Best-effort: optimized for code produced by our exporter.
 */
export function fromMiniNotation(code: string): ParseResult {
  const warnings: string[] = [];
  let bpm = DEFAULT_BPM;

  // Extract setcps
  const cpsMatch = code.match(/setcps\(\s*([\d.]+)\s*\)/);
  if (cpsMatch) {
    const cps = parseFloat(cpsMatch[1]);
    bpm = Math.round(cps * 60 * 4);
  }

  // Extract setcpm (cycles per minute; 1 cycle = 4 beats)
  const cpmMatch = code.match(/setcpm\(\s*([\d.]+)\s*\)/);
  if (cpmMatch) {
    bpm = Math.round(parseFloat(cpmMatch[1]) * 4);
  }

  // Extract stack contents, $: patterns, or single pattern
  let patternBodies: string[] = [];
  const stackMatch = code.match(/stack\(\s*([\s\S]*)\s*\)/);

  // Check for $: multi-pattern syntax
  const dollarPatterns = code.match(/(?:_?\$:\s*)((?:(?!\n_?\$:)[\s\S])*)/g);

  if (stackMatch) {
    patternBodies = splitTopLevel(stackMatch[1]);
  } else if (dollarPatterns && dollarPatterns.length > 0) {
    patternBodies = dollarPatterns.map((p) =>
      p.replace(/^_?\$:\s*/, "").trim(),
    );
  } else {
    // Find all s("...") or note("...") calls outside of setcps/setcpm
    const cleaned = code
      .replace(/setcps\([^)]*\)\s*\n?/, "")
      .replace(/setcpm\([^)]*\)\s*\n?/, "");
    if (cleaned.trim()) {
      patternBodies = [cleaned.trim()];
    }
  }

  const tracks: Track[] = [];

  for (const body of patternBodies) {
    const trimmed = body.trim();
    if (!trimmed) continue;

    try {
      const track = parseTrackPattern(trimmed);
      if (track) tracks.push(track);
      else warnings.push(`Could not parse pattern: ${trimmed.slice(0, 50)}...`);
    } catch {
      warnings.push(`Failed to parse: ${trimmed.slice(0, 50)}...`);
    }
  }

  if (tracks.length === 0 && patternBodies.length > 0) {
    warnings.push("No tracks could be parsed from the code.");
  }

  return {
    project: { bpm, stepCount: DEFAULT_STEP_COUNT, tracks, swing: 0 },
    warnings,
  };
}

/**
 * Parse JavaScript (HTML export) by extracting the embedded Strudel code.
 */
export function fromJavaScript(code: string): ParseResult {
  // Extract code from template literal: const code = `...`;
  const templateMatch = code.match(/const\s+code\s*=\s*`([\s\S]*?)`;/);
  if (templateMatch) {
    return fromMiniNotation(templateMatch[1]);
  }

  // Fallback: extract content between <script> tags (non-src ones)
  const scriptMatch = code.match(
    /<script>[\s\S]*?(setcps[\s\S]*?)(?:document\.|<\/script>)/,
  );
  if (scriptMatch) {
    return fromMiniNotation(scriptMatch[1]);
  }

  // Last resort: try parsing the whole thing as mini-notation
  const result = fromMiniNotation(code);
  if (result.project.tracks.length === 0) {
    result.warnings.push(
      "Could not detect JavaScript export format. Tried parsing as mini-notation.",
    );
  }
  return result;
}

/**
 * Auto-detect format and parse
 */
export function autoImport(code: string): ParseResult {
  if (
    code.includes("<!doctype") ||
    code.includes("<script") ||
    code.includes("initStrudel")
  ) {
    return fromJavaScript(code);
  }
  return fromMiniNotation(code);
}

// --- Internal helpers ---

function parseTrackPattern(pattern: string): Track | null {
  // Detect drum patterns: s("...") or sound("bd sd ...")
  const sMatch =
    pattern.match(/^s\(["'`]([^"'`]+)["'`]\)/) ??
    pattern.match(/^sound\(["'`]([^"'`]+)["'`]\)/);
  // Detect melodic patterns: note("...") or n("...").scale("...")
  const noteMatch = pattern.match(/^note\(["'`]([^"'`]+)["'`]\)/);
  const nScaleMatch = pattern.match(
    /^n\(["'`]([^"'`]+)["'`]\)\s*\.\s*scale\(["'`]([^"'`]+)["'`]\)/,
  );

  if (sMatch) {
    return parseDrumTrack(pattern, sMatch[1]);
  }
  if (noteMatch) {
    return parseMelodicTrack(pattern, noteMatch[1]);
  }
  if (nScaleMatch) {
    return parseScaleTrack(pattern, nScaleMatch[1], nScaleMatch[2]);
  }
  return null;
}

function parseDrumTrack(pattern: string, innerPattern: string): Track {
  const bankMatch = pattern.match(/\.bank\(["'`]([^"'`]+)["'`]\)/);
  const gainMatch = pattern.match(/\.gain\(([\d.]+)\)/);

  const bank = bankMatch?.[1] ?? "";
  const volume = gainMatch ? parseFloat(gainMatch[1]) : 1;

  // Split by comma for multiple drum rows
  const rowPatterns = innerPattern.split(/,\s*/);
  const rows: string[] = [];
  const steps: Step[][] = [];

  for (const rowPat of rowPatterns) {
    const tokens = rowPat.trim().split(/\s+/);
    // Determine drum name from first non-rest token
    const drumName = tokens.find((t) => t !== "~" && t !== "-") ?? "bd";
    rows.push(drumName);

    const rowSteps: Step[] = [];
    for (const token of tokens) {
      rowSteps.push({
        active: token !== "~" && token !== "-",
        velocity: 1,
      });
    }
    // Pad or truncate to DEFAULT_STEP_COUNT
    while (rowSteps.length < DEFAULT_STEP_COUNT) {
      rowSteps.push({ active: false, velocity: 1 });
    }
    steps.push(rowSteps.slice(0, DEFAULT_STEP_COUNT));
  }

  // Add any missing default rows
  const existingDrums = new Set(rows);
  for (const d of DEFAULT_DRUM_ROWS) {
    if (!existingDrums.has(d)) {
      rows.push(d);
      steps.push(
        Array.from({ length: DEFAULT_STEP_COUNT }, () => ({
          active: false,
          velocity: 1,
        })),
      );
    }
  }

  return {
    id: generateParserId(),
    name: `Drums`,
    type: "drums",
    sound: rows[0] ?? "bd",
    bank,
    steps,
    rows,
    muted: false,
    solo: false,
    volume,
    effects: { ...DEFAULT_EFFECTS },
  };
}

function parseMelodicTrack(pattern: string, notePattern: string): Track {
  // Support both .s("...") and .sound("...")
  const soundMatch =
    pattern.match(/\.s\("([^"]+)"\)/) ?? pattern.match(/\.sound\("([^"]+)"\)/);
  const gainMatch = pattern.match(/\.gain\(([\d.]+)\)/);

  const sound = soundMatch?.[1] ?? "triangle";
  const volume = gainMatch ? parseFloat(gainMatch[1]) : 1;

  // Strip mini-notation modifiers: *N, /N, @N, !N, <...>, [...] wrappers
  const cleaned = stripMiniModifiers(notePattern);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const allNotes = [...MELODIC_NOTES];
  const rows = allNotes;

  const steps: Step[][] = rows.map(() =>
    Array.from({ length: DEFAULT_STEP_COUNT }, () => ({
      active: false,
      velocity: 1,
    })),
  );

  for (let col = 0; col < Math.min(tokens.length, DEFAULT_STEP_COUNT); col++) {
    const token = tokens[col];
    if (token === "~" || token === "-") continue;

    // Handle chords [c4,e4,g4]
    const chordMatch = token.match(/^\[([^\]]+)\]$/);
    const noteNames = chordMatch ? chordMatch[1].split(",") : [token];

    for (const noteName of noteNames) {
      const normalized = normalizeNoteName(noteName.trim());
      const rowIdx = rows.findIndex(
        (r) => r.toLowerCase() === normalized.toLowerCase(),
      );
      if (rowIdx >= 0) {
        steps[rowIdx][col] = { active: true, velocity: 1 };
      }
    }
  }

  return {
    id: generateParserId(),
    name: `Melodic`,
    type: "melodic",
    sound,
    bank: "",
    steps,
    rows: [...rows],
    muted: false,
    solo: false,
    volume,
    effects: { ...DEFAULT_EFFECTS },
  };
}

/**
 * Normalize a Strudel note token to our internal format (e.g. "C4", "Eb3", "F#4").
 * Handles: lowercase letters (c → C3), with octave (c4 → C4), sharps/flats,
 * MIDI numbers (60 → C4), and enharmonic equivalents (d# → Eb).
 */
function normalizeNoteName(name: string): string {
  if (!name) return name;

  // Strip mini-notation suffixes like @2, !3, *4, /2 from individual tokens
  const cleaned = name.replace(/[*/@!]\d+$/, "");

  // Check if it's a MIDI number
  const midiNum = Number(cleaned);
  if (!isNaN(midiNum) && midiNum >= 0 && midiNum <= 127) {
    return midiToNoteName(midiNum);
  }

  // Letter note: match note letter, optional sharp/flat, optional octave
  const noteMatch = cleaned.match(/^([a-gA-G])([#b]?)(\d?)$/);
  if (!noteMatch) return cleaned;

  const letter = noteMatch[1].toUpperCase();
  const accidental = noteMatch[2];
  const octave = noteMatch[3] || "3"; // Strudel default octave is 3

  // Build raw note name
  const rawNote = `${letter}${accidental}${octave}`;

  // Map enharmonic equivalents to match our MELODIC_NOTES
  return mapEnharmonic(rawNote);
}

/** Map of enharmonic equivalents to what MELODIC_NOTES uses */
const ENHARMONIC_MAP: Record<string, string> = {
  Db: "C#",
  "D#": "Eb",
  Gb: "F#",
  "G#": "Ab",
  "A#": "Bb",
};

function mapEnharmonic(note: string): string {
  // Split into name + octave
  const match = note.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) return note;
  const [, name, octave] = match;
  const mapped = ENHARMONIC_MAP[name];
  return mapped ? `${mapped}${octave}` : note;
}

/** Convert MIDI note number to note name (e.g. 60 → C4) */
const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const noteIdx = midi % 12;
  return `${NOTE_NAMES[noteIdx]}${octave}`;
}

/**
 * Strip mini-notation modifiers that aren't note data:
 * angle brackets <...>, repetition *N, slow /N, elongate @N, replicate !N
 */
function stripMiniModifiers(pattern: string): string {
  let result = pattern;
  // Remove angle brackets (alternation): <a b c> → a b c
  result = result.replace(/<([^>]+)>/g, "$1");
  // Remove square bracket wrappers BUT preserve chord brackets [c4,e4] (contain commas)
  result = result.replace(/\[([^\],]+)\]/g, "$1");
  // Remove repetition/speed/elongate/replicate suffixes on groups
  result = result.replace(/[*/@!]\d+/g, "");
  return result;
}

function generateParserId(): string {
  return `imported-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Scale degree → note conversion ---

const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  "minor:pentatonic": [0, 3, 5, 7, 10],
  "major:pentatonic": [0, 2, 4, 7, 9],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

const ROOT_NOTE_MAP: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

function scaleDegreeToMidi(degree: number, scaleStr: string): number | null {
  // Parse scale: "C:minor", "A2:minor:pentatonic", "C4:major"
  const parts = scaleStr.split(":");
  const rootPart = parts[0];
  const scaleType = parts.slice(1).join(":") || "major";

  // Extract root note and octave
  const rootMatch = rootPart.match(/^([A-Ga-g][#b]?)(\d?)$/);
  if (!rootMatch) return null;

  const rootName = rootMatch[1].charAt(0).toUpperCase() + rootMatch[1].slice(1);
  const rootOctave = rootMatch[2] ? parseInt(rootMatch[2]) : 3;
  const rootMidi = ROOT_NOTE_MAP[rootName];
  if (rootMidi === undefined) return null;

  const intervals = SCALE_INTERVALS[scaleType.toLowerCase()];
  if (!intervals) return null;

  const scaleLen = intervals.length;
  const octaveOffset = Math.floor(degree / scaleLen);
  let idx = degree % scaleLen;
  if (idx < 0) idx += scaleLen;

  const midi =
    (rootOctave + 1) * 12 + rootMidi + intervals[idx] + octaveOffset * 12;
  return midi;
}

function parseScaleTrack(
  pattern: string,
  degreePattern: string,
  scaleStr: string,
): Track {
  const soundMatch =
    pattern.match(/\.s\(["'`]([^"'`]+)["'`]\)/) ??
    pattern.match(/\.sound\(["'`]([^"'`]+)["'`]\)/);
  const gainMatch = pattern.match(/\.gain\(([\d.]+)\)/);

  const sound = soundMatch?.[1] ?? "triangle";
  const volume = gainMatch ? parseFloat(gainMatch[1]) : 1;

  const cleaned = stripMiniModifiers(degreePattern);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const allNotes = [...MELODIC_NOTES];
  const rows = allNotes;

  const steps: Step[][] = rows.map(() =>
    Array.from({ length: DEFAULT_STEP_COUNT }, () => ({
      active: false,
      velocity: 1,
    })),
  );

  for (let col = 0; col < Math.min(tokens.length, DEFAULT_STEP_COUNT); col++) {
    const token = tokens[col].replace(/[*/@!]\d+$/, "");
    if (token === "~" || token === "-") continue;

    // Handle chords [0,2,4]
    const chordMatch = token.match(/^\[([^\]]+)\]$/);
    const degrees = chordMatch ? chordMatch[1].split(",") : [token];

    for (const degStr of degrees) {
      const deg = parseInt(degStr.trim());
      if (isNaN(deg)) continue;
      const midi = scaleDegreeToMidi(deg, scaleStr);
      if (midi === null) continue;
      const noteName = midiToNoteName(midi);
      const rowIdx = rows.findIndex(
        (r) => r.toLowerCase() === noteName.toLowerCase(),
      );
      if (rowIdx >= 0) {
        steps[rowIdx][col] = { active: true, velocity: 1 };
      }
    }
  }

  return {
    id: generateParserId(),
    name: `Melodic`,
    type: "melodic",
    sound,
    bank: "",
    steps,
    rows: [...rows],
    muted: false,
    solo: false,
    volume,
    effects: { ...DEFAULT_EFFECTS },
  };
}

/**
 * Split a string by commas at the top level (respecting parentheses and quotes).
 */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let quoteChar = "";
  let current = "";

  for (const ch of input) {
    if (inQuote) {
      current += ch;
      if (ch === quoteChar) inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inQuote = true;
      quoteChar = ch;
      current += ch;
      continue;
    }
    if (ch === "(" || ch === "[") {
      depth++;
      current += ch;
      continue;
    }
    if (ch === ")" || ch === "]") {
      depth--;
      current += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
