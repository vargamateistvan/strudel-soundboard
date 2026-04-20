import { useMemo, useState } from "react";
import type { Project } from "../types";
import { toMiniNotation } from "../lib/codeGenerator";
import { buildPatternCode } from "../lib/patternBuilder";
import { SyntaxHighlight } from "./SyntaxHighlight";

interface CodePreviewProps {
  project: Project;
}

export function CodePreview({ project }: CodePreviewProps) {
  const [mode, setMode] = useState<"mini" | "live">("mini");
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (mode === "live") return buildPatternCode(project);
    return toMiniNotation(project);
  }, [project, mode]);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <span className="code-preview-title">Code Preview</span>
        <div className="code-preview-tabs">
          <button
            className={`code-preview-tab ${mode === "mini" ? "active" : ""}`}
            onClick={() => setMode("mini")}
          >
            Export
          </button>
          <button
            className={`code-preview-tab ${mode === "live" ? "active" : ""}`}
            onClick={() => setMode("live")}
          >
            Live
          </button>
        </div>
        <button
          className="code-preview-copy"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? "✓" : "📋"}
        </button>
      </div>
      <pre className="code-preview-code">
        {code ? (
          <SyntaxHighlight code={code} />
        ) : (
          "// Add tracks and toggle steps to see code here"
        )}
      </pre>
    </div>
  );
}
