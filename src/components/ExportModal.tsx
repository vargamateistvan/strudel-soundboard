import { useState } from "react";
import type { Project } from "../types";
import { toMiniNotation, toJavaScript } from "../lib/codeGenerator";

interface ExportModalProps {
  project: Project;
  onClose: () => void;
}

export function ExportModal({ project, onClose }: ExportModalProps) {
  const [tab, setTab] = useState<"mini" | "js">("mini");
  const [copied, setCopied] = useState(false);

  const code = tab === "mini" ? toMiniNotation(project) : toJavaScript(project);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Code</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === "mini" ? "active" : ""}`}
            onClick={() => setTab("mini")}
          >
            Strudel Mini-Notation
          </button>
          <button
            className={`modal-tab ${tab === "js" ? "active" : ""}`}
            onClick={() => setTab("js")}
          >
            Standalone HTML/JS
          </button>
        </div>

        <div className="modal-body">
          <pre className="code-block">{code}</pre>
        </div>

        <div className="modal-footer">
          <button className="toolbar-btn action-btn" onClick={handleCopy}>
            {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
          </button>
          {tab === "mini" && (
            <a
              className="toolbar-btn action-btn"
              href={`https://strudel.cc/#${btoa(encodeURIComponent(code))}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              🔗 Open in Strudel REPL
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
