import { useReducer, useCallback, useEffect, useRef, useState } from "react";
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
  PIANO_SOUNDS,
  GUITAR_SOUNDS,
  TRACK_COLORS,
} from "../lib/constants";
import { autoSave, autoLoad } from "../lib/projectSerializer";

function createEmptySteps(rowCount: number, stepCount: number): Step[][] {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: stepCount }, () => ({ active: false, velocity: 1 })),
  );
}

function generateTrackId(): string {
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function countTracksOfType(tracks: Track[], type: Track["type"]): number {
  return tracks.filter((t) => t.type === type).length;
}

/** Find the lowest color index not already used by existing tracks */
function nextColorIndex(tracks: Track[]): number {
  const used = new Set(
    tracks.map((t) => t.colorIndex).filter((c) => c !== undefined),
  );
  for (let i = 0; i < TRACK_COLORS.length; i++) {
    if (!used.has(i)) return i;
  }
  return tracks.length % TRACK_COLORS.length;
}

function createDrumTrack(stepCount: number, existingTracks: Track[]): Track {
  const n = countTracksOfType(existingTracks, "drums") + 1;
  const rows = [...DEFAULT_DRUM_ROWS];
  return {
    id: generateTrackId(),
    name: `Drums ${n}`,
    type: "drums",
    sound: "bd",
    bank: "",
    steps: createEmptySteps(rows.length, stepCount),
    rows,
    muted: false,
    solo: false,
    volume: 1,
    effects: { ...DEFAULT_EFFECTS },
    colorIndex: nextColorIndex(existingTracks),
  };
}

function createMelodicTrack(stepCount: number, existingTracks: Track[]): Track {
  const n = countTracksOfType(existingTracks, "melodic") + 1;
  const rows = [...MELODIC_NOTES];
  return {
    id: generateTrackId(),
    name: `Synth ${n}`,
    type: "melodic",
    sound: "triangle",
    bank: "",
    steps: createEmptySteps(rows.length, stepCount),
    rows,
    muted: false,
    solo: false,
    volume: 1,
    effects: { ...DEFAULT_EFFECTS },
    colorIndex: nextColorIndex(existingTracks),
  };
}

function createPianoTrack(stepCount: number, existingTracks: Track[]): Track {
  const n = countTracksOfType(existingTracks, "piano") + 1;
  const rows = [...MELODIC_NOTES];
  return {
    id: generateTrackId(),
    name: `Piano ${n}`,
    type: "piano",
    sound: PIANO_SOUNDS[0],
    bank: "",
    steps: createEmptySteps(rows.length, stepCount),
    rows,
    muted: false,
    solo: false,
    volume: 1,
    effects: { ...DEFAULT_EFFECTS },
    colorIndex: nextColorIndex(existingTracks),
  };
}

function createGuitarTrack(stepCount: number, existingTracks: Track[]): Track {
  const n = countTracksOfType(existingTracks, "guitar") + 1;
  const rows = [...MELODIC_NOTES];
  return {
    id: generateTrackId(),
    name: `Guitar ${n}`,
    type: "guitar",
    sound: GUITAR_SOUNDS[0],
    bank: "",
    steps: createEmptySteps(rows.length, stepCount),
    rows,
    muted: false,
    solo: false,
    volume: 1,
    effects: { ...DEFAULT_EFFECTS },
    colorIndex: nextColorIndex(existingTracks),
  };
}

type Action =
  | { type: "ADD_TRACK"; trackType: "drums" | "melodic" | "piano" | "guitar" }
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
      trackType: "drums" | "melodic" | "piano" | "guitar";
      customStepCount?: number;
    }
  | { type: "SET_LOOP_LENGTH"; trackId: string; loopLength: number | undefined }
  | { type: "SHIFT_PATTERN"; trackId: string; direction: 1 | -1 }
  | { type: "RANDOMIZE_PATTERN"; trackId: string; density: number }
  | { type: "CLEAR_TRACK"; trackId: string }
  | { type: "REVERSE_STEPS"; trackId: string }
  | { type: "PASTE_STEPS"; trackId: string; steps: Step[][] }
  | {
      type: "SET_PROBABILITY";
      trackId: string;
      row: number;
      col: number;
      probability: number;
    }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "REORDER_CHAIN"; fromIndex: number; toIndex: number };

function reducer(state: Project, action: Action): Project {
  switch (action.type) {
    case "ADD_TRACK": {
      const track =
        action.trackType === "drums"
          ? createDrumTrack(state.stepCount, state.tracks)
          : action.trackType === "piano"
            ? createPianoTrack(state.stepCount, state.tracks)
            : action.trackType === "guitar"
              ? createGuitarTrack(state.stepCount, state.tracks)
              : createMelodicTrack(state.stepCount, state.tracks);
      return { ...state, tracks: [...state.tracks, track] };
    }

    case "REMOVE_TRACK": {
      // When removing a root track, unchain any tracks chained to it
      const remaining = state.tracks
        .filter((t) => t.id !== action.trackId)
        .map((t) =>
          t.chainedWith === action.trackId
            ? { ...t, chainedWith: undefined }
            : t,
        );
      return { ...state, tracks: remaining };
    }

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

    case "ADD_PRESET_TRACKS": {
      let allTracks = [...state.tracks];
      const newTracks = action.tracks.map((t) => {
        const nt = {
          ...t,
          id: generateTrackId(),
          colorIndex: nextColorIndex(allTracks),
        };
        allTracks.push(nt);
        return nt;
      });
      return {
        ...state,
        tracks: [...state.tracks, ...newTracks],
      };
    }

    case "REORDER_TRACKS": {
      const tracks = [...state.tracks];
      const [moved] = tracks.splice(action.fromIndex, 1);
      tracks.splice(action.toIndex, 0, moved);
      return { ...state, tracks };
    }

    case "REORDER_CHAIN": {
      const movedTrack = state.tracks[action.fromIndex];
      const targetTrack = state.tracks[action.toIndex];
      if (!movedTrack || !targetTrack) return state;

      // Find the chain root
      const chainRoot = movedTrack.chainedWith ?? movedTrack.id;

      // Collect the full chain group in current order
      const rootTrack = state.tracks.find((t) => t.id === chainRoot);
      if (!rootTrack) return state;
      const chainGroup = [
        rootTrack,
        ...state.tracks.filter((t) => t.chainedWith === chainRoot),
      ];

      // Find positions within the chain group
      const fromGroupIdx = chainGroup.indexOf(movedTrack);
      const toGroupIdx = chainGroup.indexOf(targetTrack);
      if (fromGroupIdx === -1 || toGroupIdx === -1) return state;

      // Reorder within the group
      const newGroup = [...chainGroup];
      const [moved] = newGroup.splice(fromGroupIdx, 1);
      newGroup.splice(toGroupIdx, 0, moved);

      // The first track in the new group becomes the root (no chainedWith)
      const newRootId = newGroup[0].id;

      // Rebuild the tracks array: replace chain members in their original positions
      // with the reordered group, updating chainedWith
      const tracks = [...state.tracks];
      const chainPositions = chainGroup
        .map((t) => tracks.indexOf(t))
        .sort((a, b) => a - b);
      for (let i = 0; i < chainPositions.length; i++) {
        const reordered = newGroup[i];
        tracks[chainPositions[i]] = {
          ...reordered,
          chainedWith: i === 0 ? undefined : newRootId,
        };
      }
      return { ...state, tracks };
    }

    case "DUPLICATE_TRACK": {
      const src = state.tracks.find((t) => t.id === action.trackId);
      if (!src) return state;
      const idx = state.tracks.findIndex((t) => t.id === action.trackId);
      const tracks = [...state.tracks];
      const clone: Track = {
        ...src,
        id: generateTrackId(),
        name: `${src.name} copy`,
        steps: src.steps.map((row) => row.map((s) => ({ ...s }))),
        rows: [...src.rows],
        colorIndex: nextColorIndex(tracks),
      };
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
      const afterTrack = state.tracks.find((t) => t.id === action.afterTrackId);
      // Calculate the chain root and total steps used in the chain
      const chainRoot = afterTrack?.chainedWith ?? action.afterTrackId;
      const rootTrack = state.tracks.find((t) => t.id === chainRoot);
      const chainMembers = [
        rootTrack,
        ...state.tracks.filter((t) => t.chainedWith === chainRoot),
      ].filter(Boolean) as typeof state.tracks;
      const usedSteps = chainMembers.reduce(
        (sum, t) => sum + (t.loopLength ?? state.stepCount),
        0,
      );
      const remainingSteps = Math.max(1, state.stepCount - usedSteps);
      const stepCount = action.customStepCount
        ? Math.min(action.customStepCount, remainingSteps)
        : remainingSteps;
      const newTrack =
        action.trackType === "drums"
          ? createDrumTrack(stepCount, state.tracks)
          : action.trackType === "piano"
            ? createPianoTrack(stepCount, state.tracks)
            : action.trackType === "guitar"
              ? createGuitarTrack(stepCount, state.tracks)
              : createMelodicTrack(stepCount, state.tracks);
      newTrack.loopLength = stepCount;
      newTrack.chainedWith = chainRoot;
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
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          const newLen = action.loopLength ?? state.stepCount;
          return {
            ...t,
            loopLength: action.loopLength,
            steps: t.steps.map((row) => {
              if (row.length >= newLen) return row.slice(0, newLen);
              return [
                ...row,
                ...Array.from({ length: newLen - row.length }, () => ({
                  active: false,
                  velocity: 1,
                })),
              ];
            }),
          };
        }),
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

    case "PASTE_STEPS":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          return {
            ...t,
            steps: t.steps.map((row, ri) => {
              if (ri >= action.steps.length) return row;
              return row.map((s, ci) =>
                ci < action.steps[ri].length ? { ...action.steps[ri][ci] } : s,
              );
            }),
          };
        }),
      };

    case "SET_PROBABILITY":
      return {
        ...state,
        tracks: state.tracks.map((t) => {
          if (t.id !== action.trackId) return t;
          const newSteps = t.steps.map((row, ri) =>
            ri === action.row
              ? row.map((step, ci) =>
                  ci === action.col
                    ? { ...step, probability: action.probability }
                    : step,
                )
              : row,
          );
          return { ...t, steps: newSteps };
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
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-save whenever project changes
  useEffect(() => {
    const err = autoSave(project);
    if (err) setSaveError(err);
  }, [project]);

  const addTrack = useCallback(
    (trackType: "drums" | "melodic" | "piano" | "guitar") => {
      dispatch({ type: "ADD_TRACK", trackType });
    },
    [],
  );

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

  const reorderChain = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: "REORDER_CHAIN", fromIndex, toIndex });
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

  const setProbability = useCallback(
    (trackId: string, row: number, col: number, probability: number) => {
      dispatch({ type: "SET_PROBABILITY", trackId, row, col, probability });
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
    (
      afterTrackId: string,
      trackType: "drums" | "melodic" | "piano" | "guitar",
      customStepCount?: number,
    ) => {
      dispatch({
        type: "INSERT_TRACK_AFTER",
        afterTrackId,
        trackType,
        customStepCount,
      });
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
      dispatch({ type: "PASTE_STEPS", trackId, steps: clip });
    },
    [project.tracks],
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
    reorderChain,
    duplicateTrack,
    setVelocity,
    setProbability,
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
    saveError,
    clearSaveError: () => setSaveError(null),
    undo,
    redo,
  };
}
