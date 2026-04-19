import { useState, useCallback, useEffect } from "react";
import { useStrudel } from "../hooks/useStrudel";
import { useTracks } from "../hooks/useTracks";
import { buildPatternCode } from "../lib/patternBuilder";
import { Toolbar } from "./Toolbar";
import { TrackList } from "./TrackList";
import { CodePreview } from "./CodePreview";
import { ExportModal } from "./ExportModal";
import { ImportModal } from "./ImportModal";
import "./App.css";

export default function App() {
  const strudel = useStrudel();
  const tracks = useTracks();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);

  const handlePlay = useCallback(() => {
    const code = buildPatternCode(tracks.project);
    if (!code) return;
    strudel.play(code);
  }, [strudel, tracks.project]);

  const handleStop = useCallback(() => {
    strudel.stop();
    setCurrentStep(-1);
  }, [strudel]);

  // Re-evaluate pattern live when tracks change while playing
  useEffect(() => {
    if (!strudel.isPlaying) return;
    const code = buildPatternCode(tracks.project);
    if (!code) {
      strudel.stop();
      return;
    }
    strudel.play(code);
  }, [tracks.project]); // intentionally omit strudel to avoid loop

  // Step position indicator using interval synced to BPM
  useEffect(() => {
    if (!strudel.isPlaying) {
      setCurrentStep(-1);
      return;
    }

    const msPerStep =
      (60 / tracks.project.bpm) * (4 / tracks.project.stepCount) * 1000;
    let step = 0;
    setCurrentStep(0);

    const interval = setInterval(() => {
      step = (step + 1) % tracks.project.stepCount;
      setCurrentStep(step);
    }, msPerStep);

    return () => clearInterval(interval);
  }, [strudel.isPlaying, tracks.project.bpm, tracks.project.stepCount]);

  // Keyboard shortcut: Space = play/stop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        if (strudel.isPlaying) handleStop();
        else handlePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [strudel.isPlaying, handlePlay, handleStop]);

  return (
    <div className="app">
      <Toolbar
        bpm={tracks.project.bpm}
        stepCount={tracks.project.stepCount}
        isPlaying={strudel.isPlaying}
        onPlay={handlePlay}
        onStop={handleStop}
        onBpmChange={tracks.setBpm}
        onStepCountChange={tracks.setStepCount}
        onExport={() => setShowExport(true)}
        onImport={() => setShowImport(true)}
      />

      <div className="app-main">
        <div className="app-tracks">
          <TrackList
            project={tracks.project}
            currentStep={currentStep}
            onAddTrack={tracks.addTrack}
            onRemoveTrack={tracks.removeTrack}
            onToggleStep={tracks.toggleStep}
            onSetSound={tracks.setSound}
            onSetBank={tracks.setBank}
            onToggleMute={tracks.toggleMute}
            onToggleSolo={tracks.toggleSolo}
            onSetVolume={tracks.setVolume}
            onSetTrackName={tracks.setTrackName}
            onAddDrumRow={tracks.addDrumRow}
            onRemoveDrumRow={tracks.removeDrumRow}
          />
        </div>

        <div className="app-preview">
          <CodePreview project={tracks.project} />
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
    </div>
  );
}
