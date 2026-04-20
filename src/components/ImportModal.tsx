import { useState } from "react";
import type { Project } from "../types";
import { autoImport } from "../lib/codeParser";

interface ImportModalProps {
  onImport: (project: Project) => void;
  onClose: () => void;
}

export function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [code, setCode] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleImport = () => {
    if (!code.trim()) {
      setError("Please paste some Strudel code.");
      return;
    }

    try {
      const result = autoImport(code);
      setWarnings(result.warnings);

      if (result.project.tracks.length === 0) {
        setError(
          'No tracks could be parsed from the code. Make sure it contains s("...") or note("...") patterns.',
        );
        return;
      }

      setError("");
      onImport(result.project);
      onClose();
    } catch (err) {
      setError(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import Code"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Import Code</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="import-hint">
            Paste Strudel mini-notation or exported HTML/JS code below. Format
            is auto-detected.
          </p>
          <textarea
            className="import-textarea"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
              setWarnings([]);
            }}
            placeholder={`setcps(0.5)\nstack(\n  s("bd ~ bd ~, hh*8"),\n  note("c4 e4 g4 ~").s("triangle")\n)`}
            rows={12}
            spellCheck={false}
          />

          {error && <div className="import-error">{error}</div>}
          {warnings.length > 0 && (
            <div className="import-warnings">
              <strong>Warnings:</strong>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="toolbar-btn action-btn" onClick={handleImport}>
            📥 Import
          </button>
          <button className="toolbar-btn action-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
