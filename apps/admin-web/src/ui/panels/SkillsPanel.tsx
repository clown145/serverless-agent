import { useEffect, useState } from "react";
import type {
  LoadedSkill,
  SkillCatalogItem,
  SkillFileRevision,
  SkillFileRevisionDetail,
  SkillSettings,
  VfsEntry,
  VfsFile
} from "../../api/types";
import { useI18n } from "../i18n/I18nProvider";
import type { PanelProps } from "./types";
import { SkillCreateDialog } from "./skills/SkillCreateDialog";
import { SkillEditor } from "./skills/SkillEditor";
import { SkillFileTree } from "./skills/SkillFileTree";
import { SkillList } from "./skills/SkillList";
import { SkillRevisions } from "./skills/SkillRevisions";
import { SkillSettingsBar } from "./skills/SkillSettingsBar";
import { defaultSkillDraft, type SkillCreateDraft } from "./skills/skillDraft";

export function SkillsPanel({ client, notify }: PanelProps) {
  const { t } = useI18n();
  const [skills, setSkills] = useState<SkillCatalogItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skill, setSkill] = useState<LoadedSkill>();
  const [settings, setSettings] = useState<SkillSettings>();
  const [entries, setEntries] = useState<VfsEntry[]>([]);
  const [file, setFile] = useState<VfsFile>();
  const [relativePath, setRelativePath] = useState("SKILL.md");
  const [newFilePath, setNewFilePath] = useState("references/notes.md");
  const [content, setContent] = useState("");
  const [revisions, setRevisions] = useState<SkillFileRevision[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<SkillFileRevisionDetail>();
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<SkillCreateDraft>(defaultSkillDraft);

  async function loadSkills(preferredSkillId = selectedSkillId) {
    try {
      const [skillResult, settingsResult] = await Promise.all([
        client.listSkills(),
        client.getSkillSettings()
      ]);
      setSkills(skillResult.skills);
      setSettings(settingsResult.settings);

      const nextSkillId =
        preferredSkillId && skillResult.skills.some((item) => item.id === preferredSkillId)
          ? preferredSkillId
          : skillResult.skills[0]?.id ?? "";
      setSelectedSkillId(nextSkillId);
      if (nextSkillId) {
        await loadSkill(nextSkillId, "SKILL.md");
      } else {
        clearSelection();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load skills", "error");
    }
  }

  async function loadSkill(skillId: string, targetPath = relativePath) {
    try {
      const [detailResult, filesResult] = await Promise.all([
        client.getSkill(skillId),
        client.listSkillFiles(skillId)
      ]);
      setSkill(detailResult.skill);
      setSelectedSkillId(skillId);
      setEntries(filesResult.entries);
      await readFile(skillId, targetPath);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to load skill", "error");
    }
  }

  async function readFile(skillId = selectedSkillId, targetPath = relativePath) {
    if (!skillId) {
      return;
    }

    try {
      const [fileResult, revisionsResult] = await Promise.all([
        client.readSkillFile(skillId, targetPath),
        client.listSkillRevisions(skillId, targetPath)
      ]);
      setFile(fileResult.file);
      setRelativePath(targetPath);
      setContent(fileResult.file.content);
      setRevisions(revisionsResult.revisions);
      setSelectedRevision(undefined);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to read skill file", "error");
    }
  }

  async function saveFile() {
    if (!selectedSkillId) {
      return;
    }

    try {
      const result = await client.writeSkillFile(selectedSkillId, {
        relativePath,
        content
      });
      setSkill(result.skill);
      notify(t("skills.fileSaved"), "ok");
      await refreshSelected(relativePath);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save skill file", "error");
    }
  }

  async function createSkill() {
    try {
      const result = await client.createSkill({
        skillId: draft.skillId,
        name: draft.name || draft.skillId,
        description: draft.description,
        body: draft.body
      });
      setCreateOpen(false);
      setDraft(defaultSkillDraft);
      notify(t("skills.created"), "ok");
      await loadSkills(result.skill.id);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to create skill", "error");
    }
  }

  async function createFile() {
    if (!selectedSkillId || !newFilePath.trim()) {
      return;
    }

    const targetPath = newFilePath.trim();
    setRelativePath(targetPath);
    setContent(defaultContentForPath(targetPath));
    setFile(undefined);
    setRevisions([]);
    setSelectedRevision(undefined);
  }

  async function deleteSelectedSkill() {
    if (!selectedSkillId || !window.confirm(t("skills.confirmDeleteSkill"))) {
      return;
    }

    try {
      await client.deleteSkill(selectedSkillId);
      notify(t("skills.deleted"), "ok");
      await loadSkills("");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete skill", "error");
    }
  }

  async function deleteFile() {
    if (!selectedSkillId || relativePath === "SKILL.md") {
      return;
    }

    if (!window.confirm(t("skills.confirmDeleteFile"))) {
      return;
    }

    try {
      await client.deleteSkillFile(selectedSkillId, relativePath, false);
      notify(t("skills.fileDeleted"), "ok");
      await refreshSelected("SKILL.md");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete skill file", "error");
    }
  }

  async function updateSettings(required: boolean) {
    try {
      const result = await client.updateSkillSettings({
        editConfirmationRequired: required
      });
      setSettings(result.settings);
      notify(t("skills.settingsSaved"), "ok");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to save skill settings", "error");
    }
  }

  async function openRevision(version: number) {
    if (!selectedSkillId) {
      return;
    }

    try {
      const result = await client.readSkillRevision(selectedSkillId, relativePath, version);
      setSelectedRevision(result.revision);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to read revision", "error");
    }
  }

  async function rollbackRevision(version: number) {
    if (!selectedSkillId || !window.confirm(t("skills.confirmRollback"))) {
      return;
    }

    try {
      const result = await client.rollbackSkillRevision(selectedSkillId, relativePath, version);
      setSkill(result.skill);
      notify(t("skills.rollbackDone"), "ok");
      await refreshSelected(relativePath);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to rollback revision", "error");
    }
  }

  async function refreshSelected(targetPath = relativePath) {
    if (!selectedSkillId) {
      await loadSkills("");
      return;
    }

    const [filesResult, detailResult] = await Promise.all([
      client.listSkillFiles(selectedSkillId),
      client.getSkill(selectedSkillId)
    ]);
    setEntries(filesResult.entries);
    setSkill(detailResult.skill);
    await readFile(selectedSkillId, targetPath);
  }

  function clearSelection() {
    setSkill(undefined);
    setEntries([]);
    setFile(undefined);
    setContent("");
    setRevisions([]);
    setSelectedRevision(undefined);
    setRelativePath("SKILL.md");
  }

  useEffect(() => {
    void loadSkills();
  }, []);

  return (
    <section className="panel skills-panel">
      <header className="panel-header">
        <div>
          <h1>{t("skills.title")}</h1>
          <p>{t("skills.subtitle")}</p>
        </div>
      </header>
      <SkillSettingsBar
        settings={settings}
        onToggleConfirmation={(required) => void updateSettings(required)}
      />
      <div className="skills-layout">
        <div className="list-pane skill-sidebar">
          <SkillList
            skills={skills}
            selectedSkillId={selectedSkillId}
            onCreate={() => setCreateOpen(true)}
            onRefresh={() => void loadSkills()}
            onSelect={(skillId) => void loadSkill(skillId, "SKILL.md")}
          />
          <SkillFileTree
            skillId={selectedSkillId}
            entries={entries}
            selectedPath={relativePath}
            newFilePath={newFilePath}
            onNewFilePathChange={setNewFilePath}
            onCreateFile={() => void createFile()}
            onDeleteSkill={() => void deleteSelectedSkill()}
            onOpenFile={(path) => void readFile(selectedSkillId, path)}
            onRefresh={() => void refreshSelected(relativePath)}
          />
        </div>
        <div className="detail-pane skill-detail">
          <SkillEditor
            skill={skill}
            file={file}
            relativePath={relativePath}
            content={content}
            onContentChange={setContent}
            onRelativePathChange={setRelativePath}
            onRead={() => void readFile()}
            onSave={() => void saveFile()}
            onDeleteFile={() => void deleteFile()}
          />
          <SkillRevisions
            revisions={revisions}
            selectedRevision={selectedRevision}
            onOpenRevision={(version) => void openRevision(version)}
            onRollback={(version) => void rollbackRevision(version)}
          />
        </div>
      </div>
      <SkillCreateDialog
        open={createOpen}
        draft={draft}
        onDraftChange={setDraft}
        onOpenChange={setCreateOpen}
        onSubmit={() => void createSkill()}
      />
    </section>
  );
}

function defaultContentForPath(path: string): string {
  if (path.endsWith(".md")) {
    return "# Notes\n\n";
  }
  if (path.endsWith(".json")) {
    return "{}\n";
  }
  return "";
}
