import { Save } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";

type ToolSettingsViewProps = {
  value: string;
  saving: boolean;
  onValueChange: (value: string) => void;
  onSave: () => void;
};

export function ToolSettingsView({ value, saving, onValueChange, onSave }: ToolSettingsViewProps) {
  const { t } = useI18n();
  const hintValue = value.trim() || "-";

  return (
    <section className="tool-settings">
      <div>
        <strong>{t("tools.settings")}</strong>
        <span>{t("tools.settingsHint", { count: hintValue })}</span>
      </div>
      <label>
        {t("tools.maxCallsPerRun")}
        <input
          type="number"
          min="1"
          max="100"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </label>
      <button className="secondary-button" disabled={saving} type="button" onClick={onSave}>
        <Save size={16} />
        {saving ? t("common.saving") : t("common.save")}
      </button>
    </section>
  );
}
