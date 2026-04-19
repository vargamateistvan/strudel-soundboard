import type { Project, Track } from "../types";

/**
 * Converts the project state into a Strudel code string for live playback.
 * Uses stack() to layer all unmuted tracks.
 */
export function buildPatternCode(project: Project): string {
  const { bpm, tracks } = project;
  const cps = bpm / 60 / 4; // cycles per second (1 cycle = 1 bar of 4 beats)

  const soloedTracks = tracks.filter((t) => t.solo);
  const activeTracks =
    soloedTracks.length > 0 ? soloedTracks : tracks.filter((t) => !t.muted);

  if (activeTracks.length === 0) return "";

  const patterns = activeTracks
    .map((t) => buildTrackPattern(t))
    .filter(Boolean);
  if (patterns.length === 0) return "";

  const lines = [`setcps(${cps})`];
  if (patterns.length === 1) {
    lines.push(patterns[0]!);
  } else {
    lines.push(`stack(\n  ${patterns.join(",\n  ")}\n)`);
  }
  return lines.join("\n");
}

function buildTrackPattern(track: Track): string | null {
  if (track.type === "drums") {
    return buildDrumPattern(track);
  }
  return buildMelodicPattern(track);
}

function buildDrumPattern(track: Track): string | null {
  const rowPatterns: string[] = [];

  for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
    const row = track.steps[rowIdx];
    if (!row) continue;
    const hasActive = row.some((s) => s.active);
    if (!hasActive) continue;

    const drumName = track.rows[rowIdx];
    const stepStrs = row.map((s) => (s.active ? drumName : "~"));
    rowPatterns.push(`s("${stepStrs.join(" ")}")`);
  }

  if (rowPatterns.length === 0) return null;

  let pattern: string;
  if (rowPatterns.length === 1) {
    pattern = rowPatterns[0];
  } else {
    pattern = `stack(\n    ${rowPatterns.join(",\n    ")}\n  )`;
  }

  if (track.bank) {
    pattern += `.bank("${track.bank}")`;
  }
  if (track.volume !== 1) {
    pattern += `.gain(${track.volume.toFixed(2)})`;
  }
  return pattern;
}

function buildMelodicPattern(track: Track): string | null {
  const stepCount = track.steps[0]?.length ?? 0;
  const stepNotes: string[] = [];

  for (let col = 0; col < stepCount; col++) {
    const notesInStep: string[] = [];
    for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
      if (track.steps[rowIdx]?.[col]?.active) {
        notesInStep.push(track.rows[rowIdx].toLowerCase());
      }
    }
    if (notesInStep.length === 0) {
      stepNotes.push("~");
    } else if (notesInStep.length === 1) {
      stepNotes.push(notesInStep[0]);
    } else {
      stepNotes.push(`[${notesInStep.join(",")}]`);
    }
  }

  if (stepNotes.every((n) => n === "~")) return null;

  let pattern = `note("${stepNotes.join(" ")}").s("${track.sound}")`;
  if (track.volume !== 1) {
    pattern += `.gain(${track.volume.toFixed(2)})`;
  }
  return pattern;
}
