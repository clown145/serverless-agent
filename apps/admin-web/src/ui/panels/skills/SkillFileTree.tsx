import { FilePlus2, RefreshCw, Trash2 } from "lucide-react";
import type { VfsEntry } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
import { StatusBadge } from "../../StatusBadge";
import { ToolbarButton } from "../../ToolbarButton";
import { displaySkillPath, relativeSkillPath } from "./skillPaths";

type SkillFileTreeProps = {
  skillId: string;
  entries: VfsEntry[];
  selectedPath: string;
  newFilePath: string;
  onNewFilePathChange: (path: string) => void;
  onCreateFile: () => void;
  onDeleteSkill: () => void;
  onOpenFile: (relativePath: string) => void;
  onRefresh: () => void;
};

export function SkillFileTree({
  skillId,
  entries,
  selectedPath,
  newFilePath,
  onNewFilePathChange,
  onCreateFile,
  onDeleteSkill,
  onOpenFile,
  onRefresh
}: SkillFileTreeProps) {
  const { t } = useI18n();
  const visibleEntries = entries.filter((entry) => entry.path !== `/skills/${skillId}`);

  return (
    <div className="skill-files-section">
      <div className="subsection-header">
        <div>
          <h2>{t("skills.files")}</h2>
          <p>{skillId || t("skills.selectSkill")}</p>
        </div>
        <div className="panel-header-actions">
          <ToolbarButton
            label={t("common.refresh")}
            icon={RefreshCw}
            onClick={onRefresh}
            disabled={!skillId}
          />
          <ToolbarButton
            label={t("skills.deleteSkill")}
            icon={Trash2}
            onClick={onDeleteSkill}
            disabled={!skillId}
            variant="danger"
          />
        </div>
      </div>
      <div className="path-bar">
        <input
          value={newFilePath}
          onChange={(event) => onNewFilePathChange(event.target.value)}
          placeholder={t("skills.filePathPlaceholder")}
        />
        <ToolbarButton
          label={t("skills.newFile")}
          icon={FilePlus2}
          onClick={onCreateFile}
          disabled={!skillId}
        />
      </div>
      <div className="item-list skill-file-list">
        {visibleEntries.map((entry) => {
          const relativePath = relativeSkillPath(skillId, entry.path);
          return (
            <button
              key={entry.id}
              className={`list-item skill-file-item${relativePath === selectedPath ? " selected" : ""}`}
              type="button"
              disabled={entry.kind === "directory"}
              onClick={() => onOpenFile(relativePath)}
            >
              <span>{displaySkillPath(skillId, entry.path)}</span>
              <StatusBadge value={entry.kind} />
            </button>
          );
        })}
        {visibleEntries.length === 0 && <EmptyState label={t("skills.noFiles")} />}
      </div>
    </div>
  );
}
