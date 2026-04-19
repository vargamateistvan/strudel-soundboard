# Strudel Soundboard

A browser-based DAW / soundboard built with React, Vite, and [Strudel](https://strudel.cc/) for live-coding music.

## Tech Stack

- **React 19** + **TypeScript 6** + **Vite 8**
- **@strudel/web** — headless Strudel audio engine (evaluate, hush, samples)
- **yarn** as the package manager
- Deployed to **GitHub Pages** via GitHub Actions

## Project Structure

```
src/
├── components/       # React UI components
│   ├── App.tsx           # Root layout, play/stop, keyboard shortcuts
│   ├── Toolbar.tsx       # BPM, step count, play/stop, import/export buttons
│   ├── TrackList.tsx     # Renders all tracks with add-track buttons
│   ├── Track.tsx         # Single track (header + grid)
│   ├── TrackHeader.tsx   # Name, sound/bank selectors, mute/solo, volume
│   ├── StepGrid.tsx      # Clickable step sequencer grid
│   ├── CodePreview.tsx   # Live Strudel code preview panel
│   ├── ExportModal.tsx   # Export as mini-notation or standalone HTML
│   ├── ImportModal.tsx   # Import from Strudel code
│   └── App.css           # Dark DAW theme styles
├── hooks/
│   ├── useStrudel.ts     # Strudel engine init, play, stop (module-level singleton)
│   └── useTracks.ts      # Track state management via useReducer
├── lib/
│   ├── constants.ts      # Drum sounds, synths, banks, notes, colors
│   ├── patternBuilder.ts # Converts project state → Strudel code string
│   ├── codeGenerator.ts  # Export formatters (mini-notation, standalone JS)
│   └── codeParser.ts     # Import parser (regex-based, best-effort)
├── types/
│   └── index.ts          # Project, Track, Step, ParseResult types
└── main.tsx              # Entry point
```

## Commands

| Command        | Description                      |
| -------------- | -------------------------------- |
| `yarn install` | Install dependencies             |
| `yarn dev`     | Start dev server (Vite)          |
| `yarn build`   | Type-check + production build    |
| `yarn lint`    | Run ESLint                       |
| `yarn preview` | Preview production build locally |
| `yarn deploy`  | Build and deploy to GitHub Pages |

## Strudel Integration

- **Initialization**: `useStrudel.ts` uses a module-level singleton (`ensureStrudel()`) that calls `initStrudel()` once, then captures `evaluate` and `hush` from the `@strudel/web` module exports.
- **Drum samples**: Loaded via `samples('github:tidalcycles/dirt-samples')` after init. Audio files are lazy-loaded from the CDN on first play.
- **Pattern evaluation**: `buildPatternCode()` converts the project state into Strudel mini-notation, then `evaluate()` sends it to the audio engine.
- **Live updates**: When tracks change during playback, the pattern is automatically re-evaluated.
- **Stop**: Uses the module-level `hush` export (not `window.hush`).

## Key Conventions

- Dark theme UI styled to resemble a DAW (Logic Pro inspired)
- Two-column layout: tracks on the left, code preview on the right
- Drum tracks use `s("bd ~ bd ~")` pattern syntax
- Melodic tracks use `note("c4 e4 ~ g4").s("triangle")` syntax
- `stack()` layers multiple tracks; `setcps(bpm/60/4)` sets tempo
- Space bar toggles play/stop

## Deployment

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`) which builds and deploys to GitHub Pages. The Vite `base` is set to `/strudel-soundboard/`.
