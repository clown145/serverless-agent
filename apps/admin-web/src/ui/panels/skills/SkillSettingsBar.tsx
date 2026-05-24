import type { SkillSettings } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";

type SkillSettingsBarProps = {
  settings?: SkillSettings;
  onToggleConfirmation: (required: boolean) => void;
};

export function SkillSettingsBar({ settings, onToggleConfirmation }: SkillSettingsBarProps) {
  const { t } = useI18n();

  return (
    <div className="skill-settings-bar">
      <div>
        <strong>{t("skills.autoEdits")}</strong>
        <span>{t("skills.autoEditsHint")}</span>
      </div>
      <label className="checkbox-row">
        <input
          checked={!settings?.editConfirmationRequired}
          type="checkbox"
          onChange={(event) => onToggleConfirmation(!event.target.checked)}
        />
        {t("skills.autoEditsEnabled")}
      </label>
    </div>
  );
}
