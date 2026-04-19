import { useState, useRef } from "react";
import type { Project } from "../types";
import {
  saveProject,
  loadProject,
  deleteProject,
  listProjects,
  downloadProject,
  uploadProject,
} from "../lib/projectSerializer";

interface SaveLoadModalProps {
  project: Project;
  onLoad: (project: Project) => void;
  onClose: () => void;
}

export function SaveLoadModal({
  project,
  onLoad,
  onClose,
}: SaveLoadModalProps) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(listProjects);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveProject(trimmed, project);
    setSaved(listProjects());
    setName("");
    setError("");
  };

  const handleLoad = (projectName: string) => {
    const p = loadProject(projectName);
    if (p) {
      onLoad(p);
      onClose();
    } else {
      setError("Failed to load project");
    }
  };

  const handleDelete = (projectName: string) => {
    deleteProject(projectName);
    setSaved(listProjects());
  };

  const handleDownload = () => {
    const fileName = name.trim() || "my-project";
    downloadProject(fileName, project);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = await uploadProject(file);
      onLoad(p);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal save-load-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Save / Load Project</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <div className="save-section">
            <h3>Save Current Project</h3>
            <div className="save-row">
              <input
                type="text"
                className="save-name-input"
                placeholder="Project name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                maxLength={60}
              />
              <button
                className="toolbar-btn action-btn"
                onClick={handleSave}
                disabled={!name.trim()}
              >
                💾 Save
              </button>
            </div>
          </div>

          <div className="file-section">
            <h3>File</h3>
            <div className="save-row">
              <button
                className="toolbar-btn action-btn"
                onClick={handleDownload}
              >
                ⬇ Download .json
              </button>
              <button
                className="toolbar-btn action-btn"
                onClick={() => fileRef.current?.click()}
              >
                ⬆ Upload .json
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleUpload}
              />
            </div>
          </div>

          <div className="projects-section">
            <h3>Saved Projects ({saved.length})</h3>
            {saved.length === 0 ? (
              <p className="no-projects">No saved projects yet.</p>
            ) : (
              <ul className="project-list">
                {saved.map((entry) => (
                  <li key={entry.name} className="project-entry">
                    <div className="project-info">
                      <span className="project-name">{entry.name}</span>
                      <span className="project-date">
                        {new Date(entry.savedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="project-actions">
                      <button
                        className="toolbar-btn action-btn"
                        onClick={() => handleLoad(entry.name)}
                      >
                        Load
                      </button>
                      <button
                        className="toolbar-btn action-btn"
                        onClick={() => {
                          saveProject(entry.name, project);
                          setSaved(listProjects());
                        }}
                        title="Overwrite with current project"
                      >
                        Overwrite
                      </button>
                      <button
                        className="toolbar-btn action-btn danger-btn"
                        onClick={() => handleDelete(entry.name)}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
