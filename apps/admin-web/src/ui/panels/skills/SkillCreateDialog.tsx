import { FormDialog } from "../../FormDialog";
import { useI18n } from "../../i18n/I18nProvider";
import type { SkillCreateDraft } from "./skillDraft";

type SkillCreateDialogProps = {
  open: boolean;
  draft: SkillCreateDraft;
  onDraftChange: (draft: SkillCreateDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
};

export function SkillCreateDialog({
  open,
  draft,
  onDraftChange,
  onOpenChange,
  onSubmit
}: SkillCreateDialogProps) {
  const { t } = useI18n();

  return (
    <FormDialog
      open={open}
      title={t("skills.create")}
      description={t("skills.createHint")}
      contentClassName="skill-create-modal"
      onOpenChange={onOpenChange}
    >
      <div className="skill-create-form">
        <label>
          {t("skills.skillId")}
          <input
            value={draft.skillId}
            onChange={(event) => onDraftChange({ ...draft, skillId: event.target.value.trim() })}
            placeholder={t("skills.skillIdPlaceholder")}
          />
        </label>
        <label>
          {t("skills.name")}
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            placeholder={t("skills.namePlaceholder")}
          />
        </label>
        <label>
          {t("skills.description")}
          <input
            value={draft.description}
            onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
            placeholder={t("skills.descriptionPlaceholder")}
          />
        </label>
        <label className="skill-create-body">
          {t("skills.body")}
          <textarea
            value={draft.body}
            onChange={(event) => onDraftChange({ ...draft, body: event.target.value })}
          />
        </label>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={onSubmit}>
            {t("common.create")}
          </button>
          <button className="secondary-button" type="button" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </FormDialog>
  );
}
