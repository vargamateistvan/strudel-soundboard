import { useState, useCallback, useEffect, useRef } from "react";
import { useStrudel, unlockAudio } from "../hooks/useStrudel";
import { useTracks } from "../hooks/useTracks";
import { buildPatternCode } from "../lib/patternBuilder";
import { Toolbar } from "./Toolbar";
import { TrackList } from "./TrackList";
import { CodePreview } from "./CodePreview";
import { Visualizer } from "./Visualizer";
import { ExportModal } from "./ExportModal";
import { ImportModal } from "./ImportModal";
import { SaveLoadModal } from "./SaveLoadModal";
import { HelpModal } from "./HelpModal";
import { useRecorder } from "../hooks/useRecorder";
import { useAnalyser } from "../hooks/useAnalyser";
import { Snackbar } from "./Snackbar";
import "./App.css";

export default function App() {
  const strudel = useStrudel();
  const tracks = useTracks();
  const recorder = useRecorder();
  const analyser = useAnalyser();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("strudel-sb-theme") || "synthwave",
  );

  // Apply theme to document root
  useEffect(() => {
    if (theme === "synthwave") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    localStorage.setItem("strudel-sb-theme", theme);
  }, [theme]);

  // Connect analyser eagerly once Strudel is ready (non-blocking)
  useEffect(() => {
    if (strudel.ready) {
      analyser.connect();
    }
  }, [strudel.ready, analyser]);

  // Unlock AudioContext on first user interaction (iOS Safari requires synchronous unlock)
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("click", handler);
    };
    window.addEventListener("touchstart", handler, { once: true });
    window.addEventListener("click", handler, { once: true });
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("click", handler);
    };
  }, []);

  const handlePlay = useCallback(() => {
    const code = buildPatternCode(tracks.project);
    if (!code) return;
    strudel.play(code);
  }, [strudel, tracks.project]);

  const handleStop = useCallback(() => {
    strudel.stop();
    setCurrentStep(-1);
    if (recorder.isRecording) recorder.stopRecording();
  }, [strudel, recorder]);

  const handleRecord = useCallback(async () => {
    await recorder.startRecording();
    // Re-evaluate pattern so the new audio graph routes through the recorder
    const code = buildPatternCode(tracks.project);
    if (code) strudel.play(code);
  }, [recorder, strudel, tracks.project]);

  const handleStopRecording = useCallback(() => {
    recorder.stopRecording();
  }, [recorder]);

  const handlePreviewRow = useCallback(
    (
      track: { type: string; sound: string; bank: string },
      rowLabel: string,
    ) => {
      let code: string;
      if (track.type === "drums") {
        code = track.bank
          ? `s("${rowLabel}").bank("${track.bank}")`
          : `s("${rowLabel}")`;
      } else {
        code = `note("${rowLabel}").s("${track.sound}")`;
      }
      strudel.preview(code);
    },
    [strudel],
  );

  // Track playing state in a ref for the live re-evaluate effect
  const isPlayingRef = useRef(strudel.isPlaying);
  isPlayingRef.current = strudel.isPlaying;

  // Re-evaluate pattern live when tracks change while playing (debounced to reduce stuttering)
  const reEvalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isPlayingRef.current) return;
    if (reEvalTimerRef.current) clearTimeout(reEvalTimerRef.current);
    reEvalTimerRef.current = setTimeout(() => {
      const code = buildPatternCode(tracks.project);
      if (!code) {
        strudel.stop();
        return;
      }
      strudel.play(code);
    }, 120);
    return () => {
      if (reEvalTimerRef.current) clearTimeout(reEvalTimerRef.current);
    };
  }, [tracks.project]); // intentionally omit strudel to avoid loop

  // Step position indicator using interval synced to BPM
  const stepRef = useRef(0);
  useEffect(() => {
    if (!strudel.isPlaying) {
      setCurrentStep(-1);
      stepRef.current = 0;
      return;
    }

    const msPerStep =
      (60 / tracks.project.bpm) * (4 / tracks.project.stepCount) * 1000;
    // When step count changes, clamp the current step to stay in bounds
    if (stepRef.current >= tracks.project.stepCount) {
      stepRef.current = stepRef.current % tracks.project.stepCount;
    }
    setCurrentStep(stepRef.current);

    const interval = setInterval(() => {
      stepRef.current = (stepRef.current + 1) % tracks.project.stepCount;
      setCurrentStep(stepRef.current);
    }, msPerStep);

    return () => clearInterval(interval);
  }, [strudel.isPlaying, tracks.project.bpm, tracks.project.stepCount]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // When focused inside a step grid, only allow meta/ctrl shortcuts (undo/redo/save)
      if ((e.target as HTMLElement)?.closest('[role="grid"]')) {
        if (!e.metaKey && !e.ctrlKey) return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (strudel.isPlaying) handleStop();
        else handlePlay();
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        tracks.redo();
      } else if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        tracks.undo();
      } else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowSaveLoad(true);
      } else if (e.key >= "1" && e.key <= "9" && !e.metaKey && !e.ctrlKey) {
        // Number keys: mute/unmute track
        const idx = parseInt(e.key) - 1;
        const t = tracks.project.tracks[idx];
        if (t) tracks.toggleMute(t.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [strudel.isPlaying, handlePlay, handleStop, tracks]);

  return (
    <div className="app">
      {!strudel.ready && (
        <div className="loading-indicator">
          <div className="loading-spinner" />
          <span>Loading audio engine…</span>
        </div>
      )}

      <Toolbar
        bpm={tracks.project.bpm}
        stepCount={tracks.project.stepCount}
        swing={tracks.project.swing ?? 0}
        isPlaying={strudel.isPlaying}
        isRecording={recorder.isRecording}
        canUndo={tracks.canUndo}
        canRedo={tracks.canRedo}
        onPlay={handlePlay}
        onStop={handleStop}
        onRecord={handleRecord}
        onStopRecording={handleStopRecording}
        onBpmChange={tracks.setBpm}
        onStepCountChange={tracks.setStepCount}
        onSwingChange={tracks.setSwing}
        onExport={() => setShowExport(true)}
        onImport={() => setShowImport(true)}
        onSaveLoad={() => setShowSaveLoad(true)}
        onNewProject={() => {
          if (
            tracks.project.tracks.length === 0 ||
            confirm("Start a new project? Unsaved changes will be lost.")
          ) {
            tracks.newProject();
          }
        }}
        onUndo={tracks.undo}
        onRedo={tracks.redo}
        onLoadPreset={tracks.importProject}
        theme={theme}
        onThemeChange={setTheme}
        onHelp={() => setShowHelp(true)}
      />

      <div className="app-main">
        <div className="app-tracks">
          <TrackList
            project={tracks.project}
            currentStep={currentStep}
            onAddTrack={tracks.addTrack}
            onRemoveTrack={tracks.removeTrack}
            onToggleStep={tracks.toggleStep}
            onSetStep={tracks.setStep}
            onSetSound={tracks.setSound}
            onSetBank={tracks.setBank}
            onToggleMute={tracks.toggleMute}
            onToggleSolo={tracks.toggleSolo}
            onSetVolume={tracks.setVolume}
            onSetTrackName={tracks.setTrackName}
            onAddDrumRow={tracks.addDrumRow}
            onRemoveDrumRow={tracks.removeDrumRow}
            onPreviewRow={(trackId, rowLabel) => {
              const track = tracks.project.tracks.find((t) => t.id === trackId);
              if (track) handlePreviewRow(track, rowLabel);
            }}
            onReorderTracks={tracks.reorderTracks}
            onReorderChain={tracks.reorderChain}
            onDuplicateTrack={tracks.duplicateTrack}
            onSetVelocity={tracks.setVelocity}
            onSetProbability={tracks.setProbability}
            onSetEffects={tracks.setEffects}
            onSetModifiers={tracks.setModifiers}
            onAddPresetTracks={tracks.addPresetTracks}
            onInsertTrackAfter={tracks.insertTrackAfter}
            onSetLoopLength={tracks.setLoopLength}
            onCopySteps={tracks.copySteps}
            onPasteSteps={tracks.pasteSteps}
            onShiftPattern={tracks.shiftPattern}
            onRandomizePattern={tracks.randomizePattern}
            onClearTrack={tracks.clearTrack}
            onReverseSteps={tracks.reverseSteps}
          />
        </div>

        <div className="app-preview">
          <Visualizer
            project={tracks.project}
            currentStep={currentStep}
            isPlaying={strudel.isPlaying}
            analyserRef={analyser.analyser}
          />
          <CodePreview
            project={tracks.project}
            onImport={tracks.importProject}
          />
        </div>
      </div>

      {showExport && (
        <ExportModal
          project={tracks.project}
          onClose={() => setShowExport(false)}
        />
      )}

      {showImport && (
        <ImportModal
          onImport={tracks.importProject}
          onClose={() => setShowImport(false)}
        />
      )}

      {showSaveLoad && (
        <SaveLoadModal
          project={tracks.project}
          onLoad={tracks.importProject}
          onClose={() => setShowSaveLoad(false)}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <Snackbar
        message={strudel.error || tracks.saveError}
        onClose={() => {
          strudel.clearError();
          tracks.clearSaveError();
        }}
      />
    </div>
  );
}
