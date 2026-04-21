import type { Project, Track, TrackEffects, TrackModifiers } from "../types";
import { DEFAULT_EFFECTS } from "../types";

/**
 * Export project as Strudel mini-notation (pasteable into strudel.cc REPL)
 */
export function toMiniNotation(project: Project): string {
  const { bpm, tracks } = project;
  const cps = bpm / 60 / 4;
  const lines: string[] = [`setcps(${cps})`];

  // Group tracks into chains (sequential) and standalone
  const chainedIds = new Set(
    tracks.filter((t) => t.chainedWith).map((t) => t.id),
  );
  const trackCodes: string[] = [];

  for (const track of tracks) {
    if (chainedIds.has(track.id)) continue; // handled as part of a chain group
    const children = tracks.filter((t) => t.chainedWith === track.id);
    if (children.length > 0) {
      // This is a chain root — collect all chain members
      const group = [track, ...children];
      const groupCodes = group
        .map((t) => trackToMiniNotation(t))
        .filter(Boolean) as string[];
      if (groupCodes.length > 0) {
        if (groupCodes.length === 1) {
          trackCodes.push(groupCodes[0]);
        } else {
          trackCodes.push(`cat(\n    ${groupCodes.join(",\n    ")}\n  )`);
        }
      }
    } else {
      const code = trackToMiniNotation(track);
      if (code) trackCodes.push(code);
    }
  }

  if (trackCodes.length === 0) {
    lines.push("// No active patterns");
    return lines.join("\n");
  }

  if (trackCodes.length === 1) {
    lines.push(trackCodes[0]);
  } else {
    lines.push(`stack(\n  ${trackCodes.join(",\n  ")}\n)`);
  }

  return lines.join("\n");
}

function trackToMiniNotation(track: Track): string | null {
  if (track.muted) return null;
  if (track.type === "drums") return drumTrackMini(track);
  return melodicTrackMini(track);
}

function drumTrackMini(track: Track): string | null {
  const rowPatterns: string[] = [];
  const len = track.loopLength ?? track.steps[0]?.length ?? 0;

  for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
    const row = track.steps[rowIdx];
    if (!row) continue;
    const sliced = row.slice(0, len);
    if (!sliced.some((s) => s.active)) continue;
    const drumName = track.rows[rowIdx];
    const steps = sliced.map((s) => (s.active ? drumName : "~")).join(" ");
    rowPatterns.push(steps);
  }

  if (rowPatterns.length === 0) return null;

  const inner =
    rowPatterns.length === 1 ? rowPatterns[0] : rowPatterns.join(", ");

  let code = `s("${inner}")`;
  if (track.bank) code += `.bank("${track.bank}")`;
  if (track.volume !== 1) code += `.gain(${track.volume.toFixed(2)})`;
  code += buildEffectsChain(track.effects);
  if (track.modifiers) code += buildModifiersChain(track.modifiers);
  return code;
}

function melodicTrackMini(track: Track): string | null {
  const stepCount = track.loopLength ?? track.steps[0]?.length ?? 0;
  const stepNotes: string[] = [];

  for (let col = 0; col < stepCount; col++) {
    const notes: string[] = [];
    for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
      if (track.steps[rowIdx]?.[col]?.active) {
        notes.push(track.rows[rowIdx].toLowerCase());
      }
    }
    if (notes.length === 0) stepNotes.push("~");
    else if (notes.length === 1) stepNotes.push(notes[0]);
    else stepNotes.push(`[${notes.join(",")}]`);
  }

  if (stepNotes.every((n) => n === "~")) return null;

  let code = `note("${stepNotes.join(" ")}").s("${track.sound}")`;
  if (track.volume !== 1) code += `.gain(${track.volume.toFixed(2)})`;
  code += buildEffectsChain(track.effects);
  if (track.modifiers) code += buildModifiersChain(track.modifiers);
  return code;
}

/**
 * Export project as standalone HTML + @strudel/web JS
 */
export function toJavaScript(project: Project): string {
  const miniCode = toMiniNotation(project);
  const escaped = miniCode.replace(/`/g, "\\`");

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Strudel Soundboard Export</title>
  <script src="https://unpkg.com/@strudel/web@latest"><\/script>
</head>
<body>
  <button id="play">▶ Play</button>
  <button id="stop">⏹ Stop</button>
  <script>
    const code = \`${escaped}\`;
    initStrudel();
    document.getElementById('play').addEventListener('click', async () => {
      const { evaluate } = await initStrudel();
      await evaluate(code);
    });
    document.getElementById('stop').addEventListener('click', () => hush());
  <\/script>
</body>
</html>`;
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
