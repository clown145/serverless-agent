import { Plus, RefreshCw } from "lucide-react";
import type { SkillCatalogItem } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
import { ToolbarButton } from "../../ToolbarButton";

type SkillListProps = {
  skills: SkillCatalogItem[];
  selectedSkillId: string;
  onCreate: () => void;
  onRefresh: () => void;
  onSelect: (skillId: string) => void;
};

export function SkillList({
  skills,
  selectedSkillId,
  onCreate,
  onRefresh,
  onSelect
}: SkillListProps) {
  const { t } = useI18n();

  return (
    <div className="skill-list-section">
      <div className="subsection-header compact">
        <div>
          <h2>{t("skills.installed")}</h2>
          <p>{t("skills.count", { count: skills.length })}</p>
        </div>
        <div className="panel-header-actions">
          <ToolbarButton label={t("common.refresh")} icon={RefreshCw} onClick={onRefresh} />
          <ToolbarButton label={t("skills.create")} icon={Plus} onClick={onCreate} />
        </div>
      </div>
      <div className="item-list skill-list">
        {skills.map((skill) => (
          <button
            key={skill.id}
            className={`list-item skill-list-item${skill.id === selectedSkillId ? " selected" : ""}`}
            type="button"
            onClick={() => onSelect(skill.id)}
          >
            <strong>{skill.name}</strong>
            <span>{skill.id}</span>
            <small>{skill.description}</small>
          </button>
        ))}
        {skills.length === 0 && <EmptyState label={t("skills.noSkills")} />}
      </div>
    </div>
  );
}
