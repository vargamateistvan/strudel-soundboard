import { useReducer, useCallback } from "react";
import type { Project, Track, Step } from "../types";
import {
  DEFAULT_BPM,
  DEFAULT_STEP_COUNT,
  DEFAULT_DRUM_ROWS,
  MELODIC_NOTES,
} from "../lib/constants";

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
  };
}

type Action =
  | { type: "ADD_TRACK"; trackType: "drums" | "melodic" }
  | { type: "REMOVE_TRACK"; trackId: string }
  | { type: "TOGGLE_STEP"; trackId: string; row: number; col: number }
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
  | { type: "IMPORT_PROJECT"; project: Project };

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

    default:
      return state;
  }
}

const initialState: Project = {
  bpm: DEFAULT_BPM,
  stepCount: DEFAULT_STEP_COUNT,
  tracks: [],
};

export function useTracks() {
  const [project, dispatch] = useReducer(reducer, initialState);

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

  return {
    project,
    addTrack,
    removeTrack,
    toggleStep,
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
  };
}
