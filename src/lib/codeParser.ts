import type { Track, Step, ParseResult } from "../types";
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

  // Extract stack contents or single pattern
  let patternBodies: string[] = [];
  const stackMatch = code.match(/stack\(\s*([\s\S]*)\s*\)/);
  if (stackMatch) {
    patternBodies = splitTopLevel(stackMatch[1]);
  } else {
    // Find all s("...") or note("...") calls outside of setcps
    const cleaned = code.replace(/setcps\([^)]*\)\s*\n?/, "");
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
    project: { bpm, stepCount: DEFAULT_STEP_COUNT, tracks },
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
  // Detect drum vs melodic
  const sMatch = pattern.match(/^s\("([^"]+)"\)/);
  const noteMatch = pattern.match(/^note\("([^"]+)"\)/);

  if (sMatch) {
    return parseDrumTrack(pattern, sMatch[1]);
  }
  if (noteMatch) {
    return parseMelodicTrack(pattern, noteMatch[1]);
  }
  return null;
}

let trackIdCounter = 1;

function parseDrumTrack(pattern: string, innerPattern: string): Track {
  const bankMatch = pattern.match(/\.bank\("([^"]+)"\)/);
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
    id: `imported-${trackIdCounter++}`,
    name: `Drums ${trackIdCounter - 1}`,
    type: "drums",
    sound: rows[0] ?? "bd",
    bank,
    steps,
    rows,
    muted: false,
    solo: false,
    volume,
  };
}

function parseMelodicTrack(pattern: string, notePattern: string): Track {
  const soundMatch = pattern.match(/\.s\("([^"]+)"\)/);
  const gainMatch = pattern.match(/\.gain\(([\d.]+)\)/);

  const sound = soundMatch?.[1] ?? "triangle";
  const volume = gainMatch ? parseFloat(gainMatch[1]) : 1;

  const tokens = notePattern.split(/\s+/);
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
    id: `imported-${trackIdCounter++}`,
    name: `Melodic ${trackIdCounter - 1}`,
    type: "melodic",
    sound,
    bank: "",
    steps,
    rows: [...rows],
    muted: false,
    solo: false,
    volume,
  };
}

function normalizeNoteName(name: string): string {
  // Capitalize first letter, handle sharp/flat
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
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
