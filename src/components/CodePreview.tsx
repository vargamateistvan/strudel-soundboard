import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import type { Project } from "../types";
import { toMiniNotation } from "../lib/codeGenerator";
import { buildPatternCode } from "../lib/patternBuilder";
import { autoImport } from "../lib/codeParser";
import { SyntaxHighlight } from "./SyntaxHighlight";

interface CodePreviewProps {
  project: Project;
  onImport: (project: Project) => void;
}

export function CodePreview({ project, onImport }: CodePreviewProps) {
  const [mode, setMode] = useState<"mini" | "live">("mini");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [parseError, setParseError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ignoreNextProjectRef = useRef(false);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const code = useMemo(() => {
    if (mode === "live") return buildPatternCode(project);
    return toMiniNotation(project);
  }, [project, mode]);

  // When project changes externally, reset edit state (unless we caused it)
  useEffect(() => {
    if (ignoreNextProjectRef.current) {
      ignoreNextProjectRef.current = false;
      return;
    }
    if (editing) {
      setEditText(code);
    }
  }, [code]);

  const handleCopy = async () => {
    const text = editing ? editText : code;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = useCallback(() => {
    setEditing(true);
    setEditText(code);
    setParseError("");
  }, [code]);

  const handleChange = useCallback(
    (value: string) => {
      setEditText(value);
      setParseError("");

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          const result = autoImport(value);
          if (result.project.tracks.length > 0) {
            ignoreNextProjectRef.current = true;
            onImport(result.project);
            setParseError("");
          } else if (value.trim()) {
            setParseError("No tracks parsed");
          }
        } catch {
          setParseError("Parse error");
        }
      }, 600);
    },
    [onImport],
  );

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setEditing(false);
    setParseError("");
  }, []);

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <span className="code-preview-title">Code Preview</span>
        <div className="code-preview-tabs">
          <button
            className={`code-preview-tab ${mode === "mini" ? "active" : ""}`}
            onClick={() => {
              setMode("mini");
              setEditing(false);
            }}
          >
            Export
          </button>
          <button
            className={`code-preview-tab ${mode === "live" ? "active" : ""}`}
            onClick={() => {
              setMode("live");
              setEditing(false);
            }}
          >
            Live
          </button>
        </div>
        {parseError && <span className="code-preview-error">{parseError}</span>}
        <button
          className="code-preview-copy"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? "✓" : "📋"}
        </button>
      </div>
      {editing ? (
        <textarea
          className="code-preview-code code-preview-textarea"
          value={editText}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          spellCheck={false}
          autoFocus
        />
      ) : (
        <pre
          className="code-preview-code"
          onClick={handleStartEdit}
          title="Click to edit"
          style={{ cursor: "text" }}
        >
          {code ? (
            <SyntaxHighlight code={code} />
          ) : (
            "// Add tracks and toggle steps to see code here"
          )}
        </pre>
      )}
    </div>
  );
}
