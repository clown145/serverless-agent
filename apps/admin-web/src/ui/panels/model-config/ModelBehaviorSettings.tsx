import type { AgentModelConfig } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";

type ModelBehaviorSettingsProps = {
  config: AgentModelConfig;
  onChange: (config: AgentModelConfig) => void;
};

export function ModelBehaviorSettings({
  config,
  onChange
}: ModelBehaviorSettingsProps) {
  const { t } = useI18n();

  return (
    <section className="model-role-card">
      <div>
        <strong>{t("modelConfig.imageCaptioning")}</strong>
        <span>{t("modelConfig.imageCaptioningHint")}</span>
      </div>
      <label className="checkbox-label">
        <input
          checked={config.imageCaptionEnabled}
          type="checkbox"
          onChange={(event) =>
            onChange({ ...config, imageCaptionEnabled: event.target.checked })
          }
        />
        {t("modelConfig.imageCaptioningEnabled")}
      </label>
    </section>
  );
}
