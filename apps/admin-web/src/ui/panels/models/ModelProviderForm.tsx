import type { ModelProvider } from "../../../api/types";
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
  function update<K extends keyof ModelProviderDraft>(key: K, value: ModelProviderDraft[K]) {
    onDraftChange({ ...draft, [key]: value });
  }

  return (
    <div className="form-grid model-form">
      <label>
        Format
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
        Name
        <input value={draft.name} onChange={(event) => update("name", event.target.value)} />
      </label>
      <label>
        Base URL
        <input value={draft.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} />
      </label>
      <label>
        API key
        <input
          value={draft.apiKey}
          autoComplete="off"
          required={draft.authType !== "none"}
          type="password"
          onChange={(event) => update("apiKey", event.target.value)}
        />
      </label>
      <button className="primary-button" type="button" onClick={onSubmit}>
        Add
      </button>
    </div>
  );
}
