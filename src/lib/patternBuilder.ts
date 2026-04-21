import type { Project, Track, TrackEffects, TrackModifiers } from "../types";
import { DEFAULT_EFFECTS } from "../types";

/**
 * Converts the project state into a Strudel code string for live playback.
 * Uses stack() to layer all unmuted tracks, and cat() for chained tracks.
 */
export function buildPatternCode(project: Project): string {
  const { bpm, tracks } = project;
  const cps = bpm / 60 / 4; // cycles per second (1 cycle = 1 bar of 4 beats)

  const soloedTracks = tracks.filter((t) => t.solo);
  const hasSolo = soloedTracks.length > 0;

  if (hasSolo && soloedTracks.length === 0) return "";

  // Group chains from ALL tracks (not just active), so muting the root doesn't break the chain
  const chainedIds = new Set(
    tracks.filter((t) => t.chainedWith).map((t) => t.id),
  );
  const patternCodes: string[] = [];

  for (const track of tracks) {
    if (chainedIds.has(track.id)) continue; // handled with its chain root
    const children = tracks.filter((t) => t.chainedWith === track.id);

    const isTrackActive = (t: Track) => (hasSolo ? t.solo : !t.muted);

    if (children.length > 0) {
      const group = [track, ...children];
      // Check if any track in the chain is active
      if (!group.some(isTrackActive)) continue;

      const groupEntries = group.map((t) => {
        const weight = t.loopLength ?? project.stepCount;
        const pattern = isTrackActive(t) ? buildTrackPattern(t) : null;
        // Muted tracks become silence but keep their time slot
        const code = pattern ?? `silence`;
        return { weight, code };
      });
      if (groupEntries.length === 1) {
        if (isTrackActive(group[0])) {
          const p = buildTrackPattern(group[0]);
          if (p) patternCodes.push(p);
        }
      } else {
        const entries = groupEntries.map((e) => `[${e.weight}, ${e.code}]`);
        patternCodes.push(`timeCat(\n    ${entries.join(",\n    ")}\n  )`);
      }
    } else {
      if (!isTrackActive(track)) continue;
      const code = buildTrackPattern(track);
      if (code) patternCodes.push(code);
    }
  }

  if (patternCodes.length === 0) return "";

  const lines = [`setcps(${cps})`];
  if (patternCodes.length === 1) {
    lines.push(patternCodes[0]!);
  } else {
    lines.push(`stack(\n  ${patternCodes.join(",\n  ")}\n)`);
  }

  // Apply swing
  const swing = project.swing ?? 0;
  if (swing > 0) {
    // Wrap in .swing(amount)
    const last = lines.length - 1;
    lines[last] = lines[last] + `.swing(${swing.toFixed(2)})`;
  }

  return lines.join("\n");
}

function buildTrackPattern(track: Track): string | null {
  let pattern: string | null;
  if (track.type === "drums") {
    pattern = buildDrumPattern(track);
  } else {
    // Both "melodic" and "piano" use note-based patterns
    pattern = buildMelodicPattern(track);
  }
  if (pattern && track.modifiers) {
    pattern += buildModifiersChain(track.modifiers);
  }
  return pattern;
}

function buildDrumPattern(track: Track): string | null {
  const rowPatterns: string[] = [];
  const len = track.loopLength ?? track.steps[0]?.length ?? 0;

  for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
    const row = track.steps[rowIdx];
    if (!row) continue;
    const sliced = row.slice(0, len);
    const hasActive = sliced.some((s) => s.active);
    if (!hasActive) continue;

    const drumName = track.rows[rowIdx];
    const stepStrs = sliced.map((s) => {
      if (!s.active) return "~";
      const prob = s.probability ?? 1;
      return prob < 1 ? `${drumName}?${prob.toFixed(2)}` : drumName;
    });
    const hasVelocity = sliced.some((s) => s.active && s.velocity !== 1);
    let rp = `s("${stepStrs.join(" ")}")`;
    if (hasVelocity) {
      const velStrs = sliced.map((s) =>
        s.active ? s.velocity.toFixed(1) : "1",
      );
      rp += `.velocity("${velStrs.join(" ")}")`;
    }
    rowPatterns.push(rp);
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
  pattern += buildEffectsChain(track.effects);
  return pattern;
}

function buildMelodicPattern(track: Track): string | null {
  const totalSteps = track.steps[0]?.length ?? 0;
  const stepCount = track.loopLength ?? totalSteps;
  const stepNotes: string[] = [];

  for (let col = 0; col < stepCount; col++) {
    const notesInStep: string[] = [];
    for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
      const step = track.steps[rowIdx]?.[col];
      if (step?.active) {
        const note = track.rows[rowIdx].toLowerCase();
        const prob = step.probability ?? 1;
        notesInStep.push(prob < 1 ? `${note}?${prob.toFixed(2)}` : note);
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

  // Per-step velocity
  const stepVels: number[] = [];
  for (let col = 0; col < stepCount; col++) {
    let vel = 1;
    for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
      const step = track.steps[rowIdx]?.[col];
      if (step?.active && step.velocity !== 1) {
        vel = step.velocity;
        break;
      }
    }
    stepVels.push(vel);
  }
  if (stepVels.some((v) => v !== 1)) {
    pattern += `.velocity("${stepVels.map((v) => v.toFixed(1)).join(" ")}")`;
  }

  if (track.volume !== 1) {
    pattern += `.gain(${track.volume.toFixed(2)})`;
  }
  pattern += buildEffectsChain(track.effects);
  return pattern;
}

function buildEffectsChain(fx: TrackEffects | undefined): string {
  if (!fx) return "";
  const d = DEFAULT_EFFECTS;
  let chain = "";
  if (fx.delay > 0) {
    chain += `.delay(${fx.delay.toFixed(2)}).delaytime(${fx.delaytime.toFixed(2)})`;
  }
  if (fx.room > 0) {
    chain += `.room(${fx.room.toFixed(2)})`;
  }
  if (fx.lpf < d.lpf) {
    chain += `.lpf(${Math.round(fx.lpf)})`;
  }
  if ((fx.hpf ?? 20) > 20) {
    chain += `.hpf(${Math.round(fx.hpf)})`;
  }
  if (fx.distort > 0) {
    chain += `.distort(${fx.distort.toFixed(2)})`;
  }
  if (fx.crush > 0) {
    chain += `.crush(${fx.crush})`;
  }
  if ((fx.pan ?? 0.5) !== 0.5) {
    chain += `.pan(${fx.pan.toFixed(2)})`;
  }
  return chain;
}

function buildModifiersChain(mod: TrackModifiers): string {
  let chain = "";
  if (mod.reverse) {
    chain += ".rev()";
  }
  if (mod.speed !== 1 && mod.speed > 0) {
    if (mod.speed < 1) {
      chain += `.slow(${(1 / mod.speed).toFixed(2)})`;
    } else {
      chain += `.fast(${mod.speed.toFixed(2)})`;
    }
  }
  if (mod.probability < 1 && mod.probability >= 0) {
    chain += `.degradeBy(${(1 - mod.probability).toFixed(2)})`;
  }
  if (mod.every) {
    const inner =
      mod.every.mod === "reverse"
        ? "x => x.rev()"
        : mod.every.mod === "double"
          ? "x => x.fast(2)"
          : "x => x.slow(2)";
    chain += `.every(${mod.every.n}, ${inner})`;
  }
  return chain;
}
