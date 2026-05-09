import { FolderPlus, FolderTree, RefreshCw } from "lucide-react";
import type { VfsEntry } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
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
  const { t } = useI18n();

  return (
    <div className="list-pane">
      <header className="panel-header compact">
        <h1>{t("vfs.title")}</h1>
        <div className="tool-meta">
          <ToolbarButton
            label={t("vfs.initialize")}
            icon={FolderTree}
            onClick={onInitialize}
          />
          <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={onRefresh} />
        </div>
      </header>
      <div className="path-bar">
        <input value={path} onChange={(event) => onPathChange(event.target.value)} />
        <button type="button" onClick={() => onOpenDirectory(path)}>
          {t("common.open")}
        </button>
      </div>
      <div className="path-bar">
        <input
          value={newDirectoryPath}
          onChange={(event) => onNewDirectoryPathChange(event.target.value)}
        />
        <ToolbarButton
          label={t("vfs.newDirectory")}
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
        {entries.length === 0 && <EmptyState label={t("vfs.noEntries")} />}
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
