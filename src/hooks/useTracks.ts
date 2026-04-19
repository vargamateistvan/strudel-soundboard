import { useReducer, useCallback, useEffect } from "react";
import type { Project, Track, Step, TrackEffects } from "../types";
import { DEFAULT_EFFECTS } from "../types";
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
  | { type: "SET_SWING"; swing: number }
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
      return { ...action.project };

    case "ADD_PRESET_TRACKS":
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

    case "SET_SWING":
      return { ...state, swing: action.swing };

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

  const setSwing = useCallback((swing: number) => {
    dispatch({ type: "SET_SWING", swing });
  }, []);

  const setStep = useCallback(
    (trackId: string, row: number, col: number, active: boolean) => {
      dispatch({ type: "SET_STEP", trackId, row, col, active });
    },
    [],
  );

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

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
    addPresetTracks,
    reorderTracks,
    duplicateTrack,
    setVelocity,
    setEffects,
    setSwing,
    undo,
    redo,
  };
}
