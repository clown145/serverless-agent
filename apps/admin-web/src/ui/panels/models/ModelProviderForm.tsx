import type { ModelProvider } from "../../../api/types";
import { useI18n } from "../../i18n/I18nProvider";
import type { ModelProviderDraft } from "./modelDefaults";

const providerTypes: ModelProvider["providerType"][] = ["openai", "gemini", "mock"];

type ModelProviderFormProps = {
  draft: ModelProviderDraft;
  onProviderTypeChange: (value: ModelProvider["providerType"]) => void;
  onDraftChange: (draft: ModelProviderDraft) => void;
  onSubmit: () => void;
};

export function ModelProviderForm({
  draft,
  onProviderTypeChange,
  onDraftChange,
  onSubmit
}: ModelProviderFormProps) {
  const { t } = useI18n();

  function update<K extends keyof ModelProviderDraft>(key: K, value: ModelProviderDraft[K]) {
    onDraftChange({ ...draft, [key]: value });
  }

  return (
    <div className="form-grid model-form">
      <label>
        {t("models.format")}
        <select
          value={draft.providerType}
          onChange={(event) => onProviderTypeChange(event.target.value as ModelProvider["providerType"])}
        >
          {providerTypes.map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("models.name")}
        <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
      </label>
      <label>
        {t("models.baseUrl")}
        <input value={draft.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} />
      </label>
      <label>
        {t("models.apiKey")}
        <input
          value={draft.apiKey}
          autoComplete="off"
          required={draft.authType !== "none"}
          type="password"
          onChange={(event) => update("apiKey", event.target.value)}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        {t("common.add")}
      </button>
    </div>
  );
}
