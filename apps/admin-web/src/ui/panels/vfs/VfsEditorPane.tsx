import { FilePenLine, GitCompareArrows, Save, Trash2 } from "lucide-react";
import type { VfsFile } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { ToolbarButton } from "../../ToolbarButton";

type VfsEditorPaneProps = {
  file?: VfsFile;
  filePath: string;
  content: string;
  moveTarget: string;
  onFilePathChange: (path: string) => void;
  onContentChange: (content: string) => void;
  onMoveTargetChange: (path: string) => void;
  onRead: () => void;
  onSave: () => void;
  onDelete: () => void;
  onMove: () => void;
};

export function VfsEditorPane({
  file,
  filePath,
  content,
  moveTarget,
  onFilePathChange,
  onContentChange,
  onMoveTargetChange,
  onRead,
  onSave,
  onDelete,
  onMove
}: VfsEditorPaneProps) {
  const { t } = useI18n();

  return (
    <div className="detail-pane editor-pane">
      <div className="path-bar">
        <input value={filePath} onChange={(event) => onFilePathChange(event.target.value)} />
        <ToolbarButton label={t("vfs.readFile")} icon={FilePenLine} onClick={onRead} />
        <ToolbarButton label={t("vfs.saveFile")} icon={Save} onClick={onSave} />
        <ToolbarButton
          label={t("vfs.deleteFile")}
          icon={Trash2}
          onClick={onDelete}
          variant="danger"
        />
      </div>
      <div className="path-bar">
        <input
          value={moveTarget}
          onChange={(event) => onMoveTargetChange(event.target.value)}
        />
        <ToolbarButton label={t("vfs.move")} icon={GitCompareArrows} onClick={onMove} />
      </div>
      {file && (
        <div className="vfs-meta-line">
          <span>v{file.version}</span>
          {file.size !== undefined && <span>{file.size} bytes</span>}
          {file.mimeType && <span>{file.mimeType}</span>}
        </div>
      )}
      <textarea
        className="code-editor"
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
      />
    </div>
  );
}
