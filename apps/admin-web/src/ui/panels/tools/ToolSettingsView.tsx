import { Save } from "lucide-react";
import type { ToolSettings } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";

type ToolSettingsViewProps = {
  settings?: ToolSettings;
  value: number;
  saving: boolean;
  onValueChange: (value: number) => void;
  onSave: () => void;
};

export function ToolSettingsView({
  settings,
  value,
  saving,
  onValueChange,
  onSave
}: ToolSettingsViewProps) {
  const { t } = useI18n();

  return (
    <section className="tool-settings">
      <div>
        <strong>{t("tools.settings")}</strong>
        <span>{t("tools.settingsHint", { count: settings?.maxToolCallsPerRun ?? value })}</span>
      </div>
      <label>
        {t("tools.maxCallsPerRun")}
        <input
          type="number"
          min="1"
          max="100"
          value={value}
          onChange={(event) => onValueChange(Number(event.target.value))}
        />
      </label>
      <button className="secondary-button" disabled={saving} type="button" onClick={onSave}>
        <Save size={16} />
        {saving ? t("common.saving") : t("common.save")}
      </button>
    </section>
  );
}
