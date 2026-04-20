# Strudel Soundboard

A browser-based step sequencer and music workstation powered by [Strudel](https://strudel.cc/). Create drum patterns, melodies, and full arrangements with an intuitive grid interface — no coding required. Export your creations as Strudel code or standalone HTML files.

**[Try it live →](https://vargamateistvan.github.io/strudel-soundboard/)**

## Features

### Sequencing

- **Multi-track editor** — add unlimited tracks, drag to reorder
- **Track types** — drums, synths (sine/saw/square/triangle), piano, guitar, and more melodic instruments (harp, marimba, glockenspiel, kalimba)
- **Step grid** — click or drag to paint notes; mouse wheel to adjust velocity (1–9)
- **Configurable grid** — 16 or 32 steps per pattern
- **Per-track loop length** — mix different pattern lengths in the same project
- **Drum banks** — Roland TR-808, TR-909, CR-78, Akai Linn, RhythmAce, ViscoSpaceDrum
- **15 drum sounds** — bd, sd, hh, oh, cp, rim, cr, rd, ht, mt, lt, cb, tb, sh, perc
- **Melodic range** — two octaves (C3–C5) with piano roll

### Effects & Modifiers

- **Effects** — delay, delay time, reverb, low-pass filter, high-pass filter, distortion, bit crush, pan
- **Modifiers** — reverse, speed (0.25×–4×), probability, every-N pattern transforms

### Transport & Recording

- **BPM** (30–300) and **swing** controls
- **Mute / solo / volume** per track
- **Record to MP3** directly in the browser

### Export & Import

- **Strudel mini-notation** — copy to the [Strudel REPL](https://strudel.cc/) or open it directly
- **Standalone HTML** — self-contained playable file with play/stop buttons
- **Project files** — save/load `.strudel.json` files (also persisted in localStorage)
- **Import** — paste mini-notation or HTML exports back into the editor

### Presets

Six built-in templates to get started quickly: Basic Rock, Hip Hop, Four on the Floor, Breakbeat, Reggaeton, Trap.

### UI

- **Real-time visualizer** — bars, spectrum (FFT), or waveform modes
- **Code preview** — see the generated Strudel code as you edit
- **Undo / redo** — Ctrl+Z / Ctrl+Shift+Z
- **Keyboard shortcuts** — Space (play/stop), arrow keys (navigate grid), numbers (set velocity)
- **Theme switching** with localStorage persistence

## Tech Stack

| Layer        | Technology                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| UI           | React 19, TypeScript 6                                                     |
| Audio engine | [@strudel/web](https://www.npmjs.com/package/@strudel/web) (Web Audio API) |
| MP3 encoding | [lamejs](https://github.com/niclasmattsson/lamejs)                         |
| Build        | Vite 8                                                                     |
| Deploy       | GitHub Pages via [gh-pages](https://www.npmjs.com/package/gh-pages)        |

## Architecture

```
src/
├── components/       UI components (App, StepGrid, Track, Toolbar, …)
├── hooks/
│   ├── useStrudel.ts   Strudel engine init, evaluate, play/stop
│   ├── useTracks.ts    Project state, undo/redo, track CRUD
│   ├── useRecorder.ts  MP3 recording via ScriptProcessorNode + lamejs
│   └── useAnalyser.ts  AnalyserNode for visualizer
├── lib/
│   ├── codeGenerator.ts  Project → mini-notation / HTML / live code
│   ├── codeParser.ts     Mini-notation / HTML → Project (import)
│   ├── patternBuilder.ts Track → Strudel method chain
│   ├── audioTap.ts       Monkey-patches AudioNode.connect for viz/recording
│   ├── constants.ts      Sounds, notes, colors
│   ├── presets.ts         Built-in pattern templates
│   └── projectSerializer.ts  localStorage + file I/O
└── types/
    └── index.ts          Track, Step, Project, Effects, Modifiers types
```

**Audio pipeline:** project state → `buildPatternCode()` → Strudel `evaluate()` → Web Audio API → audio tap splits signal to speakers + analyser (visualizer) + recorder (MP3).

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173/strudel-soundboard/](http://localhost:5173/strudel-soundboard/).

### Available Scripts

| Script            | Description                             |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Start dev server with HMR               |
| `npm run build`   | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally    |
| `npm run lint`    | Run ESLint                              |
| `npm run deploy`  | Build and deploy to GitHub Pages        |

## Deployment

The app deploys to GitHub Pages with a base path of `/strudel-soundboard/`:

```bash
npm run deploy
```

This runs `vite build` then publishes the `dist/` folder via the `gh-pages` package.

## License

MIT
