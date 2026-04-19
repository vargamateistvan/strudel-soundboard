import { useReducer, useCallback, useEffect, useRef } from "react";
import type {
  Project,
  Track,
  Step,
  TrackEffects,
  TrackModifiers,
} from "../types";
import { DEFAULT_EFFECTS, DEFAULT_MODIFIERS } from "../types";
import {
  DEFAULT_BPM,
  DEFAULT_STEP_COUNT,
  DEFAULT_DRUM_ROWS,
  MELODIC_NOTES,
} from "../lib/constants";
import { autoSave, autoLoad } from "../lib/projectSerializer";

function createEmptySteps(rowCount: number, stepCount: number): Step[][] {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: stepCount }, () => ({ active: false, velocity: 1 })),
  );
}

let nextId = 1;

/** Ensure nextId is higher than any existing track ID to prevent collisions */
function syncNextId(tracks: { id: string }[]) {
  for (const t of tracks) {
    const m = t.id.match(/^track-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= nextId) nextId = n + 1;
    }
  }
}

function createDrumTrack(stepCount: number): Track {
  const rows = [...DEFAULT_DRUM_ROWS];
  return {
    id: `track-${nextId++}`,
    name: `Drums ${nextId - 1}`,
    type: "drums",
    sound: "bd",
    bank: "",
    steps: createEmptySteps(rows.length, stepCount),
    rows,
    muted: false,
    solo: false,
    volume: 1,
    effects: { ...DEFAULT_EFFECTS },
  };
}

function createMelodicTrack(stepCount: number): Track {
  const rows = [...MELODIC_NOTES];
  return {
    id: `track-${nextId++}`,
    name: `Synth ${nextId - 1}`,
    type: "melodic",
    sound: "triangle",
    bank: "",
    steps: createEmptySteps(rows.length, stepCount),
    rows,
    muted: false,
    solo: false,
    volume: 1,
    effects: { ...DEFAULT_EFFECTS },
  };
}

type Action =
  | { type: "ADD_TRACK"; trackType: "drums" | "melodic" }
  | { type: "REMOVE_TRACK"; trackId: string }
  | { type: "TOGGLE_STEP"; trackId: string; row: number; col: number }
  | {
      type: "SET_STEP";
      trackId: string;
      row: number;
      col: number;
      active: boolean;
    }
  | { type: "SET_SOUND"; trackId: string; sound: string }
  | { type: "SET_BANK"; trackId: string; bank: string }
  | { type: "TOGGLE_MUTE"; trackId: string }
  | { type: "TOGGLE_SOLO"; trackId: string }
  | { type: "SET_VOLUME"; trackId: string; volume: number }
  | { type: "SET_BPM"; bpm: number }
  | { type: "SET_STEP_COUNT"; stepCount: number }
  | { type: "SET_TRACK_NAME"; trackId: string; name: string }
  | { type: "ADD_DRUM_ROW"; trackId: string; drumSound: string }
  | { type: "REMOVE_DRUM_ROW"; trackId: string; rowIndex: number }
  | { type: "IMPORT_PROJECT"; project: Project }
  | { type: "ADD_PRESET_TRACKS"; tracks: import("../types").Track[] }
  | { type: "REORDER_TRACKS"; fromIndex: number; toIndex: number }
  | { type: "DUPLICATE_TRACK"; trackId: string }
  | {
      type: "SET_VELOCITY";
      trackId: string;
      row: number;
      col: number;
      velocity: number;
    }
  | { type: "SET_EFFECTS"; trackId: string; effects: Partial<TrackEffects> }
  | {
      type: "SET_MODIFIERS";
      trackId: string;
      modifiers: Partial<TrackModifiers>;
    }
  | { type: "SET_SWING"; swing: number }
  | {
      type: "INSERT_TRACK_AFTER";
      afterTrackId: string;
      trackType: "drums" | "melodic";
    }
  | { type: "SET_LOOP_LENGTH"; trackId: string; loopLength: number | undefined }
  | { type: "SHIFT_PATTERN"; trackId: string; direction: 1 | -1 }
  | { type: "RANDOMIZE_PATTERN"; trackId: string; density: number }
  | { type: "CLEAR_TRACK"; trackId: string }
  | { type: "REVERSE_STEPS"; trackId: string }
  | { type: "UNDO" }
  | { type: "REDO" };

function reducer(state: Project, action: Action): Project {
  switch (action.type) {
    case "ADD_TRACK": {
      const track =
        action.trackType === "drums"
          ? createDrumTrack(state.stepCount)
          : createMelodicTrack(state.stepCount);
      return { ...state, tracks: [...state.tracks, track] };
    }

    case "REMOVE_TRACK":
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.trackId),
      };

    case "TOGGLE_STEP":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          const newSteps = t.steps.map((row, ri) =>
            ri === action.row
              ? row.map((step, ci) =>
                  ci === action.col ? { ...step, active: !step.active } : step,
                )
              : row,
          );
          return { ...t, steps: newSteps };
        }),
      };

    case "SET_STEP":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          const newSteps = t.steps.map((row, ri) =>
            ri === action.row
              ? row.map((step, ci) =>
                  ci === action.col ? { ...step, active: action.active } : step,
                )
              : row,
          );
          return { ...t, steps: newSteps };
        }),
      };

    case "SET_SOUND":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, sound: action.sound } : t,
        ),
      };

    case "SET_BANK":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, bank: action.bank } : t,
        ),
      };

    case "TOGGLE_MUTE":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, muted: !t.muted } : t,
        ),
      };

    case "TOGGLE_SOLO":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, solo: !t.solo } : t,
        ),
      };

    case "SET_VOLUME":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, volume: action.volume } : t,
        ),
      };

    case "SET_BPM":
      return { ...state, bpm: action.bpm };

    case "SET_STEP_COUNT":
      return {
        ...state,
        stepCount: action.stepCount,
        tracks: state.tracks.map((t) => ({
          ...t,
          steps: t.steps.map((row) => {
            if (row.length >= action.stepCount)
              return row.slice(0, action.stepCount);
            return [
              ...row,
              ...Array.from({ length: action.stepCount - row.length }, () => ({
                active: false,
                velocity: 1,
              })),
            ];
          }),
        })),
      };

    case "SET_TRACK_NAME":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, name: action.name } : t,
        ),
      };

    case "ADD_DRUM_ROW":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId || t.type !== "drums") return t;
          if (t.rows.includes(action.drumSound)) return t;
          return {
            ...t,
            rows: [...t.rows, action.drumSound],
            steps: [
              ...t.steps,
              Array.from({ length: state.stepCount }, () => ({
                active: false,
                velocity: 1,
              })),
            ],
          };
        }),
      };

    case "REMOVE_DRUM_ROW":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId || t.type !== "drums") return t;
          if (t.rows.length <= 1) return t;
          return {
            ...t,
            rows: t.rows.filter((_, i) => i !== action.rowIndex),
            steps: t.steps.filter((_, i) => i !== action.rowIndex),
          };
        }),
      };

    case "IMPORT_PROJECT":
      syncNextId(action.project.tracks);
      return { ...action.project };

    case "ADD_PRESET_TRACKS":
      syncNextId(action.tracks);
      return {
        ...state,
        tracks: [
          ...state.tracks,
          ...action.tracks.map((t) => ({
            ...t,
            id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          })),
        ],
      };

    case "REORDER_TRACKS": {
      const tracks = [...state.tracks];
      const [moved] = tracks.splice(action.fromIndex, 1);
      tracks.splice(action.toIndex, 0, moved);
      return { ...state, tracks };
    }

    case "DUPLICATE_TRACK": {
      const src = state.tracks.find((t) => t.id === action.trackId);
      if (!src) return state;
      const clone: Track = {
        ...src,
        id: `track-${nextId++}`,
        name: `${src.name} copy`,
        steps: src.steps.map((row) => row.map((s) => ({ ...s }))),
        rows: [...src.rows],
      };
      const idx = state.tracks.findIndex((t) => t.id === action.trackId);
      const tracks = [...state.tracks];
      tracks.splice(idx + 1, 0, clone);
      return { ...state, tracks };
    }

    case "SET_VELOCITY":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          const newSteps = t.steps.map((row, ri) =>
            ri === action.row
              ? row.map((step, ci) =>
                  ci === action.col
                    ? { ...step, velocity: action.velocity }
                    : step,
                )
              : row,
          );
          return { ...t, steps: newSteps };
        }),
      };

    case "SET_EFFECTS":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                effects: {
                  ...(t.effects ?? DEFAULT_EFFECTS),
                  ...action.effects,
                },
              }
            : t,
        ),
      };

    case "SET_MODIFIERS":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId
            ? {
                ...t,
                modifiers: {
                  ...(t.modifiers ?? DEFAULT_MODIFIERS),
                  ...action.modifiers,
                },
              }
            : t,
        ),
      };

    case "SET_SWING":
      return { ...state, swing: action.swing };

    case "INSERT_TRACK_AFTER": {
      const newTrack =
        action.trackType === "drums"
          ? createDrumTrack(state.stepCount)
          : createMelodicTrack(state.stepCount);
      const afterIdx = state.tracks.findIndex(
        (t) => t.id === action.afterTrackId,
      );
      if (afterIdx === -1)
        return { ...state, tracks: [...state.tracks, newTrack] };
      const tracks = [...state.tracks];
      tracks.splice(afterIdx + 1, 0, newTrack);
      return { ...state, tracks };
    }

    case "SET_LOOP_LENGTH":
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.trackId ? { ...t, loopLength: action.loopLength } : t,
        ),
      };

    case "SHIFT_PATTERN":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          const len = t.steps[0]?.length ?? 0;
          if (len === 0) return t;
          return {
            ...t,
            steps: t.steps.map((row) => {
              const shifted = [...row];
              if (action.direction === 1) {
                shifted.unshift(shifted.pop()!);
              } else {
                shifted.push(shifted.shift()!);
              }
              return shifted;
            }),
          };
        }),
      };

    case "RANDOMIZE_PATTERN":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          return {
            ...t,
            steps: t.steps.map((row) =>
              row.map(() => ({
                active: Math.random() < action.density,
                velocity: Math.round((0.5 + Math.random() * 0.5) * 10) / 10,
              })),
            ),
          };
        }),
      };

    case "CLEAR_TRACK":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          return {
            ...t,
            steps: t.steps.map((row) =>
              row.map((s) => ({ ...s, active: false })),
            ),
          };
        }),
      };

    case "REVERSE_STEPS":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          return {
            ...t,
            steps: t.steps.map((row) => [...row].reverse()),
          };
        }),
      };

    default:
      return state;
  }
}

const initialProject: Project = {
  bpm: DEFAULT_BPM,
  stepCount: DEFAULT_STEP_COUNT,
  tracks: [],
  swing: 0,
};

// --- Undo / Redo history wrapper ---

interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
}

const MAX_HISTORY = 50;

function historyReducer(state: HistoryState, action: Action): HistoryState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const prev = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: prev,
      future: [state.present, ...state.future],
    };
  }

  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    };
  }

  const newPresent = reducer(state.present, action);
  if (newPresent === state.present) return state;

  // IMPORT_PROJECT clears history
  if (action.type === "IMPORT_PROJECT") {
    return { past: [], present: newPresent, future: [] };
  }

  return {
    past: [...state.past.slice(-MAX_HISTORY + 1), state.present],
    present: newPresent,
    future: [],
  };
}

function createInitialHistory(): HistoryState {
  const restored = autoLoad();
  if (restored) syncNextId(restored.tracks);
  return {
    past: [],
    present: restored ?? initialProject,
    future: [],
  };
}

export function useTracks() {
  const [history, dispatch] = useReducer(
    historyReducer,
    null,
    createInitialHistory,
  );
  const project = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Auto-save whenever project changes
  useEffect(() => {
    autoSave(project);
  }, [project]);

  const addTrack = useCallback((trackType: "drums" | "melodic") => {
    dispatch({ type: "ADD_TRACK", trackType });
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    dispatch({ type: "REMOVE_TRACK", trackId });
  }, []);

  const toggleStep = useCallback(
    (trackId: string, row: number, col: number) => {
      dispatch({ type: "TOGGLE_STEP", trackId, row, col });
    },
    [],
  );

  const setSound = useCallback((trackId: string, sound: string) => {
    dispatch({ type: "SET_SOUND", trackId, sound });
  }, []);

  const setBank = useCallback((trackId: string, bank: string) => {
    dispatch({ type: "SET_BANK", trackId, bank });
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    dispatch({ type: "TOGGLE_MUTE", trackId });
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    dispatch({ type: "TOGGLE_SOLO", trackId });
  }, []);

  const setVolume = useCallback((trackId: string, volume: number) => {
    dispatch({ type: "SET_VOLUME", trackId, volume });
  }, []);

  const setBpm = useCallback((bpm: number) => {
    dispatch({ type: "SET_BPM", bpm });
  }, []);

  const setStepCount = useCallback((stepCount: number) => {
    dispatch({ type: "SET_STEP_COUNT", stepCount });
  }, []);

  const setTrackName = useCallback((trackId: string, name: string) => {
    dispatch({ type: "SET_TRACK_NAME", trackId, name });
  }, []);

  const addDrumRow = useCallback((trackId: string, drumSound: string) => {
    dispatch({ type: "ADD_DRUM_ROW", trackId, drumSound });
  }, []);

  const removeDrumRow = useCallback((trackId: string, rowIndex: number) => {
    dispatch({ type: "REMOVE_DRUM_ROW", trackId, rowIndex });
  }, []);

  const importProject = useCallback((project: Project) => {
    dispatch({ type: "IMPORT_PROJECT", project });
  }, []);

  const newProject = useCallback(() => {
    dispatch({
      type: "IMPORT_PROJECT",
      project: { ...initialProject, tracks: [] },
    });
  }, []);

  const addPresetTracks = useCallback((tracks: import("../types").Track[]) => {
    dispatch({ type: "ADD_PRESET_TRACKS", tracks });
  }, []);

  const reorderTracks = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: "REORDER_TRACKS", fromIndex, toIndex });
  }, []);

  const duplicateTrack = useCallback((trackId: string) => {
    dispatch({ type: "DUPLICATE_TRACK", trackId });
  }, []);

  const setVelocity = useCallback(
    (trackId: string, row: number, col: number, velocity: number) => {
      dispatch({ type: "SET_VELOCITY", trackId, row, col, velocity });
    },
    [],
  );

  const setEffects = useCallback(
    (trackId: string, effects: Partial<TrackEffects>) => {
      dispatch({ type: "SET_EFFECTS", trackId, effects });
    },
    [],
  );

  const setModifiers = useCallback(
    (trackId: string, modifiers: Partial<TrackModifiers>) => {
      dispatch({ type: "SET_MODIFIERS", trackId, modifiers });
    },
    [],
  );

  const setSwing = useCallback((swing: number) => {
    dispatch({ type: "SET_SWING", swing });
  }, []);

  const insertTrackAfter = useCallback(
    (afterTrackId: string, trackType: "drums" | "melodic") => {
      dispatch({ type: "INSERT_TRACK_AFTER", afterTrackId, trackType });
    },
    [],
  );

  const setLoopLength = useCallback(
    (trackId: string, loopLength: number | undefined) => {
      dispatch({ type: "SET_LOOP_LENGTH", trackId, loopLength });
    },
    [],
  );

  const setStep = useCallback(
    (trackId: string, row: number, col: number, active: boolean) => {
      dispatch({ type: "SET_STEP", trackId, row, col, active });
    },
    [],
  );

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  const clipboardRef = useRef<Step[][] | null>(null);

  const copySteps = useCallback(
    (trackId: string) => {
      const t = project.tracks.find((t) => t.id === trackId);
      if (t)
        clipboardRef.current = t.steps.map((row) => row.map((s) => ({ ...s })));
    },
    [project.tracks],
  );

  const pasteSteps = useCallback(
    (trackId: string) => {
      const clip = clipboardRef.current;
      if (!clip) return;
      const t = project.tracks.find((t) => t.id === trackId);
      if (!t) return;
      // Paste row-by-row, step-by-step up to min dimensions
      const newSteps = t.steps.map((row, ri) => {
        if (ri >= clip.length) return row;
        return row.map((s, ci) =>
          ci < clip[ri].length ? { ...clip[ri][ci] } : s,
        );
      });
      // Dispatch as IMPORT with modified track (goes through history)
      dispatch({
        type: "IMPORT_PROJECT",
        project: {
          ...project,
          tracks: project.tracks.map((tr) =>
            tr.id === trackId ? { ...tr, steps: newSteps } : tr,
          ),
        },
      });
    },
    [project],
  );

  const shiftPattern = useCallback((trackId: string, direction: 1 | -1) => {
    dispatch({ type: "SHIFT_PATTERN", trackId, direction });
  }, []);

  const randomizePattern = useCallback((trackId: string, density: number) => {
    dispatch({ type: "RANDOMIZE_PATTERN", trackId, density });
  }, []);

  const clearTrack = useCallback((trackId: string) => {
    dispatch({ type: "CLEAR_TRACK", trackId });
  }, []);

  const reverseSteps = useCallback((trackId: string) => {
    dispatch({ type: "REVERSE_STEPS", trackId });
  }, []);

  return {
    project,
    canUndo,
    canRedo,
    addTrack,
    removeTrack,
    toggleStep,
    setStep,
    setSound,
    setBank,
    toggleMute,
    toggleSolo,
    setVolume,
    setBpm,
    setStepCount,
    setTrackName,
    addDrumRow,
    removeDrumRow,
    importProject,
    newProject,
    addPresetTracks,
    reorderTracks,
    duplicateTrack,
    setVelocity,
    setEffects,
    setModifiers,
    setSwing,
    insertTrackAfter,
    setLoopLength,
    copySteps,
    pasteSteps,
    shiftPattern,
    randomizePattern,
    clearTrack,
    reverseSteps,
    undo,
    redo,
  };
}
