import { useEffect, useState } from "react";
import type { VfsEntry, VfsFile } from "../../api/types";
import type { PanelProps } from "./types";
import { VfsCommandPane } from "./vfs/VfsCommandPane";
import { VfsEditorPane } from "./vfs/VfsEditorPane";
import { VfsEntryList } from "./vfs/VfsEntryList";

export function VfsPanel({ client, notify }: PanelProps) {
  const [path, setPath] = useState("/");
  const [newDirectoryPath, setNewDirectoryPath] = useState("/workspace");
  const [filePath, setFilePath] = useState("/workspace/notes/hello.md");
  const [moveTarget, setMoveTarget] = useState("/workspace/notes/renamed.md");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<VfsFile>();
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [command, setCommand] = useState("ls /");
  const [commandOutput, setCommandOutput] = useState("");

  async function loadDirectory(target = path) {
    try {
      const result = await client.listVfs(target);
      setPath(target);
      setEntries(result.entries);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load VFS", "error");
    }
  }

  async function readFile(target = filePath) {
    try {
      const result = await client.readVfsFile(target);
      setFile(result.file);
      setFilePath(result.file.path);
      setMoveTarget(result.file.path);
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
      await readFile(filePath);
      await loadDirectory(path);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save file", "error");
    }
  }

  async function createDirectory() {
    try {
      await client.mkdirVfs(newDirectoryPath);
      notify("Directory created", "ok");
      await loadDirectory(path);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create directory", "error");
    }
  }

  async function deleteFile() {
    try {
      await client.deleteVfs(filePath, false);
      notify("Entry deleted", "ok");
      setContent("");
      setFile(undefined);
      await loadDirectory(path);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete entry", "error");
    }
  }

  async function moveEntry() {
    try {
      const result = await client.moveVfs(filePath, moveTarget);
      notify("Entry moved", "ok");
      setFilePath(result.entry.path);
      setMoveTarget(result.entry.path);
      await loadDirectory(path);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to move entry", "error");
    }
  }

  async function runCommand() {
    try {
      const result = await client.runVfsCommand({ command, cwd: path });
      setCommandOutput(result.result.output);
      await loadDirectory(path);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to run command", "error");
    }
  }

  useEffect(() => {
    void loadDirectory("/");
  }, []);

  return (
    <section className="panel vfs-panel">
      <div className="split-panel">
        <VfsEntryList
          path={path}
          entries={entries}
          newDirectoryPath={newDirectoryPath}
          onPathChange={setPath}
          onNewDirectoryPathChange={setNewDirectoryPath}
          onOpenDirectory={(target) => void loadDirectory(target)}
          onOpenEntry={(entry) => {
            if (entry.kind === "directory") {
              void loadDirectory(entry.path);
            } else {
              void readFile(entry.path);
            }
          }}
          onRefresh={() => void loadDirectory(path)}
          onCreateDirectory={() => void createDirectory()}
        />
        <VfsEditorPane
          file={file}
          filePath={filePath}
          content={content}
          moveTarget={moveTarget}
          onFilePathChange={setFilePath}
          onContentChange={setContent}
          onMoveTargetChange={setMoveTarget}
          onRead={() => void readFile()}
          onSave={() => void writeFile()}
          onDelete={() => void deleteFile()}
          onMove={() => void moveEntry()}
        />
      </div>
      <VfsCommandPane
        command={command}
        output={commandOutput}
        onCommandChange={setCommand}
        onRun={() => void runCommand()}
      />
    </section>
  );
}
