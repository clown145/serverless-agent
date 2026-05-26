import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";

type ToolSettingsFormProps = {
  maxSteps: number;
  onSave: (maxSteps: number) => Promise<void>;
};

export function ToolSettingsForm({ maxSteps, onSave }: ToolSettingsFormProps) {
  const { t } = useI18n();
  const [value, setValue] = useState<number | string>(maxSteps);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(maxSteps);
  }, [maxSteps]);

  const numericValue = typeof value === "string" ? parseInt(value, 10) : value;
  const isValid =
    !isNaN(numericValue) &&
    Number.isInteger(numericValue) &&
    numericValue >= 1 &&
    numericValue <= 100;

  const isDirty = numericValue !== maxSteps;

  async function handleSave() {
    if (!isValid || !isDirty) return;
    setSaving(true);
    try {
      await onSave(numericValue);
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
          onChange={(event) => {
            const val = event.target.value;
            setValue(val === "" ? "" : val);
          }}
        />
        <p className="hint-text">{t("tools.maxStepsHint")}</p>
      </label>
      <button
        className="primary-button"
        type="button"
        disabled={saving || !isValid || !isDirty}
        onClick={handleSave}
      >
        {saving ? t("common.saving") : t("common.save")}
      </button>
    </div>
  );
}
