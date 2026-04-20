import { useCallback, useRef } from "react";
import { PRESETS } from "../lib/presets";

interface ToolbarProps {
  bpm: number;
  stepCount: number;
  swing: number;
  isPlaying: boolean;
  isRecording: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onStopRecording: () => void;
  onBpmChange: (bpm: number) => void;
  onStepCountChange: (count: number) => void;
  onSwingChange: (swing: number) => void;
  onExport: () => void;
  onImport: () => void;
  onSaveLoad: () => void;
  onNewProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onLoadPreset: (project: import("../types").Project) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  onHelp: () => void;
}

export function Toolbar({
  bpm,
  stepCount,
  swing,
  isPlaying,
  isRecording,
  canUndo,
  canRedo,
  onPlay,
  onStop,
  onRecord,
  onStopRecording,
  onBpmChange,
  onStepCountChange,
  onSwingChange,
  onExport,
  onImport,
  onSaveLoad,
  onNewProject,
  onUndo,
  onRedo,
  onLoadPreset,
  theme,
  onThemeChange,
  onHelp,
}: ToolbarProps) {
  const tapTimesRef = useRef<number[]>([]);

  const handleTapTempo = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;
    // Reset if last tap was > 2 seconds ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      taps.length = 0;
    }
    taps.push(now);
    // Keep last 8 taps
    if (taps.length > 8) taps.shift();
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.round(60000 / avgMs);
      if (newBpm >= 30 && newBpm <= 300) {
        onBpmChange(newBpm);
      }
    }
  }, [onBpmChange]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className={`toolbar-btn transport-btn ${isPlaying ? "playing" : ""}`}
          onClick={isPlaying ? onStop : onPlay}
          title={isPlaying ? "Stop (Space)" : "Play (Space)"}
        >
          {isPlaying ? "⏹" : "▶"}
        </button>
        <button
          className={`toolbar-btn transport-btn record-btn ${isRecording ? "recording" : ""}`}
          onClick={isRecording ? onStopRecording : onRecord}
          title={isRecording ? "Stop Recording" : "Record"}
        >
          {isRecording ? "⏺" : "⏺"}
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className="toolbar-btn action-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="toolbar-btn action-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪
        </button>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">
          BPM
          <input
            type="number"
            className="toolbar-input bpm-input"
            value={bpm}
            min={30}
            max={300}
            onChange={(e) =>
              onBpmChange(Math.max(30, Math.min(300, Number(e.target.value))))
            }
          />
        </label>
        <input
          type="range"
          className="toolbar-slider"
          min={30}
          max={300}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
        />
        <button
          className="toolbar-btn action-btn tap-tempo-btn"
          onClick={handleTapTempo}
          title="Tap to set BPM"
        >
          TAP
        </button>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">
          Steps
          <select
            className="toolbar-select"
            value={stepCount}
            onChange={(e) => onStepCountChange(Number(e.target.value))}
          >
            <option value={8}>8</option>
            <option value={16}>16</option>
            <option value={32}>32</option>
            <option value={48}>48</option>
            <option value={64}>64</option>
            <option value={128}>128</option>
          </select>
        </label>
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">
          Swing
          <span className="swing-value">{Math.round((swing ?? 0) * 100)}%</span>
        </label>
        <input
          type="range"
          className="toolbar-slider"
          min={0}
          max={1}
          step={0.05}
          value={swing ?? 0}
          onChange={(e) => onSwingChange(Number(e.target.value))}
        />
      </div>

      <div className="toolbar-group">
        <label className="toolbar-label">
          Preset
          <select
            className="toolbar-select"
            value=""
            onChange={(e) => {
              const idx = Number(e.target.value);
              if (!isNaN(idx)) onLoadPreset(PRESETS[idx].build());
            }}
          >
            <option value="">Load preset…</option>
            {PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="toolbar-group toolbar-actions">
        <button
          className="toolbar-btn action-btn"
          onClick={onNewProject}
          title="New Project"
        >
          📄 New
        </button>
        <button
          className="toolbar-btn action-btn"
          onClick={onSaveLoad}
          title="Save / Load Project"
        >
          💾 Save/Load
        </button>
        <button
          className="toolbar-btn action-btn"
          onClick={onImport}
          title="Import Code"
        >
          📥 Import
        </button>
        <button
          className="toolbar-btn action-btn"
          onClick={onExport}
          title="Export Code"
        >
          📤 Export
        </button>
      </div>

      <div className="toolbar-group">
        <select
          className="toolbar-select theme-select"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          title="Theme"
        >
          <option value="synthwave">🌌 Synthwave</option>
          <option value="terminal">💚 Terminal</option>
          <option value="sunset">🌅 Sunset</option>
          <option value="dark">🌑 Dark</option>
          <option value="light">☀️ Light</option>
        </select>
        <button
          className="toolbar-btn action-btn help-btn"
          onClick={onHelp}
          title="Help"
        >
          ?
        </button>
        <a
          className="toolbar-btn action-btn bug-report-link"
          href="https://github.com/vargamateistvan/strudel-soundboard/issues"
          target="_blank"
          rel="noopener noreferrer"
          title="Report a bug"
        >
          🐛
        </a>
      </div>
    </div>
  );
}
