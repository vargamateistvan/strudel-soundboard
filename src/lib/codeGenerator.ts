import type { Project, Track } from "../types";

/**
 * Export project as Strudel mini-notation (pasteable into strudel.cc REPL)
 */
export function toMiniNotation(project: Project): string {
  const { bpm, tracks } = project;
  const cps = bpm / 60 / 4;
  const lines: string[] = [`setcps(${cps})`];

  const trackCodes = tracks
    .map((t) => trackToMiniNotation(t))
    .filter(Boolean) as string[];

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

  for (let rowIdx = 0; rowIdx < track.rows.length; rowIdx++) {
    const row = track.steps[rowIdx];
    if (!row || !row.some((s) => s.active)) continue;
    const drumName = track.rows[rowIdx];
    const steps = row.map((s) => (s.active ? drumName : "~")).join(" ");
    rowPatterns.push(steps);
  }

  if (rowPatterns.length === 0) return null;

  const inner =
    rowPatterns.length === 1 ? rowPatterns[0] : rowPatterns.join(", ");

  let code = `s("${inner}")`;
  if (track.bank) code += `.bank("${track.bank}")`;
  if (track.volume !== 1) code += `.gain(${track.volume.toFixed(2)})`;
  return code;
}

function melodicTrackMini(track: Track): string | null {
  const stepCount = track.steps[0]?.length ?? 0;
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
