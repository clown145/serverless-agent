import { FolderPlus, FolderTree, RefreshCw } from "lucide-react";
import type { VfsEntry } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";

type VfsEntryListProps = {
  path: string;
  entries: VfsEntry[];
  newDirectoryPath: string;
  onPathChange: (path: string) => void;
  onNewDirectoryPathChange: (path: string) => void;
  onOpenDirectory: (path: string) => void;
  onOpenEntry: (entry: VfsEntry) => void;
  onRefresh: () => void;
  onCreateDirectory: () => void;
  onInitialize: () => void;
};

export function VfsEntryList({
  path,
  entries,
  newDirectoryPath,
  onPathChange,
  onNewDirectoryPathChange,
  onOpenDirectory,
  onOpenEntry,
  onRefresh,
  onCreateDirectory,
  onInitialize
}: VfsEntryListProps) {
  return (
    <div className="list-pane">
      <header className="panel-header compact">
        <h1>VFS</h1>
        <div className="tool-meta">
          <ToolbarButton
            label="Initialize workspace"
            icon={FolderTree}
            onClick={onInitialize}
          />
          <ToolbarButton label="Refresh" icon={RefreshCw} onClick={onRefresh} />
        </div>
      </header>
      <div className="path-bar">
        <input value={path} onChange={(event) => onPathChange(event.target.value)} />
        <button type="button" onClick={() => onOpenDirectory(path)}>
          Open
        </button>
      </div>
      <div className="path-bar">
        <input
          value={newDirectoryPath}
          onChange={(event) => onNewDirectoryPathChange(event.target.value)}
        />
        <ToolbarButton
          label="New directory"
          icon={FolderPlus}
          onClick={onCreateDirectory}
        />
      </div>
      <div className="item-list">
        {entries.map((entry) => (
          <button
            key={entry.id}
            className="list-item"
            type="button"
            onClick={() => onOpenEntry(entry)}
          >
            <span>{displayPath(entry.path, path)}</span>
            <StatusBadge value={entry.kind} />
          </button>
        ))}
        {entries.length === 0 && <EmptyState label="No entries" />}
      </div>
    </div>
  );
}

function displayPath(entryPath: string, currentPath: string): string {
  if (currentPath === "/") {
    return entryPath;
  }

  return entryPath.replace(`${currentPath}/`, "");
}
