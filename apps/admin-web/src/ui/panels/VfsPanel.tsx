import { FilePenLine, RefreshCw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { VfsEntry } from "../../api/types";
import { EmptyState } from "../EmptyState";
import { StatusBadge } from "../StatusBadge";
import { ToolbarButton } from "../ToolbarButton";
import type { PanelProps } from "./types";

export function VfsPanel({ client, notify }: PanelProps) {
  const [path, setPath] = useState("/");
  const [filePath, setFilePath] = useState("/workspace/notes/hello.md");
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState<VfsEntry[]>([]);

  async function loadDirectory(target = path) {
    try {
      const result = await client.listVfs(target);
      setEntries(result.entries);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load VFS", "error");
    }
  }

  async function readFile(target = filePath) {
    try {
      const result = await client.readVfsFile(target);
      setFilePath(result.file.path);
      setContent(result.file.content);
      notify("File loaded", "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to read file", "error");
    }
  }

  async function writeFile() {
    try {
      await client.writeVfsFile({ path: filePath, content, mimeType: "text/plain" });
      notify("File saved", "ok");
      await loadDirectory(path);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save file", "error");
    }
  }

  useEffect(() => {
    void loadDirectory("/");
  }, []);

  return (
    <section className="panel split-panel">
      <div className="list-pane">
        <header className="panel-header compact">
          <h1>VFS</h1>
          <ToolbarButton label="Refresh" icon={RefreshCw} onClick={() => void loadDirectory()} />
        </header>
        <div className="path-bar">
          <input value={path} onChange={(event) => setPath(event.target.value)} />
          <button type="button" onClick={() => void loadDirectory()}>
            Open
          </button>
        </div>
        <div className="item-list">
          {entries.map((entry) => (
            <button
              key={entry.id}
              className="list-item"
              type="button"
              onClick={() => {
                if (entry.kind === "directory") {
                  setPath(entry.path);
                  void loadDirectory(entry.path);
                } else {
                  void readFile(entry.path);
                }
              }}
            >
              <span>{entry.path}</span>
              <StatusBadge value={entry.kind} />
            </button>
          ))}
          {entries.length === 0 && <EmptyState label="No entries" />}
        </div>
      </div>
      <div className="detail-pane editor-pane">
        <div className="path-bar">
          <input value={filePath} onChange={(event) => setFilePath(event.target.value)} />
          <ToolbarButton label="Read file" icon={FilePenLine} onClick={() => void readFile()} />
          <ToolbarButton label="Save file" icon={Save} onClick={() => void writeFile()} />
        </div>
        <textarea
          className="code-editor"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
      </div>
    </section>
  );
}
