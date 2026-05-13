import type { ModelCatalogItem, ModelProvider } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { modelKey, modelLabel, parseModelKey } from "./modelSelection";

type DefaultModelPickerProps = {
  activeProviderId: string;
  activeModelId: string;
  models: ModelCatalogItem[];
  providers: ModelProvider[];
  onActivate: (providerId: string, modelId: string) => void;
};

export function DefaultModelPicker({
  activeProviderId,
  activeModelId,
  models,
  providers,
  onActivate
}: DefaultModelPickerProps) {
  const { t } = useI18n();
  const activeKey = modelKey(activeProviderId, activeModelId);

  return (
    <section className="model-default-picker">
      <label>
        {t("models.defaultModel")}
        <select
          value={activeKey}
          onChange={(event) => {
            const next = parseModelKey(event.target.value);
            if (next.providerId && next.modelId) {
              onActivate(next.providerId, next.modelId);
            }
          }}
        >
          <option value="">{t("models.selectEnabledModel")}</option>
          {models.map((model) => (
            <option key={model.id} value={modelKey(model.providerId, model.modelId)}>
              {modelLabel(model, providers)}
            </option>
          ))}
        </select>
      </label>
      <span>{t("models.defaultModelHint")}</span>
    </section>
  );
}
