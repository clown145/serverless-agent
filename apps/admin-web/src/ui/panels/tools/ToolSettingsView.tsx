import { Save } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  MAX_MODEL_STEPS_PER_RUN,
  MAX_TOOL_CALLS_PER_RUN,
  MIN_MODEL_STEPS_PER_RUN,
  MIN_TOOL_CALLS_PER_RUN
} from "./tool-settings-constants";

type ToolSettingsViewProps = {
  maxCallsDraft: string;
  maxStepsDraft: string;
  saving: boolean;
  onCallsChange: (value: string) => void;
  onStepsChange: (value: string) => void;
  onSave: () => void;
};

export function ToolSettingsView({
  maxCallsDraft,
  maxStepsDraft,
  saving,
  onCallsChange,
  onStepsChange,
  onSave
}: ToolSettingsViewProps) {
  const { t } = useI18n();

  return (
    <section className="tool-settings">
      <div>
        <strong>{t("tools.settings")}</strong>
      </div>
      <label>
        {t("tools.maxCallsPerRun")}
        <input
          type="number"
          min={MIN_TOOL_CALLS_PER_RUN}
          max={MAX_TOOL_CALLS_PER_RUN}
          value={maxCallsDraft}
          onChange={(event) => onCallsChange(event.target.value)}
        />
      </label>
      <label>
        {t("tools.maxModelStepsPerRun")}
        <input
          type="number"
          min={MIN_MODEL_STEPS_PER_RUN}
          max={MAX_MODEL_STEPS_PER_RUN}
          value={maxStepsDraft}
          onChange={(event) => onStepsChange(event.target.value)}
        />
      </label>
      <button className="secondary-button" disabled={saving} type="button" onClick={onSave}>
        <Save size={16} />
        {saving ? t("common.saving") : t("common.save")}
      </button>
    </section>
  );
}
