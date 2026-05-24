import { FilePenLine, Save, Trash2 } from "lucide-react";
import type { LoadedSkill, VfsFile } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { ToolbarButton } from "../../ToolbarButton";
import { skillFilePath } from "./skillPaths";

type SkillEditorProps = {
  skill?: LoadedSkill;
  file?: VfsFile;
  relativePath: string;
  content: string;
  onContentChange: (content: string) => void;
  onRelativePathChange: (path: string) => void;
  onRead: () => void;
  onSave: () => void;
  onDeleteFile: () => void;
};

export function SkillEditor({
  skill,
  file,
  relativePath,
  content,
  onContentChange,
  onRelativePathChange,
  onRead,
  onSave,
  onDeleteFile
}: SkillEditorProps) {
  const { t } = useI18n();
  const absolutePath = skill ? skillFilePath(skill.id, relativePath) : "";

  return (
    <div className="skill-editor">
      <div className="path-bar">
        <input
          value={relativePath}
          onChange={(event) => onRelativePathChange(event.target.value)}
          placeholder={t("skills.rootFilePlaceholder")}
        />
        <ToolbarButton
          label={t("skills.readFile")}
          icon={FilePenLine}
          onClick={onRead}
          disabled={!skill}
        />
        <ToolbarButton
          label={t("skills.saveFile")}
          icon={Save}
          onClick={onSave}
          disabled={!skill}
        />
        <ToolbarButton
          label={t("skills.deleteFile")}
          icon={Trash2}
          onClick={onDeleteFile}
          disabled={!skill || relativePath === "SKILL.md"}
          variant="danger"
        />
      </div>
      {skill && (
        <div className="skill-meta-line">
          <span>{absolutePath}</span>
          {file && <span>v{file.version}</span>}
          {file?.size !== undefined && <span>{file.size} bytes</span>}
          {file?.mimeType && <span>{file.mimeType}</span>}
        </div>
      )}
      {skill && (
        <div className="skill-summary-line">
          <strong>{skill.metadata.name}</strong>
          <span>{skill.metadata.description}</span>
        </div>
      )}
      <textarea
        className="code-editor skill-code-editor"
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
      />
    </div>
  );
}
