import type { ModelCatalogItem, ModelProvider, ModelRole } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import { enabledModelOptions, modelKey, modelLabel, parseModelKey } from "../models/modelSelection";
import type { ModelRoleDefinition } from "./modelRoleDefinitions";

type ModelRolePickerProps = {
  definition: ModelRoleDefinition;
  models: ModelCatalogItem[];
  providers: ModelProvider[];
  value: string;
  onChange: (role: ModelRole, value: string) => void;
};

export function ModelRolePicker({
  definition,
  models,
  providers,
  value,
  onChange
}: ModelRolePickerProps) {
  const { t } = useI18n();
  const options = enabledModelOptions(models);
  const selected = value ? parseModelKey(value) : {};
  const selectedModel = options.find(
    (model) => model.providerId === selected.providerId && model.modelId === selected.modelId
  );
  const capabilityWarning =
    definition.preferredCapability &&
    selectedModel &&
    !selectedModel.capabilities.includes(definition.preferredCapability);

  return (
    <section className="model-role-card">
      <div>
        <strong>{t(definition.labelKey)}</strong>
        <span>{t(definition.descriptionKey)}</span>
      </div>
      <label>
        {t("modelConfig.selectModel")}
        <select value={value} onChange={(event) => onChange(definition.role, event.target.value)}>
          {definition.allowEmpty && <option value="">{t("modelConfig.useFallback")}</option>}
          {!definition.allowEmpty && <option value="">{t("models.selectEnabledModel")}</option>}
          {options.map((model) => (
            <option key={model.id} value={modelKey(model.providerId, model.modelId)}>
              {modelLabel(model, providers)}
            </option>
          ))}
        </select>
      </label>
      {capabilityWarning && (
        <small className="model-role-warning">
          {t("modelConfig.capabilityWarning", {
            capability: t(`models.capability.${definition.preferredCapability}`)
          })}
        </small>
      )}
    </section>
  );
}
