import type { Project } from "../types";

const AUTOSAVE_KEY = "strudel-sb-autosave";
const PROJECT_PREFIX = "strudel-sb-project-";
const CURRENT_VERSION = 1;

interface SavedEnvelope {
  version: number;
  project: Project;
}

interface SavedEntry {
  name: string;
  savedAt: string;
  data: SavedEnvelope;
}

// --- localStorage helpers ---

export function autoSave(project: Project): string | null {
  try {
    const envelope: SavedEnvelope = { version: CURRENT_VERSION, project };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(envelope));
    return null;
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      return "Storage quota exceeded — your changes may not be saved. Try deleting unused projects.";
    }
    return "Failed to save project to local storage.";
  }
}

export function autoLoad(): Project | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SavedEnvelope;
    if (envelope.version !== CURRENT_VERSION) return null;
    return envelope.project;
  } catch {
    return null;
  }
}

export function saveProject(name: string, project: Project): string | null {
  try {
    const entry: SavedEntry = {
      name,
      savedAt: new Date().toISOString(),
      data: { version: CURRENT_VERSION, project },
    };
    localStorage.setItem(PROJECT_PREFIX + name, JSON.stringify(entry));
    return null;
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      return "Storage quota exceeded — cannot save project. Try deleting unused projects.";
    }
    return "Failed to save project.";
  }
}

export function loadProject(name: string): Project | null {
  try {
    const raw = localStorage.getItem(PROJECT_PREFIX + name);
    if (!raw) return null;
    const entry = JSON.parse(raw) as SavedEntry;
    if (entry.data.version !== CURRENT_VERSION) return null;
    return entry.data.project;
  } catch {
    return null;
  }
}

export function deleteProject(name: string): void {
  localStorage.removeItem(PROJECT_PREFIX + name);
}

export function listProjects(): { name: string; savedAt: string }[] {
  const result: { name: string; savedAt: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PROJECT_PREFIX)) continue;
    try {
      const entry = JSON.parse(localStorage.getItem(key)!) as SavedEntry;
      result.push({ name: entry.name, savedAt: entry.savedAt });
    } catch {
      // corrupt entry — skip
    }
  }
  return result.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

// --- File download/upload ---

export function downloadProject(name: string, project: Project): void {
  const envelope: SavedEnvelope = { version: CURRENT_VERSION, project };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.strudel.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function uploadProject(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith(".json")) {
      reject(new Error("File must be a .json file"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const envelope = JSON.parse(reader.result as string) as SavedEnvelope;
        if (!envelope.project || !Array.isArray(envelope.project.tracks)) {
          reject(new Error("Invalid project file"));
          return;
        }
        resolve(envelope.project);
      } catch {
        reject(new Error("Failed to parse project file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
