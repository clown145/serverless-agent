import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";

type ToolSettingsFormProps = {
  maxSteps: number;
  onSave: (maxSteps: number) => Promise<void>;
};

export function ToolSettingsForm({ maxSteps, onSave }: ToolSettingsFormProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(maxSteps);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mcp-form">
      <h3>{t("tools.settings")}</h3>
      <label>
        {t("tools.maxSteps")}
        <input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
        />
        <p className="hint-text">{t("tools.maxStepsHint")}</p>
      </label>
      <button
        className="primary-button"
        type="button"
        disabled={saving || value === maxSteps}
        onClick={handleSave}
      >
        {saving ? t("common.saving") : t("common.save")}
      </button>
    </div>
  );
}
