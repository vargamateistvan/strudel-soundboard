interface ToolbarProps {
  bpm: number;
  stepCount: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onStepCountChange: (count: number) => void;
  onExport: () => void;
  onImport: () => void;
}

export function Toolbar({
  bpm,
  stepCount,
  isPlaying,
  onPlay,
  onStop,
  onBpmChange,
  onStepCountChange,
  onExport,
  onImport,
}: ToolbarProps) {
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
          </select>
        </label>
      </div>

      <div className="toolbar-group toolbar-actions">
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
    </div>
  );
}
